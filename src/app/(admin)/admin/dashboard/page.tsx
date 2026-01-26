"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Activity, Wrench, BookOpen, Upload, Users, BarChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { OnboardingFunnelChart, UsageCharts } from "@/components/app/admin/usage-charts";
import { ChatInteractionChart } from "@/components/app/admin/chat-interaction-chart";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query } from "firebase/firestore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Club } from "@/lib/types";

export default function AdminDashboardPage() {
  const db = useFirestore();
  const [selectedClubId, setSelectedClubId] = useState<string | undefined>(undefined);
  const [selectedChart, setSelectedChart] = useState<'onboarding' | 'usage' | 'chat'>('onboarding');
  const [selectedTimeRange, setSelectedTimeRange] = useState<'weekly' | 'total'>('weekly');

  const clubsQuery = useMemoFirebase(
    () => (db ? query(collection(db, "clubs")) : null),
    [db]
  );
  const { data: clubs } = useCollection<Club>(clubsQuery);

  const clubIdForCharts = selectedClubId === "all" ? undefined : selectedClubId;
  const selectedClubName = clubs?.find(c => c.id === selectedClubId)?.name || "Alle Clubs";

  const chartComponents: { [key: string]: React.ReactNode } = {
    onboarding: <OnboardingFunnelChart clubId={clubIdForCharts} />,
    usage: <UsageCharts clubId={clubIdForCharts} />,
    chat: <ChatInteractionChart clubId={clubIdForCharts} timeRange={selectedTimeRange} />,
  };

  return (
    <div className="space-y-8">
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-3 text-2xl">
                            <Activity className="h-7 w-7 text-primary" />
                            Applicatie Dashboard
                        </CardTitle>
                        <CardDescription>
                            Een overzicht van het gebruik en de status voor: <span className="font-bold text-foreground">{selectedClubName}</span>
                        </CardDescription>
                    </div>
                    <div className="w-full sm:w-64">
                         <Select onValueChange={setSelectedClubId} defaultValue="all">
                            <SelectTrigger>
                                <SelectValue placeholder="Selecteer een club..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Alle Clubs</SelectItem>
                                {clubs?.map((club) => (
                                <SelectItem key={club.id} value={club.id}>
                                    {club.name}
                                </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
        </Card>

        <Card>
          <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                      <CardTitle className="flex items-center gap-3 text-2xl">
                          <BarChart className="h-7 w-7 text-primary" />
                          Grafieken
                      </CardTitle>
                      <CardDescription>
                          Selecteer een grafiek en periode om de data te visualiseren.
                      </CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Select onValueChange={(value) => setSelectedChart(value as any)} defaultValue="onboarding">
                        <SelectTrigger className="w-full sm:w-[200px]">
                            <SelectValue placeholder="Selecteer een grafiek..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="onboarding">Onboarding Funnel</SelectItem>
                            <SelectItem value="usage">Wekelijkse Activiteit</SelectItem>
                            <SelectItem value="chat">Chat Interacties</SelectItem>
                        </SelectContent>
                    </Select>
                    {selectedChart === 'chat' && (
                       <Select onValueChange={(value) => setSelectedTimeRange(value as 'weekly' | 'total')} defaultValue="weekly">
                          <SelectTrigger className="w-full sm:w-[200px]">
                              <SelectValue placeholder="Selecteer een periode..." />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="weekly">Laatste 7 Dagen</SelectItem>
                              <SelectItem value="total">Volledige Historiek</SelectItem>
                          </SelectContent>
                      </Select>
                    )}
                  </div>
              </div>
          </CardHeader>
          <CardContent className="grid gap-6">
              {chartComponents[selectedChart]}
          </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                     <Wrench className="h-7 w-7 text-primary" />
                    Onderhoudstools
                </CardTitle>
                <CardDescription>
                    Beheer de applicatie, kennisbank, en voer onderhoudstaken uit.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/admin/knowledge-base" passHref>
                    <Button variant="outline" className="w-full h-full p-6 flex flex-col items-center justify-center gap-2">
                        <BookOpen className="h-8 w-8" />
                        <span className="font-semibold">Kennisbank</span>
                    </Button>
                </Link>
                <Link href="/admin/file-importer" passHref>
                     <Button variant="outline" className="w-full h-full p-6 flex flex-col items-center justify-center gap-2">
                        <Upload className="h-8 w-8" />
                        <span className="font-semibold">Code Importer</span>
                    </Button>
                </Link>
                <Link href="/cleanup-db" passHref>
                     <Button variant="outline" className="w-full h-full p-6 flex flex-col items-center justify-center gap-2">
                        <Wrench className="h-8 w-8" />
                        <span className="font-semibold">Database Tools</span>
                    </Button>
                </Link>
            </CardContent>
        </Card>

    </div>
  );
}
