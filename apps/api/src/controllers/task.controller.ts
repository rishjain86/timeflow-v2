import { Request, Response, NextFunction } from 'express';
import { Prisma, TaskStatus, Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { NotFoundError, UnauthorizedError, BadRequestError } from '../utils/errors';
import { CreateTaskInput } from '../schemas/task.schema';

const hasManagerAccess = (role: string | Role) => ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(String(role));

export const createTask = async (
  req: Request<unknown, unknown, any>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, description, projectId, assignedToId, status, dueDate, isBillable, requiresClinicalCompliance, hourlyRate } = req.body;
    const organizationId = res.locals.user.organizationId;

    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId, isActive: true }
    });

    if (!project) throw new NotFoundError('Project not found in your organization');

    const existingTask = await prisma.task.findFirst({
      where: { 
        projectId, 
        name: { equals: name, mode: 'insensitive' } 
      }
    });

    if (existingTask) {
      if (!existingTask.isActive) {
        const restoredTask = await prisma.task.update({
          where: { id: existingTask.id },
          data: {
            isActive: true,
            description: description || existingTask.description,
            assignedToId: assignedToId !== undefined ? assignedToId : existingTask.assignedToId,
            status: status || TaskStatus.TODO,
            dueDate: dueDate ? new Date(dueDate) : existingTask.dueDate,
            isBillable: isBillable !== undefined ? Boolean(isBillable) : existingTask.isBillable,
            requiresClinicalCompliance: requiresClinicalCompliance !== undefined ? Boolean(requiresClinicalCompliance) : existingTask.requiresClinicalCompliance,
            hourlyRate: hourlyRate ? Number(hourlyRate) : existingTask.hourlyRate,
          },
        });

        return res.status(201).json({ success: true, message: 'Previously deleted task restored successfully', data: { task: restoredTask } });
      } else {
        throw new BadRequestError(`A task named "${name}" already exists in this project.`);
      }
    }

    if (assignedToId) {
      const user = await prisma.user.findFirst({
        where: { id: assignedToId, organizationId, isActive: true },
      });
      if (!user) throw new NotFoundError('Assigned user not found in your organization');
    }

    const task = await prisma.task.create({
      data: {
        name,
        description,
        projectId,
        assignedToId,
        status,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        organizationId,
        isBillable: isBillable !== undefined ? Boolean(isBillable) : true,
        requiresClinicalCompliance: requiresClinicalCompliance !== undefined ? Boolean(requiresClinicalCompliance) : false,
        hourlyRate: hourlyRate ? Number(hourlyRate) : null,
      },
    });

    res.status(201).json({ success: true, message: 'Task created successfully', data: { task } });
  } catch (error) {
    next(error);
  }
};

export const getTasks = async (
  req: Request<unknown, unknown, unknown, { page?: string; limit?: string; search?: string; projectId?: string; assignedToId?: string; status?: TaskStatus }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { organizationId, id: currentUserId, role } = res.locals.user;
    
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const search = req.query.search || '';
    const projectId = req.query.projectId;
    const status = req.query.status;
    
    const skip = (page - 1) * limit;

    const whereClause: Prisma.TaskWhereInput = {
      organizationId,
      isActive: true,
      ...(projectId && { projectId }),
      ...(status && { status }),
    };

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    if (!hasManagerAccess(role)) {
      whereClause.AND = [
        {
          OR: [
            { assignedToId: currentUserId }, 
            { assignments: { some: { userId: currentUserId } } } 
          ]
        }
      ];
    } else if (req.query.assignedToId) {
      whereClause.AND = [
        {
          OR: [
            { assignedToId: req.query.assignedToId },
            { assignments: { some: { userId: req.query.assignedToId } } }
          ]
        }
      ];
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          project: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
          assignments: {
             include: {
                user: { select: { id: true, firstName: true, lastName: true } }
             }
          }
        }
      }),
      prisma.task.count({ where: whereClause }),
    ]);

    res.status(200).json({ success: true, data: { tasks, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } } });
  } catch (error) {
    next(error);
  }
};

