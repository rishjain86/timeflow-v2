import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const DUMMY_ORG_ID = 'placeholder-org-id';

export async function GET() {
  try {
    const settings = await prisma.organization.findUnique({
      where: { id: DUMMY_ORG_ID },
    });
    
    return NextResponse.json(settings);
  } catch (error) {
    console.error('[SETTINGS_GET]', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    
    // Dynamically update provided fields (e.g., name, currency, timezone, etc.)
    const updatedSettings = await prisma.organization.update({
      where: { id: DUMMY_ORG_ID },
      data: body,
    });

    return NextResponse.json(updatedSettings);
  } catch (error) {
    console.error('[SETTINGS_PATCH]', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
