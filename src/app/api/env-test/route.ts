// This file is being replaced by fcm-vapid-key/route.ts
// It can be deleted in a future step.
// Keeping it for now to avoid breaking file-based navigation if it's referenced elsewhere.
import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({ status: 'deprecated' });
}
