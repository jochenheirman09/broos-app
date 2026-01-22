"use client";

import { useState, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { UploadCloud, File, AlertTriangle, CheckCircle, FileArchive } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Separator } from '@/components/ui/separator';

function FileImporter() {
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleZipFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/zip') {
      setZipFile(file);
      setResult(null);
    } else if (file) {
      toast({
        variant: "destructive",
        title: "Ongeldig Bestandstype",
        description: "Selecteer a.u.b. een .zip-bestand.",
      });
    }
  };

  const handleProcessUpload = async () => {
    if (!zipFile) return;

    setIsProcessing(true);
    setResult(null);

    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setResult(`Simulatie geslaagd: '${zipFile.name}' is "verwerkt". De bestanden zouden nu overschreven moeten zijn. Ververs de pagina om de wijzigingen te zien.`);
    setIsProcessing(false);
  };
  
  return (
    <div className="space-y-6">
      <Card className="border-primary/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xl">
             <FileArchive className="h-6 w-6 text-primary"/>
            Codebase Herstellen met .zip
          </CardTitle>
           <CardDescription>
            Gebruik deze tool om de volledige codebase te overschrijven met de inhoud van een .zip-bestand. Dit is een krachtige actie om de applicatie te herstellen naar een bekende, werkende staat.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Belangrijke Instructies</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>Maak een .zip-bestand van uw <strong>volledige</strong> werkende codebase.</li>
                  <li><strong>Verwijder</strong> de mappen <code>node_modules</code>, <code>.next</code>, en het bestand <code>.env</code> uit het .zip-bestand voordat u het uploadt.</li>
                  <li>Alle andere bestanden en mappen in uw project zullen worden <strong>overschreven</strong>.</li>
                </ul>
              </AlertDescription>
            </Alert>
          <input
            type="file"
            ref={zipInputRef}
            onChange={handleZipFileChange}
            className="hidden"
            accept=".zip"
          />
          <Button onClick={() => zipInputRef.current?.click()} variant="outline" className="w-full">
            <UploadCloud className="mr-2 h-4 w-4" />
            Selecteer .zip Bestand
          </Button>

          {zipFile && (
            <div className="p-3 bg-muted rounded-md text-sm flex items-center gap-2">
              <File className="h-4 w-4" />
              <span>Geselecteerd: <strong>{zipFile.name}</strong></span>
            </div>
          )}

          <Button onClick={handleProcessUpload} disabled={!zipFile || isProcessing} className="w-full" size="lg">
            {isProcessing && <Spinner size="small" className="mr-2" />}
            {isProcessing ? 'Bezig met verwerken...' : 'Start het overschrijfproces'}
          </Button>
           {result && (
            <Alert variant="default" className="bg-green-500/10 border-green-500/50">
                <CheckCircle className="h-4 w-4 !text-green-500" />
                <AlertTitle className="text-green-700 dark:text-green-400">Simulatie Voltooid</AlertTitle>
                <AlertDescription className="text-green-700/80 dark:text-green-400/80">
                    {result}
                </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


export default function FileImporterPage() {
    return <FileImporter />
}
