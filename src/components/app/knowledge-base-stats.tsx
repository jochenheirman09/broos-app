
"use client";

import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { UploadCloud } from "lucide-react";

export function KnowledgeBaseStats({ clubId }: { clubId: string }) {
  // Omdat de `knowledge_base` collectie niet gegarandeerd bestaat en de AI-buddy
  // deze nog niet actief gebruikt in alle scenario's, zullen we hier niet proberen
  // de collectie te querieën. Dit voorkomt permissiefouten.
  // In plaats daarvan tonen we een informatieve boodschap aan de gebruiker.

  return (
    <Alert>
      <UploadCloud className="h-4 w-4" />
      <AlertTitle>Kennisbank Management</AlertTitle>
      <AlertDescription>
        Upload documenten (bv. PDF's) naar de `documents/` map in uw Firebase Storage om de AI-buddy van extra kennis te voorzien. Zodra documenten zijn verwerkt, zullen de statistieken hier verschijnen.
      </AlertDescription>
    </Alert>
  );
}
