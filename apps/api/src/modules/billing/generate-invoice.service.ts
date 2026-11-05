import { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';
import { GenerateInvoicesBody } from './generate-invoice.schema';
import { AppError } from '../../utils/errors';
import { calculateBillingAmount } from '../../utils/billing.utils';

export const generateInvoicesService = async (
  organizationId: string,
  userId: string,
  filters: GenerateInvoicesBody
) => {
  const whereClause: any = {
    organizationId,
    isBillable: true,
    billingStatus: 'READY',
  };

  if (filters.clientId) whereClause.clientId = filters.clientId;
  if (filters.payerId) whereClause.fundingSourceId = filters.payerId; 

  if (filters.fromDate || filters.toDate) {
    whereClause.date = {};
    if (filters.fromDate) whereClause.date.gte = new Date(filters.fromDate);
    if (filters.toDate) whereClause.date.lte = new Date(filters.toDate);
  }

  // Dry Run Execution
  if (filters.dryRun) {
    const timeEntries = await prisma.timeEntry.findMany({
      where: whereClause,
      include: { serviceCode: true, client: true },
    });

    const grouped = timeEntries.reduce((acc, entry) => {
      if (!entry.clientId) return acc;
      
      const groupKey = `${entry.clientId}_${entry.fundingSourceId || 'SELF'}`;
      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(entry);
      return acc;
    }, {} as Record<string, typeof timeEntries>);

    let estimatedAmount = new Prisma.Decimal(0);
    timeEntries.forEach((e) => {
      // 100% Strongly typed, no 'as any'
      estimatedAmount = estimatedAmount.add(calculateBillingAmount(e));
    });

    return {
      success: true,
      message: 'Dry run completed successfully. No data was modified.',
      isDryRun: true,
      summary: {
        totalSessions: timeEntries.length,
        totalInvoices: Object.keys(grouped).length,
        estimatedAmount: estimatedAmount.toNumber(), 
      },
    };
  }

  // Live Execution inside Transaction
  return await prisma.$transaction(async (tx) => {
    const timeEntries = await tx.timeEntry.findMany({
      where: whereClause,
      include: { serviceCode: true, client: true },
    });

    if (timeEntries.length === 0) {
      return {
        success: true,
        message: 'No eligible sessions found for billing.',
        summary: { totalSessions: 0, totalInvoices: 0, estimatedAmount: 0 },
      };
    }

    const entryIds = timeEntries.map((e) => e.id);

    // ATOMIC CLAIM
    const claimResult = await tx.timeEntry.updateMany({
      where: {
        id: { in: entryIds },
        billingStatus: 'READY',
        organizationId,
      },
      data: {
        billingStatus: 'PROCESSING',
      },
    });

    if (claimResult.count !== entryIds.length) {
      throw new AppError('Concurrency conflict: Some sessions are currently being processed. Please try again.', 409);
    }

    const groupedByClientAndFundingSource = timeEntries.reduce((acc, entry) => {
      if (!entry.clientId) return acc;

      const groupKey = `${entry.clientId}_${entry.fundingSourceId || 'SELF'}`;
      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(entry);
      return acc;
    }, {} as Record<string, typeof timeEntries>);

    const createdInvoices = [];
    let totalProcessedAmount = new Prisma.Decimal(0);

    for (const [, entries] of Object.entries(groupedByClientAndFundingSource)) {
      const clientId = entries[0].clientId!;
      const fundingSourceId = entries[0].fundingSourceId || null; 
      
      let invoiceTotal = new Prisma.Decimal(0);
      entries.forEach(e => {
        // 100% Strongly typed, no 'as any'
        invoiceTotal = invoiceTotal.add(calculateBillingAmount(e));
      });
      
      totalProcessedAmount = totalProcessedAmount.add(invoiceTotal);

      // ATOMIC INCREMENT FOR SEQUENCE
      const updatedSetting = await tx.setting.upsert({
        where: { organizationId },
        update: { lastInvoiceSeq: { increment: 1 } },
        create: {
          organizationId,
          lastInvoiceSeq: 1,
        },
      });

      const prefix = updatedSetting.invoicePrefix || 'INV-';
      const dueDaysOffset = updatedSetting.dueDays || 30;
      const invoiceNumber = `${prefix}${String(updatedSetting.lastInvoiceSeq).padStart(6, '0')}`;

      // Invoice Creation
      const invoice = await tx.invoice.create({
        data: {
          organizationId,
          clientId,
          fundingSourceId,
          invoiceNumber,
          issueDate: new Date(), 
          dueDate: new Date(Date.now() + dueDaysOffset * 24 * 60 * 60 * 1000), 
          status: 'DRAFT', 
          subtotal: invoiceTotal,
          totalAmount: invoiceTotal,
          balanceDue: invoiceTotal,
          items: {
            create: entries.map((e) => {
              // 100% Strongly typed, no 'as any'
              const lineTotal = calculateBillingAmount(e);
              return {
                organizationId,
                timeEntryId: e.id,
                description: `${e.serviceCode?.code || 'Therapy Session'} on ${e.date.toISOString().split('T')[0]}`,
                quantity: e.duration, 
                unitPrice: e.serviceCode?.defaultRate || 0,
                hours: e.duration, 
                hourlyRate: e.serviceCode?.defaultRate || 0,
                lineTotal,
                unit: 'HOURS', 
              };
            }),
          },
        },
      });

      // Status Billed
      await tx.timeEntry.updateMany({
        where: { id: { in: entries.map((e) => e.id) }, organizationId },
        data: {
          billingStatus: 'BILLED',
          invoiceId: invoice.id,
        },
      });

      createdInvoices.push(invoice);
    }

    const summary = {
      totalSessions: entryIds.length,
      totalInvoices: createdInvoices.length,
      estimatedAmount: totalProcessedAmount.toNumber(),
    };

    // Strongly-Typed Audit Log
    await tx.auditLog.create({
      data: {
        action: 'GENERATE_INVOICES_BATCH',
        entityType: 'INVOICE',
        entityId: 'BATCH',
        userId,
        organizationId,
        details: {
          message: `Successfully generated ${summary.totalInvoices} invoices for ${summary.totalSessions} sessions.`,
          summary,
        },
      },
    });

    // UX Notification
    await tx.notification.create({
      data: {
        title: 'Batch Invoice Generation',
        message: `Successfully generated ${summary.totalInvoices} invoices.`,
        type: 'SUCCESS',
        userId,
        organizationId,
      },
    });

    return {
      success: true,
      message: 'Invoices generated successfully.',
      isDryRun: false,
      summary,
      invoiceIds: createdInvoices.map((inv) => inv.id),
    };
  });
};
