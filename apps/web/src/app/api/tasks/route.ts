import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const DUMMY_ORG_ID = 'placeholder-org-id';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    const tasks = await prisma.task.findMany({
      where: {
        organizationId: DUMMY_ORG_ID,
        ...(projectId && { projectId }),
      },
      include: {
        project: { select: { name: true } },
        assignedTo: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('[TASKS_GET]', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, status, dueDate, projectId, assignedToId } = body;

    if (!name || !projectId) {
      return NextResponse.json({ message: 'Name and Project ID are required' }, { status: 400 });
    }

    const newTask = await prisma.task.create({
      data: {
        name,
        description,
        status: status || 'TODO',
        dueDate: dueDate ? new Date(dueDate) : null,
        projectId,
        assignedToId: assignedToId || null,
        organizationId: DUMMY_ORG_ID,
      },
      include: {
        project: true,
      }
    });

    return NextResponse.json(newTask, { status: 201 });
  } catch (error) {
    console.error('[TASKS_POST]', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
