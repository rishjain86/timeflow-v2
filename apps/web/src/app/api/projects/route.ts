import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// TODO: Replace this with the actual Organization ID from the authenticated user's session later.
// For now, we use a placeholder so the Prisma queries don't fail.
const DUMMY_ORG_ID = 'placeholder-org-id'; 

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Fetch projects from the database
    const projects = await prisma.project.findMany({
      where: {
        organizationId: DUMMY_ORG_ID,
        ...(status && { status: status as any }), // Filter by status if provided in the query
      },
      include: {
        client: true, // Fetch the associated client details as well
      },
      orderBy: {
        createdAt: 'desc', // Show the newest projects first
      }
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error('[PROJECTS_GET]', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, status, clientId } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json({ message: 'Project name is required' }, { status: 400 });
    }

    // Create the new project in the database
    const newProject = await prisma.project.create({
      data: {
        name,
        description,
        status: status || 'PLANNING',
        clientId: clientId || null,
        organizationId: DUMMY_ORG_ID,
      },
      include: {
        client: true,
      }
    });

    return NextResponse.json(newProject, { status: 201 });
  } catch (error) {
    console.error('[PROJECTS_POST]', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
