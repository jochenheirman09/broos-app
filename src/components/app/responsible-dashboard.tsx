
"use client";

import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import type { Club, Team } from "@/lib/types";
import { Spinner } from "../ui/spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Building, BookOpen, RefreshCw, KeyRound, Copy, Users, LogOut, PlusCircle, AlertTriangle, Archive } from "lucide-react";
import { Separator } from "../ui/separator";
import { CreateTeamForm } from "./create-team-form";
import { TeamList } from "./team-list";
import { useCallback, useState, useEffect } from "react";
import { ClubUpdates } from "./club-updates";
import { Button } from "../ui/button";
import { generateClubInvitationCode } from "@/actions/club-actions";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { useUser } from "@/context/user-context";
import { StaffUpdates } from "./staff-updates";
import { KnowledgeBaseManager } from "./knowledge-base-stats";
import { AlertList } from "./alert-list";
import { Alert, AlertTitle, AlertDescription } from "../ui/alert";

function ResponsibleNoClub() {
  const { logout } = useUser();
  return (
    <Card className="bg-accent/20 border-accent">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl">
          <Building className="h-7 w-7 mr-3 text-accent-foreground" />
          Creëer of Herstel Je Club
        </CardTitle>
        <CardDescription className="text-accent-foreground/80">
          Om de app te blijven gebruiken, moet je een club aanmaken of je opnieuw aansluiten bij je bestaande club om je account te herstellen.
           Als je dit net hebt gedaan, moet je eerst uitloggen en opnieuw inloggen.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row gap-4">
        <Link href="/create-club" passHref>
          <Button variant="accent" size="lg">
            <PlusCircle className="mr-2 h-5 w-5" />
            Club Aanmaken of Herstellen
          </Button>
        </Link>
        <Button variant="outline" size="lg" onClick={logout}>
          <LogOut className="mr-2 h-5 w-5" />
          Uitloggen en Opnieuw Inloggen
        </Button>
      </CardContent>
    </Card>
  );
}


function ClubManagement({ clubId }: { clubId: string }) {
  const { userProfile } = useUser();
  const { toast } = useToast();
  const [refreshKey, setRefreshKey] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const firestore = useFirestore();

  const clubRef = useMemoFirebase(
    () => (firestore && clubId ? doc(firestore, "clubs", clubId) : null),
    [firestore, clubId]
  );
  const { data: club, isLoading } = useDoc<Club>(clubRef);

  const handleTeamChange = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  const handleGenerateCode = async () => {
    if (!club) return;
    setIsGenerating(true);
    try {
      const result = await generateClubInvitationCode(club.id);
      if (result.success) {
        toast({
            title: "Code gegenereerd!",
            description: `Een nieuwe uitnodigingscode is gegenereerd voor ${club.name}. De lijst wordt vernieuwd.`,
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: error.message || "Kon geen uitnodigingscode genereren.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (!club?.invitationCode) return;
    navigator.clipboard.writeText(club.invitationCode).then(
      () => {
        toast({
          title: "Code gekopieerd!",
          description: "De clubcode is naar je klembord gekopieerd.",
        });
      },
      (err) => {
        toast({
          variant: "destructive",
          title: "Kopiëren mislukt",
          description: "Kon de code niet kopiëren. Probeer het handmatig.",
        });
      }
    );
  };

  if (isLoading || !userProfile) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center p-8">
          <Spinner />
        </CardContent>
      </Card>
    );
  }

  if (!club) {
    return (
        <Card>
            <CardContent className="p-6">
                 <p className="text-muted-foreground">
                    Clubgegevens worden geladen of zijn niet beschikbaar...
                </p>
            </CardContent>
        </Card>
    );
  }
  
  const claimsReady = !!(userProfile && userProfile.role && userProfile.clubId);


  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                  <CardTitle className="flex items-center text-2xl font-bold">
                    <Building className="h-7 w-7 mr-3 text-primary" />
                    {club.name}
                  </CardTitle>
                  <CardDescription>
                    Bekijk hieronder club-brede inzichten en team-inzichten die dagelijks automatisch worden bijgewerkt.
                  </CardDescription>
              </div>
               <div className="flex items-center gap-2 w-full sm:w-auto">
                    {club.invitationCode ? (
                         <div className="flex items-center gap-2 w-full">
                           <span className="font-mono text-base bg-muted px-4 py-2 rounded-lg shadow-clay-inset flex-grow text-center">
                               {club.invitationCode}
                           </span>
                           <Button variant="ghost" size="icon" onClick={copyToClipboard} aria-label="Kopieer club code">
                               <Copy className="h-5 w-5" />
                           </Button>
                           <Button variant="ghost" size="icon" onClick={handleGenerateCode} disabled={isGenerating} aria-label="Genereer nieuwe club code">
                               <RefreshCw className="h-5 w-5" />
                           </Button>
                       </div>
                    ) : (
                       <Button
                            variant="outline"
                            className="w-full"
                            onClick={handleGenerateCode}
                            disabled={isGenerating}
                        >
                            {isGenerating ? <Spinner size="small" className="mr-2" /> : <KeyRound className="mr-2 h-4 w-4" />}
                            Genereer Club Code
                        </Button>
                    )}
                </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-muted-foreground">Club-brede Inzichten</h3>
            <ClubUpdates clubId={club.id} />
          </div>
          <Separator />
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-muted-foreground flex items-center gap-2">
                Team Inzichten
            </h3>
            <StaffUpdates clubId={club.id} />
          </div>
        </CardContent>
      </Card>

       <Card>
        <CardHeader>
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div className="flex-grow">
              <CardTitle className="flex items-center text-2xl">
                <AlertTriangle className="h-6 w-6 mr-3 text-destructive" />
                Actieve Alerts
              </CardTitle>
              <CardDescription>
                Een overzicht van alle nieuwe, zorgwekkende signalen binnen de club.
              </CardDescription>
            </div>
            <Link href="/alerts/archive" passHref>
              <Button variant="outline" className="w-full sm:w-auto">
                Bekijk Archief
                <Archive className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {claimsReady ? (
              <AlertList status="new" />
          ) : (
              <div className="flex justify-center items-center h-20"><Spinner /></div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle className="flex items-center text-2xl">
                <Users className="h-6 w-6 mr-3" />
                Team Chat
            </CardTitle>
            <CardDescription>
                Start een gesprek met een speler of staflid binnen je club.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Link href="/p2p-chat" passHref>
                <Button>Open Team Chat</Button>
            </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Team Management</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="text-xl font-semibold mb-4">Jouw Teams</h3>
            <TeamList
              clubId={club.id}
              key={refreshKey}
              onTeamChange={handleTeamChange}
            />
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-4">
              Voeg een Nieuw Team Toe
            </h3>
            <CreateTeamForm clubId={club.id} onTeamCreated={handleTeamChange} />
          </div>
        </CardContent>
      </Card>
      
      <KnowledgeBaseManager />
    </>
  );
}


export function ResponsibleDashboard({ clubId }: { clubId?: string }) {
    if (!clubId) {
        return <ResponsibleNoClub />;
    }
  return <ClubManagement clubId={clubId} />;
}
