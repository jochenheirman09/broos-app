
'use server';

import { Firestore } from 'firebase-admin/firestore';
import { analyzeTeamData } from '@/ai/flows/team-analysis-flow';
import { generatePlayerUpdate } from '@/ai/flows/player-update-flow';
import { analyzeClubData } from '@/ai/flows/club-analysis-flow';
import { sendNotification } from '@/ai/flows/notification-flow';
import type { TeamAnalysisInput, TeamAnalysisOutput, NotificationInput, PlayerUpdateInput, ClubAnalysisInput, AITeamSummary } from '@/ai/types';
import type { UserProfile, Team, WellnessScore, WithId, StaffUpdate, PlayerUpdate, ClubUpdate } from '@/lib/types';
import { formatInTimeZone } from 'date-fns-tz';
import { getFirebaseAdmin } from '@/ai/genkit';

/**
 * Executes the full daily analysis and notification job.
 * It will:
 * 1. Send check-in reminders to all players.
 * 2. Analyze each team's data, save a staff insight, and notify staff.
 * 3. Generate and save a personalized "weetje" for each player and notify them.
 * 4. Analyze club-wide data, save a club insight, and notify responsibles.
 */
export async function runAnalysisJob() {
  console.log('[CRON ACTION] Starting full analysis and notification job...');
  const { adminDb } = await getFirebaseAdmin();
  const db: Firestore = adminDb;
  
  let notificationCount = 0;
  let teamAnalysisCount = 0;
  let playerUpdateCount = 0;
  let clubAnalysisCount = 0;

  // --- Step 1: Send Check-in Reminder Notifications ---
  console.log('[CRON] Step 1: Dispatching check-in reminders...');
  const playersSnapshot = await db.collection('users').where('role', '==', 'player').get();

  for (const playerDoc of playersSnapshot.docs) {
    const player = playerDoc.data() as UserProfile;
    if (player.uid) { // Ensure player uid exists
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

    // --- TEAM & PLAYER ANALYSIS (per team) ---
    const teamsSnapshot = await clubDoc.ref.collection('teams').get();
    for (const teamDoc of teamsSnapshot.docs) {
      const team = { id: teamDoc.id, ...teamDoc.data() } as WithId<Team>;
      const playersInTeamSnapshot = await db.collection('users').where('teamId', '==', team.id).get();
      
      if (playersInTeamSnapshot.empty) continue;
      
      const playersData: { playerProfile: UserProfile; scores: WellnessScore; }[] = [];
      for (const playerDoc of playersInTeamSnapshot.docs) {
        const wellnessSnapshot = await playerDoc.ref.collection('wellnessScores').orderBy('date', 'desc').limit(1).get();
        if (!wellnessSnapshot.empty) {
          playersData.push({ 
            playerProfile: playerDoc.data() as UserProfile, 
            scores: wellnessSnapshot.docs[0].data() as WellnessScore 
          });
        }
      }

      if (playersData.length > 0) {
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
          const insightData: StaffUpdate = { ...teamAnalysisResult.insight, id: insightRef.id, date: formatInTimeZone(new Date(), 'Europe/Brussels', 'yyyy-MM-dd') };
          await insightRef.set(insightData);
          teamAnalysisCount++;
          
          // Notify staff members of this team
          const staffQuery = db.collection('users').where('teamId', '==', team.id).where('role', '==', 'staff');
          const staffSnapshot = await staffQuery.get();
          for (const staffDoc of staffSnapshot.docs) {
            await sendNotification({ userId: staffDoc.id, title: `Nieuw Inzicht voor ${team.name}`, body: insightData.title, link: '/dashboard' });
          }
        }

        // --- PLAYER-SPECIFIC "WEETJES" ---
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
                    const updateData: PlayerUpdate = { ...playerUpdateResult, id: updateRef.id, date: formatInTimeZone(new Date(), 'Europe/Brussels', 'yyyy-MM-dd') };
                    await updateRef.set(updateData);
                    playerUpdateCount++;
                    await sendNotification({ userId: playerProfile.uid, title: 'Nieuw Weetje!', body: updateData.title, link: '/dashboard' });
                }
            }
        }
      }
    }

    // --- CLUB-WIDE ANALYSIS ---
    if (teamSummaries.length > 0) {
        const clubAnalysisInput: ClubAnalysisInput = { clubId, clubName: clubDoc.data().name, teamSummaries };
        const clubInsightResult = await analyzeClubData(clubAnalysisInput);

        if (clubInsightResult) {
            const insightRef = clubDoc.ref.collection('clubUpdates').doc();
            const insightData: ClubUpdate = { ...clubInsightResult, id: insightRef.id, date: formatInTimeZone(new Date(), 'Europe/Brussels', 'yyyy-MM-dd') };
            await insightRef.set(insightData);
            clubAnalysisCount++;

            // Notify all responsible users of this club
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
