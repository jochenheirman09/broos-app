
"use client";

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import type { KnowledgeDocument, KnowledgeUsageStat } from "@/lib/types";
import { Spinner } from "../ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { FileText, BarChart2, AlertCircle, UploadCloud } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "../ui/badge";
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';
import { useMemo } from "react";

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

  const statsQuery = useMemoFirebase(() => {
     return collection(db, "knowledge_stats");
  }, [db]);

  const {
    data: documents,
    isLoading: isLoadingDocs,
    error: docsError,
  } = useCollection<KnowledgeDocument>(documentsQuery);
  
  const {
    data: stats,
    isLoading: isLoadingStats,
    error: statsError,
  } = useCollection<KnowledgeUsageStat>(statsQuery);

  const statsMap = useMemo(() => {
    if (!stats) return new Map<string, KnowledgeUsageStat>();
    return new Map(stats.map(s => [s.id, s]));
  }, [stats]);


  if (isLoadingDocs || isLoadingStats) {
    return (
      <div className="flex justify-center items-center h-40">
        <Spinner />
      </div>
    );
  }

  if (docsError || statsError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Fout</AlertTitle>
        <AlertDescription>
          Kon de statistieken van de kennisbank niet laden. Probeer het later opnieuw.
          { (docsError || statsError)?.message }
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
            <TableHead className="text-center">Aantal Queries</TableHead>
            <TableHead className="text-right">Laatst Geraadpleegd</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => {
            const docStats = statsMap.get(doc.id);
            return (
              <TableRow key={doc.id}>
                <TableCell className="font-medium">{doc.name}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant[doc.status] || 'secondary'}>{statusTranslation[doc.status] || doc.status}</Badge>
                </TableCell>
                <TableCell className="text-center">
                    {docStats?.queryCount || 0}
                </TableCell>
                <TableCell className="text-right">
                    {docStats?.lastQueried ? formatDistanceToNow(new Date(docStats.lastQueried.seconds * 1000), { addSuffix: true, locale: nl }) : 'Nooit'}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
