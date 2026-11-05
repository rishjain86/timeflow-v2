import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    // Note: Later, this will be filtered to only show organizations 
    // the currently authenticated user has access to.
    const organizations = await prisma.organization.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(organizations);
  } catch (error) {
    console.error('[ORGANIZATIONS_GET]', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, logo, currency, timezone } = body;

    if (!name) {
      return NextResponse.json({ message: 'Organization name is required' }, { status: 400 });
    }

    const newOrganization = await prisma.organization.create({
      data: {
        name,
        logo: logo || null,
        currency: currency || 'USD',
        timezone: timezone || 'UTC',
      }
    });

    return NextResponse.json(newOrganization, { status: 201 });
  } catch (error) {
    console.error('[ORGANIZATIONS_POST]', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
