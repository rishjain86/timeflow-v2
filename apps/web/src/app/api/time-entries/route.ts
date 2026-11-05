import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// TODO: Replace with authenticated user's details later
const DUMMY_ORG_ID = 'placeholder-org-id';
const DUMMY_USER_ID = 'placeholder-user-id'; 

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    // Fetch time entries, filter by projectId if provided
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        organizationId: DUMMY_ORG_ID,
        ...(projectId && { projectId }),
      },
      include: {
        project: {
          select: { name: true }
        },
        task: {
          select: { name: true }
        },
      },
      orderBy: {
        date: 'desc',
      }
    });

    return NextResponse.json(timeEntries);
  } catch (error) {
    console.error('[TIME_ENTRIES_GET]', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, duration, description, isBillable, projectId, taskId, clientId } = body;

    // Validate required fields
    if (!date || duration === undefined || !projectId) {
      return NextResponse.json({ message: 'Date, duration, and project are required' }, { status: 400 });
    }

    // Create the new time entry
    const newTimeEntry = await prisma.timeEntry.create({
      data: {
        date: new Date(date),
        duration,
        description,
        isBillable: isBillable ?? true,
        projectId,
        taskId: taskId || null,
        clientId: clientId || null,
        organizationId: DUMMY_ORG_ID,
        userId: DUMMY_USER_ID, 
      },
      include: {
        project: true,
      }
    });

    return NextResponse.json(newTimeEntry, { status: 201 });
  } catch (error) {
    console.error('[TIME_ENTRIES_POST]', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
