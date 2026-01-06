import { NextResponse } from 'next/server';

// This API route securely exposes the VAPID key to the client.
// It reads the key from server-side environment variables.
export async function GET() {
    const vapidKey = process.env.FIREBASE_VAPID_KEY;

    if (!vapidKey) {
        console.error("[API/FCM] FIREBASE_VAPID_KEY is not set on the server.");
        return NextResponse.json(
            { error: 'VAPID key not configured on the server.' }, 
            { status: 500 }
        );
    }

    return NextResponse.json({ vapidKey });
}
