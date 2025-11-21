
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "../ui/spinner";
import { useUser } from "@/context/user-context";
import { useFirestore } from "@/firebase/client-provider";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "../ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { addPlayerTraining } from "@/lib/firebase/firestore/training";

interface AddTrainingDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onTrainingAdded: () => void;
}

export function AddTrainingDialog({
  isOpen,
  setIsOpen,
  onTrainingAdded,
}: AddTrainingDialogProps) {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
        toast({ variant: "destructive", title: "Niet ingelogd"});
        return;
    }
    if (!date || !description) {
      toast({
        variant: "destructive",
        title: "Onvolledige gegevens",
        description: "Selecteer een datum en geef een beschrijving op.",
      });
      return;
    }

    setIsLoading(true);
    
    try {
        await addPlayerTraining({
            db,
            userId: user.uid,
            date,
            description,
        });

        // Optimistic UI update
        onTrainingAdded();
    } catch(error) {
        // Error is already emitted by the firestore function
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Voeg Individuele Training Toe</DialogTitle>
          <DialogDescription>
            Log een extra training die je zelf hebt gedaan.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="date">Datum van training</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Kies een datum</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Beschrijving</Label>
            <Textarea
              id="description"
              placeholder="bv. 30 min hardlopen in het park"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
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
            {isLoading ? "Opslaan..." : "Training Opslaan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
