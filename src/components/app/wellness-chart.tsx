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
import type { WellnessScore, WithId } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { TrendingUp, FileWarning } from "lucide-react";
import { Spinner } from "../ui/spinner";

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

  if (!scoresData || scoresData.length === 0) {
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

  const latestScore = scoresData[0];
  const chartData = Object.entries(chartConfig)
    .map(([key, config]) => {
      const scoreValue = latestScore[key as keyof WellnessScore] as
        | number
        | undefined;
      return {
        metric: config.label,
        value: scoreValue || 0,
        fill: config.color,
        emoji: scoreValue ? EMOJIS[scoreValue] : "📊",
      };
    })
    .filter((item) => item.value > 0);

  if (chartData.length === 0) {
     return (
      <Alert>
        <TrendingUp className="h-4 w-4" />
        <AlertTitle>Nog geen scores ingevuld</AlertTitle>
        <AlertDescription>
          In je laatste gesprek zijn nog geen scores geregistreerd. Praat met Broos om je dashboard te vullen!
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="h-80 w-full">
      <ChartContainer config={chartConfig} className="w-full h-full">
        <BarChart
          accessibilityLayer
          data={chartData}
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          layout="vertical"
        >
          <CartesianGrid horizontal={false} />
          <YAxis
            dataKey="metric"
            type="category"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            tick={({ x, y, payload }) => {
              const item = chartData.find((d) => d.metric === payload.value);
              return (
                <g transform={`translate(${x},${y})`}>
                  <text
                    x={-10}
                    y={0}
                    dy={4}
                    textAnchor="end"
                    fill="hsl(var(--foreground))"
                    className="text-sm"
                  >
                    {item?.metric}
                  </text>
                  <text
                    x={-30}
                    y={0}
                    dy={4}
                    textAnchor="end"
                    className="text-lg"
                  >
                    {item?.emoji}
                  </text>
                </g>
              );
            }}
            width={100}
          />
          <XAxis dataKey="value" type="number" hide domain={[0, 5]} />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent indicator="line" />}
          />
          <Bar dataKey="value" layout="vertical" radius={8} barSize={32} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
