import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, password, organizationName } = body;

    // 1. Validate fields
    if (!email || !password || !firstName || !organizationName) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // 2. Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json({ message: 'User already exists' }, { status: 400 });
    }

    // 3. Create Organization
    const organization = await prisma.organization.create({
      data: {
        name: organizationName,
      }
    });

    // 4. Create User using the correct schema field 'passwordHash'
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName: lastName || null,
        email,
        passwordHash: password, // <-- Schema matches 'passwordHash', not 'password'
        role: 'ADMIN',
        organizationId: organization.id,
      }
    });

    return NextResponse.json(
      { 
        message: 'User created successfully', 
        user: { id: user.id, email: user.email, firstName: user.firstName, role: user.role, organizationId: user.organizationId },
        token: "dummy-jwt-token-for-testing" // Frontend expects a token based on register.ts
      }, 
      { status: 201 }
    );
  } catch (error) {
    console.error('[REGISTER_POST]', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
