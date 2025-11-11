"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "../ui/spinner";
import { createTeam } from "@/lib/firebase/firestore/team";
import { useFirestore } from "@/firebase";
import { Schedule, DayOfWeek } from "@/lib/types";
import { Checkbox } from "../ui/checkbox";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";

const days: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const dayTranslations: Record<DayOfWeek, string> = {
    monday: "Maandag",
    tuesday: "Dinsdag",
    wednesday: "Woensdag",
    thursday: "Donderdag",
    friday: "Vrijdag",
    saturday: "Zaterdag",
    sunday: "Zondag",
};

export function CreateTeamForm({
  clubId,
  onTeamCreated,
}: {
  clubId: string;
  onTeamCreated: () => void;
}) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [teamName, setTeamName] = useState("");
  const [trainingDays, setTrainingDays] = useState<Set<DayOfWeek>>(new Set());
  const [gameDay, setGameDay] = useState<DayOfWeek | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleTrainingDayChange = (day: DayOfWeek, checked: boolean) => {
    setTrainingDays((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(day);
        if (gameDay === day) setGameDay(null); // Can't be training and game day
      } else {
        newSet.delete(day);
      }
      return newSet;
    });
  };

  const handleGameDayChange = (day: DayOfWeek) => {
    setGameDay(day);
    // Ensure the same day is not a training day
    if (trainingDays.has(day)) {
        setTrainingDays(prev => {
            const newSet = new Set(prev);
            newSet.delete(day);
            return newSet;
        })
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (teamName.length < 3) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Teamnaam moet minstens 3 tekens lang zijn.",
      });
      return;
    }

    setIsLoading(true);

    const schedule: Schedule = {};
    days.forEach(day => {
        if (trainingDays.has(day)) {
            schedule[day] = 'training';
        } else if (gameDay === day) {
            schedule[day] = 'game';
        } else {
            schedule[day] = 'rest';
        }
    });

    try {
      await createTeam({
        db: firestore,
        clubId,
        teamName,
        schedule
      });
      toast({
        title: "Succes!",
        description: `Team "${teamName}" is aangemaakt.`,
      });
      // Reset form
      setTeamName("");
      setTrainingDays(new Set());
      setGameDay(null);
      onTeamCreated();
    } catch (error) {
      console.error("Fout bij het maken van het team:", error);
      toast({
        variant: "destructive",
        title: "Fout bij het maken van het team",
        description:
          "Je hebt mogelijk geen toestemming of er is een onverwachte fout opgetreden.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="team-name">Teamnaam</Label>
        <Input
          id="team-name"
          name="team-name"
          placeholder="bv. Onder 11s"
          required
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        <div>
          <Label>Trainingsdagen</Label>
          <div className="grid grid-cols-3 gap-4 mt-2">
            {days.map((day) => (
              <div key={day} className="flex items-center space-x-2">
                <Checkbox
                  id={`train-${day}`}
                  checked={trainingDays.has(day)}
                  onCheckedChange={(checked) => handleTrainingDayChange(day, !!checked)}
                />
                <label
                  htmlFor={`train-${day}`}
                  className="text-sm font-medium"
                >
                  {dayTranslations[day]}
                </label>
              </div>
            ))}
          </div>
        </div>
         <div>
          <Label>Wedstrijddag</Label>
           <RadioGroup value={gameDay || ""} onValueChange={(value) => handleGameDayChange(value as DayOfWeek)} className="grid grid-cols-3 gap-4 mt-2">
            {days.map((day) => (
              <div key={day} className="flex items-center space-x-2">
                <RadioGroupItem value={day} id={`game-${day}`} disabled={trainingDays.has(day)} />
                <Label htmlFor={`game-${day}`}>{dayTranslations[day]}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      </div>


      <Button type="submit" disabled={isLoading} variant="secondary" className="!mt-8">
        {isLoading && <Spinner size="small" className="mr-2" />}
        {isLoading ? "Team aanmaken..." : "Team aanmaken"}
      </Button>
    </form>
  );
}
