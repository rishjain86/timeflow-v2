import { Request, Response, NextFunction } from 'express';
import { Role, ProjectStatus, TaskStatus } from '@prisma/client';
import { prisma } from '../config/prisma';

export const getDashboardStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // 🟢 ANTI-VERCEL CACHE HEADERS (Zabardasti Cache ko rokne ke liye)
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');

  try {
    const userPayload = res.locals.user || {};
    const organizationId = userPayload.organizationId;
    // 🔒 STRICT ID EXTRACTION
    const userId = userPayload.id || userPayload.userId || userPayload.sub;
    const role = userPayload.role;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'CRITICAL Auth Error: Missing User ID' });
    }
    
    const isManagement = role === Role.SUPER_ADMIN || role === Role.ADMIN || role === Role.MANAGER;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const defaultTaskStats: Record<TaskStatus, number> = {
      [TaskStatus.TODO]: 0,
      [TaskStatus.IN_PROGRESS]: 0,
      [TaskStatus.IN_REVIEW]: 0,
      [TaskStatus.COMPLETED]: 0,
      [TaskStatus.CANCELLED]: 0,
    };

    if (isManagement) {
      const [
        totalClients,
        activeProjects,
        taskStatusCounts,
        recentProjects,
        recentTasks,
        monthlyTimeLogged,
        logs 
      ] = await Promise.all([
        prisma.client.count({ 
          where: { organizationId, isActive: true } 
        }),
        
        prisma.project.count({ 
          where: { organizationId, isActive: true, status: ProjectStatus.ACTIVE } 
        }),
        
        prisma.task.groupBy({
          by: ['status'],
          where: { organizationId, isActive: true },
          _count: { id: true }
        }),
        
        prisma.project.findMany({
          where: { organizationId, isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            name: true,
            status: true,
            client: { select: { name: true } }
          }
        }),
        
        prisma.task.findMany({
          where: { 
            organizationId, 
            isActive: true,
            status: { not: TaskStatus.COMPLETED }
          },
          orderBy: { dueDate: 'asc' },
          take: 5,
          select: {
            id: true,
            name: true,
            status: true,
            dueDate: true,
            assignedTo: { select: { firstName: true, lastName: true } }
          }
        }),

        prisma.timeEntry.aggregate({
          where: { 
            organizationId, 
            date: { gte: startOfMonth },
            approvalStatus: { not: 'REJECTED' }
          },
          _sum: { duration: true }
        }),
        
        prisma.auditLog.findMany({
            where: { organizationId },
            take: 20,
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { firstName: true, lastName: true, role: true } } }
        })
      ]);

      const tasksByStatus = taskStatusCounts.reduce((acc, curr) => {
        acc[curr.status] = curr._count.id;
        return acc;
      }, { ...defaultTaskStats });

      const totalMonthlyMinutes = Number(monthlyTimeLogged._sum.duration ?? 0);
      const totalMonthlyHours = Math.round((totalMonthlyMinutes / 60) * 100) / 100;

      return res.status(200).json({
        success: true,
        data: {
          overview: {
            totalClients,
            activeProjects,
            totalMonthlyHours,
            tasksByStatus,
          },
          recentProjects,
          upcomingTasks: recentTasks,
          recentLogs: logs 
        }
      });
    } else {
      const [
        myTaskStatusCounts,
        myUpcomingTasks,
        myMonthlyTimeLogged,
        myRecentProjects,
        logs 
      ] = await Promise.all([
        prisma.task.groupBy({
          by: ['status'],
          where: { organizationId, assignedToId: userId, isActive: true },
          _count: { id: true }
        }),

        prisma.task.findMany({
          where: { 
            organizationId, 
            assignedToId: userId,
            isActive: true,
            status: { not: TaskStatus.COMPLETED }
          },
          orderBy: { dueDate: 'asc' },
          take: 5,
          select: {
            id: true,
            name: true,
            status: true,
            dueDate: true,
            project: { select: { name: true } }
          }
        }),

        prisma.timeEntry.aggregate({
          where: { 
            organizationId, 
            userId: userId, // 🔒 FORCED FILTER
            date: { gte: startOfMonth },
            approvalStatus: { not: 'REJECTED' }
          },
          _sum: { duration: true }
        }),

        prisma.project.findMany({
          where: {
            organizationId,
            isActive: true,
            tasks: {
              some: { assignedToId: userId }
            }
          },
          orderBy: { updatedAt: 'desc' },
          take: 5,
          select: {
            id: true,
            name: true,
            status: true
          }
        }),

        // 🔒 STRICT SECURITY FIX: Only explicitly fetch logs for THIS particular userId
        prisma.auditLog.findMany({
            where: { organizationId, userId: userId }, 
            take: 20,
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { firstName: true, lastName: true, role: true } } }
        })
      ]);

      const tasksByStatus = myTaskStatusCounts.reduce((acc, curr) => {
        acc[curr.status] = curr._count.id;
        return acc;
      }, { ...defaultTaskStats });

      const totalMonthlyMinutes = Number(myMonthlyTimeLogged._sum.duration ?? 0);
      const totalMonthlyHours = Math.round((totalMonthlyMinutes / 60) * 100) / 100;

      return res.status(200).json({
        success: true,
        data: {
          overview: {
            totalMonthlyHours,
            tasksByStatus,
          },
          activeProjects: myRecentProjects,
          upcomingTasks: myUpcomingTasks,
          recentLogs: logs 
        }
      });
    }
  } catch (error) {
    next(error);
  }
};
