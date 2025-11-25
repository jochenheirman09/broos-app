
'use server';

import { Firestore } from 'firebase-admin/firestore';
import { TeamAnalysisInput, analyzeTeamData, type AITeamSummary } from '@/ai/flows/team-analysis-flow';
import { ClubAnalysisInput, analyzeClubData } from '@/ai/flows/club-analysis-flow';
import { PlayerUpdateInput, generatePlayerUpdate } from '@/ai/flows/player-update-flow';
import { sendNotification } from '@/ai/flows/notification-flow';
import type { UserProfile, Team, WellnessScore, WithId, StaffUpdate, ClubUpdate, PlayerUpdate } from '@/lib/types';
import { format, getISOWeek, getYear } from 'date-fns';
import { getFirebaseAdmin } from '@/ai/genkit';

export async function runAnalysisJob() {
  console.log('[CRON ACTION] Starting analysis job...');
  const { adminDb } = getFirebaseAdmin();
  const db: Firestore = adminDb;
  let analysisCount = 0;
  let notificationCount = 0;

  const clubsSnapshot = await db.collection('clubs').get();

  for (const clubDoc of clubsSnapshot.docs) {
    const club = { id: clubDoc.id, ...clubDoc.data() } as WithId<Pick<Club, 'id' | 'name'>>;
    const teamsSnapshot = await clubDoc.ref.collection('teams').get();
    
    const teamSummariesForClub: { teamName: string; summary: AITeamSummary }[] = [];

    for (const teamDoc of teamsSnapshot.docs) {
      const team = { id: teamDoc.id, ...teamDoc.data() } as WithId<Team>;
      
      const playersQuery = db.collection('users').where('teamId', '==', team.id);
      const playersSnapshot = await playersQuery.get();
      
      if (playersSnapshot.empty) continue;
      
      const playersData: { userId: string; name: string; scores: WellnessScore; }[] = [];

      for (const playerDoc of playersSnapshot.docs) {
        const player = { id: playerDoc.id, ...playerDoc.data() } as WithId<UserProfile>;
        
        try {
            await sendNotification({
                userId: player.id,
                title: `Tijd voor je check-in, ${player.name.split(' ')[0]}!`,
                body: `Hoe was je dag? Vertel het aan je buddy.`,
                link: '/chat'
            });
            notificationCount++;
        } catch (e) {
            console.error(`Failed to send notification to user ${player.id}:`, e);
        }

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
        
        if (analysisResult?.summary) {
          const summaryId = `weekly-${getYear(today)}-${getISOWeek(today)}`;
          const summaryRef = teamDoc.ref.collection('summaries').doc(summaryId);
          
          await summaryRef.set({
            ...analysisResult.summary,
            id: summaryId,
            teamId: team.id,
            date: format(today, 'yyyy-MM-dd'),
          }, { merge: true });

          teamSummariesForClub.push({ teamName: team.name, summary: analysisResult.summary });
          analysisCount++;

          // After generating team summary, generate individual player updates
          for (const playerData of playersData) {
            try {
              const playerUpdateInput: PlayerUpdateInput = {
                playerName: playerData.name.split(' ')[0],
                playerScores: playerData.scores,
                teamAverageScores: analysisResult.summary,
              };

              const playerUpdateResult = await generatePlayerUpdate(playerUpdateInput);

              if (playerUpdateResult) {
                const updateRef = db.collection('users').doc(playerData.userId).collection('updates').doc();
                const updateData: PlayerUpdate = {
                  ...playerUpdateResult,
                  id: updateRef.id,
                  date: format(today, 'yyyy-MM-dd'),
                };
                await updateRef.set(updateData);
                
                // Send notification for the new update
                await sendNotification({
                  userId: playerData.userId,
                  title: `💡 Nieuw Weetje: ${playerUpdateResult.title}`,
                  body: playerUpdateResult.content.substring(0, 100) + '...',
                  link: '/dashboard'
                });
                notificationCount++;
              }
            } catch(e) {
                console.error(`Failed to generate player update for ${playerData.userId}:`, e);
            }
          }
        }

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
    
    if (teamSummariesForClub.length > 0) {
        try {
            const clubAnalysisInput: ClubAnalysisInput = {
                clubId: club.id,
                clubName: club.name,
                teamSummaries: teamSummariesForClub,
            };
            const clubInsightResult = await analyzeClubData(clubAnalysisInput);

            if (clubInsightResult) {
                const insightRef = clubDoc.ref.collection('clubUpdates').doc();
                const insightData: ClubUpdate = {
                    ...clubInsightResult,
                    id: insightRef.id,
                    date: format(new Date(), 'yyyy-MM-dd'),
                };
                await insightRef.set(insightData);
            }
        } catch (e) {
            console.error(`Failed to generate club-level insight for ${club.name}:`, e);
        }
    }
  }
  
  console.log(`[CRON ACTION] Finished analysis job. Teams analyzed: ${analysisCount}, Notifications sent: ${notificationCount}`);
  return { analysisCount, notificationCount };
}
