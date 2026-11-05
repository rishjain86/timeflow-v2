import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const DUMMY_ORG_ID = 'placeholder-org-id';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    const expenses = await prisma.expense.findMany({
      where: {
        organizationId: DUMMY_ORG_ID,
        ...(projectId && { projectId }),
      },
      include: {
        project: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(expenses);
  } catch (error) {
    console.error('[EXPENSES_GET]', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, category, date, description, projectId } = body;

    if (!amount || !date || !category) {
      return NextResponse.json({ message: 'Amount, Date, and Category are required' }, { status: 400 });
    }

    const newExpense = await prisma.expense.create({
      data: {
        amount: parseFloat(amount),
        category,
        date: new Date(date),
        description,
        projectId: projectId || null,
        organizationId: DUMMY_ORG_ID,
      },
      include: {
        project: true,
      }
    });

    return NextResponse.json(newExpense, { status: 201 });
  } catch (error) {
    console.error('[EXPENSES_POST]', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
