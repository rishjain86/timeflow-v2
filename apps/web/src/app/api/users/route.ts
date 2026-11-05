import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const DUMMY_ORG_ID = 'placeholder-org-id';

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: { organizationId: DUMMY_ORG_ID },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('[USERS_GET]', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, role } = body;

    if (!email || !firstName) {
      return NextResponse.json({ message: 'First name and email are required' }, { status: 400 });
    }

    const newUser = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        role: role || 'USER',
        organizationId: DUMMY_ORG_ID,
      }
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error('[USERS_POST]', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
