
"use client";

import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { UploadCloud } from "lucide-react";

export function KnowledgeBaseStats({ clubId }: { clubId: string }) {
  // We will not query the knowledge base here to prevent permission errors
  // if the collection does not exist yet. Instead, we show an informational message.
  return (
    <Alert>
      <UploadCloud className="h-4 w-4" />
      <AlertTitle>Kennisbank Management</AlertTitle>
      <AlertDescription>
        Deze functionaliteit is momenteel in ontwikkeling. Binnenkort kunt u hier documenten beheren om de kennis van de AI-buddy uit te breiden.
      </AlertDescription>
    </Alert>
  );
}
