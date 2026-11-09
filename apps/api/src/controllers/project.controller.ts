import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { ProjectStatus } from '@prisma/client';

const generateSlug = (name: string) => {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Math.random().toString(36).substring(2, 7);
};

const isValidUUID = (str: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export const createProject = async (
  req: Request<unknown, unknown, any>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let { 
      name, description, clientId, assignedUserId, status, startDate, endDate, hourlyRate,
      hcaiNumber, modality, approvalStatus, assignedToId, 
      approvedServices, notApprovedServices, notes, ratePerHour,
      patientName
    } = req.body;

    const organizationId = res.locals.user?.organizationId;
    if (!organizationId) {
      res.status(400).json({ success: false, message: 'Organization is required. Please create an organization first.' });
      return;
    }

    const finalAssignedUserId = assignedToId || assignedUserId;
    const finalHourlyRate = ratePerHour || hourlyRate;
    const finalDescription = notes || description;

    let actualClientName = patientName || name;
    if (!patientName && name && name.includes(' - ')) {
       actualClientName = name.split(' - ')[0].trim();
    }

    let finalClientId = clientId;

    // DO NOT AUTO-CREATE A CLIENT FOR HEALTHCARE CASES
    if (!finalClientId || (typeof finalClientId === 'string' && finalClientId.trim() === '')) {
       finalClientId = undefined;
    } else {
       const clientExists = await prisma.client.findFirst({
          where: { id: finalClientId, organizationId, isActive: true }
       });
       if (!clientExists) {
          res.status(404).json({ success: false, message: 'Selected Payor not found.' });
          return;
       }
    }

    const isHealthcareCase = name && (name.includes(' - HCAI') || name.includes(' - OT') || name.includes(' - PT') || name.includes('APPROVED'));
    
    let finalProjectName = name || actualClientName || 'New Case'; 

    if (isHealthcareCase && !finalProjectName.includes('HCAI') && hcaiNumber) {
       let generatedName = `${actualClientName}`;
       if (hcaiNumber) generatedName += ` - HCAI ${hcaiNumber}`;
       if (modality) generatedName += ` - ${modality}`;
       if (approvalStatus) generatedName += ` - ${approvalStatus}`;
       if (finalHourlyRate) generatedName += ` @ ${finalHourlyRate}/hour`;
       
       if (finalAssignedUserId) {
         const assignedUser = await prisma.user.findUnique({ where: { id: finalAssignedUserId } });
         if (assignedUser) generatedName += ` - Assigned ${assignedUser.firstName}`;
       }

       const noServicesStr = (notApprovedServices && notApprovedServices.length > 0) 
         ? notApprovedServices.map((s: string) => `(NO ${s})`).join(' ') 
         : '';
       if (noServicesStr) generatedName += ` - ${noServicesStr}`;

       const approvedServicesStr = (approvedServices && approvedServices.length > 0) 
         ? approvedServices.join(' OR ') 
         : '';
       if (approvedServicesStr) generatedName += ` - ${approvedServicesStr}`;

       if (finalDescription) generatedName += ` - (${finalDescription})`;

       generatedName += ` - #${Math.floor(1000 + Math.random() * 9000)}`;
       finalProjectName = generatedName.trim();
    }

    const slug = generateSlug(finalProjectName);

    const project = await prisma.$transaction(async (tx) => {
      const newProject = await tx.project.create({
        data: {
          name: finalProjectName,
          slug, 
          description: finalDescription,
          patientName: actualClientName,
          clientId: finalClientId, 
          status: status || 'ACTIVE',
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          hourlyRate: finalHourlyRate ? Number(finalHourlyRate) : null,
          organizationId,
          hcaiNumber: hcaiNumber || null,
          modality: modality || null,
          approvalStatus: approvalStatus || null,
          assignedToId: finalAssignedUserId || null,
          approvedServices: approvedServices || [],
          notApprovedServices: notApprovedServices || [],
        },
      });

      await tx.projectBudget.create({
        data: {
          projectId: newProject.id,
          organizationId,
          totalAllocatedHours: 0,
          memberBudgets: finalAssignedUserId ? {
            create: [
              {
                userId: finalAssignedUserId,
                allocatedHours: 0,
                consumedHours: 0,
                remainingHours: 0
              }
            ]
          } : undefined
        }
      });

      // 🟢 FIX: Removed the automatic Task Creation chunk entirely!
      // The case now starts blank, allowing you to use your manual pipeline.

      return newProject;
    });

    res.status(201).json({
      success: true,
      message: 'Case/Project created successfully',
      data: { project },
    });
  } catch (error: any) {
    console.error('CREATE_PROJECT_ERROR:', error);
    if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
      res.status(400).json({ 
        success: false, 
        message: 'A Case with this exact name already exists. Please modify the details slightly.' 
      });
      return;
    }
    next(error);
  }
};

