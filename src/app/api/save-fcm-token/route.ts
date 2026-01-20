
import { NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/server/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  const logPrefix = `[API - save-fcm-token]`;
  try {
    const { token, userId } = await request.json();
    
    if (!token || !userId) {
      console.error(`${logPrefix} ❌ Missing token or userId in request body.`);
      return NextResponse.json({ error: 'Missing token or user ID' }, { status: 400 });
    }

    console.log(`${logPrefix} 🚀 Received token for user ${userId}: ${token.substring(0,20)}...`);

    const { adminDb } = await getFirebaseAdmin();
    const tokenRef = adminDb.collection('users').doc(userId).collection('fcmTokens').doc(token);
    
    const doc = await tokenRef.get();

    if (!doc.exists) {
        console.log(`${logPrefix} ℹ️ Token does not exist. Creating new document.`);
        await tokenRef.set({
            token: token,
            createdAt: FieldValue.serverTimestamp(),
            lastSeen: FieldValue.serverTimestamp(),
            platform: 'web',
        });
        console.log(`${logPrefix} ✅ Successfully CREATED token document.`);

    } else {
        console.log(`${logPrefix} ℹ️ Token exists. Updating 'lastSeen' timestamp.`);
        await tokenRef.update({ lastSeen: FieldValue.serverTimestamp() });
        console.log(`${logPrefix} ✅ Successfully UPDATED token document.`);
    }

    return NextResponse.json({ success: true, message: 'Token saved successfully.' });

  } catch (error: any) {
    console.error(`${logPrefix} 🔥 CRITICAL: Internal server error:`, error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
