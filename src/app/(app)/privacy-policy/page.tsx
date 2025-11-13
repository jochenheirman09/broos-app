
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Shield } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Shield className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl">Privacybeleid</CardTitle>
          </div>
          <CardDescription>
            Laatst bijgewerkt: {new Date().toLocaleDateString("nl-NL")}
          </CardDescription>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
          <h2>Inleiding</h2>
          <p>
            Dit is een placeholder voor uw privacybeleid. Het is van cruciaal
            belang dat u dit vervangt door een volledig, juridisch getoetst
            document, vooral omdat u gegevens van minderjarigen verwerkt.
          </p>

          <h2>Belangrijke Punten om op te nemen:</h2>
          <ul>
            <li>
              <strong>Welke gegevens worden verzameld:</strong> Wees specifiek.
              Noem e-mail, naam, geboortedatum, team/club-ID, en de inhoud van
              chats met de AI-buddy.
            </li>
            <li>
              <strong>Doel van de gegevensverzameling:</strong> Leg uit waarom u
              deze gegevens nodig heeft: voor accountbeheer, om de AI-buddy te
              laten functioneren, voor welzijnsanalyse en om stafleden te
              alarmeren bij serieuze problemen.
            </li>
            <li>
              <strong>Gegevens van minderjarigen:</strong> Beschrijf uw
              procedures voor het verwerken van gegevens van gebruikers onder de
              16 jaar, inclusief de noodzaak van ouderlijke toestemming.
            </li>
            <li>
              <strong>Delen van gegevens:</strong> Maak duidelijk dat
              persoonlijke chatdata vertrouwelijk is, maar dat geaggregeerde,
              anonieme trends en specifieke, ernstige alerts gedeeld kunnen
              worden met clubpersoneel.
            </li>
            <li>
              <strong>Bewaartermijnen:</strong> Definieer hoe lang u
              verschillende soorten gegevens bewaart (bijv. accountgegevens tot
              verwijdering, chatlogs voor 1 jaar).
            </li>
            <li>
              <strong>Beveiliging:</strong> Beschrijf de technische maatregelen
              die u neemt om de gegevens te beveiligen (bv. versleuteling,
              beveiligde servers via Firebase).
            </li>
            <li>
              <strong>Rechten van de gebruiker (GDPR):</strong> Leg uit hoe
              gebruikers (of hun ouders) hun gegevens kunnen inzien, corrigeren
              of laten verwijderen.
            </li>
            <li>
              <strong>Contactgegevens:</strong> Vermeld een duidelijk
              contactpunt voor privacygerelateerde vragen.
            </li>
          </ul>
          <p className="font-bold text-destructive">
            Raadpleeg een jurist om ervoor te zorgen dat uw privacybeleid
            volledig voldoet aan de GDPR en andere relevante wetgeving.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
