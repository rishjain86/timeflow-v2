// apps/api/src/controllers/invoice.controller.ts

import { Request, Response, NextFunction } from 'express';
import { Prisma, Role, InvoiceStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { NotFoundError, UnauthorizedError, ConflictError } from '../utils/errors';

// Import New Services for PDF & Email
import { generatePdfBuffer } from '../modules/billing/generate-pdf.service';
import { sendInvoiceEmail } from '../modules/billing/email-invoice.service';

// RBAC Helpers
const hasManagerAccess = (role: Role) => role === Role.ADMIN || role === Role.MANAGER || role === Role.SUPER_ADMIN;

// Utility for precise financial rounding (mitigating JS float issues)
const roundFinancial = (num: number): number => Math.round(num * 100) / 100;

// 🟢 FIX: New Generate Invoice logic that safely parses frontend items payload
export const generateInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId, role } = res.locals.user;
    
    if (!hasManagerAccess(role)) {
      throw new UnauthorizedError('Only managers and administrators can generate invoices');
    }

    const { clientId, projectId, issueDate, dueDate, notes, items } = req.body;

    const client = await prisma.client.findFirst({
      where: { id: clientId, organizationId }
    });

    if (!client) {
      throw new NotFoundError('Client not found or does not belong to your organization');
    }

    // Auto-generate invoice number
    const invoiceNumber = `INV-${Math.floor(100000 + Math.random() * 900000)}`;

    // Calculate subtotal from items dynamically
    let subtotal = 0;
    if (items && Array.isArray(items)) {
      subtotal = items.reduce((sum: number, item: any) => sum + (Number(item.quantity || 0) * Number(item.unitPrice || 0)), 0);
    }

    const taxRate = 0; 
    const calculatedTaxAmount = roundFinancial((subtotal * taxRate) / 100);
    const calculatedTotal = roundFinancial(subtotal + calculatedTaxAmount);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        issueDate: issueDate ? new Date(issueDate) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : null,
        subtotal: roundFinancial(subtotal),
        taxRate: roundFinancial(taxRate),
        taxAmount: calculatedTaxAmount,
        totalAmount: calculatedTotal,
        notes,
        status: InvoiceStatus.DRAFT,
        clientId,
        projectId,
        organizationId,
        // 🟢 FIX: Actively save the line items into the database
        ...(items && Array.isArray(items) && items.length > 0 && {
          items: {
            create: items.map((item: any) => ({
              description: item.description,
              quantity: Number(item.quantity || 1),
              unitPrice: Number(item.unitPrice || 0)
            }))
          }
        })
      }
    });

    res.status(201).json({
      success: true,
      message: 'Invoice generated successfully',
      data: { invoice },
    });
  } catch (error) {
    next(error);
  }
};

export const createInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId, role } = res.locals.user;
    
    if (!hasManagerAccess(role)) {
      throw new UnauthorizedError('Only managers and administrators can create invoices');
    }

    const { invoiceNumber, clientId, projectId, issueDate, dueDate, subtotal, taxRate = 0, notes } = req.body;

    // Cross-tenant data leak protection
    const client = await prisma.client.findFirst({
      where: { id: clientId, organizationId }
    });

    if (!client) {
      throw new NotFoundError('Client not found or does not belong to your organization');
    }

    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, organizationId }
      });

      if (!project) {
        throw new NotFoundError('Project not found or does not belong to your organization');
      }
    }

    const existingInvoice = await prisma.invoice.findUnique({
      where: {
        organizationId_invoiceNumber: {
          organizationId,
          invoiceNumber,
        }
      }
    });

    if (existingInvoice) {
      throw new ConflictError(`Invoice number ${invoiceNumber} already exists`);
    }

    const calculatedTaxAmount = roundFinancial((subtotal * taxRate) / 100);
    const calculatedTotal = roundFinancial(subtotal + calculatedTaxAmount);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        issueDate: new Date(issueDate),
        dueDate: dueDate ? new Date(dueDate) : null,
        subtotal: roundFinancial(subtotal),
        taxRate: roundFinancial(taxRate),
        taxAmount: calculatedTaxAmount,
        totalAmount: calculatedTotal,
        notes,
        status: InvoiceStatus.DRAFT,
        clientId,
        projectId,
        organizationId,
      }
    });

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: { invoice },
    });
  } catch (error) {
    next(error);
  }
};

export const getInvoices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId, role } = res.locals.user;
    
    if (!hasManagerAccess(role)) {
      throw new UnauthorizedError('Only managers and administrators can view invoices');
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const search = req.query.search as string || '';
    const status = req.query.status as InvoiceStatus;
    const clientId = req.query.clientId as string;
    
    const skip = (page - 1) * limit;

    const whereClause: Prisma.InvoiceWhereInput = {
      organizationId,
      ...(status && { status }),
      ...(clientId && { clientId }),
      ...(search && {
        OR: [
          { invoiceNumber: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { issueDate: 'desc' },
        include: {
          client: { select: { name: true, email: true } },
          project: { select: { name: true } }
        }
      }),
      prisma.invoice.count({ where: whereClause }),
    ]);

    res.status(200).json({
      success: true,
      data: { 
        invoices,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        }
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getInvoiceById = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { organizationId, role } = res.locals.user;

    if (!hasManagerAccess(role)) {
      throw new UnauthorizedError('Only managers and administrators can view invoices');
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id, organizationId },
      include: {
        client: true,
        project: { select: { name: true } },
        // 🟢 FIX: Include the items so frontend has the data to display and edit
        items: true,
      }
    });

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    res.status(200).json({
      success: true,
      data: { invoice },
    });
  } catch (error) {
    next(error);
  }
};

