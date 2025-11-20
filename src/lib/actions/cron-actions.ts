
'use server';

import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { analyzeTeamData, type TeamAnalysisInput, type TeamSummary } from '@/ai/flows/team-analysis-flow';
import { analyzeClubData, type ClubAnalysisInput } from '@/ai/flows/club-analysis-flow';
import { sendNotification } from '@/ai/flows/notification-flow';
import type { UserProfile, Team, WellnessScore, WithId, StaffUpdate, ClubUpdate, PlayerUpdate } from '@/lib/types';
import { format, getISOWeek, getYear } from 'date-fns';

export async function runCronJobs() {
  // Initialize Firebase Admin SDK if it hasn't been already, right here.
  if (!getApps().length) {
    initializeApp();
  }
  const db: Firestore = getFirestore();
  
  let analysisCount = 0;
  let notificationCount = 0;
  const today = new Date();
  const todayFormatted = format(today, 'yyyy-MM-dd');

  const clubsSnapshot = await db.collection('clubs').get();

  for (const clubDoc of clubsSnapshot.docs) {
    const club = { id: clubDoc.id, ...clubDoc.data() } as WithId<Pick<Club, 'id' | 'name' | 'ownerId'>>;
    const teamsSnapshot = await clubDoc.ref.collection('teams').get();
    
    const teamSummariesForClub: { teamName: string; summary: TeamSummary }[] = [];

    for (const teamDoc of teamsSnapshot.docs) {
      const team = { id: teamDoc.id, ...teamDoc.data() } as WithId<Team>;
      
      const playersQuery = db.collection('users').where('teamId', '==', team.id);
      const playersSnapshot = await playersQuery.get();
      
      if (playersSnapshot.empty) continue;
      
      const playersData: { userId: string; name: string; scores: WellnessScore }[] = [];
      const staffMembers: WithId<UserProfile>[] = [];

      for (const playerDoc of playersSnapshot.docs) {
        const user = { id: playerDoc.id, ...playerDoc.data() } as WithId<UserProfile>;
        
        if (user.role === 'player') {
            try {
                await sendNotification({
                    userId: user.id,
                    title: `Tijd voor je check-in, ${user.name.split(' ')[0]}!`,
                    body: `Hoe was je dag? Vertel het aan je buddy.`,
                    link: '/chat'
                });
                notificationCount++;
            } catch (e) {
                console.error(`Failed to send notification to user ${user.id}:`, e);
            }

            const wellnessSnapshot = await playerDoc.ref.collection('wellnessScores').orderBy('date', 'desc').limit(1).get();
            if (!wellnessSnapshot.empty) {
              const score = wellnessSnapshot.docs[0].data() as WellnessScore;
              playersData.push({
                userId: user.id,
                name: user.name,
                scores: score,
              });
            }
        } else if (user.role === 'staff') {
            staffMembers.push(user);
        }
      }

      if (playersData.length > 0) {
        const analysisInput: TeamAnalysisInput = { teamId: team.id, teamName: team.name, playersData };
        const analysisResult = await analyzeTeamData(analysisInput);
        
        if (analysisResult?.summary) {
          const summaryId = `weekly-${getYear(today)}-${getISOWeek(today)}`;
          const summaryRef = teamDoc.ref.collection('summaries').doc(summaryId);
          
          await summaryRef.set({
            ...analysisResult.summary,
            id: summaryId,
            teamId: team.id,
            date: todayFormatted,
          }, { merge: true });

          teamSummariesForClub.push({ teamName: team.name, summary: analysisResult.summary });
          analysisCount++;
        }

        if (analysisResult?.insight) {
            const insightRef = teamDoc.ref.collection('staffUpdates').doc();
            const insightData: StaffUpdate = {
                ...analysisResult.insight,
                id: insightRef.id,
                date: todayFormatted,
            };
            await insightRef.set(insightData);
            
            for (const staff of staffMembers) {
                await sendNotification({
                    userId: staff.id,
                    title: `Nieuw Team-inzicht: ${insightData.title}`,
                    body: `Er is een nieuw inzicht beschikbaar voor team ${team.name}. Bekijk het op je dashboard.`,
                    link: '/dashboard',
                });
            }
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
                    date: todayFormatted,
                };
                await insightRef.set(insightData);

                await sendNotification({
                    userId: club.ownerId,
                    title: `Nieuw Club-inzicht: ${insightData.title}`,
                    body: `Er is een nieuw club-breed inzicht beschikbaar. Bekijk het op je dashboard.`,
                    link: '/dashboard',
                });
            }
        } catch (e) {
            console.error(`Failed to generate club-level insight for ${club.name}:`, e);
        }
    }
  }

  const playersSnapshot = await db.collection('users').where('role', '==', 'player').get();
  for (const playerDoc of playersSnapshot.docs) {
      const updatesSnapshot = await playerDoc.ref.collection('updates').where('date', '==', todayFormatted).get();
      for (const updateDoc of updatesSnapshot.docs) {
          const update = updateDoc.data() as PlayerUpdate;
          try {
             await sendNotification({
                userId: playerDoc.id,
                title: `Nieuw weetje: ${update.title}`,
                body: 'Je buddy heeft een nieuw persoonlijk inzicht voor je op je dashboard.',
                link: '/dashboard',
            });
            notificationCount++;
          } catch(e) {
             console.error(`Failed to send 'weetje' notification to user ${playerDoc.id}:`, e);
          }
      }
  }

  return { analysisCount, notificationCount };
}
