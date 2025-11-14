"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUser } from "@/context/user-context";
import { useFirestore } from "@/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
} from "firebase/firestore";
import type { UserProfile, Team, WellnessScore, WithId } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, PlayCircle, BarChart2 } from "lucide-react";
import Link from "next/link";
import { analyzeTeamData, TeamAnalysisInput } from "@/ai/flows/team-analysis-flow";
import { format, getISOWeek, getYear } from 'date-fns';


export default function AnalysisPage() {
  const { userProfile } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<string | null>(null);

  const handleStartAnalysis = async () => {
    if (!db || !userProfile?.clubId) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Clubinformatie niet gevonden.",
      });
      return;
    }

    setIsLoading(true);
    setLastAnalysis(null);

    try {
      // 1. Get all teams in the club
      const teamsRef = collection(db, `clubs/${userProfile.clubId}/teams`);
      const teamsSnapshot = await getDocs(teamsRef);
      const teams = teamsSnapshot.docs.map(
        (doc) => ({ ...doc.data(), id: doc.id } as WithId<Team>)
      );

      // 2. Get all players in the club
      const playersQuery = query(
        collection(db, "users"),
        where("clubId", "==", userProfile.clubId)
      );
      const playersSnapshot = await getDocs(playersQuery);
      const players = playersSnapshot.docs.map(
        (doc) => ({ ...doc.data(), id: doc.id } as WithId<UserProfile>)
      );

      let totalAnalyses = 0;
      const batch = writeBatch(db);

      // 3. For each team, gather data and run analysis
      for (const team of teams) {
        const teamPlayers = players.filter((p) => p.teamId === team.id);
        if (teamPlayers.length === 0) continue;

        const playersData = [];

        for (const player of teamPlayers) {
          // Get the latest wellness score for each player
          const wellnessQuery = query(
            collection(db, `users/${player.uid}/wellnessScores`)
          );
          const wellnessSnapshot = await getDocs(wellnessQuery);
          const scores = wellnessSnapshot.docs.map(d => d.data() as WellnessScore);
          
          // For simplicity, we'll just take the first score if available.
          // A real app might average scores over a week.
          if (scores.length > 0) {
            playersData.push({
              userId: player.uid,
              scores: scores[0], 
            });
          }
        }
        
        if (playersData.length > 0) {
            const analysisInput: TeamAnalysisInput = { teamId: team.id, playersData };
            const analysisResult = await analyzeTeamData(analysisInput);

            if (analysisResult?.summary) {
                totalAnalyses++;
                const today = new Date();
                const summaryId = `weekly-${getYear(today)}-${getISOWeek(today)}`;
                const summaryRef = doc(db, `clubs/${userProfile.clubId}/teams/${team.id}/summaries`, summaryId);
                batch.set(summaryRef, {
                    ...analysisResult.summary,
                    id: summaryId,
                    teamId: team.id,
                    date: format(today, 'yyyy-MM-dd'),
                });
            }
        }
      }
      
      if (totalAnalyses > 0) {
        await batch.commit();
        setLastAnalysis(`Analyse voltooid voor ${totalAnalyses} team(s). Samenvattingen zijn opgeslagen.`);
        toast({
          title: "Analyse voltooid",
          description: `Er zijn succesvol samenvattingen gegenereerd voor ${totalAnalyses} team(s).`,
        });
      } else {
        setLastAnalysis("Geen nieuwe data om te analyseren. Er zijn geen spelers met recente wellness-scores gevonden.");
      }

    } catch (error: any) {
      console.error("Analysis failed:", error);
      toast({
        variant: "destructive",
        title: "Analyse Mislukt",
        description: error.message || "Er is een onverwachte fout opgetreden.",
      });
      setLastAnalysis(`Fout: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center text-2xl">
                <BarChart2 className="h-6 w-6 mr-3" />
                Team Analyse
              </CardTitle>
              <CardDescription>
                Start hier een handmatige analyse van de welzijnsdata van je
                teams.
              </CardDescription>
            </div>
             <Link href="/dashboard" passHref>
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Terug naar Dashboard
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <p className="text-muted-foreground">
            Klik op de knop om de meest recente wellness-scores van al je teams
            te verzamelen en er een AI-gegenereerde samenvatting van te maken.
            Dit proces kan even duren.
          </p>
          <Button
            size="lg"
            onClick={handleStartAnalysis}
            disabled={isLoading}
            className="w-full max-w-xs"
          >
            {isLoading ? (
              <>
                <Spinner size="small" className="mr-2" />
                Analyse wordt uitgevoerd...
              </>
            ) : (
              <>
                <PlayCircle className="mr-2 h-5 w-5" />
                Start Analyse
              </>
            )}
          </Button>

          {(isLoading || lastAnalysis) && (
            <Alert className={`text-left ${isLoading ? 'animate-pulse' : ''}`}>
              <AlertTitle className="font-semibold">
                {isLoading ? 'Bezig met verwerken...' : 'Resultaat'}
              </AlertTitle>
              <AlertDescription>
                {isLoading ? 'De data wordt nu verzameld en geanalyseerd. Sluit dit venster niet.' : lastAnalysis}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