export const getProjects = async (
  req: Request<unknown, unknown, unknown, { page?: string; limit?: string; search?: string; clientId?: string; status?: ProjectStatus }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { organizationId, id: userId, role } = res.locals.user;
    
    if (!organizationId) {
      res.status(200).json({ success: true, data: { projects: [], meta: { total: 0, page: 1, limit: 25000, totalPages: 0 } } });
      return;
    }

    const isAdminOrManager = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role);

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(25000, Math.max(1, Number(req.query.limit) || 25000));
    const search = req.query.search || '';

    const clientId = req.query.clientId;
    const status = req.query.status;

    const skip = (page - 1) * limit;

    const whereClause: any = {
      organizationId,
      isActive: true,
      ...(clientId && { clientId }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    if (!isAdminOrManager) {
      whereClause.AND = [
        {
          OR: [
            { assignedToId: userId }, 
            { tasks: { some: { assignedToId: userId } } },
            { projectBudget: { memberBudgets: { some: { userId: userId } } } }
          ]
        }
      ];
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: {
            select: { id: true, name: true, companyName: true }
          },
          projectBudget: true
        }
      }),
      prisma.project.count({ where: whereClause }),
    ]);

    res.status(200).json({
      success: true,
      data: { 
        projects,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
      },
    });
  } catch (error) {
    console.error('GET_PROJECTS_ERROR:', error);
    next(error);
  }
};

export const getProjectById = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (id === 'undefined' || !id) {
      res.status(404).json({ success: false, message: 'Invalid project ID.' });
      return;
    }

    const { organizationId, id: userId, role } = res.locals.user;
    if (!organizationId) {
      res.status(400).json({ success: false, message: 'Organization is required.' });
      return;
    }

    const isAdminOrManager = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role);

    const whereCondition: any = { 
      OR: isValidUUID(id) ? [{ id: id }, { slug: id }] : [{ slug: id }],
      organizationId, 
      isActive: true 
    };

    if (!isAdminOrManager) {
      whereCondition.AND = [
        {
          OR: [
            { assignedToId: userId }, 
            { tasks: { some: { assignedToId: userId } } },
            { projectBudget: { memberBudgets: { some: { userId: userId } } } }
          ]
        }
      ];
    }

    const project = await prisma.project.findFirst({
      where: whereCondition,
      include: {
        client: {
          select: { id: true, name: true, email: true, companyName: true }
        },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, role: true }
        },
        projectBudget: true
      }
    });

    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found or access denied.' });
      return;
    }

    res.status(200).json({ success: true, data: { project } });
  } catch (error) {
    console.error('GET_PROJECT_BY_ID_ERROR:', error);
    next(error);
  }
};

