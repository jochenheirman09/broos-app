
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
            Dit is een placeholder voor uw algemene voorwaarden. Het is van
            cruciaal belang dat u dit vervangt door een volledig, juridisch
            getoetst document.
          </p>

          <h2>Belangrijke Punten om op te nemen:</h2>
          <ul>
            <li>
              <strong>Definitie van de Dienst:</strong> Beschrijf wat de Broos
              2.0-app doet: een AI-gestuurde buddy voor het mentaal welzijn van
              jonge sporters.
            </li>
            <li>
              <strong>Toestemming voor minderjarigen:</strong> Neem een clausule
              op die expliciet vermeldt dat gebruikers onder de 16 jaar
              toestemming van hun ouders of wettelijke voogd nodig hebben om de
              app te gebruiken. Dit dekt u juridisch in voor de toekomstige
              implementatie van een ouderlijk toestemmingsmechanisme.
            </li>
            <li>
              <strong>Gebruiksregels:</strong> Verbied misbruik van de app, het
              invoeren van illegale of schadelijke content, en het proberen te
              hacken van de service.
            </li>
            <li>
              <strong>Rol van de AI:</strong> Maak duidelijk dat de AI-buddy
              een ondersteunend hulpmiddel is en geen vervanging voor
              professionele medische of psychologische hulp.
            </li>
            <li>
              <strong>Beperking van Aansprakelijkheid:</strong> Vrijwaar uw
              bedrijf van aansprakelijkheid voor beslissingen die gebruikers
              nemen op basis van de interacties met de AI.
            </li>
            <li>
              <strong>Intellectueel Eigendom:</strong> Stel dat de app, de
              merknaam en alle door de AI gegenereerde content (zoals 'weetjes'
              en samenvattingen) eigendom zijn van uw bedrijf.
            </li>
            <li>
              <strong>Beëindiging van het account:</strong> Beschrijf onder
              welke omstandigheden een account kan worden opgeschort of
              verwijderd (bijv. bij misbruik).
            </li>
          </ul>
          <p className="font-bold text-destructive">
            Raadpleeg een jurist om ervoor te zorgen dat uw algemene voorwaarden
            juridisch waterdicht zijn en aansluiten bij uw bedrijfsmodel.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
