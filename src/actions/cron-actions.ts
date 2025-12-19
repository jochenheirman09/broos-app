
'use server';
import { Firestore, WriteBatch } from 'firebase-admin/firestore';
import { analyzeTeamData } from '@/ai/flows/team-analysis-flow';
import { generatePlayerUpdate } from '@/ai/flows/player-update-flow';
import { analyzeClubData } from '@/ai/flows/club-analysis-flow';
import { sendNotification } from '@/ai/flows/notification-flow';
import type { TeamAnalysisInput, NotificationInput, PlayerUpdateInput, ClubAnalysisInput, AITeamSummary } from '@/ai/types';
import type { UserProfile, Team, WellnessScore, WithId, StaffUpdate, PlayerUpdate, ClubUpdate } from '@/lib/types';
import { getFirebaseAdmin } from '@/ai/genkit';
import { formatInTimeZone } from 'date-fns-tz';

const TIME_ZONE = 'Europe/Brussels';

/**
 * Sends a daily check-in reminder to all players.
 */
async function sendCheckInReminders(db: Firestore): Promise<number> {
  let notificationCount = 0;
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
        // This is a direct notification and is okay to send immediately.
        const result = await sendNotification(notificationInput);
        if (result.success) notificationCount++;
      } catch (e) {
        console.error(`[CRON] Failed to send reminder to user ${player.uid}:`, e);
      }
    }
  }
  return notificationCount;
}

/**
 * Analyzes wellness data for a single team and saves insights.
 */
async function analyzeSingleTeam(db: Firestore, team: WithId<Team>, today: string): Promise<{ teamSummary: AITeamSummary | null, insightGenerated: boolean, playerUpdatesGenerated: number }> {
    const teamDocRef = db.collection('clubs').doc(team.clubId).collection('teams').doc(team.id);
    const playersInTeamSnapshot = await db.collection('users').where('teamId', '==', team.id).get();
    
    if (playersInTeamSnapshot.empty) {
        console.log(`[CRON] Team ${team.name} has no players, skipping.`);
        return { teamSummary: null, insightGenerated: false, playerUpdatesGenerated: 0 };
    }

    const playersData: { playerProfile: UserProfile; scores: WellnessScore; }[] = [];
    for (const playerDoc of playersInTeamSnapshot.docs) {
        const wellnessDocRef = playerDoc.ref.collection('wellnessScores').doc(today);
        const wellnessDoc = await wellnessDocRef.get();
        if (wellnessDoc.exists) {
            playersData.push({ 
                playerProfile: playerDoc.data() as UserProfile, 
                scores: wellnessDoc.data() as WellnessScore 
            });
        }
    }

    if (playersData.length === 0) {
        console.log(`[CRON] No wellness data available today for any player in team ${team.name}.`);
        return { teamSummary: null, insightGenerated: false, playerUpdatesGenerated: 0 };
    }

    const analysisInput: TeamAnalysisInput = {
        teamId: team.id,
        teamName: team.name,
        playersData: playersData.map(p => ({ name: p.playerProfile.name, scores: p.scores })),
    };
    const teamAnalysisResult = await analyzeTeamData(analysisInput);

    let insightGenerated = false;
    let playerUpdatesGenerated = 0;
    const batch = db.batch();

    // Archive old staff updates
    const oldStaffUpdatesQuery = teamDocRef.collection('staffUpdates').where('status', '==', 'new');
    const oldStaffUpdatesSnapshot = await oldStaffUpdatesQuery.get();
    oldStaffUpdatesSnapshot.forEach((doc: any) => batch.update(doc.ref, { status: 'archived' }));

    // Save Staff Insight
    if (teamAnalysisResult?.insight) {
        const insightRef = teamDocRef.collection('staffUpdates').doc();
        batch.set(insightRef, { ...teamAnalysisResult.insight, id: insightRef.id, date: today, status: 'new' });
        insightGenerated = true;
    }

    // Generate Player Updates (Weetjes) and archive old ones
    if (teamAnalysisResult?.summary) {
        for (const { playerProfile, scores } of playersData) {
             const playerUpdatesRef = db.collection('users').doc(playerProfile.uid).collection('updates');
             const oldPlayerUpdatesQuery = await playerUpdatesRef.where('status', '==', 'new').get();
             oldPlayerUpdatesQuery.forEach((doc: any) => batch.update(doc.ref, { status: 'archived' }));
            
            const playerUpdateInput: PlayerUpdateInput = {
                playerName: playerProfile.name,
                playerScores: scores,
                teamAverageScores: teamAnalysisResult.summary,
            };
            const playerUpdateResult = await generatePlayerUpdate(playerUpdateInput);
            if (playerUpdateResult) {
                const updateRef = playerUpdatesRef.doc();
                batch.set(updateRef, { ...playerUpdateResult, id: updateRef.id, date: today, status: 'new' });
                playerUpdatesGenerated++;
            }
        }
    }

    await batch.commit();
    return { teamSummary: teamAnalysisResult?.summary || null, insightGenerated, playerUpdatesGenerated: 0 };
}