export const updateProject = async (
  req: Request<{ id: string }, unknown, any>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (id === 'undefined' || !id) {
      res.status(404).json({ success: false, message: 'Invalid project ID.' });
      return;
    }

    const organizationId = res.locals.user?.organizationId;
    if (!organizationId) {
      res.status(400).json({ success: false, message: 'Organization is required.' });
      return;
    }

    let { 
      name, description, clientId, status, startDate, endDate, budget, deadline, hourlyRate,
      hcaiNumber, modality, approvalStatus, approvedServices, notApprovedServices, assignedToId 
    } = req.body;

    if (!clientId || (typeof clientId === 'string' && clientId.trim() === '')) {
      clientId = undefined;
    }

    const existingProject = await prisma.project.findFirst({
      where: { 
        OR: isValidUUID(id) ? [{ id: id }, { slug: id }] : [{ slug: id }],
        organizationId, 
        isActive: true 
      },
    });

    if (!existingProject) {
      res.status(404).json({ success: false, message: 'Project not found.' });
      return;
    }

    if (clientId && clientId !== existingProject.clientId) {
      const client = await prisma.client.findFirst({
        where: { id: clientId, organizationId, isActive: true },
      });
      if (!client) {
        res.status(404).json({ success: false, message: 'Client not found in your organization.' });
        return;
      }
    }

    const parsedStartDate = startDate === undefined ? undefined : (startDate === null ? null : new Date(startDate));
    const parsedEndDate = deadline ? new Date(deadline) : (endDate === undefined ? undefined : (endDate === null ? null : new Date(endDate)));

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (clientId !== undefined) updateData.clientId = clientId;
    if (status !== undefined) updateData.status = status;
    if (parsedStartDate !== undefined) updateData.startDate = parsedStartDate;
    if (parsedEndDate !== undefined) updateData.endDate = parsedEndDate;
    if (budget !== undefined) updateData.budget = Number(budget);
    if (hourlyRate !== undefined) updateData.hourlyRate = hourlyRate === null || hourlyRate === '' ? null : Number(hourlyRate);

    if (hcaiNumber !== undefined) updateData.hcaiNumber = hcaiNumber;
    if (modality !== undefined) updateData.modality = modality;
    if (approvalStatus !== undefined) updateData.approvalStatus = approvalStatus;
    if (approvedServices !== undefined) updateData.approvedServices = approvedServices;
    if (notApprovedServices !== undefined) updateData.notApprovedServices = notApprovedServices;
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId;

    const updatedProject = await prisma.project.update({
      where: { id: existingProject.id }, 
      data: updateData,
    });

    res.status(200).json({ success: true, message: 'Project updated', data: { project: updatedProject } });
  } catch (error) {
    console.error('UPDATE_PROJECT_ERROR:', error);
    next(error);
  }
};

export const deleteProject = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (id === 'undefined' || !id) {
      res.status(404).json({ success: false, message: 'Invalid project ID.' });
      return;
    }

    const organizationId = res.locals.user?.organizationId;
    if (!organizationId) {
      res.status(400).json({ success: false, message: 'Organization is required.' });
      return;
    }

    const existingProject = await prisma.project.findFirst({
      where: { 
        OR: isValidUUID(id) ? [{ id: id }, { slug: id }] : [{ slug: id }],
        organizationId, 
        isActive: true 
      },
    });

    if (!existingProject) {
      res.status(404).json({ success: false, message: 'Project not found.' });
      return;
    }

    await prisma.project.update({
      where: { id: existingProject.id },
      data: { isActive: false },
    });

    res.status(200).json({ success: true, message: 'Project deleted', data: null });
  } catch (error) {
    console.error('DELETE_PROJECT_ERROR:', error);
    next(error);
  }
};

export const updateProjectStatus = async (
  req: Request<{ id: string }, unknown, { status: ProjectStatus }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (id === 'undefined' || !id) {
      res.status(404).json({ success: false, message: 'Invalid project ID.' });
      return;
    }

    const { status } = req.body;
    const organizationId = res.locals.user?.organizationId;
    if (!organizationId) {
      res.status(400).json({ success: false, message: 'Organization is required.' });
      return;
    }

    const existingProject = await prisma.project.findFirst({
      where: { 
        OR: isValidUUID(id) ? [{ id: id }, { slug: id }] : [{ slug: id }],
        organizationId, 
        isActive: true 
      },
    });

    if (!existingProject) {
      res.status(404).json({ success: false, message: 'Project not found.' });
      return;
    }

    const updatedProject = await prisma.project.update({
      where: { id: existingProject.id },
      data: { status },
    });

    res.status(200).json({ success: true, message: 'Status updated', data: { project: updatedProject } });
  } catch (error) {
    console.error('UPDATE_PROJECT_STATUS_ERROR:', error);
    next(error);
  }
};

