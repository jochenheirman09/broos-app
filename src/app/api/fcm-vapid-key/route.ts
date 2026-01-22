// DEPRECATED - This API route is no longer needed as the VAPID key
// is now exposed directly to the client via NEXT_PUBLIC_FIREBASE_VAPID_KEY.
// This file can be removed in a future cleanup step.
import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({ status: 'deprecated' });
}
