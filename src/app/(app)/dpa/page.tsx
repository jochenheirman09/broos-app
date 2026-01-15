
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Handshake } from "lucide-react";

export default function DpaPage() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Handshake className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl">Verwerkersovereenkomst (DPA)</CardTitle>
          </div>
          <CardDescription>
            Laatst bijgewerkt: {new Date().toLocaleDateString("nl-NL")}
          </CardDescription>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
          <h2>Inleiding</h2>
          <p>
            Deze Verwerkersovereenkomst (&quot;DPA&quot;) vormt een aanvulling op de Algemene Voorwaarden tussen Broos 2.0 (&quot;Verwerker&quot;) en de klant (uw club, de &quot;Verwerkingsverantwoordelijke&quot;). Deze DPA legt de rechten en plichten vast met betrekking tot de verwerking van persoonsgegevens.
          </p>
          <p className="font-bold text-destructive">
            WAARSCHUWING: Dit is een placeholder en een sterk vereenvoudigd voorbeeld. Een DPA is een complex juridisch document. Raadpleeg een jurist om een waterdichte overeenkomst op te stellen die voldoet aan de GDPR.
          </p>

          <h3>Artikel 1: Definities</h3>
          <p>
            De termen die in deze DPA worden gebruikt, zoals &quot;persoonsgegevens&quot;, &quot;verwerking&quot;, &quot;verwerkingsverantwoordelijke&quot;, en &quot;verwerker&quot;, hebben dezelfde betekenis als in de Algemene Verordening Gegevensbescherming (AVG/GDPR).
          </p>
          
          <h3>Artikel 2: Onderwerp van de verwerking</h3>
          <p>De Verwerker verbindt zich ertoe om in opdracht van de Verwerkingsverantwoordelijke de persoonsgegevens van spelers en stafleden te verwerken ten behoeve van het aanbieden van de Broos 2.0-applicatie, gericht op het monitoren en bevorderen van mentaal welzijn.</p>

          <h3>Artikel 3: Plichten van de Verwerker (Broos 2.0)</h3>
          <ul>
            <li>De persoonsgegevens uitsluitend te verwerken voor de doeleinden zoals hierboven beschreven.</li>
            <li>Passende technische en organisatorische beveiligingsmaatregelen te treffen (zoals encryptie, toegangscontrole via Firestore-regels).</li>
            <li>Geheimhouding te waarborgen van de persoonsgegevens.</li>
            <li>De Verwerkingsverantwoordelijke bij te staan bij het vervullen van diens plichten onder de GDPR, zoals het uitvoeren van verzoeken van betrokkenen (recht op inzage, verwijdering, etc.).</li>
            <li>In geval van een datalek de Verwerkingsverantwoordelijke onverwijld te informeren.</li>
          </ul>

          <h3>Artikel 4: Plichten van de Verwerkingsverantwoordelijke (De Club)</h3>
          <ul>
            <li>Zeker te stellen dat er een wettelijke grondslag is voor de verwerking van persoonsgegevens (bv. toestemming).</li>
            <li>Voor minderjarige gebruikers, verifieerbare ouderlijke toestemming te verkrijgen en te documenteren.</li>
            <li>De gebruikers (spelers, staf) adequaat te informeren over de verwerking van hun gegevens.</li>
          </ul>

          <h3>Artikel 5: Subverwerkers</h3>
          <p>De Verwerker maakt gebruik van Google Cloud Platform (inclusief Firebase) als subverwerker. De Verwerker zal geen andere subverwerkers inschakelen zonder voorafgaande schriftelijke toestemming van de Verwerkingsverantwoordelijke.</p>

        </CardContent>
      </Card>
    </div>
  );
}
