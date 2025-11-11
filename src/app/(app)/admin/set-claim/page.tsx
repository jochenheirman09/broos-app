'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { User, CheckCircle, AlertCircle, Shield } from 'lucide-react';
import { useUser } from '@/context/user-context';
import { setResponsibleClaim } from '@/ai/flows/set-claim-flow';
import { useToast } from '@/hooks/use-toast';

export default function SetClaimPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{success: boolean, message: string} | null>(null);

  const handleSetClaim = async () => {
    if (!user || !user.email) {
        toast({
            variant: "destructive",
            title: "Fout",
            description: "Je moet ingelogd zijn om deze actie uit te voeren."
        });
        return;
    }

    setIsLoading(true);
    setResult(null);

    try {
        const response = await setResponsibleClaim({ uid: user.uid, email: user.email });
        setResult(response);
        if (response.success) {
            toast({
                title: "Succes!",
                description: "De claim is ingesteld. Log nu uit en opnieuw in.",
            });
        } else {
             toast({
                variant: "destructive",
                title: "Actie Mislukt",
                description: response.message,
            });
        }
    } catch (e: any) {
      const errorMessage = e.message || "Er is een onbekende fout opgetreden.";
      setResult({ success: false, message: errorMessage });
      toast({
        variant: "destructive",
        title: "Fout",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Niet Ingelogd</AlertTitle>
          <AlertDescription>
            Log in om deze pagina te gebruiken.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <Shield className="h-6 w-6 mr-3 text-primary" />
            Claim 'Responsible' Rol
          </CardTitle>
          <CardDescription>
            Gebruik deze eenmalige actie om de 'responsible' rol-claim voor uw account in te stellen. Dit is nodig om toegang te krijgen tot beheerdersfuncties.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Instructies</AlertTitle>
            <AlertDescription>
              1. Klik op de knop hieronder. <br/>
              2. Wacht op het succesbericht. <br/>
              3. **Log volledig uit en log dan opnieuw in** om de wijziging te activeren.
            </AlertDescription>
          </Alert>
          <Button onClick={handleSetClaim} disabled={isLoading} className="w-full" size="lg">
            {isLoading ? <Spinner size="small" className="mr-2" /> : <User className="mr-2 h-4 w-4" />}
            {isLoading ? 'Claim instellen...' : "Stel 'responsible' Claim in voor mijn Account"}
          </Button>

          {result && (
            <Alert variant={result.success ? "default" : "destructive"} className="mt-4">
                {result.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertTitle>{result.success ? "Succes" : "Fout"}</AlertTitle>
                <AlertDescription>
                    {result.message}
                </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
