import { NextResponse } from 'next/server';

/**
 * This API route securely exposes the VAPID key to the client.
 * The key is injected into the backend server's environment via apphosting.yaml.
 */
export async function GET() {
    const vapidKey = process.env.FIREBASE_VAPID_KEY;

    if (!vapidKey) {
        console.error('[API/VAPID] CRITICAL: FIREBASE_VAPID_KEY is not available in the server environment.');
        return NextResponse.json(
            { error: 'VAPID key not configured on the server.' },
            { status: 500 }
        );
    }

    return NextResponse.json({ vapidKey });
}
