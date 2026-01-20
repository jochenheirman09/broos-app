
import { NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/server/firebase-admin';

export async function POST(request: Request) {
  const logPrefix = `[API - remove-fcm-token]`;
  try {
    const { token, userId } = await request.json();
    
    if (!token || !userId) {
      console.error(`${logPrefix} ❌ Missing token or userId in request body.`);
      return NextResponse.json({ error: 'Missing token or user ID' }, { status: 400 });
    }

    console.log(`${logPrefix} 🚀 Attempting to remove token for user ${userId}: ${token.substring(0,20)}...`);

    const { adminDb } = getFirebaseAdmin();
    const tokenRef = adminDb.collection('users').doc(userId).collection('fcmTokens').doc(token);

    // Delete the specific token document
    await tokenRef.delete();

    console.log(`${logPrefix} ✅ Successfully DELETED token document for user ${userId}.`);
    return NextResponse.json({ success: true, message: 'Token removed successfully.' });

  } catch (error: any) {
    console.error(`${logPrefix} 🔥 CRITICAL: Internal server error:`, error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
