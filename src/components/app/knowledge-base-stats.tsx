
"use client";

import { useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Spinner } from "../ui/spinner";
import { UploadCloud, BrainCircuit, FileText, CheckCircle, AlertCircle, Clock } from "lucide-react";
import type { KnowledgeDocument, WithId } from "@/lib/types";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { useUser } from "@/context/user-context";
import { ingestDocument } from "@/ai/flows/ingest-flow";
import { useToast } from "@/hooks/use-toast";

const statusIcons = {
  pending: <Clock className="h-4 w-4 text-yellow-500" />,
  ingesting: <Spinner size="small" />,
  completed: <CheckCircle className="h-4 w-4 text-green-500" />,
  error: <AlertCircle className="h-4 w-4 text-red-500" />,
}

function DocumentItem({ doc }: { doc: WithId<KnowledgeDocument> }) {
  return (
    <div className="flex items-center justify-between p-3 border-b last:border-b-0">
      <div className="flex items-center gap-3">
        <FileText className="h-5 w-5 text-muted-foreground" />
        <span className="font-medium truncate">{doc.name}</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground capitalize">
        {statusIcons[doc.status]}
        <span>{doc.status}</span>
      </div>
    </div>
  )
}

export function KnowledgeBaseManager() {
  const { userProfile } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const docsQuery = useMemoFirebase(() => {
    if (userProfile?.role !== 'responsible') return null;
    return query(collection(db, `knowledge_base`), orderBy("ingestedAt", "desc"));
  }, [userProfile?.role, db]);

  const { data: documents, isLoading, error } = useCollection<KnowledgeDocument>(docsQuery);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userProfile?.clubId) return;

    setIsUploading(true);

    try {
        const fileContent = await file.text();
        const result = await ingestDocument({
            fileName: file.name,
            fileContent,
            clubId: userProfile.clubId,
        });

        if (result.success) {
            toast({
                title: "Upload Geslaagd",
                description: `Het document "${file.name}" wordt verwerkt.`
            });
        } else {
            throw new Error(result.message);
        }

    } catch (error: any) {
        console.error("Upload failed:", error);
        toast({
            variant: "destructive",
            title: "Upload Mislukt",
            description: error.message || "Kon het bestand niet uploaden."
        })
    } finally {
        setIsUploading(false);
        if(fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }
  };
  
  if (userProfile?.role !== 'responsible') {
    return (
        <Alert variant="destructive">
            <AlertTitle>Geen Toegang</AlertTitle>
            <AlertDescription>Alleen een clubverantwoordelijke kan de kennisbank beheren.</AlertDescription>
        </Alert>
    )
  }

  return (
    <Card className="bg-card/30">
      <CardContent className="p-4 space-y-4">
        <Button onClick={handleUploadClick} className="w-full" disabled={isUploading}>
          {isUploading ? <Spinner size="small" className="mr-2"/> : <UploadCloud className="mr-2 h-4 w-4" />}
          {isUploading ? "Verwerken..." : "Document uploaden"}
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept=".txt,.md"
          disabled={isUploading}
        />

        <div className="border rounded-lg">
          {isLoading && <div className="p-4 text-center"><Spinner /></div>}
          
          {!isLoading && error && (
             <Alert variant="destructive">
                <AlertTitle>Fout</AlertTitle>
                <AlertDescription>Kon documenten niet laden. Controleer of je de juiste permissies hebt.</AlertDescription>
             </Alert>
          )}

          {!isLoading && documents && documents.length > 0 && (
            <div>
              {documents.map(doc => <DocumentItem key={doc.id} doc={doc} />)}
            </div>
          )}

          {!isLoading && (!documents || documents.length === 0) && (
            <div className="p-8 text-center text-muted-foreground">
              <BrainCircuit className="mx-auto h-8 w-8 mb-2" />
              <p>De kennisbank is leeg.</p>
              <p className="text-xs">Upload documenten om de AI te trainen.</p>
            </div>
          )}
        </div>

      </CardContent>
    </Card>
  );
}
