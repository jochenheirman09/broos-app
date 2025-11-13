
"use client";

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import type { KnowledgeDocument } from "@/lib/types";
import { Spinner } from "../ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { FileText, AlertCircle, UploadCloud } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "../ui/badge";

const statusVariant: { [key: string]: "default" | "secondary" | "destructive" } = {
    completed: "default",
    ingesting: "secondary",
    pending: "secondary",
    error: "destructive"
};

const statusTranslation: { [key: string]: string } = {
  completed: "Verwerkt",
  ingesting: "Bezig met verwerken",
  pending: "In behandeling",
  error: "Fout",
};

export function KnowledgeBaseStats({ clubId }: { clubId: string }) {
  const db = useFirestore();

  const documentsQuery = useMemoFirebase(() => {
    return query(
      collection(db, "knowledge_base"),
      orderBy("name", "asc")
    );
  }, [db]);

  const {
    data: documents,
    isLoading: isLoadingDocs,
    error: docsError,
  } = useCollection<KnowledgeDocument>(documentsQuery);

  if (isLoadingDocs) {
    return (
      <div className="flex justify-center items-center h-40">
        <Spinner />
      </div>
    );
  }

  if (docsError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Fout</AlertTitle>
        <AlertDescription>
          Kon de documenten van de kennisbank niet laden. Probeer het later opnieuw.
          { docsError?.message }
        </AlertDescription>
      </Alert>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <Alert>
        <UploadCloud className="h-4 w-4" />
        <AlertTitle>Lege Kennisbank</AlertTitle>
        <AlertDescription>
          Er zijn nog geen documenten gevonden. Upload documenten (PDF's) naar uw Firebase Storage in de `knowledge_base/{'{clubId}'}/{'{documentName}'}` map om de AI-buddy te trainen. De status verschijnt hier automatisch.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Documentnaam</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => {
            return (
              <TableRow key={doc.id}>
                <TableCell className="font-medium">{doc.name}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant[doc.status] || 'secondary'}>{statusTranslation[doc.status] || doc.status}</Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
