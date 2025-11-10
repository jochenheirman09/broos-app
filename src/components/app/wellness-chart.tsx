"use client";

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { useUser } from "@/context/user-context";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { WellnessScore } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { TrendingUp, FileWarning, MoreHorizontal } from "lucide-react";
import { Spinner } from "../ui/spinner";
import { placeholderWellnessScores } from "@/lib/placeholder-data";
import { useState } from "react";
import { Button } from "../ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "../ui/sheet";

const chartConfig = {
  mood: { label: "Stemming", color: "hsl(var(--chart-1))" },
  stress: { label: "Stress", color: "hsl(var(--chart-2))" },
  sleep: { label: "Slaap", color: "hsl(var(--chart-3))" },
  motivation: { label: "Motivatie", color: "hsl(var(--chart-4))" },
  rest: { label: "Rust", color: "hsl(var(--chart-5))" },
} satisfies ChartConfig;

const EMOJIS = ["", "😞", "😟", "😐", "🙂", "😄"];

export function WellnessChart() {
  const { user } = useUser();
  const db = useFirestore();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const scoresQuery = useMemoFirebase(() => {
    if (!user || !db) return null;
    return query(
      collection(db, `users/${user.uid}/wellnessScores`),
      orderBy("date", "desc"),
      limit(1)
    );
  }, [user, db]);

  const {
    data: scoresData,
    isLoading,
    error,
  } = useCollection<WellnessScore>(scoresQuery);

  const latestScore =
    !isLoading && scoresData && scoresData.length > 0
      ? scoresData[0]
      : placeholderWellnessScores[0];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <FileWarning className="h-4 w-4" />
        <AlertTitle>Fout</AlertTitle>
        <AlertDescription>
          Kon de welzijnsdata niet laden. Probeer het later opnieuw.
        </AlertDescription>
      </Alert>
    );
  }

  if (!latestScore) {
    return (
      <Alert>
        <TrendingUp className="h-4 w-4" />
        <AlertTitle>Nog geen data beschikbaar</AlertTitle>
        <AlertDescription>
          Begin een gesprek met je buddy om je eerste welzijnsoverzicht te
          zien.
        </AlertDescription>
      </Alert>
    );
  }

  const chartData = Object.entries(chartConfig)
    .map(([key, config]) => {
      const scoreValue = latestScore[key as keyof WellnessScore] as
        | number
        | undefined;
      const reasonKey = `${key}Reason` as keyof WellnessScore;
      const reason = latestScore[reasonKey] as string | undefined;

      return {
        metric: config.label,
        value: scoreValue || 0,
        fill: config.color,
        emoji: scoreValue ? EMOJIS[scoreValue] : "📊",
        reason: reason || "Geen details beschikbaar.",
      };
    })
    .filter((item) => item.value > 0);

  if (chartData.length === 0) {
    return (
      <Alert>
        <TrendingUp className="h-4 w-4" />
        <AlertTitle>Nog geen scores ingevuld</AlertTitle>
        <AlertDescription>
          In je laatste gesprek zijn nog geen scores geregistreerd. Praat met
          Broos om je dashboard te vullen!
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="h-80 w-full">
        <ChartContainer config={chartConfig} className="w-full h-full">
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={{ top: 10, right: 10, bottom: 20, left: 10 }}
            layout="vertical"
          >
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="metric"
              type="category"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              width={100}
              tick={({ x, y, payload }) => {
                 const item = chartData.find((d) => d.metric === payload.value);
                return (
                   <g transform={`translate(${x},${y})`}>
                    <text x={-25} y={0} dy={4} textAnchor="middle" className="text-lg fill-muted-foreground">{item?.emoji}</text>
                    <text x={0} y={0} dy={4} textAnchor="end" fill="hsl(var(--foreground))" className="text-sm">{payload.value}</text>
                  </g>
                )
              }}
            />
            <XAxis dataKey="value" type="number" domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  formatter={(value, name) => `${value}/5`}
                  indicator="line"
                />
              }
            />
            <Bar dataKey="value" layout="vertical" radius={8} barSize={32} />
          </BarChart>
        </ChartContainer>
      </div>
      <div className="flex justify-center">
        <Button variant="outline" onClick={() => setIsSheetOpen(true)}>
          <MoreHorizontal className="mr-2 h-4 w-4" />
          Meer Details
        </Button>
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Details van je Welzijnsscores</SheetTitle>
            <SheetDescription>
              Hier is een gedetailleerd overzicht van de scores uit je laatste
              gesprek.
            </SheetDescription>
          </SheetHeader>
          <div className="py-4 space-y-6">
            {chartData.map((item) => (
              <div key={item.metric} className="p-4 rounded-xl bg-card/50 shadow-clay-card">
                 <div className="flex items-center justify-between mb-2">
                   <div className="flex items-center gap-3">
                    <span className="text-2xl">{item.emoji}</span>
                    <h3 className="font-bold text-lg">{item.metric}</h3>
                   </div>
                   <div className="font-bold text-lg">{item.value}/5</div>
                 </div>
                 <p className="text-muted-foreground text-sm">{item.reason}</p>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