export const updateInvoice = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { organizationId, role } = res.locals.user;

    if (!hasManagerAccess(role)) {
      throw new UnauthorizedError('Only managers and administrators can update invoices');
    }

    // 🟢 FIX: Added clientId, issueDate, and items to be extracted from body
    const { status, subtotal, taxRate, dueDate, notes, issueDate, clientId, items } = req.body;

    const existingInvoice = await prisma.invoice.findFirst({
      where: { id, organizationId },
    });

    if (!existingInvoice) {
      throw new NotFoundError('Invoice not found');
    }

    if (
      existingInvoice.status === InvoiceStatus.PAID || 
      existingInvoice.status === InvoiceStatus.CANCELLED
    ) {
      throw new ConflictError(`Cannot modify an invoice that is already ${existingInvoice.status}`);
    }

    let updatedSubtotal: number = Number(existingInvoice.subtotal);
    let updatedTaxRate: number = Number(existingInvoice.taxRate);
    
    // 🟢 FIX: Recalculate subtotal dynamically if items array is being updated
    if (items && Array.isArray(items)) {
      updatedSubtotal = items.reduce((sum: number, item: any) => sum + (Number(item.quantity || 0) * Number(item.unitPrice || 0)), 0);
    } else if (subtotal !== undefined) {
      updatedSubtotal = subtotal;
    }

    if (taxRate !== undefined) updatedTaxRate = taxRate;

    const calculatedTaxAmount = roundFinancial((updatedSubtotal * updatedTaxRate) / 100);
    const calculatedTotal = roundFinancial(updatedSubtotal + calculatedTaxAmount);

    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(dueDate && { dueDate: new Date(dueDate) }),
        ...(issueDate && { issueDate: new Date(issueDate) }), // 🟢 Allow date update
        ...(clientId && { clientId }), // 🟢 Allow client update
        ...(notes !== undefined && { notes }),
        subtotal: roundFinancial(updatedSubtotal),
        taxRate: roundFinancial(updatedTaxRate),
        taxAmount: calculatedTaxAmount,
        totalAmount: calculatedTotal,
        // 🟢 FIX: Update items gracefully (clears old ones and creates new array)
        ...(items && Array.isArray(items) && {
          items: {
            deleteMany: {},
            create: items.map((item: any) => ({
              description: item.description,
              quantity: Number(item.quantity || 1),
              unitPrice: Number(item.unitPrice || 0)
            }))
          }
        })
      },
      include: {
        items: true // Return updated items back to frontend
      }
    });

    res.status(200).json({
      success: true,
      message: 'Invoice updated successfully',
      data: { invoice: updatedInvoice },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteInvoice = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { organizationId, role } = res.locals.user;

    if (role !== Role.ADMIN && role !== Role.SUPER_ADMIN) {
      throw new UnauthorizedError('Only administrators can delete invoices');
    }

    const existingInvoice = await prisma.invoice.findFirst({
      where: { id, organizationId },
    });

    if (!existingInvoice) {
      throw new NotFoundError('Invoice not found');
    }

    if (
      existingInvoice.status === InvoiceStatus.PAID || 
      existingInvoice.status === InvoiceStatus.CANCELLED
    ) {
      throw new ConflictError(`Cannot delete an invoice that is already ${existingInvoice.status}`);
    }

    await prisma.invoice.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: 'Invoice deleted successfully',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

// --- NEW ENHANCEMENTS FOR PHASE 5 ---

export const generateInvoicePdf = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { organizationId, role } = res.locals.user;

    if (!hasManagerAccess(role)) {
      throw new UnauthorizedError('Only managers and administrators can download invoices');
    }

    // Fetch invoice with related data for PDF rendering
    const invoice = await prisma.invoice.findFirst({
      where: { id, organizationId },
      include: {
        client: true,
      }
    });

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    const pdfBuffer = await generatePdfBuffer(invoice);

    // Set headers to trigger a download or inline view in the browser
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice_${invoice.invoiceNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

export const emailInvoiceToClient = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { organizationId, role } = res.locals.user;

    if (!hasManagerAccess(role)) {
      throw new UnauthorizedError('Only managers and administrators can email invoices');
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id, organizationId },
      include: {
        client: true,
      }
    });

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    if (!invoice.client.email) {
      throw new ConflictError('Client does not have a registered email address.');
    }

    // Generate the PDF buffer on the fly
    const pdfBuffer = await generatePdfBuffer(invoice);

    // Send via email service
    await sendInvoiceEmail(invoice, pdfBuffer);

    // Optionally update status to SENT if it was currently a DRAFT
    if (invoice.status === InvoiceStatus.DRAFT) {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: 'SENT' as InvoiceStatus } 
      });
    }

    res.status(200).json({
      success: true,
      message: `Invoice successfully emailed to ${invoice.client.email}`,
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