export const toggleArchiveProject = async (
  req: Request<{ id: string }, unknown, { isArchived: boolean }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    
    const { isArchived } = req.body || {}; 

    if (id === 'undefined' || !id) {
      res.status(404).json({ success: false, message: 'Invalid project ID.' });
      return;
    }

    const organizationId = res.locals.user?.organizationId;
    if (!organizationId) {
      res.status(400).json({ success: false, message: 'Organization is required.' });
      return;
    }

    const existingProject = await prisma.project.findFirst({
      where: { 
        OR: isValidUUID(id) ? [{ id: id }, { slug: id }] : [{ slug: id }],
        organizationId, 
        isActive: true 
      },
    });

    if (!existingProject) {
      res.status(404).json({ success: false, message: 'Project not found.' });
      return;
    }

    const updatedProject = await prisma.project.update({
      where: { id: existingProject.id },
      data: { isArchived: Boolean(isArchived) },
    });

    res.status(200).json({ 
      success: true, 
      message: isArchived ? 'Project archived successfully' : 'Project restored successfully', 
      data: { project: updatedProject } 
    });
  } catch (error) {
    console.error('TOGGLE_ARCHIVE_PROJECT_ERROR:', error);
    next(error);
  }
};

export const requestExtraBudget = async (
  req: Request<{ id: string }, unknown, any>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: projectId } = req.params;
    
    const body = req.body || {};
    const rawHours = body.requestedHours ?? body.hoursRequested ?? body.hours ?? body.requested_hours ?? body.duration;
    const reason = (body.reason && String(body.reason).trim() !== '') ? String(body.reason).trim() : 'Extra hours needed';
    const taskId = body.taskId || body.task_id || null;
    
    const userPayload = res.locals.user || {};
    const organizationId = userPayload.organizationId;
    const userId = userPayload.id || userPayload.userId || userPayload.sub;

    if (!organizationId || !userId) {
      res.status(400).json({ success: false, message: 'Organization and User authentication is required.' });
      return;
    }

    const hours = Number(rawHours);

    if (isNaN(hours) || hours <= 0) {
      res.status(400).json({ success: false, message: 'Valid requested hours are required.' });
      return;
    }

    const budgetRequest = await prisma.budgetRequest.create({
      data: {
        projectId,
        taskId: taskId || null,
        userId,
        organizationId,
        requestedHours: hours,
        reason,
        status: 'PENDING'
      }
    });

    await prisma.auditLog.create({
      data: {
        action: 'BUDGET_REQUESTED',
        entityType: 'PROJECT',
        entityId: projectId,
        userId,
        organizationId,
        details: { 
          message: `Employee requested ${hours} extra hours`,
          reason: reason
        } as any
      }
    });

    res.status(201).json({ 
      success: true, 
      message: 'Budget request submitted successfully to managers.',
      data: { budgetRequest }
    });
  } catch (error) {
    console.error('REQUEST_EXTRA_BUDGET_ERROR:', error);
    next(error);
  }
};

export const updateProjectTaskRates = async (
  req: Request<{ id: string }, unknown, { rates: { taskId: string; customRate: number | null }[] }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { rates } = req.body;
    const organizationId = res.locals.user?.organizationId;
    
    if (!organizationId) {
      res.status(400).json({ success: false, message: 'Organization is required.' });
      return;
    }

    const project = await prisma.project.findFirst({
      where: { 
        OR: isValidUUID(id) ? [{ id: id }, { slug: id }] : [{ slug: id }],
        organizationId 
      }
    });

    if (!project) {
      res.status(404).json({ success: false, message: 'Project not found.' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      for (const rateObj of rates) {
        if (rateObj.customRate === null || rateObj.customRate === undefined) {
          await tx.projectTaskRate.deleteMany({
            where: { projectId: project.id, taskId: rateObj.taskId, organizationId }
          });
        } else {
          await tx.projectTaskRate.upsert({
            where: {
              projectId_taskId: {
                projectId: project.id,
                taskId: rateObj.taskId
              }
            },
            update: { customRate: rateObj.customRate },
            create: {
              projectId: project.id,
              taskId: rateObj.taskId,
              customRate: rateObj.customRate,
              organizationId
            }
          });
        }
      }
    });

    res.status(200).json({ success: true, message: 'Project task rates updated successfully' });
  } catch (error) {
    console.error('UPDATE_PROJECT_TASK_RATES_ERROR:', error);
    next(error);
  }
};

