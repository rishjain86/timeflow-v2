import { Response, NextFunction, Request } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import {
  createTeamSchema,
  updateTeamSchema,
  getTeamsQuerySchema,
  teamIdParamSchema,
  addTeamMemberSchema,
  removeTeamMemberSchema,
} from '../schemas/team.schema';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    organizationId: string;
    role: string;
  };
}

export const createTeam = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = createTeamSchema.parse({ body: req.body });
    const { name, description, managerId } = validatedData.body;
    const { organizationId } = req.user;

    // Validate manager if provided
    if (managerId) {
      const manager = await prisma.user.findFirst({
        where: { id: managerId, organizationId },
      });
      if (!manager) {
        res.status(400).json({ success: false, message: 'Invalid manager ID or user does not belong to your organization' });
        return;
      }
    }

    const team = await prisma.team.create({
      data: {
        name,
        description,
        managerId,
        organizationId,
      },
    });

    res.status(201).json({ success: true, message: 'Team created successfully', data: team });
  } catch (error) {
    next(error);
  }
};

export const getTeams = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedQuery = getTeamsQuerySchema.parse({ query: req.query });
    const { page, limit, search } = validatedQuery.query;
    const { organizationId } = req.user;

    const where: Prisma.TeamWhereInput = {
      organizationId,
      ...(search && {
        name: { contains: search, mode: 'insensitive' },
      }),
    };

    const skip = (page - 1) * limit;

    const [teams, totalCount] = await Promise.all([
      prisma.team.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          manager: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { members: true } },
        },
      }),
      prisma.team.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: teams,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getTeamById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = teamIdParamSchema.parse({ params: req.params });
    const { id } = validatedData.params;
    const { organizationId } = req.user;

    const team = await prisma.team.findFirst({
      where: { id, organizationId },
      include: {
        manager: { select: { id: true, firstName: true, lastName: true, email: true } },
        members: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
          },
        },
      },
    });

    if (!team) {
      res.status(404).json({ success: false, message: 'Team not found' });
      return;
    }

    res.status(200).json({ success: true, data: team });
  } catch (error) {
    next(error);
  }
};

export const updateTeam = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = updateTeamSchema.parse({ params: req.params, body: req.body });
    const { id } = validatedData.params;
    const { managerId } = validatedData.body;
    const { organizationId } = req.user;

    const existingTeam = await prisma.team.findFirst({
      where: { id, organizationId },
    });

    if (!existingTeam) {
      res.status(404).json({ success: false, message: 'Team not found' });
      return;
    }

    // Validate manager if it's being updated
    if (managerId && managerId !== existingTeam.managerId) {
      const manager = await prisma.user.findFirst({
        where: { id: managerId, organizationId },
      });
      if (!manager) {
        res.status(400).json({ success: false, message: 'Invalid manager ID or user does not belong to your organization' });
        return;
      }
    }

    const updatedTeam = await prisma.team.update({
      where: { id },
      data: validatedData.body,
    });

    res.status(200).json({ success: true, message: 'Team updated successfully', data: updatedTeam });
  } catch (error) {
    next(error);
  }
};

export const deleteTeam = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = teamIdParamSchema.parse({ params: req.params });
    const { id } = validatedData.params;
    const { organizationId } = req.user;

    const existingTeam = await prisma.team.findFirst({
      where: { id, organizationId },
    });

    if (!existingTeam) {
      res.status(404).json({ success: false, message: 'Team not found' });
      return;
    }

    await prisma.team.delete({
      where: { id },
    });

    res.status(200).json({ success: true, message: 'Team deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const addTeamMember = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = addTeamMemberSchema.parse({ params: req.params, body: req.body });
    const { id: teamId } = validatedData.params;
    const { userId } = validatedData.body;
    const { organizationId } = req.user;

    // 1. Verify team belongs to org
    const team = await prisma.team.findFirst({
      where: { id: teamId, organizationId },
    });
    if (!team) {
      res.status(404).json({ success: false, message: 'Team not found' });
      return;
    }

    // 2. Verify user belongs to org
    const user = await prisma.user.findFirst({
      where: { id: userId, organizationId },
    });
    if (!user) {
      res.status(400).json({ success: false, message: 'User not found or does not belong to your organization' });
      return;
    }

    // 3. Check if user is already in the team
    const existingMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId, userId },
      },
    });
    if (existingMember) {
      res.status(400).json({ success: false, message: 'User is already a member of this team' });
      return;
    }

    // 4. Add member
    const teamMember = await prisma.teamMember.create({
      data: { teamId, userId },
    });

    res.status(201).json({ success: true, message: 'Member added to team successfully', data: teamMember });
  } catch (error) {
    next(error);
  }
};

export const removeTeamMember = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = removeTeamMemberSchema.parse({ params: req.params });
    const { id: teamId, userId } = validatedData.params;
    const { organizationId } = req.user;

    // Verify team belongs to org to prevent cross-tenant deletion
    const team = await prisma.team.findFirst({
      where: { id: teamId, organizationId },
    });
    if (!team) {
      res.status(404).json({ success: false, message: 'Team not found' });
      return;
    }

    const existingMember = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });

    if (!existingMember) {
      res.status(404).json({ success: false, message: 'User is not a member of this team' });
      return;
    }

    await prisma.teamMember.delete({
      where: { teamId_userId: { teamId, userId } },
    });

    res.status(200).json({ success: true, message: 'Member removed from team successfully' });
  } catch (error) {
    next(error);
  }
};
