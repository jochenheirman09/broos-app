
"use client";

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import type { KnowledgeDocument, KnowledgeUsageStat } from "@/lib/types";
import { Spinner } from "../ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { FileText, BarChart2, AlertCircle } from "lucide-react";
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

const statusVariant: { [key: string]: "default" | "secondary" | "destructive" } = {
    completed: "default",
    ingesting: "secondary",
    pending: "secondary",
    error: "destructive"
};

export function KnowledgeBaseStats({ clubId }: { clubId: string }) {
  const db = useFirestore();

  const documentsQuery = useMemoFirebase(() => {
    return query(
      collection(db, `clubs/${clubId}/knowledgeDocuments`),
      orderBy("name", "asc")
    );
  }, [db, clubId]);

  const statsQuery = useMemoFirebase(() => {
     return collection(db, `clubs/${clubId}/knowledgeStats`);
  }, [db, clubId]);

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
        <FileText className="h-4 w-4" />
        <AlertTitle>Lege Kennisbank</AlertTitle>
        <AlertDescription>
          Er zijn nog geen documenten geüpload om de AI-buddy te trainen. Upload PDF-bestanden via Firebase Storage om te beginnen.
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
                  <Badge variant={statusVariant[doc.status] || 'secondary'}>{doc.status}</Badge>
                </TableCell>
                <TableCell className="text-center">
                    {docStats?.queryCount || 0}
                </TableCell>
                <TableCell className="text-right">
                    {docStats?.lastQueried ? formatDistanceToNow(docStats.lastQueried.toDate(), { addSuffix: true, locale: nl }) : 'Nooit'}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