export const getTaskById = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { organizationId, id: currentUserId, role } = res.locals.user;

    const task = await prisma.task.findFirst({
      where: { id, organizationId, isActive: true },
      include: {
        project: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignments: {
             include: {
                user: { select: { id: true, firstName: true, lastName: true } }
             }
          }
      }
    });

    if (!task) throw new NotFoundError('Task not found');
    
    if (!hasManagerAccess(role)) {
      const isLegacyAssigned = task.assignedToId === currentUserId;
      const isGranularAssigned = task.assignments.some(a => a.userId === currentUserId || a.user?.id === currentUserId);
      if (!isLegacyAssigned && !isGranularAssigned) {
        throw new UnauthorizedError('You are not authorized to view or log time for this task');
      }
    }

    res.status(200).json({ success: true, data: { task } });
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (req: Request<{ id: string }, unknown, any>, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { organizationId, id: currentUserId, role } = res.locals.user;
    
    const { name, description, projectId, assignedToId, status, dueDate, isBillable, requiresClinicalCompliance, hourlyRate, assignedUsers } = req.body;

    const existingTask = await prisma.task.findFirst({ where: { id, organizationId, isActive: true } });
    if (!existingTask) throw new NotFoundError('Task not found');
    if (!hasManagerAccess(role) && existingTask.assignedToId !== currentUserId) throw new UnauthorizedError('You are not authorized to update this task');

    const parsedDueDate = dueDate === undefined ? undefined : (dueDate === null ? null : new Date(dueDate));

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        name,
        description,
        projectId,
        assignedToId: assignedToId === undefined ? undefined : (assignedToId === null ? null : assignedToId),
        status,
        dueDate: parsedDueDate,
        isBillable: isBillable !== undefined ? Boolean(isBillable) : undefined,
        requiresClinicalCompliance: requiresClinicalCompliance !== undefined ? Boolean(requiresClinicalCompliance) : undefined,
        hourlyRate: hourlyRate !== undefined ? (hourlyRate === null || hourlyRate === '' ? null : Number(hourlyRate)) : undefined,
      },
    });

    if (assignedUsers && Array.isArray(assignedUsers)) {
       try {
          await (prisma as any).taskAssignment.deleteMany({ 
             where: { taskId: id, organizationId } 
          });
          
          if (assignedUsers.length > 0) {
             await (prisma as any).taskAssignment.createMany({
                data: assignedUsers.map((userId: string) => ({ 
                   taskId: id, 
                   userId, 
                   organizationId 
                }))
             });
          }
       } catch (error) {
          console.error("Granular assignment sync failed", error);
       }
    }

    res.status(200).json({ success: true, message: 'Task updated successfully', data: { task: updatedTask } });
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { organizationId, role } = res.locals.user;

    if (!hasManagerAccess(role)) throw new UnauthorizedError('Only administrators and managers can delete tasks');

    const existingTask = await prisma.task.findFirst({ where: { id, organizationId, isActive: true } });
    if (!existingTask) throw new NotFoundError('Task not found');

    await prisma.task.update({ where: { id }, data: { isActive: false } });
    res.status(200).json({ success: true, message: 'Task deleted successfully', data: null });
  } catch (error) {
    next(error);
  }
};

export const getOrganizationTaskNames = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = res.locals.user;
    const tasks = await prisma.task.findMany({
      where: { organizationId, isActive: true },
      select: { name: true },
      distinct: ['name'],
      orderBy: { name: 'asc' }
    });
    res.status(200).json({ success: true, data: tasks.map(t => t.name) });
  } catch (error) {
    next(error);
  }
};

export const assignTasksToProject = async (
  req: Request<unknown, unknown, any>, 
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId, taskNames, tasksConfig } = req.body;
    const { organizationId } = res.locals.user;

    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId, isActive: true }
    });

    if (!project) throw new NotFoundError('Project not found in your organization');

    for (const name of taskNames) {
      const config = tasksConfig?.find((t: any) => t.name === name);
      const isClinical = config?.requiresClinicalCompliance === true;

      await prisma.task.upsert({
        where: {
          projectId_name: {
            projectId,
            name,
          },
        },
        update: {
          requiresClinicalCompliance: isClinical,
          isActive: true,
        },
        create: {
          projectId,
          organizationId,
          name,
          requiresClinicalCompliance: isClinical,
          status: TaskStatus.TODO
        },
      });
    }

    res.status(201).json({ success: true, message: 'Tasks assigned to project successfully' });
  } catch (error) {
    next(error);
  }
};

export const deleteOrganizationTaskByName = async (req: Request<{name: string}>, res: Response, next: NextFunction) => {
  try {
    const { name } = req.params;
    const { organizationId, role } = res.locals.user;

    if (!hasManagerAccess(role)) {
      throw new UnauthorizedError('Only administrators and managers can delete common tasks');
    }

    const tasksToDelete = await prisma.task.findMany({
      where: { 
        organizationId, 
        name: { equals: name, mode: 'insensitive' } 
      },
      select: { id: true }
    });

    if (tasksToDelete.length > 0) {
      await prisma.task.deleteMany({
        where: { id: { in: tasksToDelete.map(t => t.id) } }
      });
    }

    res.status(200).json({ success: true, message: 'Common task removed completely!', data: null });
  } catch (error) {
    next(error);
  }
};
