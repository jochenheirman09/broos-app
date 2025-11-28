
"use client";

import {
  Card,
  CardContent,
  CardDescription,
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
} from "lucide-react";
import { useUser } from "@/context/user-context";

export default function AboutPage() {
  const { userProfile } = useUser();
  const buddyName = userProfile?.buddyName || "Broos";

  const features = [
    {
      icon: <Sparkles className="h-8 w-8 text-primary" />,
      title: `Je Persoonlijke AI Buddy (${buddyName})`,
      description:
        `${buddyName} is een empathische psycholoog, gespecialiseerd in het welzijn van jonge atleten. Hij voert natuurlijke, ondersteunende gesprekken om je te helpen reflecteren op je dag.`,
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
      icon: <Users className="h-8 w-8 text-primary" />,
      title: "Veilige Ruimte",
      description:
        `Alle gesprekken zijn vertrouwelijk. ${buddyName} creëert een veilige, niet-oordelende omgeving waar je vrijuit kunt praten over wat je bezighoudt.`,
    },
    {
      icon: <AlertTriangle className="h-8 w-8 text-destructive" />,
      title: "Alert Systeem",
      description:
        `Als ${buddyName} alarmerende signalen opvangt in je gesprek, zoals extreme negativiteit of serieuze problemen, wordt er discreet een melding gemaakt naar de clubstaf zodat ze je kunnen ondersteunen.`,
    },
  ];

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader className="text-center">
          <Info className="mx-auto h-12 w-12 text-primary mb-4" />
          <CardTitle className="text-3xl">Over {buddyName}</CardTitle>
          <CardDescription className="text-lg">
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
      </Card>
    </div>
  );
}
