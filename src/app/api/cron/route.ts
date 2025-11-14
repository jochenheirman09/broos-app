
import { NextResponse } from 'next/server';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { TeamAnalysisInput, analyzeTeamData } from '@/ai/flows/team-analysis-flow';
import type { UserProfile, Team, WellnessScore, WithId, StaffUpdate } from '@/lib/types';
import { format, getISOWeek, getYear } from 'date-fns';

// Initialize Firebase Admin SDK if it hasn't been already.
function initializeFirebaseAdmin(): { db: Firestore } {
  if (!getApps().length) {
    // In a Firebase Hosting environment (or with GOOGLE_APPLICATION_CREDENTIALS set),
    // initializeApp() discovers credentials automatically.
    initializeApp();
  }
  return { db: getFirestore() };
}

async function runAnalysis() {
  const { db } = initializeFirebaseAdmin();
  let analysisCount = 0;

  const clubsSnapshot = await db.collection('clubs').get();

  for (const clubDoc of clubsSnapshot.docs) {
    const teamsSnapshot = await clubDoc.ref.collection('teams').get();

    for (const teamDoc of teamsSnapshot.docs) {
      const team = { id: teamDoc.id, ...teamDoc.data() } as WithId<Team>;
      
      const playersQuery = db.collection('users').where('teamId', '==', team.id);
      const playersSnapshot = await playersQuery.get();
      
      if (playersSnapshot.empty) continue;
      
      const playersData = [];

      for (const playerDoc of playersSnapshot.docs) {
        const player = { id: playerDoc.id, ...playerDoc.data() } as WithId<UserProfile>;
        
        // In a real cron job, you'd likely fetch scores from the last 24 hours/week.
        // For simplicity, we get the latest one.
        const wellnessSnapshot = await playerDoc.ref.collection('wellnessScores').orderBy('date', 'desc').limit(1).get();

        if (!wellnessSnapshot.empty) {
          const score = wellnessSnapshot.docs[0].data() as WellnessScore;
          playersData.push({
            userId: player.id,
            name: player.name,
            scores: score,
          });
        }
      }

      if (playersData.length > 0) {
        const analysisInput: TeamAnalysisInput = { teamId: team.id, teamName: team.name, playersData };
        const analysisResult = await analyzeTeamData(analysisInput);

        const today = new Date();
        
        // Save the data summary
        if (analysisResult?.summary) {
          const summaryId = `weekly-${getYear(today)}-${getISOWeek(today)}`;
          const summaryRef = teamDoc.ref.collection('summaries').doc(summaryId);
          
          await summaryRef.set({
            ...analysisResult.summary,
            id: summaryId,
            teamId: team.id,
            date: format(today, 'yyyy-MM-dd'),
          }, { merge: true });

          analysisCount++;
        }

        // Save the generated insight (StaffUpdate)
        if (analysisResult?.insight) {
            const insightRef = teamDoc.ref.collection('staffUpdates').doc();
            const insightData: StaffUpdate = {
                ...analysisResult.insight,
                id: insightRef.id,
                date: format(today, 'yyyy-MM-dd'),
            };
            await insightRef.set(insightData);
        }
      }
    }
  }
  return analysisCount;
}

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
    const count = await runAnalysis();
    return NextResponse.json({
      success: true,
      message: `Analysis completed successfully for ${count} teams.`,
    });
  } catch (error: any) {
    console.error('Cron job failed:', error);
    return new NextResponse(
      JSON.stringify({ success: false, message: error.message || 'An internal error occurred.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
