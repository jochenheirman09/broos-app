import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function DeprecatedPage() {

    return (
    <div className="container mx-auto py-8">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Pagina Gearchiveerd</CardTitle>
          <CardDescription>
            Deze migratiepagina is niet langer nodig.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Verouderd</AlertTitle>
                <AlertDescription>
                    Deze pagina was een tijdelijke oplossing en is nu vervangen door een betere team-management flow. U kunt deze pagina veilig negeren.
                </AlertDescription>
            </Alert>
        </CardContent>
      </Card>
    </div>
    )
}
