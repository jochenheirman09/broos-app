
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Trash2, ShieldAlert, Users, Wrench, PlayCircle } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { handleCleanup, handleConditionalUserCleanup, handleFixStuckOnboarding } from "@/actions/cleanup-actions";
import { handleRunAnalysisJob } from "@/actions/cron-actions";

function AnalysisJobCard() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const onRunJob = async () => {
    setIsLoading(true);
    try {
      const result = await handleRunAnalysisJob();
      if (result.success) {
        toast({
          title: "Analyse Voltooid!",
          description: result.message,
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Analyse Mislukt",
        description: error.message || "Er is een onbekende fout opgetreden.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <PlayCircle className="h-8 w-8 text-primary" />
          <div>
            <CardTitle className="text-2xl">Start Dagelijkse Analyse Job</CardTitle>
            <CardDescription>
              Voer handmatig de nachtelijke analyse en notificatie-taak uit.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-6">
          Deze actie simuleert de dagelijkse cron job. Het analyseert alle data van vandaag, genereert inzichten (weetjes) voor spelers, staf en club, en verstuurt notificaties naar gebruikers die nieuwe inzichten hebben.
        </p>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="default" className="w-full" size="lg">
              {isLoading ? <Spinner className="mr-2 h-5 w-5" /> : <PlayCircle className="mr-2 h-5 w-5" />}
              Start Handmatige Analyse
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Bevestig handmatige analyse</AlertDialogTitle>
              <AlertDialogDescription>
                Weet je zeker dat je de dagelijkse analyse job nu wilt starten? Dit kan enkele minuten duren en zal notificaties versturen.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isLoading}>
                Annuleren
              </AlertDialogCancel>
              <AlertDialogAction onClick={onRunJob} disabled={isLoading}>
                {isLoading && <Spinner size="small" className="mr-2" />}
                Ja, start analyse
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}


function ConditionalCleanupCard() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const onConditionalCleanup = async () => {
    setIsLoading(true);
    try {
      const result = await handleConditionalUserCleanup();
      if (result.success) {
        toast({
          title: "Opruimen Voltooid!",
          description: result.message,
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Opruimen Mislukt",
        description: error.message || "Er is een onbekende fout opgetreden.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <CardTitle className="text-2xl">Conditionele Gebruikers-opschoning</CardTitle>
            <CardDescription>
              Verwijder testgebruikers op basis van e-maildomein.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-6">
          Deze actie verwijdert alle gebruikers (en hun data) wiens e-mailadres <strong>niet</strong> eindigt op <code>@gmail.com</code> of <code>@hotmail.com</code>. Dit is handig om testgebruikers met tijdelijke e-mailadressen op te ruimen.
        </p>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="w-full" size="lg">
              <Trash2 className="mr-2 h-5 w-5" />
              Start Conditionele Opschoning
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Bevestig conditionele opschoning</AlertDialogTitle>
              <AlertDialogDescription>
                Weet je zeker dat je alle gebruikers wilt verwijderen behalve die met een Gmail- of Hotmail-adres? Deze actie is onomkeerbaar.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isLoading}>
                Annuleren
              </AlertDialogCancel>
              <AlertDialogAction onClick={onConditionalCleanup} disabled={isLoading}>
                {isLoading && <Spinner size="small" className="mr-2" />}
                Ja, start opschoning
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

function OnboardingFixCard() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const onFixOnboarding = async () => {
    setIsLoading(true);
    try {
      const result = await handleFixStuckOnboarding();
      if (result.success) {
        toast({
          title: "Reparatie Voltooid!",
          description: result.message,
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Reparatie Mislukt",
        description: error.message || "Er is een onbekende fout opgetreden.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Wrench className="h-8 w-8 text-primary" />
          <div>
            <CardTitle className="text-2xl">Repareer Vastgelopen Onboarding</CardTitle>
            <CardDescription>
              Zet de onboarding-status van vastgelopen gebruikers op voltooid.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-6">
          Deze actie zoekt naar gebruikers die gesprekken zijn gestart maar wiens <code>onboardingCompleted</code> status nog op <code>false</code> staat. Voor deze gebruikers wordt de status op <code>true</code> gezet, zodat ze de normale wellness-analyse kunnen starten.
        </p>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="default" className="w-full" size="lg">
              {isLoading ? <Spinner className="mr-2 h-5 w-5" /> : <Wrench className="mr-2 h-5 w-5" />}
              Start Reparatie
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Bevestig Reparatie</AlertDialogTitle>
              <AlertDialogDescription>
                Weet je zeker dat je de onboarding-status wilt repareren voor alle vastgelopen gebruikers?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isLoading}>
                Annuleren
              </AlertDialogCancel>
              <AlertDialogAction onClick={onFixOnboarding} disabled={isLoading}>
                {isLoading && <Spinner size="small" className="mr-2" />}
                Ja, start reparatie
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}


function FullCleanupCard() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const onFullCleanup = async () => {
    setIsLoading(true);
    try {
      const result = await handleCleanup();
      if (result.success) {
        toast({
          title: "Database Opgeruimd!",
          description: result.message,
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Opruimen Mislukt",
        description: error.message || "Er is een onbekende fout opgetreden.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
      <Card className="border-destructive">
        <CardHeader>
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-8 w-8 text-destructive" />
            <div>
              <CardTitle className="text-2xl text-destructive">
                Volledige Database Reset
              </CardTitle>
              <CardDescription>
                Deze actie is onomkeerbaar. Gebruik met uiterste voorzichtigheid.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="mb-6">
            Klik op de onderstaande knop om alle documenten in de{" "}
            <code className="bg-muted px-1 py-0.5 rounded">users</code> en{" "}
            <code className="bg-muted px-1 py-0.5 rounded">clubs</code>{" "}
            collecties (inclusief alle subcollecties zoals teams, chats, etc.)
            permanent te verwijderen.
          </p>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full" size="lg">
                <Trash2 className="mr-2 h-5 w-5" />
                Start Volledige Reset
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Weet u het absoluut zeker?</AlertDialogTitle>
                <AlertDialogDescription>
                  U staat op het punt alle gebruikers-, club- en teamgegevens te
                  verwijderen. Deze actie kan niet ongedaan worden gemaakt.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isLoading}>
                  Annuleren
                </AlertDialogCancel>
                <AlertDialogAction onClick={onFullCleanup} disabled={isLoading}>
                  {isLoading && <Spinner size="small" className="mr-2" />}
                  Ja, alles verwijderen
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
  )
}

export default function CleanupDbPage() {
  return (
    <div className="container mx-auto py-8">
        <div className="space-y-8 max-w-xl mx-auto">
            <AnalysisJobCard />
            <OnboardingFixCard />
            <ConditionalCleanupCard />
            <FullCleanupCard />
        </div>
    </div>
  );
}
