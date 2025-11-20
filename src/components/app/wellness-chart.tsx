
"use client";

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase/client-provider";
import { useUser } from "@/context/user-context";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { WellnessScore } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { TrendingUp, FileWarning } from "lucide-react";
import { Spinner } from "../ui/spinner";
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
  familyLife: { label: "Thuis", color: "hsl(var(--chart-1))" },
  school: { label: "School", color: "hsl(var(--chart-2))" },
  hobbys: { label: "Hobby's", color: "hsl(var(--chart-3))" },
  food: { label: "Voeding", color: "hsl(var(--chart-4))" },
} satisfies ChartConfig;

const EMOJIS = ["", "😞", "😟", "😐", "🙂", "😄"];

// Custom Bar component to have full control over rendering
const CustomBar = (props: any) => {
  const { x, y, width, height, value, emoji, fill } = props;
  const ratingText = value ? (value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)) : "N/A";
  const isDarkTheme = document.documentElement.classList.contains('dark');

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} rx={8} ry={8} />
      <text
        x={x + width - 10}
        y={y + height / 2}
        fill={isDarkTheme ? "#fff" : "#111"}
        textAnchor="end"
        dy=".35em"
        className="text-sm font-bold"
      >
        {ratingText}
      </text>
       <text
        x={x + 15}
        y={y + height / 2}
        textAnchor="start"
        dy=".35em"
        className="text-lg"
      >
        {emoji}
      </text>
    </g>
  );
};


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
      : null;

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
        emoji: scoreValue ? EMOJIS[Math.round(scoreValue)] : "📊",
        reason: reason || "Nog geen gedetailleerde feedback voor dit onderwerp.",
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
      <div className="h-[26rem] w-full">
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
              width={80}
              className="text-sm fill-muted-foreground"
            />
            <XAxis dataKey="value" type="number" domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} />
            <ChartTooltip
              cursor={{fill: 'hsl(var(--muted))', opacity: 0.5, radius: 8}}
              content={
                <ChartTooltipContent
                  formatter={(value, name, item) => {
                      const formattedValue = typeof value === 'number' ? (value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)) : value;
                      return (
                      <div className="flex flex-col">
                          <span className="font-bold">{`${item.payload.metric}: ${formattedValue}`}</span>
                          <span className="text-xs text-muted-foreground mt-1">{item.payload.reason}</span>
                      </div>
                  )}}
                  indicator="line"
                />
              }
            />
            <Bar dataKey="value" layout="vertical" radius={8} barSize={40} shape={<CustomBar />} />
          </BarChart>
        </ChartContainer>
      </div>
      <div className="flex justify-center">
        <Button variant="outline" onClick={() => setIsSheetOpen(true)}>
          Details
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
            {chartData.map((item) => {
                const formattedValue = item.value ? (item.value % 1 === 0 ? item.value.toFixed(0) : item.value.toFixed(1)) : 'N/A';
                return (
              <div key={item.metric} className="p-4 rounded-xl bg-card/50 shadow-clay-card">
                 <div className="flex items-center justify-between mb-2">
                   <div className="flex items-center gap-3">
                    <span className="text-2xl">{item.emoji}</span>
                    <h3 className="font-bold text-lg">{item.metric}</h3>
                   </div>
                   <div className="font-bold text-lg">{formattedValue}</div>
                 </div>
                 <p className="text-muted-foreground text-sm">{item.reason}</p>
              </div>
            )})}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
