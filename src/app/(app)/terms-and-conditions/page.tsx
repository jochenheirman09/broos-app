
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function TermsAndConditionsPage() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <FileText className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl">Algemene Voorwaarden</CardTitle>
          </div>
          <CardDescription>
            Laatst bijgewerkt: {new Date().toLocaleDateString("nl-NL")}
          </CardDescription>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
          <h2>Inleiding</h2>
          <p>
            Welkom bij Broos 2.0. Door deze applicatie te gebruiken, gaat u akkoord met deze voorwaarden.
          </p>
           <p className="font-bold text-destructive">
            LET OP: Dit is een concepttekst en dient als placeholder. Raadpleeg een jurist om ervoor te zorgen dat uw algemene voorwaarden volledig en juridisch bindend zijn.
          </p>
          
          <h2>1. Gebruik van de Dienst</h2>
            <p>Broos 2.0 is een hulpmiddel voor mentaal welzijn, geen medisch of therapeutisch apparaat. De AI-buddy is ontworpen als ondersteunende partner en is geen vervanging voor professionele psychologische of medische hulp. Beslissingen die u neemt op basis van interacties met de AI zijn uw eigen verantwoordelijkheid.</p>

          <h2>2. Toestemming voor Minderjarigen</h2>
            <p>Indien u jonger bent dan 16 jaar, bevestigt u door gebruik te maken van deze app dat u toestemming heeft van een ouder of wettelijke voogd. Wij behouden ons het recht voor om mechanismen te implementeren om deze toestemming te verifiëren.</p>
          
          <h2>3. Intellectueel Eigendom</h2>
            <p>Alle content, de merknaam "Broos 2.0", de software, en de door de AI gegenereerde inzichten en samenvattingen zijn intellectueel eigendom van de makers van deze applicatie en mogen niet zonder toestemming worden gekopieerd of verspreid.</p>

          <h2>4. Gedragsregels</h2>
            <p>U stemt ermee in de applicatie niet te gebruiken voor illegale doeleinden, het lastigvallen van anderen, of het proberen te omzeilen van de beveiligingsmaatregelen. Misbruik kan leiden tot onmiddellijke beëindiging van uw account.</p>

            <h2>5. Beperking van Aansprakelijkheid</h2>
            <p>De makers van Broos 2.0 zijn niet aansprakelijk voor enige directe of indirecte schade die voortvloeit uit het gebruik of de onmogelijkheid tot gebruik van de applicatie.</p>
        </CardContent>
      </Card>
    </div>
  );
}
