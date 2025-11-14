
import { NextResponse } from 'next/server';
import { runCronJobs } from '@/lib/actions/cron-actions';

/**
 * HTTP GET handler for the cron job.
 * Protected by checking for a specific header sent by Cloud Scheduler.
 */
export async function GET(request: Request) {
  // IMPORTANT: Secure this endpoint.
  // This header is recommended by Google for Cloud Scheduler invocations.
  if (request.headers.get('X-CloudScheduler') !== 'true' && process.env.NODE_ENV === 'production') {
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const { analysisCount, notificationCount } = await runCronJobs();
    return NextResponse.json({
      success: true,
      message: `Analysis completed for ${analysisCount} teams. ${notificationCount} notifications sent.`,
    });
  } catch (error: any) {
    console.error('Cron job failed:', error);
    return new NextResponse(
      JSON.stringify({ success: false, message: error.message || 'An internal error occurred.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
