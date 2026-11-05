import { Prisma, AppointmentStatus } from '@prisma/client';
import prisma from '../../lib/prisma';

// Define the exact shape returned by the Prisma query for strong compile-time safety
type RecentTimeEntry = Prisma.TimeEntryGetPayload<{
  include: {
    user: { select: { firstName: true; lastName: true } };
    serviceCode: { select: { code: true } };
    appointment: {
      select: { client: { select: { name: true } } };
    };
  };
}>;

export interface DashboardMetrics {
  totalClients: number;
  activeBudgets: number;
  totalExpensesThisMonth: number;
  upcomingAppointments: number; // SPRINT 3 Addition
  recentTimeEntries: RecentTimeEntry[];
}

export const getOrganizationDashboardMetrics = async (
  organizationId: string
): Promise<DashboardMetrics> => {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalClients,
    activeBudgets,
    expensesAggregation,
    upcomingAppointments,
    recentTimeEntries,
  ] = await Promise.all([
    // 1. Total Active Clients
    prisma.client.count({
      where: { organizationId, isActive: true },
    }),
    
    // 2. Active Budgets (Sprint 3: tied to Authorizations)
    prisma.budget.count({
      where: {
        organizationId,
        fundingSource: {
          authorization: {
            endDate: { gte: now },
            status: 'ACTIVE',
          },
        },
      },
    }),
    
    // 3. Expenses this month
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: {
        organizationId,
        expenseDate: { gte: firstDayOfMonth }, // Fixed: field is expenseDate
      },
    }),
    
    // 4. Sprint 3: Scheduled Upcoming Appointments
    prisma.appointment.count({
      where: {
        organizationId,
        startTime: { gte: now },
        status: AppointmentStatus.SCHEDULED,
      },
    }),
    
    // 5. Recent Time Entries with Sprint 3 clinical connections
    prisma.timeEntry.findMany({
      where: { organizationId },
      orderBy: { date: 'desc' },
      take: 5,
      include: {
        user: { select: { firstName: true, lastName: true } },
        serviceCode: { select: { code: true } },
        appointment: {
          select: { client: { select: { name: true } } }, // Fixed: Fetch client via appointment
        },
      },
    }),
  ]);

  return {
    totalClients,
    activeBudgets,
    totalExpensesThisMonth: expensesAggregation._sum.amount?.toNumber() || 0,
    upcomingAppointments,
    recentTimeEntries,
  };
};

export const generateFinancialReport = async (
  organizationId: string,
  startDate: string,
  endDate: string
) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const [expenses, invoices] = await Promise.all([
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: { organizationId, expenseDate: { gte: start, lte: end } }, // Fixed: expenseDate
    }),
    prisma.invoice.aggregate({
      _sum: { totalAmount: true },
      where: { organizationId, issueDate: { gte: start, lte: end } },
    }),
  ]);

  return {
    period: { start, end },
    totalExpenses: expenses._sum.amount?.toNumber() || 0,
    totalInvoiced: invoices._sum.totalAmount?.toNumber() || 0,
  };
};
