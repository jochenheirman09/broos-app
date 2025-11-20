
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "../ui/spinner";
import { useFirestore } from "@/firebase/client-provider";
import type { Team, Schedule, DayOfWeek } from "@/lib/types";
import { updateTeam } from "@/lib/firebase/firestore/team";
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

interface EditTeamDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  clubId: string;
  team: Team;
  onTeamUpdated: () => void;
}

export function EditTeamDialog({
  isOpen,
  setIsOpen,
  clubId,
  team,
  onTeamUpdated,
}: EditTeamDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [teamName, setTeamName] = useState(team.name);
  const [trainingDays, setTrainingDays] = useState<Set<DayOfWeek>>(new Set());
  const [gameDay, setGameDay] = useState<DayOfWeek | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTeamName(team.name);
      const newTrainingDays = new Set<DayOfWeek>();
      let newGameDay: DayOfWeek | null = null;
      if (team.schedule) {
        for (const day in team.schedule) {
          if (team.schedule[day] === "training") {
            newTrainingDays.add(day as DayOfWeek);
          } else if (team.schedule[day] === "game") {
            newGameDay = day as DayOfWeek;
          }
        }
      }
      setTrainingDays(newTrainingDays);
      setGameDay(newGameDay);
    }
  }, [isOpen, team.name, team.schedule]);
  
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


  const handleSubmit = async () => {
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
      await updateTeam({
        db: firestore,
        clubId,
        teamId: team.id,
        teamData: { name: teamName, schedule },
      });
      toast({
        title: "Succes!",
        description: `Team "${teamName}" is bijgewerkt.`,
      });
      onTeamUpdated();
      setIsOpen(false);
    } catch (error) {
      console.error("Fout bij het bijwerken van het team:", error);
      toast({
        variant: "destructive",
        title: "Fout bij het bijwerken van het team",
        description:
          "Je hebt mogelijk geen toestemming of er is een onverwachte fout opgetreden.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Team bewerken</DialogTitle>
          <DialogDescription>
            Pas de gegevens aan voor het team &quot;{team.name}&quot;.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="team-name">Teamnaam</Label>
            <Input
              id="team-name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="bv. Onder 11s"
            />
          </div>

          <div className="space-y-4">
            <div>
              <Label>Trainingsdagen</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-2">
                {days.map((day) => (
                  <div key={day} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-train-${day}`}
                      checked={trainingDays.has(day)}
                      onCheckedChange={(checked) => handleTrainingDayChange(day, !!checked)}
                    />
                    <label
                      htmlFor={`edit-train-${day}`}
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
              <RadioGroup value={gameDay || ""} onValueChange={(value) => handleGameDayChange(value as DayOfWeek)} className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-2">
                {days.map((day) => (
                  <div key={day} className="flex items-center space-x-2">
                    <RadioGroupItem value={day} id={`edit-game-${day}`} disabled={trainingDays.has(day)} />
                    <Label htmlFor={`edit-game-${day}`}>{dayTranslations[day]}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isLoading}
          >
            Annuleren
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Spinner size="small" className="mr-2" />}
            {isLoading ? "Opslaan..." : "Wijzigingen opslaan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
