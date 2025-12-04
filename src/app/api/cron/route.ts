import { NextResponse } from 'next/server';
import { runAnalysisJob } from '@/actions/cron-actions';

/**
 * HTTP GET handler for the cron job.
 * Protected by checking for a specific header sent by Cloud Scheduler.
 */
export async function GET(request: Request) {
  // In production, require the Cloud Scheduler header. For local dev, allow direct access.
  if (process.env.NODE_ENV === 'production' && request.headers.get('X-CloudScheduler') !== 'true') {
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const result = await runAnalysisJob();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Cron job failed:', error);
    return new NextResponse(
      JSON.stringify({ success: false, message: error.message || 'An internal error occurred.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
