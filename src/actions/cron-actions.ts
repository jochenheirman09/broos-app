'use server';

import { Firestore } from 'firebase-admin/firestore';
import { analyzeTeamData } from '@/ai/flows/team-analysis-flow';
import type { TeamAnalysisInput, TeamAnalysisOutput } from '@/ai/types';
import type { UserProfile, Team, WellnessScore, WithId, StaffUpdate } from '@/lib/types';
import { format } from 'date-fns';
import { getFirebaseAdmin } from '@/ai/genkit';

/**
 * Executes a focused analysis job for teams.
 * This is an isolated first step for the full cron functionality.
 * It will:
 * 1. Iterate through all clubs and their teams.
 * 2. For each team, gather the latest wellness scores from its players.
 * 3. If data is available, call the `analyzeTeamData` AI flow.
 * 4. Save the resulting 'insight' into the team's `staffUpdates` subcollection.
 *
 * NOTE: This version does NOT yet handle notifications, player updates, or club updates.
 */
export async function runAnalysisJob() {
  console.log('[CRON ACTION - Step 1] Starting TEAM analysis job...');
  const { adminDb } = await getFirebaseAdmin();
  const db: Firestore = adminDb;
  let analysisCount = 0;

  const clubsSnapshot = await db.collection('clubs').get();

  for (const clubDoc of clubsSnapshot.docs) {
    const teamsSnapshot = await clubDoc.ref.collection('teams').get();
    
    for (const teamDoc of teamsSnapshot.docs) {
      const team = { id: teamDoc.id, ...teamDoc.data() } as WithId<Team>;
      
      const playersQuery = db.collection('users').where('teamId', '==', team.id);
      const playersSnapshot = await playersQuery.get();
      
      if (playersSnapshot.empty) {
        console.log(`[CRON] Team ${team.name} has no players, skipping.`);
        continue;
      }
      
      const playersData: { name: string; scores: WellnessScore; }[] = [];

      for (const playerDoc of playersSnapshot.docs) {
        const player = playerDoc.data() as UserProfile;
        
        // Fetch the latest wellness score for each player
        const wellnessSnapshot = await playerDoc.ref.collection('wellnessScores').orderBy('date', 'desc').limit(1).get();

        if (!wellnessSnapshot.empty) {
          const score = wellnessSnapshot.docs[0].data() as WellnessScore;
          playersData.push({ name: player.name, scores: score });
        }
      }

      // Only run analysis if there's data from at least one player
      if (playersData.length > 0) {
        const analysisInput: TeamAnalysisInput = { teamId: team.id, teamName: team.name, playersData };
        const analysisResult: TeamAnalysisOutput | null = await analyzeTeamData(analysisInput);
        
        // Save the generated insight if it exists
        if (analysisResult?.insight) {
            const insightRef = teamDoc.ref.collection('staffUpdates').doc();
            const insightData: StaffUpdate = {
                ...analysisResult.insight,
                id: insightRef.id,
                date: format(new Date(), 'yyyy-MM-dd'),
            };
            await insightRef.set(insightData);
            console.log(`[CRON] Saved new insight for team ${team.name}.`);
            analysisCount++;
        }
      }
    }
  }
  
  const result = `Team analysis job finished. Generated insights for ${analysisCount} teams.`;
  console.log(`[CRON ACTION] ${result}`);
  return { success: true, message: result, analysisCount };
}