/**
 * Analyzes aggregated data for a single club and saves insights.
 */
async function analyzeSingleClub(db: Firestore, clubId: string, clubName: string, teamSummaries: { teamName: string; summary: AITeamSummary }[], today: string): Promise<boolean> {
    if (teamSummaries.length === 0) return false;
    
    const clubAnalysisInput: ClubAnalysisInput = { clubId, clubName, teamSummaries };
    const clubInsightResult = await analyzeClubData(clubAnalysisInput);

    if (clubInsightResult) {
        const clubUpdatesRef = db.collection('clubs').doc(clubId).collection('clubUpdates');
        
        // Archive old club updates
        const oldUpdatesSnapshot = await clubUpdatesRef.where('status', '==', 'new').get();
        const batch = db.batch();
        oldUpdatesSnapshot.forEach((doc: any) => batch.update(doc.ref, { status: 'archived' }));

        // Create new club update
        const insightRef = clubUpdatesRef.doc();
        batch.set(insightRef, { ...clubInsightResult, id: insightRef.id, date: today, status: 'new' });
        
        await batch.commit();
        return true;
    }
    return false;
}


/**
 * Executes the full daily analysis job.
 * This version ONLY generates data and does NOT send push notifications for insights.
 */
export async function runAnalysisJob() {
  console.log('[CRON ACTION] Starting full analysis job...');
  const { adminDb: db } = await getFirebaseAdmin();
  const today = formatInTimeZone(new Date(), TIME_ZONE, 'yyyy-MM-dd');
  
  // STEP 1: Send daily check-in reminders. This is time-sensitive and should happen as scheduled.
  const notificationCount = await sendCheckInReminders(db);
  console.log(`[CRON] Step 1 complete. Dispatched ${notificationCount} reminders.`);

  // STEP 2, 3 & 4: Analyze data and generate insights.
  console.log('[CRON] Starting data analysis for teams, players, and clubs...');
  let teamAnalysisCount = 0;
  let playerUpdateCount = 0;
  let clubAnalysisCount = 0;
  
  const clubsSnapshot = await db.collection('clubs').get();
  
  for (const clubDoc of clubsSnapshot.docs) {
    const clubId = clubDoc.id;
    const clubName = clubDoc.data().name;
    const teamSummariesForClub: { teamName: string; summary: AITeamSummary }[] = [];

    const teamsSnapshot = await clubDoc.ref.collection('teams').get();
    for (const teamDoc of teamsSnapshot.docs) {
        const team = { id: teamDoc.id, ...teamDoc.data() } as WithId<Team>;
        const { teamSummary, insightGenerated, playerUpdatesGenerated } = await analyzeSingleTeam(db, team, today);

        if (teamSummary) {
            teamSummariesForClub.push({ teamName: team.name, summary: teamSummary });
        }
        if (insightGenerated) teamAnalysisCount++;
        playerUpdateCount += playerUpdatesGenerated;
    }
    
    // Analyze club data based on team summaries for this club
    if (await analyzeSingleClub(db, clubId, clubName, teamSummariesForClub, today)) {
        clubAnalysisCount++;
    }
  }
  
  const result = `Job finished. Sent ${notificationCount} reminders. Generated ${teamAnalysisCount} team insights, ${playerUpdateCount} player updates, and ${clubAnalysisCount} club insights. Insight notifications are NOT sent by this job.`;
  console.log(`[CRON ACTION] ${result}`);
  return { success: true, message: result };
}
