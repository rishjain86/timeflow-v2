export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Helper function to decode JWT without needing external libraries
function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    // 1. Request se JWT Token nikalna
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Unauthorized: No token provided' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const user = parseJwt(token);

    if (!user || !user.organizationId) {
      return NextResponse.json({ message: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    // 2. User ki details nikalna
    const organizationId = user.organizationId;
    const userId = user.id || user.userId || user.sub;
    const role = user.role;

    const isAdminOrManager = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role);

    // 3. 🔒 STRICT SECURITY FILTER
    if (isAdminOrManager) {
      // Admin/Manager ko sab dikhega
      const [totalClients, activeProjects, invoicesResult, recentTasks] = await Promise.all([
        prisma.client.count({ where: { organizationId } }),
        prisma.project.count({ where: { organizationId, status: 'ACTIVE' } }),
        prisma.invoice.aggregate({
          where: { organizationId, status: 'PAID' },
          _sum: { totalAmount: true }
        }),
        prisma.task.findMany({
          where: { organizationId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { project: { select: { name: true } } }
        })
      ]);

      return NextResponse.json({
        totalClients,
        activeProjects,
        totalRevenue: invoicesResult._sum.totalAmount || 0,
        recentTasks
      });

    } else {
      // 🟢 Employee ko SIRF aur SIRF apna data dikhega
      const [activeProjects, recentTasks] = await Promise.all([
        prisma.project.count({ 
          where: { 
            organizationId, 
            status: 'ACTIVE',
            tasks: { some: { assignedToId: userId } } // Sirf apne assigned projects
          } 
        }),
        prisma.task.findMany({
          where: { organizationId, assignedToId: userId }, // Sirf apne tasks
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { project: { select: { name: true } } }
        })
      ]);

      return NextResponse.json({
        totalClients: 0,
        activeProjects,
        totalRevenue: 0, // Employees ko revenue/billable nahi dikhna chahiye
        recentTasks
      });
    }

  } catch (error) {
    console.error('[DASHBOARD_GET]', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
