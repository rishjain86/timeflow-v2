import { Request, Response, NextFunction } from 'express';
import { Prisma, Role, TaskStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { NotFoundError } from '../utils/errors';

// Helper for RBAC
const hasManagerAccess = (role: Role) => 
  role === Role.ADMIN || role === Role.MANAGER || role === Role.SUPER_ADMIN;

/**
 * Get Time and Task Report for a specific Project
 */
export const getProjectReport = async (
  req: Request<{ projectId: string }, unknown, unknown, { startDate?: string; endDate?: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId } = req.params;
    const { organizationId, role } = res.locals.user;
    const { startDate, endDate } = req.query;

    // 🟢 FIX: Send 403 instead of 401 to prevent frontend Auto-Logout
    if (!hasManagerAccess(role)) {
      res.status(403).json({ success: false, message: 'Only administrators and managers can generate project reports' });
      return;
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId, isActive: true },
      include: { client: { select: { name: true } } }
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    const dateFilter: Prisma.DateTimeFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);
    
    const timeEntryWhere: Prisma.TimeEntryWhereInput = {
      projectId,
      organizationId,
      ...(Object.keys(dateFilter).length > 0 && { date: dateFilter })
    };

    const [taskStats, timeEntries, totalDurationAgg] = await Promise.all([
      // Task Status Breakdown
      prisma.task.groupBy({
        by: ['status'],
        where: { projectId, organizationId, isActive: true },
        _count: { id: true },
      }),
      // Time Entries grouped by User
      prisma.timeEntry.groupBy({
        by: ['userId'],
        where: timeEntryWhere,
        _sum: { duration: true },
      }),
      // Total Billable vs Non-Billable Time
      prisma.timeEntry.groupBy({
        by: ['isBillable'],
        where: timeEntryWhere,
        _sum: { duration: true },
      })
    ]);

    const users = await prisma.user.findMany({
      where: { id: { in: timeEntries.map(t => t.userId) } },
      select: { id: true, firstName: true, lastName: true }
    });
    
    const userMap = new Map(users.map(u => [u.id, u]));

    const userTimeBreakdown = timeEntries.map(entry => {
      const user = userMap.get(entry.userId);
      return {
        user: `${user?.firstName} ${user?.lastName || ''}`.trim(),
        totalHours: Math.round((Number(entry._sum.duration) || 0) / 60 * 100) / 100,
      };
    });

    const defaultTaskStats: Record<TaskStatus, number> = {
      [TaskStatus.TODO]: 0,
      [TaskStatus.IN_PROGRESS]: 0,
      [TaskStatus.IN_REVIEW]: 0,
      [TaskStatus.COMPLETED]: 0,
      [TaskStatus.CANCELLED]: 0,
    };

    const tasksByStatus = taskStats.reduce((acc, curr) => {
      acc[curr.status] = curr._count.id;
      return acc;
    }, { ...defaultTaskStats });

    let billableHours = 0;
    let nonBillableHours = 0;

    totalDurationAgg.forEach(agg => {
      const hours = Math.round((Number(agg._sum.duration) || 0) / 60 * 100) / 100;
      if (agg.isBillable) billableHours += hours;
      else nonBillableHours += hours;
    });

    res.status(200).json({
      success: true,
      data: {
        project: {
          id: project.id,
          name: project.name,
          clientName: project.client?.name || 'Self-Funded / Internal', // 🟢 FIX 5: Fallback string adjusted
          status: project.status,
        },
        report: {
          period: { startDate: startDate || 'All time', endDate: endDate || 'All time' },
          tasksByStatus,
          time: {
            totalHours: billableHours + nonBillableHours,
            billableHours,
            nonBillableHours,
            userTimeBreakdown,
          }
        }
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Time Report for a specific User
 */
export const getUserReport = async (
  req: Request<{ userId: string }, unknown, unknown, { startDate?: string; endDate?: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req.params;
    const { organizationId, id: currentUserId, role } = res.locals.user;
    const { startDate, endDate } = req.query;

    // 🟢 FIX: Send 403 instead of 401 to prevent frontend Auto-Logout
    if (currentUserId !== userId && !hasManagerAccess(role)) {
      res.status(403).json({ success: false, message: 'You are not authorized to view this user\'s report' });
      return;
    }

    const targetUser = await prisma.user.findFirst({
      where: { id: userId, organizationId, isActive: true },
      select: { firstName: true, lastName: true, email: true }
    });

    if (!targetUser) {
      throw new NotFoundError('User not found');
    }

    const dateFilter: Prisma.DateTimeFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const timeEntryWhere: Prisma.TimeEntryWhereInput = {
      userId,
      organizationId,
      ...(Object.keys(dateFilter).length > 0 && { date: dateFilter })
    };

    const [projectTimeAgg, billableAgg] = await Promise.all([
      prisma.timeEntry.groupBy({
        by: ['projectId'],
        where: timeEntryWhere,
        _sum: { duration: true },
      }),
      prisma.timeEntry.groupBy({
        by: ['isBillable'],
        where: timeEntryWhere,
        _sum: { duration: true },
      })
    ]);

    const projects = await prisma.project.findMany({
      where: { id: { in: projectTimeAgg.map(p => p.projectId) } },
      select: { id: true, name: true }
    });

    const projectMap = new Map(projects.map(p => [p.id, p]));

    const projectTimeBreakdown = projectTimeAgg.map(entry => {
      const project = projectMap.get(entry.projectId);
      return {
        projectId: entry.projectId,
        projectName: project?.name || 'Unknown Project',
        totalHours: Math.round((Number(entry._sum.duration) || 0) / 60 * 100) / 100,
      };
    });

    let billableHours = 0;
    let nonBillableHours = 0;

    billableAgg.forEach(agg => {
      const hours = Math.round((Number(agg._sum.duration) || 0) / 60 * 100) / 100;
      if (agg.isBillable) billableHours += hours;
      else nonBillableHours += hours;
    });

    res.status(200).json({
      success: true,
      data: {
        user: targetUser,
        report: {
          period: { startDate: startDate || 'All time', endDate: endDate || 'All time' },
          time: {
            totalHours: billableHours + nonBillableHours,
            billableHours,
            nonBillableHours,
            projectTimeBreakdown,
          }
        }
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Advanced Time Report (Aggregated Overview with Approvals & Rejections safely separated)
 */
export const getAdvancedTimeReport = async (
  req: Request<unknown, unknown, unknown, { startDate?: string; endDate?: string; projectId?: string; userId?: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { organizationId, role, id: currentUserId } = res.locals.user;
    const { startDate, endDate, projectId, userId } = req.query;

    const targetUserId = !hasManagerAccess(role) ? currentUserId : (userId || undefined);

    const dateFilter: Prisma.DateTimeFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const where: Prisma.TimeEntryWhereInput = {
      organizationId,
      ...(targetUserId && { userId: targetUserId }),
      ...(projectId && { projectId }),
      ...(Object.keys(dateFilter).length > 0 && { date: dateFilter })
    };

    const aggregations = await prisma.timeEntry.groupBy({
      by: ['approvalStatus', 'isBillable'],
      where,
      _sum: { 
        duration: true, 
        billableAmount: true 
      },
    });

    let totalHours = 0;
    let approvedHours = 0;
    let pendingHours = 0;
    let rejectedHours = 0;
    let billableHours = 0;
    let nonBillableHours = 0;
    let totalBillableAmount = 0;

    aggregations.forEach(agg => {
      const hours = Math.round((Number(agg._sum.duration) || 0) / 60 * 100) / 100;
      const amount = Number(agg._sum.billableAmount) || 0;

      totalHours += hours;

      if (agg.approvalStatus === 'APPROVED') {
        approvedHours += hours;
        if (agg.isBillable) {
          totalBillableAmount += amount;
        }
      } else if (agg.approvalStatus === 'PENDING') {
        pendingHours += hours;
      } else if (agg.approvalStatus === 'REJECTED') {
        rejectedHours += hours;
      }

      if (agg.isBillable) {
        billableHours += hours;
      } else {
        nonBillableHours += hours;
      }
    });

    res.status(200).json({
      success: true,
      data: {
        period: { startDate: startDate || 'All time', endDate: endDate || 'All time' },
        overview: {
          totalHours,
          approvedHours,
          pendingHours,
          rejectedHours,
          billableHours,
          nonBillableHours,
          totalBillableAmount
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Budget Reports (Project Pool & Task Specific budgets)
 */
export const getBudgetReport = async (
  req: Request<unknown, unknown, unknown, { projectId?: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { organizationId, role } = res.locals.user;
    const { projectId } = req.query;

    // 🟢 FIX: Send 403 instead of 401 to prevent frontend Auto-Logout
    if (!hasManagerAccess(role)) {
      res.status(403).json({ success: false, message: 'Only administrators and managers can view comprehensive budget reports' });
      return;
    }

    const where: Prisma.ProjectBudgetWhereInput = {
      organizationId,
      ...(projectId && { projectId })
    };

    const projectBudgets = await prisma.projectBudget.findMany({
      where,
      include: {
        project: { 
          select: { 
            id: true, 
            name: true, 
            status: true, 
            client: { select: { name: true } } 
          } 
        },
        taskBudgets: {
          include: {
            task: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedBudgets = projectBudgets.map(budget => {
      return {
        id: budget.id,
        projectId: budget.projectId,
        projectName: budget.project.name,
        clientName: budget.project.client?.name || 'Self-Funded / Internal', // 🟢 FIX 5
        projectStatus: budget.project.status,
        budgetStatus: budget.status,
        totalAllocatedHours: Number(budget.totalAllocatedHours),
        consumedHours: Number(budget.consumedHours),
        remainingHours: Number(budget.remainingHours),
        progressPercentage: budget.progressPercentage,
        taskBudgets: budget.taskBudgets.map(tb => ({
          taskId: tb.taskId,
          taskName: tb.task.name,
          allocatedHours: Number(tb.allocatedHours),
          consumedHours: Number(tb.consumedHours),
          remainingHours: Number(tb.remainingHours),
          progressPercentage: tb.progressPercentage,
          status: tb.status
        }))
      };
    });

    res.status(200).json({
      success: true,
      data: {
        budgets: formattedBudgets
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Overage / Extra Hours Request Report
 */
export const getOverageReport = async (
  req: Request<unknown, unknown, unknown, { projectId?: string; userId?: string; status?: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { organizationId, role, id: currentUserId } = res.locals.user;
    const { projectId, userId, status } = req.query;

    const targetUserId = !hasManagerAccess(role) ? currentUserId : (userId || undefined);

    const overageRequests = await prisma.budgetRequest.findMany({
      where: {
        organizationId,
        ...(targetUserId && { userId: targetUserId }),
        ...(projectId && { projectId }),
        ...(status && { status }),
      },
      include: {
        project: { 
          select: { 
            id: true, 
            name: true, 
            client: { select: { name: true } } 
          } 
        },
        user: { 
          select: { id: true, firstName: true, lastName: true } 
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedRequests = overageRequests.map(request => ({
      id: request.id,
      projectId: request.projectId,
      projectName: request.project.name,
      clientName: request.project.client?.name || 'Self-Funded / Internal', // 🟢 FIX 5
      userId: request.userId,
      userName: `${request.user.firstName} ${request.user.lastName || ''}`.trim(),
      requestedHours: request.requestedHours,
      reason: request.reason,
      status: request.status,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    }));

    res.status(200).json({
      success: true,
      data: {
        requests: formattedRequests
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Clinical Compliance Report (Based on Tasks requiring compliance)
 */
export const getClinicalComplianceReport = async (
  req: Request<unknown, unknown, unknown, { projectId?: string; userId?: string; complianceStatus?: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { organizationId, role, id: currentUserId } = res.locals.user;
    const { projectId, userId, complianceStatus } = req.query;

    const targetUserId = !hasManagerAccess(role) ? currentUserId : (userId || undefined);

    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        organizationId,
        ...(targetUserId && { userId: targetUserId }),
        ...(projectId && { projectId }),
        task: {
          requiresClinicalCompliance: true
        }
      },
      include: {
        project: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
        task: { select: { id: true, name: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
        appointment: {
          include: {
            attendance: { select: { status: true } },
            clinicalNote: { select: { isApproved: true } }
          }
        }
      },
      orderBy: { date: 'desc' }
    });

    let complianceRecords = timeEntries.map(entry => {
      const hasCnrUrl = !!entry.cnrDocumentUrl;
      const hasAttendanceUrl = !!entry.attendanceDocumentUrl;
      const appointmentCnrApproved = entry.appointment?.clinicalNote?.isApproved || false;
      const attendancePresent = entry.appointment?.attendance?.status === 'PRESENT' || false;

      const isCompliant = (hasCnrUrl && hasAttendanceUrl) || (appointmentCnrApproved && attendancePresent);

      return {
        id: entry.id,
        date: entry.date,
        durationHours: Math.round((Number(entry.duration) || 0) / 60 * 100) / 100,
        projectId: entry.projectId,
        projectName: entry.project.name,
        clientName: entry.client?.name || 'Self-Funded / Internal', // 🟢 FIX 5
        taskId: entry.taskId,
        taskName: entry.task?.name,
        userName: `${entry.user.firstName} ${entry.user.lastName || ''}`.trim(),
        hasCnrDocument: hasCnrUrl,
        hasAttendanceDocument: hasAttendanceUrl,
        appointmentCnrApproved,
        attendancePresent,
        status: isCompliant ? 'COMPLIANT' : 'NON_COMPLIANT'
      };
    });

    if (complianceStatus) {
      complianceRecords = complianceRecords.filter(record => record.status === complianceStatus);
    }

    res.status(200).json({
      success: true,
      data: {
        records: complianceRecords
      }
    });
  } catch (error) {
    next(error);
  }
};
