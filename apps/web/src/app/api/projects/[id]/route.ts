import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await request.json();
    
    // Extract everything from the request body
    const { name, description, status, budget, deadline } = body;

    // Update the project in the database
    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        name,
        description,
        status,
        budget: budget !== undefined ? budget : null,       // Saves the budget
        deadline: deadline !== undefined ? deadline : null, // Saves the deadline
      },
    });

    return NextResponse.json({
      message: 'Project updated successfully',
      data: updatedProject
    });

  } catch (error: any) {
    console.error('[PROJECT_UPDATE_ERROR]', error);
    return NextResponse.json(
      { message: error?.message || 'Failed to update project' },
      { status: 500 }
    );
  }
}
