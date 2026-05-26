import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    // SECURITY NOTE: In production, you MUST verify the caller is actually an admin!
    // You would typically read the Authorization header, decode the Firebase JWT,
    // check if it's valid, and verify that the user's role in the DB is "super_admin".

    const body = await req.json();
    const { email, password, companyId, factoryId, role } = body;

    if (!email || !password || !companyId || !factoryId || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Create the user in Firebase Authentication securely on the backend
    const userRecord = await adminAuth.createUser({
      email,
      password,
    });

    // 2. Write their multi-tenant details to the Realtime Database
    await adminDb.ref(`users/${userRecord.uid}`).set({
      email,
      companyId,
      factoryId,
      role
    });

    return NextResponse.json({ 
      message: 'Employee created successfully', 
      uid: userRecord.uid 
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating new employee:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
