import { InvoiceStatus, UnitType } from '@prisma/client';
import prisma from '../../lib/prisma';

interface AutomationResult {
  invoiceId?: string;
  totalBilledAmount: number;
  billedEntriesCount: number;
  heldEntriesCount: number;
  holdReasons: any[];
}

/**
 * Core Automation Engine for Smart Invoicing
 * Filters Time Entries based on strict Dual-Signature and CNR compliance.
 */
export const generateAutomatedInvoice = async (
  organizationId: string,
  clientId: string,
  fundingSourceId: string
): Promise<AutomationResult> => {
  
  // 1. Fetch all UNBILLED time entries for this client via Appointment relation
  const pendingTimeEntries = await prisma.timeEntry.findMany({
    where: {
      organizationId,
      fundingSourceId,
      isBillable: true,
      // FILTER FIX: Accessing clientId through the Appointment relation
      appointment: {
        clientId: clientId,
      },
    },
    include: {
      serviceCode: true,
      appointment: {
        include: {
          attendance: true,
          clinicalNote: true, 
        },
      },
    },
  });

  const validEntries = [];
  const heldEntries = [];

  // 2. SMART FILTERING: Check Compliance (Signatures & CNR)
  for (const entry of pendingTimeEntries) {
    const attendance = entry.appointment?.attendance;
    const cnr = entry.appointment?.clinicalNote;

    let holdReason = null;

    if (!attendance) {
      holdReason = 'Attendance sheet missing.';
    } else if (!attendance.therapistSigned || !attendance.clientSigned) {
      holdReason = 'Attendance missing dual signatures (Therapist or Client).';
    } else if (!cnr) {
      holdReason = 'CNR (Clinical Notes) missing.';
    } else if (!cnr.therapistSigned || !cnr.clientSigned) {
      holdReason = 'CNR missing dual signatures (Therapist or Client).';
    } else if (!cnr.isApproved) {
      holdReason = 'CNR is uploaded but not yet Manager-Approved.';
    }

    if (holdReason) {
      heldEntries.push({ timeEntryId: entry.id, date: entry.date, reason: holdReason });
    } else {
      validEntries.push(entry);
    }
  }

  // 3. Early Exit if no valid entries to bill
  if (validEntries.length === 0) {
    return {
      totalBilledAmount: 0,
      billedEntriesCount: 0,
      heldEntriesCount: heldEntries.length,
      holdReasons: heldEntries,
    };
  }

  // 4. Calculate Totals & Prepare Invoice Items
  let totalAmount = 0;
  const invoiceItemsData = validEntries.map((entry) => {
    const hours = entry.duration.toNumber();
    const rate = entry.serviceCode ? entry.serviceCode.defaultRate.toNumber() : 50; // Fallback rate
    const lineTotal = hours * rate;
    
    totalAmount += lineTotal;

    return {
      description: `Therapy Session - ${entry.serviceCode?.code || 'Standard'} on ${entry.date.toISOString().split('T')[0]}`,
      hours: hours,
      hourlyRate: rate,
      lineTotal: lineTotal,
      unitPrice: rate,
      quantity: hours,
      unit: UnitType.HOURS,
      organizationId,
    };
  });

  // 5. Generate Invoice and Lock the Time Entries (Transaction to ensure data safety)
  const result = await prisma.$transaction(async (tx) => {
    // Create Invoice
    const newInvoice = await tx.invoice.create({
      data: {
        invoiceNumber: `INV-${Date.now()}`,
        issueDate: new Date(),
        dueDate: new Date(new Date().setDate(new Date().getDate() + 15)), // +15 Days
        status: InvoiceStatus.DRAFT,
        subtotal: totalAmount,
        totalAmount: totalAmount,
        balanceDue: totalAmount,
        clientId,
        fundingSourceId,
        organizationId,
        items: {
          create: invoiceItemsData,
        },
      },
    });

    // Mark valid Time Entries as 'Billed'
    const validEntryIds = validEntries.map((e) => e.id);
    await tx.timeEntry.updateMany({
      where: { id: { in: validEntryIds } },
      data: { isBillable: false }, 
    });

    return newInvoice;
  });

  // 6. Return comprehensive automation report
  return {
    invoiceId: result.id,
    totalBilledAmount: totalAmount,
    billedEntriesCount: validEntries.length,
    heldEntriesCount: heldEntries.length,
    holdReasons: heldEntries, 
  };
};
