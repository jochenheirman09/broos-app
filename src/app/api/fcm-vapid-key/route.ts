
import { NextResponse } from 'next/server';

// This API route securely exposes the VAPID key to the client.
// It reads the key from server-side environment variables.
export async function GET() {
    const vapidKey = process.env.FIREBASE_VAPID_KEY;
    console.log('[API/FCM] VAPID Key endpoint hit.');

    if (!vapidKey) {
        console.error("[API/FCM] CRITICAL: FIREBASE_VAPID_KEY is not set on the server.");
        return NextResponse.json(
            { error: 'VAPID key not configured on the server.' }, 
            { status: 500 }
        );
    }
    
    console.log(`[API/FCM] Returning VAPID key: ${vapidKey.substring(0, 10)}...`);
    return NextResponse.json({ vapidKey });
}
