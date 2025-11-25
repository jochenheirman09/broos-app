"use client";

import { useUser } from "@/context/user-context";
import {
  useCollection,
  useDoc,
  useFirestore,
  useMemoFirebase,
} from "@/firebase";
import { collection, doc, query } from "firebase/firestore";
import type { PlayerTraining, Team, WithId } from "@/lib/types";
import { Spinner } from "../ui/spinner";
import { cn } from "@/lib/utils";
import { format, addDays, isSameDay } from "date-fns";
import { nl } from "date-fns/locale";
import { Dumbbell, Footprints, Gamepad2, Bed, Plus } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

const activityDetails = {
  training: {
    icon: <Dumbbell className="h-5 w-5" />,
    label: "Teamtraining",
    color: "bg-primary/20 text-primary-foreground",
    borderColor: "border-primary",
  },
  game: {
    icon: <Gamepad2 className="h-5 w-5" />,
    label: "Wedstrijd",
    color: "bg-accent/20 text-accent-foreground",
    borderColor: "border-accent",
  },
  rest: {
    icon: <Bed className="h-5 w-5" />,
    label: "Rustdag",
    color: "bg-muted/30 text-muted-foreground",
    borderColor: "border-muted",
  },
  individual: {
    icon: <Footprints className="h-5 w-5" />,
    label: "Individuele Training",
    color: "bg-secondary/50 text-secondary-foreground",
    borderColor: "border-secondary",
  },
};

const daysOfWeek = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export function WeekSchedule({ refreshKey }: { refreshKey?: number }) {
  const { user, userProfile } = useUser();
  const db = useFirestore();

  // Fetch team data to get the schedule
  const teamRef = useMemoFirebase(() => {
    if (!userProfile?.teamId || !userProfile?.clubId) return null;
    return doc(
      db,
      "clubs",
      userProfile.clubId,
      "teams",
      userProfile.teamId
    );
  }, [db, userProfile?.teamId, userProfile?.clubId]);
  const { data: teamData, isLoading: isTeamLoading } = useDoc<Team>(teamRef);

  // Fetch individual trainings
  const trainingsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, "users", user.uid, "trainings"));
  }, [db, user, refreshKey]); // Add refreshKey as a dependency
  const { data: individualTrainings, isLoading: areTrainingsLoading } =
    useCollection<PlayerTraining>(trainingsQuery);

  if (isTeamLoading || areTrainingsLoading) {
    return (
      <div className="flex justify-center items-center h-24">
        <Spinner />
      </div>
    );
  }

  const today = new Date();
  // Find the most recent Monday
  const startOfWeek = addDays(today, (1 - (today.getDay() || 7)) % 7);

  const weekDates = Array.from({ length: 7 }).map((_, i) =>
    addDays(startOfWeek, i)
  );

  return (
    <TooltipProvider>
      <div className="grid grid-cols-7 gap-2">
        {weekDates.map((date, index) => {
          const dayName = daysOfWeek[index];
          const teamActivity = teamData?.schedule?.[dayName] || "rest";
          const activityInfo =
            activityDetails[teamActivity as keyof typeof activityDetails];

          const individualTrainingsOnDay = (individualTrainings || []).filter(
            (t) => isSameDay(new Date(t.date), date)
          );

          return (
            <div key={dayName} className="flex flex-col items-center gap-2">
              <span className="text-xs font-bold uppercase text-muted-foreground">
                {format(date, "EEE", { locale: nl })}
              </span>
              <div
                className={cn(
                  "h-16 w-full rounded-lg border-2 p-2 flex flex-col items-center justify-center gap-1",
                  activityInfo.borderColor,
                  activityInfo.color
                )}
              >
                <Tooltip>
                  <TooltipTrigger>{activityInfo.icon}</TooltipTrigger>
                  <TooltipContent>
                    <p>{activityInfo.label}</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Individual Trainings */}
              {individualTrainingsOnDay.map((training) => (
                <div
                  key={training.id}
                  className={cn(
                    "h-10 w-full rounded-lg border p-1 flex items-center justify-center",
                    activityDetails.individual.borderColor,
                    activityDetails.individual.color,
                  )}
                >
                  <Tooltip>
                    <TooltipTrigger>
                      {activityDetails.individual.icon}
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-semibold">Individuele Training</p>
                      <p className="text-xs text-muted-foreground">{training.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
