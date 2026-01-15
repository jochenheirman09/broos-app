
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
            Welkom bij Broos 2.0. Wij hechten het grootste belang aan de privacy en veiligheid van onze gebruikers, in het bijzonder minderjarigen. Dit beleid legt uit welke gegevens we verzamelen, waarom we dat doen, en hoe we die beschermen.
          </p>
           <p className="font-bold text-destructive">
            LET OP: Dit is een concepttekst en dient als placeholder. Raadpleeg een jurist om ervoor te zorgen dat uw privacybeleid volledig voldoet aan de GDPR en andere relevante wetgeving voordat u de applicatie live zet.
          </p>

          <h2>1. Welke gegevens verzamelen wij?</h2>
          <ul>
            <li>
              <strong>Accountgegevens:</strong> Naam, e-mailadres, geboortedatum, rol (speler, staf, etc.), en team/club-affiliatie.
            </li>
            <li>
              <strong>Gespreksdata:</strong> De inhoud van de gesprekken die u voert met uw AI-buddy. Deze data is strikt vertrouwelijk.
            </li>
             <li>
              <strong>Welzijnsdata:</strong> Gegevens die de AI afleidt uit gesprekken, zoals scores voor stemming, stress, en slaap. Deze worden gebruikt voor uw persoonlijke dashboard.
            </li>
             <li>
              <strong>Technische data:</strong> Anonieme data over app-gebruik om de service te verbeteren.
            </li>
          </ul>

          <h2>2. Waarom verzamelen wij deze gegevens?</h2>
          <ul>
            <li>
              Om uw account te beheren en u toegang te geven tot de juiste functionaliteiten (speler- of stafdashboard).
            </li>
            <li>
              Om de AI-buddy in staat te stellen een persoonlijk en contextbewust gesprek met u te voeren.
            </li>
            <li>
              Om u persoonlijke inzichten en visualisaties te tonen op uw dashboard.
            </li>
             <li>
              Om geaggregeerde, anonieme rapportages te genereren voor clubstaf, zonder individuele data te onthullen.
            </li>
             <li>
              Om een alert-systeem te voeden dat, na uw expliciete toestemming, de staf kan waarschuwen bij ernstige welzijnsproblemen.
            </li>
          </ul>

          <h2>3. Delen van Gegevens</h2>
            <p>Uw privacy is onze prioriteit. We delen uw data als volgt:</p>
            <ul>
                <li><strong>Strikt Vertrouwelijk:</strong> Uw persoonlijke chatgesprekken worden met niemand gedeeld.</li>
                <li><strong>Met Toestemming:</strong> In het geval van een serieuze alert (bv. meldingen over mentale gezondheid), zal de AI u ALTIJD expliciet vragen of de details van dat specifieke bericht gedeeld mogen worden met de bevoegde clubstaf. Zonder uw "ja", wordt er alleen een anonieme melding gemaakt.</li>
                <li><strong>Anoniem & Geaggregeerd:</strong> Voor team- en clubrapportages worden alleen gemiddelden en trends gebruikt (bv. "het gemiddelde stressniveau van het team was 3.5/5"). Individuele scores zijn nooit herleidbaar.</li>
            </ul>

          <h2>4. Gegevens van Minderjarigen</h2>
            <p>Wij zijn ons ervan bewust dat we gegevens van minderjarigen verwerken. We vereisen dat gebruikers onder de 16 jaar toestemming hebben van een ouder of wettelijke voogd om deze app te gebruiken, zoals beschreven in onze Algemene Voorwaarden.</p>

           <h2>5. Uw Rechten (GDPR)</h2>
            <p>U heeft het recht om:</p>
            <ul>
                <li>Uw gegevens in te zien.</li>
                <li>Uw gegevens te corrigeren.</li>
                <li>Uw gegevens volledig te laten verwijderen (het recht op vergetelheid).</li>
            </ul>
            <p>Neem contact met ons op via [uw-contact-email] om gebruik te maken van deze rechten.</p>

        </CardContent>
      </Card>
    </div>
  );
}
