
"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Building, Users, AlertTriangle, Archive, MessageSquare, Activity, BarChart3 } from "lucide-react";
import { CreateTeamForm } from "./create-team-form";
import { TeamList } from "./team-list";
import { useCallback, useState } from "react";
import { ClubUpdates } from "./club-updates";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { StaffUpdates } from "./staff-updates";
import { AlertList } from "./alert-list";
import { ResponsibleNoClub } from "./responsible-no-club";
import { ClubLogoManager } from "./club-logo-manager";
import { NotificationBadge } from "./notification-badge";
import { NotificationTroubleshooter } from "./notification-troubleshooter";
import { ChatInteractionChart } from "./admin/chat-interaction-chart";
import { OnboardingFunnelChart, UsageCharts } from "./admin/usage-charts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


function ClubManagement({ clubId }: { clubId: string }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedChart, setSelectedChart] = useState<'onboarding' | 'usage' | 'chat'>('onboarding');
  const [selectedTimeRange, setSelectedTimeRange] = useState<'weekly' | 'total'>('weekly');

  const handleTeamChange = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  const chartComponents: { [key: string]: React.ReactNode } = {
    onboarding: <OnboardingFunnelChart clubId={clubId} />,
    usage: <UsageCharts clubId={clubId} />,
    chat: <ChatInteractionChart clubId={clubId} timeRange={selectedTimeRange} />,
  };


  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center text-2xl font-bold">
                  <Building className="h-7 w-7 mr-3 text-primary" />
                  Club Overzicht
                </CardTitle>
                <CardDescription>
                    De meest recente club-brede inzichten.
                </CardDescription>
              </div>
              <Link href="/archive/club-updates" passHref>
                  <Button variant="secondary" size="sm" className="flex items-center relative">
                      <Archive className="mr-2 h-4 w-4" />
                      Bekijk Archief
                      <NotificationBadge type="clubUpdates" />
                  </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <ClubUpdates clubId={clubId} status="new" showDateInHeader={true} />
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2">
          <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                      <CardTitle className="flex items-center gap-3 text-2xl">
                          <BarChart3 className="h-7 w-7 text-primary" />
                          Clubstatistieken
                      </CardTitle>
                      <CardDescription>
                          Selecteer een grafiek om de data te visualiseren.
                      </CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
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
          <CardContent className="grid gap-6 pt-0 sm:pt-6">
              {chartComponents[selectedChart]}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                      <CardTitle className="flex items-center text-2xl">Team Inzichten</CardTitle>
                      <CardDescription>
                          Een overzicht van de meest recente trends per team.
                      </CardDescription>
                  </div>
                  <Link href="/archive/staff-updates" passHref>
                      <Button variant="secondary" size="sm" className="flex items-center relative">
                          <Archive className="mr-2 h-4 w-4" />
                          Bekijk Archief
                          <NotificationBadge type="staffUpdates" />
                      </Button>
                  </Link>
              </div>
          </CardHeader>
          <CardContent>
            <StaffUpdates clubId={clubId} status="new" showDateInHeader={true} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
              <CardTitle className="flex items-center">
                  <Users className="h-6 w-6 mr-3" />
                  Team Chat
              </CardTitle>
              <CardDescription>
                  Start een privégesprek of groepsgesprek.
              </CardDescription>
          </CardHeader>
          <CardContent>
              <Link href="/p2p-chat" passHref>
                  <Button className="flex items-center relative">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Open Team Chat
                      <NotificationBadge type="messages" />
                  </Button>
              </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center text-2xl">
                  <AlertTriangle className="mr-3 h-6 w-6 text-destructive" />
                  Actieve Alerts
                </CardTitle>
              </div>
              <Link href="/alerts" passHref>
                <Button variant="outline" className="w-full sm:w-auto flex items-center relative">
                  Bekijk Alle Alerts
                  <NotificationBadge type="alerts" status="new" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
              <AlertList status="new" limit={5} />
          </CardContent>
        </Card>

      </div>
      
      <div className="mt-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Team Management</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <h3 className="text-xl font-semibold mb-4">Jouw Teams</h3>
              <TeamList
                clubId={clubId}
                key={refreshKey}
                onTeamChange={handleTeamChange}
              />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4">
                Voeg een Nieuw Team Toe
              </h3>
              <CreateTeamForm clubId={clubId} onTeamCreated={handleTeamChange} />
            </div>
            <div className='self-start'>
               <h3 className="text-xl font-semibold mb-4">
                Club Logo
              </h3>
              <ClubLogoManager clubId={clubId} />
            </div>
          </CardContent>
        </Card>
        
        <NotificationTroubleshooter />
      </div>
    </>
  );
}


export function ResponsibleDashboard({ clubId }: { clubId?: string }) {
    if (!clubId) {
        return (
            <ResponsibleNoClub />
        )
    }
  return <ClubManagement clubId={clubId} />;
}
