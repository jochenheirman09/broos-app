"use client";

import { useEffect, useState } from "react";
import { useFirestore } from "@/firebase";
import type { Club, Team, WithId } from "@/lib/types";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Label as RechartsLabel, Legend, Tooltip } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { collection, getDocs, query, where, type Query, type QuerySnapshot, type DocumentData } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MessageCircle } from "lucide-react";

const chartConfig = {
  userMessages: {
    label: "Berichten van Spelers",
    color: "hsl(var(--chart-1))",
  },
  assistantMessages: {
    label: "Antwoorden van Buddy",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

export function ChatInteractionChart({ clubId, timeRange = 'weekly' }: { clubId?: string, timeRange?: 'weekly' | 'total' }) {
  const db = useFirestore();
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const chartTitle = `Chat Interacties (${timeRange === 'weekly' ? 'Laatste 7 Dagen' : 'Totaal'})`;
  const yAxisLabel = clubId ? "Team" : "Club";

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

        const processGroup = async (group: WithId<Club | Team>, isTeam: boolean) => {
          let usersQuery;
          if (isTeam) {
            usersQuery = query(collection(db, 'users'), where('teamId', '==', group.id));
          } else {
            usersQuery = query(collection(db, 'users'), where('clubId', '==', group.id));
          }
          const usersSnap = await getDocs(usersQuery);

          let totalUserMessages = 0;
          let totalAssistantMessages = 0;

          const chatPromises = usersSnap.docs.map(userDoc => {
            let chatsQuery: Query = collection(db, `users/${userDoc.id}/chats`);
            if (timeRange === 'weekly') {
              chatsQuery = query(chatsQuery, where('date', '>=', sevenDaysAgoStr));
            }
            return getDocs(chatsQuery);
          });
          
          const chatSnapshots = await Promise.allSettled(chatPromises);

          const messagePromises: Promise<QuerySnapshot<DocumentData>>[] = [];
          chatSnapshots.forEach(chatSnapResult => {
            if (chatSnapResult.status === 'fulfilled') {
              chatSnapResult.value.forEach(chatDoc => {
                messagePromises.push(getDocs(collection(chatDoc.ref, 'messages')));
              });
            }
          });
          
          const messageSnapshots = await Promise.allSettled(messagePromises);

          messageSnapshots.forEach(messageSnapResult => {
            if (messageSnapResult.status === 'fulfilled') {
              messageSnapResult.value.forEach(msgDoc => {
                const role = msgDoc.data().role;
                if (role === 'user') totalUserMessages++;
                if (role === 'assistant') totalAssistantMessages++;
              });
            }
          });

          return { name: group.name, userMessages: totalUserMessages, assistantMessages: totalAssistantMessages };
        };

        let data: { name: string; userMessages: number; assistantMessages: number; }[] = [];
        if (clubId) {
          const teamsRef = collection(db, `clubs/${clubId}/teams`);
          const teamsSnap = await getDocs(teamsRef);
          const teams = teamsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as WithId<Team>[];
          data = await Promise.all(teams.map(team => processGroup(team, true)));
        } else {
          const clubsRef = collection(db, 'clubs');
          const clubsSnap = await getDocs(clubsRef);
          const clubs = clubsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as WithId<Club>[];
          data = await Promise.all(clubs.map(club => processGroup(club, false)));
        }
        
        setChartData(data.filter(d => d.userMessages > 0 || d.assistantMessages > 0));

      } catch (e: any) {
        console.error("ChatInteractionChart error:", e);
        setError(`Fout bij laden van chatdata: ${e.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [clubId, db, timeRange]);

  if (isLoading) {
    return (
      <div className="h-64 flex justify-center items-center"><Spinner /></div>
    );
  }

  if (error) {
    return <Alert variant="destructive"><AlertTitle>Fout</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
  }
  
  if (chartData.length === 0) {
    return (
        <Alert><AlertTitle>Geen Data</AlertTitle><AlertDescription>Er zijn nog geen chatinteracties beschikbaar voor deze periode.</AlertDescription></Alert>
    );
  }

  return (
     <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            {chartTitle}
          </CardTitle>
          <CardDescription>Aantal berichten per {clubId ? 'team' : 'club'}.</CardDescription>
        </CardHeader>
        <CardContent>
            <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
            <BarChart
                accessibilityLayer
                data={chartData}
                layout="vertical"
                barGap={4}
                margin={{ top: 5, right: 30, left: 20, bottom: 20 }}
            >
                <CartesianGrid horizontal={false} />
                <YAxis
                    dataKey="name"
                    type="category"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tickFormatter={(value) => value.slice(0, 10) + (value.length > 10 ? '...' : '')}
                    width={80}
                >
                    <RechartsLabel 
                        value={yAxisLabel} 
                        angle={-90} 
                        position="insideLeft" 
                        style={{ textAnchor: 'middle', fill: 'hsl(var(--foreground))' }}
                        offset={-10}
                    />
                </YAxis>
                <XAxis type="number" allowDecimals={false} domain={[0, 'dataMax + 5']}>
                    <RechartsLabel 
                        value="Aantal Berichten" 
                        position="insideBottom" 
                        offset={-15} 
                        style={{ fill: 'hsl(var(--foreground))' }}
                    />
                </XAxis>
                <Tooltip
                    cursor={{ fill: "hsl(var(--muted))" }}
                    content={<ChartTooltipContent />}
                />
                <Legend content={<ChartLegendContent />} />
                <Bar dataKey="userMessages" fill="var(--color-userMessages)" radius={4} />
                <Bar dataKey="assistantMessages" fill="var(--color-assistantMessages)" radius={4} />
            </BarChart>
            </ChartContainer>
        </CardContent>
    </Card>
  );
}
