import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const DUMMY_ORG_ID = 'placeholder-org-id';

export async function GET() {
  try {
    const clients = await prisma.client.findMany({
      where: { organizationId: DUMMY_ORG_ID },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(clients);
  } catch (error) {
    console.error('[CLIENTS_GET]', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, address, companyName } = body;

    if (!name) {
      return NextResponse.json({ message: 'Name is required' }, { status: 400 });
    }

    const newClient = await prisma.client.create({
      data: {
        name,
        email,
        phone,
        address,
        companyName,
        organizationId: DUMMY_ORG_ID,
      }
    });

    return NextResponse.json(newClient, { status: 201 });
  } catch (error) {
    console.error('[CLIENTS_POST]', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
