
"use client"

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { useUser } from "@/context/user-context"
import { collection, query, orderBy, limit } from "firebase/firestore"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { WellnessScore } from "@/lib/types"
import { Alert, AlertDescription, AlertTitle } from "../ui/alert"
import { TrendingUp, FileWarning } from "lucide-react"
import { Spinner } from "../ui/spinner"
import { useState, useMemo } from "react"
import { Button } from "../ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { ScrollArea, ScrollViewport } from "../ui/scroll-area"
import { format } from "date-fns"
import { nl } from "date-fns/locale"

const chartConfig = {
  mood: { label: "Stemming", color: "hsl(var(--chart-1))" },
  stress: { label: "Stress", color: "hsl(var(--chart-2))" },
  rest: { label: "Rust", color: "hsl(var(--chart-5))" },
  motivation: { label: "Motivatie", color: "hsl(var(--chart-4))" },
  familyLife: { label: "Thuis", color: "hsl(var(--chart-1))" },
  school: { label: "School", color: "hsl(var(--chart-2))" },
  hobbys: { label: "Hobby's", color: "hsl(var(--chart-3))" },
  food: { label: "Voeding", color: "hsl(var(--chart-4))" },
} satisfies ChartConfig;


const EMOJIS = ["", "😞", "😟", "😐", "🙂", "😄"];

// Custom Bar component to have full control over rendering
const CustomBar = (props: any) => {
  const { x, y, width, height, value, emoji, fill, isPlaceholder } = props;
  const ratingText = value > 0 ? (value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)) : "3";
  const isDarkTheme = document.documentElement.classList.contains('dark');
  const barFill = isPlaceholder ? "hsl(var(--muted) / 0.3)" : fill;
  const textFill = isPlaceholder ? "hsl(var(--muted-foreground))" : (isDarkTheme ? "#fff" : "#111");


  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={barFill} rx={8} ry={8} />
      <text
        x={x + width - 10}
        y={y + height / 2}
        fill={textFill}
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

// Custom Y-axis tick to include the date
const CustomYAxisTick = (props: any) => {
  const { x, y, payload } = props;
  const { value, lastUpdated } = payload;

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={4} textAnchor="end" fill="hsl(var(--muted-foreground))" className="text-sm">
        {value}
      </text>
      {lastUpdated && (
        <text x={0} y={14} dy={4} textAnchor="end" fill="hsl(var(--muted-foreground))" className="text-xs">
          ({lastUpdated})
        </text>
      )}
    </g>
  );
};


export function WellnessChart() {
  const { user, userProfile } = useUser();
  const db = useFirestore();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Guarded query
  const scoresQuery = useMemoFirebase(() => {
    if (!user) return null; // Wait for user
    return query(
      collection(db, `users/${user.uid}/wellnessScores`),
      orderBy("date", "desc"),
      limit(7)
    );
  }, [user, db]);

  const {
    data: scoresData,
    isLoading,
    error,
  } = useCollection<WellnessScore>(scoresQuery);

  const chartData = useMemo(() => {
    return Object.entries(chartConfig).map(([key, config]) => {
      let latestValue: number | undefined;
      let latestReason: string | undefined;
      let latestDate: string | undefined;

      // Find the most recent score for this specific metric
      if (scoresData) {
        for (const scoreDoc of scoresData) {
          let value = scoreDoc[key as keyof WellnessScore] as number | undefined;
          let reason = scoreDoc[`${key}Reason` as keyof WellnessScore] as string | undefined;

          // Handle 'rest' vs 'sleep' legacy data. 'rest' is the new standard.
          if (key === 'rest' && !value && scoreDoc.sleep) {
            value = scoreDoc.sleep;
            reason = scoreDoc.sleepReason;
          }

          if (value !== undefined && value !== null && value !== 0) {
            latestValue = value;
            latestReason = reason;
            latestDate = scoreDoc.date;
            break; // Found the most recent one for this key
          }
        }
      }

      const isPlaceholder = latestValue === undefined || latestValue === null || latestValue === 0;
      const displayValue = isPlaceholder ? 3 : Number(latestValue);
      const lastUpdatedFormatted = latestDate ? format(new Date(`${latestDate}T00:00:00`), 'EEE', { locale: nl }) : undefined;

      return {
        metric: config.label,
        value: displayValue,
        isPlaceholder,
        fill: config.color,
        emoji: EMOJIS[Math.round(displayValue)] || "😐",
        reason: latestReason || "Nog geen data beschikbaar.",
        lastUpdated: lastUpdatedFormatted,
        lastUpdatedFull: latestDate ? format(new Date(`${latestDate}T00:00:00`), 'PPP', { locale: nl }) : "Onbekend",
      };
    });
  }, [scoresData]);

  const hasAnyData = useMemo(() => chartData.some(d => !d.isPlaceholder), [chartData]);

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

  if (!hasAnyData) {
    return (
      <Alert>
        <TrendingUp className="h-4 w-4" />
        <AlertTitle>Nog geen scores ingevuld</AlertTitle>
        <AlertDescription>
          Praat met {userProfile?.buddyName || 'je buddy'} om je dashboard te vullen!
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
            margin={{ top: 10, right: 10, bottom: 0, left: 10 }}
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
              interval={0}
              tick={<CustomYAxisTick />}
            />
            <XAxis dataKey="value" type="number" domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} />
            <ChartTooltip
              cursor={{fill: 'hsl(var(--muted))', opacity: 0.5, radius: 8}}
              content={
                <ChartTooltipContent
                  formatter={(value, name, item) => {
                      if (item.payload.isPlaceholder) {
                         return (
                            <div className="flex flex-col">
                                <span className="font-bold">{`${item.payload.metric}: 3`}</span>
                                <span className="text-xs text-muted-foreground mt-1">Nog geen data beschikbaar</span>
                            </div>
                         )
                      }
                      const formattedValue = typeof value === 'number' ? (value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)) : value;
                      return (
                      <div className="flex flex-col">
                          <div className="flex justify-between items-center">
                            <span className="font-bold">{`${item.payload.metric}: ${formattedValue}`}</span>
                            <span className="text-xs text-muted-foreground ml-4">{item.payload.lastUpdated}</span>
                          </div>
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
        <SheetContent className="flex flex-col p-0">
          <SheetHeader className="p-6 pb-4">
            <SheetTitle>Details van je Welzijnsscores</SheetTitle>
            <SheetDescription>
              Hier is een gedetailleerd overzicht van de meest recente scores voor elk onderwerp.
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1 min-h-0">
            <ScrollViewport>
              <div className="px-6 pb-6 space-y-6">
                {chartData.map((item) => {
                    const isPlaceholder = item.isPlaceholder;
                    const displayValue = Number(item.value);
                    const displayReason = item.reason;
                    const formattedValue = displayValue % 1 === 0 ? displayValue.toFixed(0) : displayValue.toFixed(1);

                    return (
                  <div key={item.metric} className={cn("p-4 rounded-xl shadow-clay-card", isPlaceholder ? "bg-muted/50" : "bg-card/50")}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{item.emoji}</span>
                        <h3 className="font-bold text-lg">{item.metric}</h3>
                      </div>
                      <div className={cn("font-bold text-lg", isPlaceholder && "text-muted-foreground")}>{formattedValue}</div>
                    </div>
                    <p className="text-sm text-muted-foreground">{displayReason}</p>
                    <p className="text-xs text-muted-foreground/80 mt-2">
                      Laatst bijgewerkt: {item.lastUpdatedFull}
                    </p>
                  </div>
                )})}
              </div>
            </ScrollViewport>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}
