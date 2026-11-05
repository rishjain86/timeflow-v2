import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const DUMMY_ORG_ID = 'placeholder-org-id';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    const invoices = await prisma.invoice.findMany({
      where: {
        organizationId: DUMMY_ORG_ID,
        ...(clientId && { clientId }),
      },
      include: {
        client: { select: { name: true, email: true } },
        items: true,
      },
      orderBy: { issueDate: 'desc' },
    });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error('[INVOICES_GET]', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      invoiceNumber, issueDate, dueDate, status, clientId, 
      subtotal, taxAmount, discountAmount, totalAmount, items 
    } = body;

    if (!invoiceNumber || !issueDate || !clientId) {
      return NextResponse.json({ message: 'Invoice Number, Issue Date, and Client ID are required' }, { status: 400 });
    }

    const newInvoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        issueDate: new Date(issueDate),
        dueDate: dueDate ? new Date(dueDate) : null,
        status: status || 'DRAFT',
        clientId,
        subtotal: subtotal || 0,
        taxAmount: taxAmount || 0,
        discountAmount: discountAmount || 0,
        totalAmount: totalAmount || 0,
        organizationId: DUMMY_ORG_ID,
        items: items && items.length > 0 ? {
          create: items.map((item: any) => ({
            description: item.description,
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
            organizationId: DUMMY_ORG_ID,
          }))
        } : undefined
      },
      include: {
        client: true,
        items: true,
      }
    });

    return NextResponse.json(newInvoice, { status: 201 });
  } catch (error) {
    console.error('[INVOICES_POST]', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
