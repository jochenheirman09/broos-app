
'use server';

import { Firestore } from 'firebase-admin/firestore';
import { analyzeTeamData } from '@/ai/flows/team-analysis-flow';
import { generatePlayerUpdate } from '@/ai/flows/player-update-flow';
import { analyzeClubData } from '@/ai/flows/club-analysis-flow';
import { sendNotification } from '@/ai/flows/notification-flow';
import type { TeamAnalysisInput, NotificationInput, PlayerUpdateInput, ClubAnalysisInput, AITeamSummary } from '@/ai/types';
import type { UserProfile, Team, WellnessScore, WithId, StaffUpdate, PlayerUpdate, ClubUpdate } from '@/lib/types';
import { getFirebaseAdmin } from '@/ai/genkit';
import { formatInTimeZone } from 'date-fns-tz';

/**
 * Executes the full daily analysis and notification job.
 */
export async function runAnalysisJob() {
  console.log('[CRON ACTION] Starting full analysis and notification job...');
  const { adminDb: db } = await getFirebaseAdmin();
  const timeZone = 'Europe/Brussels';
  const today = formatInTimeZone(new Date(), timeZone, 'yyyy-MM-dd');
  
  let notificationCount = 0;
  let teamAnalysisCount = 0;
  let playerUpdateCount = 0;
  let clubAnalysisCount = 0;

  // --- Step 1: Send Check-in Reminder Notifications ---
  console.log('[CRON] Step 1: Dispatching check-in reminders...');
  const playersSnapshot = await db.collection('users').where('role', '==', 'player').get();

  for (const playerDoc of playersSnapshot.docs) {
    const player = playerDoc.data() as UserProfile;
    if (player.uid) {
        const notificationInput: NotificationInput = {
            userId: player.uid,
            title: `Tijd voor je check-in, ${player.name.split(' ')[0]}!`,
            body: `Je buddy, ${player.buddyName || 'Broos'}, wacht op je.`,
            link: '/chat'
        };
        try {
            const result = await sendNotification(notificationInput);
            if (result.success) notificationCount++;
        } catch(e) {
            console.error(`[CRON] Failed to send reminder to user ${player.uid}:`, e);
        }
    }
  }
  console.log(`[CRON] Step 1 complete. Dispatched ${notificationCount} reminders.`);

  // --- Step 2, 3, 4: Data Analysis and Contextual Notifications ---
  console.log('[CRON] Step 2: Starting team, player, and club analysis...');
  const clubsSnapshot = await db.collection('clubs').get();
  
  for (const clubDoc of clubsSnapshot.docs) {
    const clubId = clubDoc.id;
    const teamSummaries: { teamName: string; summary: AITeamSummary }[] = [];

    const teamsSnapshot = await clubDoc.ref.collection('teams').get();
    for (const teamDoc of teamsSnapshot.docs) {
      const team = { id: teamDoc.id, ...teamDoc.data() } as WithId<Team>;
      const playersInTeamSnapshot = await db.collection('users').where('teamId', '==', team.id).get();
      
      if (playersInTeamSnapshot.empty) {
        console.log(`[CRON] Team ${team.name} has no players, skipping.`);
        continue;
      }
      
      const playersData: { playerProfile: UserProfile; scores: WellnessScore; }[] = [];
      for (const playerDoc of playersInTeamSnapshot.docs) {
        // CORRECTED QUERY: Fetch the wellness score for the specific user for 'today'.
        const wellnessDocRef = playerDoc.ref.collection('wellnessScores').doc(today);
        const wellnessDoc = await wellnessDocRef.get();

        if (wellnessDoc.exists) {
          playersData.push({ 
            playerProfile: playerDoc.data() as UserProfile, 
            scores: wellnessDoc.data() as WellnessScore 
          });
        } else {
           console.log(`[CRON] No wellness score found for today (${today}) for player ${playerDoc.id}.`);
        }
      }

      if (playersData.length > 0) {
        console.log(`[CRON] Analyzing data for ${playersData.length} players in team ${team.name}.`);
        const analysisInput: TeamAnalysisInput = {
          teamId: team.id,
          teamName: team.name,
          playersData: playersData.map(p => ({ name: p.playerProfile.name, scores: p.scores })),
        };
        const teamAnalysisResult = await analyzeTeamData(analysisInput);

        if (teamAnalysisResult?.summary) {
            teamSummaries.push({ teamName: team.name, summary: teamAnalysisResult.summary });
        }

        if (teamAnalysisResult?.insight) {
          const insightRef = teamDoc.ref.collection('staffUpdates').doc();
          const insightData: StaffUpdate = { ...teamAnalysisResult.insight, id: insightRef.id, date: today };
          await insightRef.set(insightData);
          teamAnalysisCount++;
          
          const staffQuery = db.collection('users').where('teamId', '==', team.id).where('role', '==', 'staff');
          const staffSnapshot = await staffQuery.get();
          for (const staffDoc of staffSnapshot.docs) {
            await sendNotification({ userId: staffDoc.id, title: `Nieuw Inzicht voor ${team.name}`, body: insightData.title, link: '/dashboard' });
          }
        }

        // Player-specific "Weetjes"
        for (const { playerProfile, scores } of playersData) {
            if (teamAnalysisResult?.summary) {
                const playerUpdateInput: PlayerUpdateInput = {
                    playerName: playerProfile.name,
                    playerScores: scores,
                    teamAverageScores: teamAnalysisResult.summary,
                };
                const playerUpdateResult = await generatePlayerUpdate(playerUpdateInput);
                if (playerUpdateResult) {
                    const updateRef = db.collection('users').doc(playerProfile.uid).collection('updates').doc();
                    const updateData: PlayerUpdate = { ...playerUpdateResult, id: updateRef.id, date: today };
                    await updateRef.set(updateData);
                    playerUpdateCount++;
                    await sendNotification({ userId: playerProfile.uid, title: 'Nieuw Weetje!', body: updateData.title, link: '/dashboard' });
                }
            }
        }
      } else {
        console.log(`[CRON] No wellness data available today for any player in team ${team.name}.`);
      }
    }

    // Club-wide analysis
    if (teamSummaries.length > 0) {
        console.log(`[CRON] Analyzing data for ${teamSummaries.length} teams in club ${clubDoc.data().name}.`);
        const clubAnalysisInput: ClubAnalysisInput = { clubId, clubName: clubDoc.data().name, teamSummaries };
        const clubInsightResult = await analyzeClubData(clubAnalysisInput);

        if (clubInsightResult) {
            const insightRef = clubDoc.ref.collection('clubUpdates').doc();
            const insightData: ClubUpdate = { ...clubInsightResult, id: insightRef.id, date: today };
            await insightRef.set(insightData);
            clubAnalysisCount++;

            const responsibleQuery = db.collection('users').where('clubId', '==', clubId).where('role', '==', 'responsible');
            const responsibleSnapshot = await responsibleQuery.get();
            for (const responsibleDoc of responsibleSnapshot.docs) {
                await sendNotification({ userId: responsibleDoc.id, title: `Nieuw Clubinzicht: ${clubDoc.data().name}`, body: insightData.title, link: '/dashboard' });
            }
        }
    }
  }
  
  const result = `Job finished. Sent ${notificationCount} reminders. Generated ${teamAnalysisCount} team insights, ${playerUpdateCount} player updates, and ${clubAnalysisCount} club insights.`;
  console.log(`[CRON ACTION] ${result}`);
  return { success: true, message: result };
}