export const importProjects = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { organizationId, role, canManageImports } = res.locals.user || {};

    if (!organizationId) {
      res.status(400).json({ success: false, message: 'Organization is required.' });
      return;
    }

    const isAuthorized = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role) || canManageImports === true;
    if (!isAuthorized) {
      res.status(403).json({ success: false, message: 'Access Denied: You do not have permission to import data.' });
      return;
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { industryType: true }
    });

    const isHealthcare = org?.industryType === 'HEALTHCARE';
    const { data: rows } = req.body;

    const managementTeam = await prisma.user.findMany({
      where: { organizationId, role: { in: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] } }
    });

    let bcrypt: any;
    try {
      bcrypt = require('bcryptjs');
    } catch (e) {
      bcrypt = require('bcrypt'); 
    }

    let successCount = 0;
    let rowErrors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const rawProjectName = isHealthcare ? (row['Patient Name'] || row['Project Name']) : (row['Project Name'] || row['Patient Name']);
        if (!rawProjectName || String(rawProjectName).trim() === '') continue; 
        
        const mainEntityName = String(rawProjectName).trim();
        const clientName = String(row['Client (Case Owner)'] || row['Client'] || 'General Client').trim();
        const loggedByName = String(row['Logged By'] || row['Consultant/Therapist'] || clientName).trim();

        const hcaiNumber = isHealthcare && row['HCAI Number'] ? String(row['HCAI Number']).trim() : null;
        const projectDescription = row['Project Description'] ? String(row['Project Description']).trim() : null;
        const finalProjectName = projectDescription && projectDescription.length > 0 ? projectDescription : mainEntityName;

        const rawAllocated = row['Allocated Hours'] || row['Total Budget'] || '0';
        const allocatedHours = parseFloat(String(rawAllocated).replace(/[^0-9.]/g, '')) || 0;

        const rawProjectBudget = row['Project Budget'];
        const projectBudgetVal = rawProjectBudget ? parseFloat(String(rawProjectBudget).replace(/[^0-9.]/g, '')) : null;

        const rawRate = row['Billable Rate'] || '0';
        const billableRate = parseFloat(String(rawRate).replace(/[^0-9.]/g, '')) || 0;

        const rawIsBillable = row['Is Billable'];
        let isBillableVal = billableRate > 0; 
        if (rawIsBillable !== undefined && rawIsBillable !== null && String(rawIsBillable).trim() !== '') {
            const strVal = String(rawIsBillable).toLowerCase().trim();
            isBillableVal = ['yes', 'true', '1', 'y'].includes(strVal);
        }

        const [firstName, ...lastNameArr] = loggedByName.split(' ');
        const lastName = lastNameArr.join(' ');
        let workerUser = null;

        if (firstName && firstName !== 'Unknown') {
          workerUser = await prisma.user.findFirst({
            where: { organizationId, firstName, lastName }
          });

          if (!workerUser) {
            const randomString = Math.random().toString(36).substring(2, 7);
            const email = `${firstName.toLowerCase().replace(/[^a-z0-9]/g, '')}.${lastName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'worker'}.${randomString}@company.local`;
            const passwordHash = await bcrypt.hash(crypto.randomBytes(24).toString('base64url'), 10);
            
            workerUser = await prisma.user.create({
              data: {
                firstName,
                lastName,
                email,
                passwordHash,
                role: isHealthcare ? 'THERAPIST' : 'EMPLOYEE',
                requirePasswordChange: true,
                organizationId
              }
            });
          }
        }

        let client = await prisma.client.findFirst({ where: { organizationId, name: clientName } });
        if (!client) {
          client = await prisma.client.create({ data: { name: clientName, organizationId } });
        }

        let project = await prisma.project.findFirst({ 
          where: { 
            organizationId, 
            name: finalProjectName, 
            clientId: client.id,
            ...(hcaiNumber ? { hcaiNumber } : {}),
            description: projectDescription
          } 
        });

        let projectBudget;
        if (!project) {
          project = await prisma.project.create({
            data: {
              name: finalProjectName,
              slug: generateSlug(finalProjectName),
              description: projectDescription,
              clientId: client.id,
              modality: isHealthcare ? (row['Modality'] || null) : null,
              hcaiNumber: hcaiNumber, 
              approver: row['Approver'] || null,
              budget: projectBudgetVal,
              organizationId,
            }
          });

          const members = managementTeam.map(admin => ({ userId: admin.id }));
          if (workerUser) members.push({ userId: workerUser.id });
          const uniqueMembers = Array.from(new Map(members.map(m => [m.userId, m])).values());

          projectBudget = await prisma.projectBudget.create({
            data: {
              projectId: project.id,
              organizationId,
              totalAllocatedHours: allocatedHours, 
              memberBudgets: {
                create: uniqueMembers.map(m => ({ userId: m.userId }))
              }
            }
          });
        } else {
          if (projectBudgetVal !== null && project.budget === null) {
             project = await prisma.project.update({
               where: { id: project.id },
               data: { budget: projectBudgetVal }
             });
          }

          projectBudget = await prisma.projectBudget.findUnique({ where: { projectId: project.id } });
          if (!projectBudget) {
            projectBudget = await prisma.projectBudget.create({
              data: { 
                projectId: project.id, 
                organizationId,
                totalAllocatedHours: allocatedHours 
              }
            });
          } else if (allocatedHours > 0 && Number(projectBudget.totalAllocatedHours) === 0) {
            projectBudget = await prisma.projectBudget.update({
              where: { id: projectBudget.id },
              data: { totalAllocatedHours: allocatedHours }
            });
          }
        }

        const taskName = row['Task Name'] || 'General Task';
        let task = await prisma.task.findFirst({ where: { organizationId, projectId: project.id, name: taskName } });
        if (!task) {
          task = await prisma.task.create({
            data: {
              name: taskName,
              projectId: project.id,
              organizationId,
              assignedToId: workerUser?.id || null,
              isBillable: isBillableVal 
            }
          });
        } else {
           if (task.isBillable !== isBillableVal) {
             task = await prisma.task.update({
               where: { id: task.id },
               data: { isBillable: isBillableVal }
             });
           }
        }

        if (billableRate > 0) {
          await prisma.projectTaskRate.upsert({
            where: { projectId_taskId: { projectId: project.id, taskId: task.id } },
            update: { customRate: billableRate },
            create: { projectId: project.id, taskId: task.id, customRate: billableRate, organizationId }
          });
        }

        const rawHours = row['Hours'] || '0';
        const hours = parseFloat(String(rawHours).replace(/[^0-9.]/g, '')) || 0;

        if (hours > 0) {
          let entryDate = new Date();
          if (row['Date']) {
             const parts = String(row['Date']).split(/[-/]/);
             if (parts.length === 3 && parts[0].length === 2 && parts[2].length === 4) {
                 entryDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`); 
             } else {
                 entryDate = new Date(row['Date']);
             }
          }

          const targetUserId = workerUser?.id || managementTeam[0]?.id;

          await prisma.timeEntry.create({
            data: {
              date: isNaN(entryDate.getTime()) ? new Date() : entryDate,
              duration: hours,
              description: row['Notes'] || 'Imported Entry',
              isBillable: isBillableVal, 
              hourlyRate: billableRate > 0 ? billableRate : null,
              billableAmount: billableRate > 0 ? hours * billableRate : 0,
              approvalStatus: 'APPROVED', 
              projectId: project.id,
              taskId: task.id,
              clientId: client.id,
              userId: targetUserId,
              organizationId
            }
          });

          await prisma.projectTaskBudget.upsert({
            where: { projectBudgetId_taskId: { projectBudgetId: projectBudget.id, taskId: task.id } },
            update: { consumedHours: { increment: hours } },
            create: { projectBudgetId: projectBudget.id, taskId: task.id, consumedHours: hours, allocatedHours: 0, remainingHours: 0 }
          });

          await prisma.projectMemberBudget.upsert({
            where: { projectBudgetId_userId: { projectBudgetId: projectBudget.id, userId: targetUserId } },
            update: { consumedHours: { increment: hours } },
            create: { projectBudgetId: projectBudget.id, userId: targetUserId, consumedHours: hours, allocatedHours: 0, remainingHours: 0 }
          });

          await prisma.projectBudget.update({
            where: { id: projectBudget.id },
            data: { consumedHours: { increment: hours } }
          });
        }
        
        successCount++;
      } catch (rowError: any) {
        console.error(`Error on row ${i + 1}:`, rowError);
        rowErrors.push(`Row ${i + 1}: ${rowError.message}`);
      }
    }

    if (rowErrors.length > 0) {
      res.status(400).json({ 
        success: false, 
        message: `Import failed with ${rowErrors.length} errors. First error: ${rowErrors[0]}`, 
        errors: rowErrors 
      });
    } else {
      res.status(200).json({ 
        success: true, 
        message: `Smart Import completed successfully. Imported ${successCount} records.` 
      });
    }

  } catch (error: any) {
    console.error('IMPORT_PROJECTS_CRITICAL_ERROR:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};

export const getAllBudgetRequests = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status } = req.query;
    const organizationId = res.locals.user?.organizationId;

    if (!organizationId) {
      res.status(400).json({ success: false, message: 'Organization required.' });
      return;
    }

    const budgetRequests = await prisma.budgetRequest.findMany({
      where: {
        organizationId,
        ...(status ? { status: String(status) } : {})
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
        project: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const taskIds = budgetRequests.map(br => br.taskId).filter(Boolean) as string[];
    const tasksMap = new Map();

    if (taskIds.length > 0) {
      const tasks = await prisma.task.findMany({
        where: { id: { in: taskIds } },
        select: { id: true, name: true }
      });
      tasks.forEach(t => tasksMap.set(t.id, t));
    }

    const mappedRequests = budgetRequests.map(br => ({
      ...br,
      task: br.taskId && tasksMap.has(br.taskId) ? tasksMap.get(br.taskId) : null
    }));

    res.status(200).json({ success: true, data: { budgetRequests: mappedRequests } });
  } catch (error: any) {
    console.error('GET_BUDGET_REQUESTS_ERROR:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch budget requests', 
      error: error.message 
    });
  }
};

export const approveBudgetRequest = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const organizationId = res.locals.user?.organizationId;

    const budgetRequest = await prisma.budgetRequest.findUnique({
      where: { id }
    });

    if (!budgetRequest || budgetRequest.organizationId !== organizationId) {
      res.status(404).json({ success: false, message: 'Budget request not found.' });
      return;
    }

    if (budgetRequest.status !== 'PENDING') {
      res.status(400).json({ success: false, message: 'Only pending requests can be approved.' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.budgetRequest.update({
        where: { id },
        data: { status: 'APPROVED' }
      });

      const projectBudget = await tx.projectBudget.findFirst({
        where: { projectId: budgetRequest.projectId }
      });

      if (projectBudget) {
        await tx.projectBudget.update({
          where: { id: projectBudget.id },
          data: { totalAllocatedHours: { increment: budgetRequest.requestedHours } }
        });

        if (budgetRequest.taskId) {
          const existingTaskBudget = await tx.projectTaskBudget.findFirst({
            where: { projectBudgetId: projectBudget.id, taskId: budgetRequest.taskId }
          });

          if (existingTaskBudget) {
            await tx.projectTaskBudget.update({
              where: { id: existingTaskBudget.id },
              data: { 
                allocatedHours: { increment: budgetRequest.requestedHours },
                remainingHours: { increment: budgetRequest.requestedHours }
              }
            });
          } else {
            await tx.projectTaskBudget.create({
              data: {
                projectBudgetId: projectBudget.id,
                taskId: budgetRequest.taskId,
                allocatedHours: budgetRequest.requestedHours,
                remainingHours: budgetRequest.requestedHours,
                consumedHours: 0
              }
            });
          }
        }

        const existingMemberBudget = await tx.projectMemberBudget.findFirst({
          where: { projectBudgetId: projectBudget.id, userId: budgetRequest.userId }
        });

        if (existingMemberBudget) {
          await tx.projectMemberBudget.update({
            where: { id: existingMemberBudget.id },
            data: { 
              allocatedHours: { increment: budgetRequest.requestedHours },
              remainingHours: { increment: budgetRequest.requestedHours }
            }
          });
        } else {
          await tx.projectMemberBudget.create({
            data: {
              projectBudgetId: projectBudget.id,
              userId: budgetRequest.userId,
              allocatedHours: budgetRequest.requestedHours,
              remainingHours: budgetRequest.requestedHours,
              consumedHours: 0
            }
          });
        }
      }
    });

    res.status(200).json({ success: true, message: 'Budget request approved successfully.' });
  } catch (error) {
    console.error('APPROVE_BUDGET_ERROR:', error);
    next(error);
  }
};

export const rejectBudgetRequest = async (
  req: Request<{ id: string }, unknown, { rejectionReason: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    
    await prisma.budgetRequest.update({
      where: { id },
      data: { 
        status: 'REJECTED', 
        rejectionReason: rejectionReason || 'No reason provided' 
      }
    });

    res.status(200).json({ success: true, message: 'Budget request rejected.' });
  } catch (error) {
    console.error('REJECT_BUDGET_ERROR:', error);
    next(error);
  }
};

export const duplicateProject = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const organizationId = res.locals.user?.organizationId;

    if (!organizationId) {
      res.status(400).json({ success: false, message: 'Organization is required.' });
      return;
    }

    const existingProject = await prisma.project.findFirst({
      where: { 
        OR: isValidUUID(id) ? [{ id: id }, { slug: id }] : [{ slug: id }],
        organizationId 
      },
      include: { 
        tasks: true, 
        projectBudget: { 
          include: { memberBudgets: true } 
        } 
      }
    });

    if (!existingProject) {
      res.status(404).json({ success: false, message: 'Project not found.' });
      return;
    }

    const newProjectName = `${existingProject.name} (Copy)`;
    const newSlug = generateSlug(newProjectName);

    const newProject = await prisma.$transaction(async (tx) => {
      const createdProject = await tx.project.create({
        data: {
          name: newProjectName,
          slug: newSlug,
          description: existingProject.description,
          clientId: existingProject.clientId,
          modality: existingProject.modality,
          hcaiNumber: existingProject.hcaiNumber,
          approver: existingProject.approver,
          status: 'PLANNING',
          startDate: existingProject.startDate,
          endDate: existingProject.endDate,
          hourlyRate: existingProject.hourlyRate,
          organizationId,
        }
      });

      if (existingProject.projectBudget) {
        await tx.projectBudget.create({
          data: {
            projectId: createdProject.id,
            organizationId,
            totalAllocatedHours: existingProject.projectBudget.totalAllocatedHours,
            consumedHours: 0,
            memberBudgets: {
              create: existingProject.projectBudget.memberBudgets.map(mb => ({
                userId: mb.userId,
                allocatedHours: mb.allocatedHours,
                remainingHours: mb.allocatedHours, 
                consumedHours: 0
              }))
            }
          }
        });
      }

      if (existingProject.tasks && existingProject.tasks.length > 0) {
        await tx.task.createMany({
          data: existingProject.tasks.map(task => ({
            name: task.name,
            projectId: createdProject.id,
            organizationId,
            assignedToId: task.assignedToId
          }))
        });
      }

      return createdProject;
    });

    res.status(201).json({ success: true, message: 'Project duplicated successfully', data: { project: newProject } });
  } catch (error) {
    console.error('DUPLICATE_PROJECT_ERROR:', error);
    next(error);
  }
};
