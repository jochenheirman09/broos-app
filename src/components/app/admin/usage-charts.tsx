
"use client";

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import type { Club, Team, WithId, UserProfile } from "@/lib/types";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Cell, PieChart, Pie, Label as RechartsLabel, Tooltip as RechartsTooltip, LabelList, Legend } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { useEffect, useState, useMemo } from "react";
import { collection, getDocs, query, where, limit, type QuerySnapshot, type DocumentData } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users } from "lucide-react";

const usageChartConfig = {
  activeUsers: {
    label: "Actieve Gebruikers",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export function OnboardingFunnelChart({ clubId }: { clubId?: string }) {
    const db = useFirestore();

    const playersQuery = useMemoFirebase(() => {
        let q = query(collection(db, "users"), where("role", "==", "player"));
        if (clubId) {
            q = query(q, where("clubId", "==", clubId));
        }
        return q;
    }, [db, clubId]); 

    const { data: players, isLoading, error } = useCollection<UserProfile>(playersQuery);
  
    if (isLoading) {
      return <div className="h-48 flex justify-center items-center"><Spinner /></div>;
    }
  
    if (error) {
      return <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>Could not load player data.</AlertDescription></Alert>;
    }
  
    const totalPlayers = players?.length || 0;
    const onboardedPlayers = players?.filter(p => p.onboardingCompleted).length || 0;
    const notOnboardedPlayers = totalPlayers - onboardedPlayers;
  
    const data = [
      { name: 'Onboarding Voltooid', value: onboardedPlayers, fill: "hsl(var(--chart-2))" },
      { name: 'Nog Niet Gestart', value: notOnboardedPlayers, fill: "hsl(var(--chart-5))" },
    ];

    if (totalPlayers === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Onboarding Funnel
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert><AlertDescription>Er zijn geen spelers in het systeem{clubId ? ' voor deze club' : ''}.</AlertDescription></Alert>
                </CardContent>
            </Card>
        )
    }
  
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Onboarding Funnel
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-48 w-full">
                    <ResponsiveContainer>
                        <PieChart>
                            <RechartsTooltip formatter={(value, name) => [`${value} spelers`, name]} />
                            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 mt-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{backgroundColor: data[0].fill}}/>
                        {data[0].name}: {data[0].value}
                    </div>
                     <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{backgroundColor: data[1].fill}}/>
                        {data[1].name}: {data[1].value}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}


/**
 * A client-side aggregated chart showing weekly active users.
 * If a clubId is provided, it shows usage per team within that club.
 * If no clubId is provided, it shows usage per club across the whole platform.
 */
export function UsageCharts({ clubId }: { clubId?: string }) {
  const db = useFirestore();
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const chartTitle = "Wekelijkse Activiteit";
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
            const totalUsers = usersSnap.size;
            let activeUsers = 0;

            if (totalUsers > 0) {
                const activePromises = usersSnap.docs.map(async (userDoc) => {
                    const chatsRef = query(collection(db, `users/${userDoc.id}/chats`), where('date', '>=', sevenDaysAgoStr), limit(1));
                    const chatSnap = await getDocs(chatsRef);
                    return !chatSnap.empty;
                });
                const results = await Promise.allSettled(activePromises);
                results.forEach((result) => {
                    if (result.status === 'fulfilled' && result.value === true) {
                        activeUsers++;
                    }
                });
            }
            return { name: group.name, activeUsers, totalUsers };
        }

        let data: { name: string; activeUsers: number; totalUsers: number }[] = [];
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
        
        setChartData(data.filter(d => d.totalUsers > 0));

      } catch (e: any) {
        console.error("UsageCharts error:", e);
        setError(`Fout bij laden van grafiekdata: ${e.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [clubId, db]);

  if (isLoading) {
    return <div className="h-64 flex justify-center items-center"><Spinner /></div>;
  }
  if (error) {
    return <Alert variant="destructive"><AlertTitle>Fout</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
  }
  if (chartData.length === 0) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {chartTitle}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Alert><AlertTitle>Geen Data</AlertTitle><AlertDescription>Er is nog geen gebruiksdata beschikbaar.</AlertDescription></Alert>
            </CardContent>
        </Card>
    );
  }

  return (
     <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {chartTitle}
          </CardTitle>
           <CardDescription>Actieve gebruikers in de laatste 7 dagen.</CardDescription>
        </CardHeader>
        <CardContent>
            <ChartContainer config={usageChartConfig} className="min-h-[250px] w-full">
            <BarChart
                accessibilityLayer
                data={chartData}
                layout="vertical"
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
                        style={{ fill: 'hsl(var(--foreground))' }}
                        offset={-10}
                    />
                </YAxis>
                <XAxis dataKey="activeUsers" type="number" allowDecimals={false} domain={[0, 'dataMax + 1']}>
                    <RechartsLabel 
                        value="Actieve Gebruikers" 
                        position="insideBottom" 
                        offset={-15} 
                        style={{ fill: 'hsl(var(--foreground))' }}
                    />
                </XAxis>
                <ChartTooltip
                    cursor={{ fill: "hsl(var(--muted))" }}
                    content={
                        <ChartTooltipContent
                            formatter={(value, name, item) => (
                                <div className="flex flex-col gap-1">
                                    <span className="font-bold">{item.payload.name}</span>
                                    <span className="text-muted-foreground">{`${value} van de ${item.payload.totalUsers} gebruikers waren actief.`}</span>
                                </div>
                            )}
                        />
                    }
                />
                <Bar
                    dataKey="activeUsers"
                    fill="var(--color-activeUsers)"
                    radius={4}
                    barSize={40}
                >
                    <LabelList 
                        dataKey="totalUsers" 
                        position="right" 
                        offset={8}
                        formatter={(value: number) => `/ ${value}`}
                        style={{ fill: 'hsl(var(--foreground))', fontSize: '12px', fontWeight: 500 }}
                    />
                </Bar>
            </BarChart>
            </ChartContainer>
        </CardContent>
    </Card>
  );
}

    