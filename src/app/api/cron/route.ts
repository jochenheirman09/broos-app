
import { NextResponse } from 'next/server';

/**
 * HTTP GET handler for the cron job.
 * Protected by checking for a specific header sent by Cloud Scheduler.
 * It now dynamically imports the cron action to prevent build-time errors
 * related to server-only packages in API routes.
 */
export async function GET(request: Request) {
  if (request.headers.get('X-CloudScheduler') !== 'true' && process.env.NODE_ENV === 'production') {
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    // Dynamically import and run the job.
    // This breaks the static import chain that causes build failures in Next.js API routes
    // when server-only packages like Genkit are involved.
    const { runAnalysisJob } = await import('@/app/actions/cron-actions');
    const { analysisCount, notificationCount } = await runAnalysisJob();
    
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
