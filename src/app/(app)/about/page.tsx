
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  HeartPulse,
  Info,
  MessageSquare,
  Sparkles,
  Users,
  AlertTriangle,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { useUser } from "@/context/user-context";
import packageJson from "../../../../package.json";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AboutPage() {
  const { userProfile } = useUser();
  const buddyName = userProfile?.buddyName || "Broos";
  const appVersion = packageJson.version;
  const commitHash = process.env.NEXT_PUBLIC_GIT_COMMIT_SHA;

  const features = [
    {
      icon: <Sparkles className="h-8 w-8 text-primary" />,
      title: `Je Persoonlijke AI Buddy (${buddyName})`,
      description:
        `${buddyName} is een empathische applicatie, gedreven door AI en ondersteund door specifieke psychologische documentatie, gespecialiseerd in het welzijn van jonge atleten.`,
    },
    {
      icon: <HeartPulse className="h-8 w-8 text-primary" />,
      title: "Welzijnsanalyse",
      description:
        `Tijdens het gesprek analyseert ${buddyName} op de achtergrond je stemming, stress, slaap en andere belangrijke welzijnsfactoren. Deze analyse voedt je persoonlijke dashboard.`,
    },
    {
      icon: <MessageSquare className="h-8 w-8 text-primary" />,
      title: "Contextbewuste Gesprekken",
      description:
        `${buddyName} houdt rekening met jouw schema, zoals trainingen en wedstrijden, om relevante en tijdige vragen te stellen. Het voelt als een echt gesprek, geen interview.`,
    },
    {
      icon: <ShieldCheck className="h-8 w-8 text-green-500" />,
      title: "Jouw Data, Jouw Controle",
      description:
        "Gesprekken zijn 100% privé. Niemand kan ze lezen. Stafleden zien alleen anonieme teamgemiddelden (bv. 'de gemiddelde slaapscore was 3/5'). Voor het delen van details over een specifieke alert wordt ALTIJD je expliciete toestemming gevraagd.",
    },
    {
      icon: <Users className="h-8 w-8 text-primary" />,
      title: "Veilige & Private Ruimte",
      description:
        "Jouw gesprekken met Broos zijn 100% privé. Niemand anders binnen de club, ook niet de staf, kan deze gesprekken inzien. Jouw data is van jou.",
    },
    {
      icon: <AlertTriangle className="h-8 w-8 text-destructive" />,
      title: "Alert Systeem met Toestemming",
      description:
        `Als ${buddyName} een ernstig signaal opvangt, zal het ALTIJD eerst jouw toestemming vragen voordat er een discrete melding wordt gemaakt naar de clubstaf. Jij behoudt de controle.`,
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
           <div className="relative flex w-full justify-center items-center">
             <div className="absolute left-0">
               <Link href="/dashboard" passHref>
                  <Button variant="ghost" size="icon">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
             </div>
             <div className="text-center">
                <Info className="mx-auto h-12 w-12 text-primary mb-4" />
                <CardTitle className="text-3xl">Over {buddyName}</CardTitle>
             </div>
           </div>
          <CardDescription className="text-lg text-center pt-2">
            Jouw partner in mentaal welzijn voor jonge sporters.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-6">
          {features.map((feature, index) => (
            <Card key={index} className="bg-card/50">
              <CardHeader>
                <div className="flex items-center gap-4">
                  {feature.icon}
                  <CardTitle>{feature.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </CardContent>
        <CardFooter>
            <p className="w-full text-center text-sm text-muted-foreground">
                Versie: {appVersion} (commit: {commitHash ? commitHash.substring(0, 7) : 'lokaal'})
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
