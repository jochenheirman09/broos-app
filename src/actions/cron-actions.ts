
'use server';
import { Firestore, FieldValue } from 'firebase-admin/firestore';
import { analyzeTeamData } from '../ai/flows/team-analysis-flow';
import { generatePlayerUpdate } from '../ai/flows/player-update-flow';
import { analyzeClubData } from '../ai/flows/club-analysis-flow';
import { sendNotification } from '../ai/flows/notification-flow';
import type { TeamAnalysisInput, NotificationInput, PlayerUpdateInput, ClubAnalysisInput, AITeamSummary, TeamInsight } from '../ai/types';
import type { UserProfile, Team, WellnessScore, WithId, ClubUpdate, PlayerUpdate } from '../lib/types';
import { getFirebaseAdmin } from '../ai/genkit';
import { formatInTimeZone } from 'date-fns-tz';

const TIME_ZONE = 'Europe/Brussels';

/**
 * Executes the full daily analysis job.
 * This function is designed to be triggered by a cron job (e.g., via a Cloud Scheduler).
 */
export async function runAnalysisJob() {
  const { adminDb: db } = await getFirebaseAdmin();
  console.log("[CRON] Starting nightly analysis job...");
  const today = formatInTimeZone(new Date(), TIME_ZONE, 'yyyy-MM-dd');

  try {
    // 1. Get all clubs
    const clubsSnapshot = await db.collection('clubs').get();
    if (clubsSnapshot.empty) {
        console.log("[CRON] No clubs found. Exiting job.");
        return { success: true, message: "No clubs to process." };
    }
    console.log(`[CRON] Found ${clubsSnapshot.size} clubs.`);

    for (const clubDoc of clubsSnapshot.docs) {
        const clubId = clubDoc.id;
        const clubName = clubDoc.data().name || 'Onbekende Club';
        console.log(`[CRON] Processing club: ${clubName} (${clubId})`);
        
        const allTeamSummariesForClub: { teamName: string; summary: AITeamSummary }[] = [];

        // 2. Get all teams within the club
        const teamsSnapshot = await db.collection('clubs').doc(clubId).collection('teams').get();
        if (teamsSnapshot.empty) {
            console.log(`[CRON] No teams found for club ${clubName}.`);
            continue;
        }
        console.log(`[CRON] Found ${teamsSnapshot.size} teams for club ${clubName}.`);

        for (const teamDoc of teamsSnapshot.docs) {
            const team = { id: teamDoc.id, ...teamDoc.data() } as WithId<Team>;
            console.log(`[CRON] Analyzing team: ${team.name} (${team.id})`);
            
            // 3. Get all players for the current team
            const playersQuery = db.collection('users').where('teamId', '==', team.id);
            const playersSnapshot = await playersQuery.get();
            
            if (playersSnapshot.empty) {
                console.log(`[CRON] No players found for team ${team.name}.`);
                continue;
            }
            console.log(`[CRON] Found ${playersSnapshot.size} players for team ${team.name}.`);

            const playersWithData: { playerProfile: UserProfile; scores: WellnessScore; }[] = [];
            const playersWithoutData: UserProfile[] = [];
            
            // 4. For each player, get their wellness score for today
            for (const playerDoc of playersSnapshot.docs) {
                const playerProfile = playerDoc.data() as UserProfile;
                const wellnessDoc = await db.collection('users').doc(playerProfile.uid).collection('wellnessScores').doc(today).get();

                if (wellnessDoc.exists) {
                    console.log(`[CRON] Data found for player ${playerProfile.uid}.`);
                    playersWithData.push({
                        playerProfile,
                        scores: wellnessDoc.data() as WellnessScore
                    });
                } else {
                    console.log(`[CRON] No data for ${today} for player ${playerProfile.uid}`);
                    playersWithoutData.push(playerProfile);
                }
            }

            // 5. Send reminder notifications
            for (const player of playersWithoutData) {
                console.log(`[CRON] Sending check-in reminder to ${player.name}`);
                const notificationInput: NotificationInput = {
                    userId: player.uid,
                    title: 'Vergeet je check-in niet!',
                    body: `Hey ${player.name.split(' ')[0]}, je buddy wacht op je om te horen hoe het gaat.`,
                    link: '/chat'
                };
                // Fire and forget
                sendNotification(notificationInput).catch(e => console.error(`[CRON] Failed to send notification to ${player.uid}`, e));
            }


            if (playersWithData.length > 0) {
                // 6. Run team-level analysis
                console.log(`[CRON] Running team analysis for ${team.name} with data from ${playersWithData.length} players.`);
                const teamAnalysisInput: TeamAnalysisInput = { 
                    teamId: team.id, 
                    teamName: team.name, 
                    playersData: playersWithData.map(p => ({ name: p.playerProfile.name, scores: p.scores }))
                };
                const teamAnalysisResult = await analyzeTeamData(teamAnalysisInput);

                if (teamAnalysisResult && teamAnalysisResult.summary && teamAnalysisResult.insight) {
                    allTeamSummariesForClub.push({ teamName: team.name, summary: teamAnalysisResult.summary });
                    
                    // 7. Save the staff update (team insight)
                    const staffUpdateRef = db.collection('clubs').doc(clubId).collection('teams').doc(team.id).collection('staffUpdates').doc();
                    const staffUpdateData: Omit<TeamInsight, 'id'> = { ...teamAnalysisResult.insight, date: today };
                    await staffUpdateRef.set({ ...staffUpdateData, id: staffUpdateRef.id });
                    console.log(`[CRON] Saved staff update for team ${team.name}`);

                    // 8. Generate and save individual player "weetjes"
                    for (const playerData of playersWithData) {
                        const playerUpdateInput: PlayerUpdateInput = {
                            playerName: playerData.playerProfile.name,
                            playerScores: playerData.scores,
                            teamAverageScores: teamAnalysisResult.summary
                        };
                        const playerUpdateResult = await generatePlayerUpdate(playerUpdateInput);

                        if (playerUpdateResult) {
                            const playerUpdateRef = db.collection('users').doc(playerData.playerProfile.uid).collection('updates').doc();
                            const playerUpdateData: Omit<PlayerUpdate, 'id'> = { 
                                ...playerUpdateResult, 
                                title: playerUpdateResult.title ?? "Persoonlijk Weetje",
                                content: playerUpdateResult.content ?? "Je nieuwe wellness-update staat klaar.",
                                category: playerUpdateResult.category ?? "Wellness",
                                date: today 
                            };
                            await playerUpdateRef.set({ ...playerUpdateData, id: playerUpdateRef.id });
                            console.log(`[CRON] Saved player update for ${playerData.playerProfile.name}`);
                        }
                    }
                }
            }
        } // End of team loop
        
        // 9. Run club-level analysis if there is data from multiple teams
        if (allTeamSummariesForClub.length > 0) {
            console.log(`[CRON] Running club analysis for ${clubName}.`);
            const clubAnalysisInput: ClubAnalysisInput = { clubId, clubName, teamSummaries: allTeamSummariesForClub };
            const clubInsightResult = await analyzeClubData(clubAnalysisInput);

            if (clubInsightResult) {
                const clubUpdateRef = db.collection('clubs').doc(clubId).collection('clubUpdates').doc();
                const clubUpdateData: Omit<ClubUpdate, 'id'> = { 
                    ...clubInsightResult, 
                    title: clubInsightResult.title ?? `Club Update ${today}`,
                    content: clubInsightResult.content ?? "Geen specifieke details beschikbaar voor deze update.",
                    category: clubInsightResult.category ?? "Club Trends",
                    date: today
                };
                await clubUpdateRef.set({ ...clubUpdateData, id: clubUpdateRef.id });
                console.log(`[CRON] Saved club update for ${clubName}`);
            }
        }
    } // End of club loop

     return { success: true, message: "Cron job finished successfully." };
  } catch (error) {
    console.error("[CRON] CRITICAL ERROR in runAnalysisJob:", error);
    return { success: false, message: "Cron job failed." };
  }
}
