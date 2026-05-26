import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, name, companyId, factoryId, role, status, needsPasswordChange } = body;

    if (!email || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields: email, password, role' }, { status: 400 });
    }

    // 1. Create the Firebase Auth user securely on the server
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name || '',
    });

    // 2. Write the user profile to Realtime Database
    await adminDb.ref(`users/${userRecord.uid}`).set({
      email,
      name: name || '',
      companyId: companyId || null,
      factoryId: factoryId || null,
      role,
      status: status || 'approved',
      needsPasswordChange: needsPasswordChange || false,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      message: 'User created successfully',
      uid: userRecord.uid,
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
