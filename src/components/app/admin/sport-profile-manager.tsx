
"use client";

import { useState } from "react";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import type { SportProfile, WithId } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { FileWarning, PlusCircle, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { createSportProfile, updateSportProfile, deleteSportProfile } from "@/actions/sport-actions";
import { useUser } from "@/context/user-context";


const formSchema = z.object({
  id: z.string().min(2, "ID moet minstens 2 tekens zijn.").regex(/^[a-z0-9-]+$/, "ID mag alleen kleine letters, cijfers en streepjes bevatten."),
  name: z.string().min(2, "Naam moet minstens 2 tekens zijn."),
  slogan: z.string().min(5, "Slogan moet minstens 5 tekens zijn."),
});
type FormValues = z.infer<typeof formSchema>;

interface SportProfileFormDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  sportProfile?: WithId<SportProfile> | null;
}

function SportProfileFormDialog({ isOpen, setIsOpen, sportProfile }: SportProfileFormDialogProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const isEditMode = !!sportProfile;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditMode
      ? sportProfile
      : { id: "", name: "", slogan: "" },
  });

  async function onSubmit(values: FormValues) {
    if (!user) return;
    setIsProcessing(true);
    
    let result;
    if (isEditMode) {
      result = await updateSportProfile(user.uid, sportProfile.id, values);
    } else {
      result = await createSportProfile(user.uid, values.id, values);
    }

    if (result.success) {
      toast({ title: result.message });
      setIsOpen(false);
      form.reset();
    } else {
      toast({ variant: "destructive", title: "Fout", description: result.message });
    }
    setIsProcessing(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Bewerk Sportprofiel' : 'Nieuw Sportprofiel'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? `Bewerk de gegevens voor '${sportProfile.name}'.` : 'Voeg een nieuwe sport toe aan het systeem.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ID</FormLabel>
                  <FormControl>
                    <Input placeholder="bv. football" {...field} disabled={isEditMode} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Naam</FormLabel>
                  <FormControl>
                    <Input placeholder="bv. Voetbal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slogan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slogan</FormLabel>
                  <FormControl>
                    <Input placeholder="Een pakkende zin" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Annuleren</Button>
              <Button type="submit" disabled={isProcessing}>
                {isProcessing && <Spinner size="small" className="mr-2" />}
                {isEditMode ? 'Opslaan' : 'Aanmaken'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


export function SportProfileManager() {
  const db = useFirestore();
  const { toast } = useToast();
  const { user } = useUser();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSport, setSelectedSport] = useState<WithId<SportProfile> | null>(null);

  const sportsQuery = useMemoFirebase(
    () => (db ? query(collection(db, "sport_profiles"), orderBy("name")) : null),
    [db]
  );
  const { data: sports, isLoading, error } = useCollection<SportProfile>(sportsQuery);

  const handleAddNew = () => {
    setSelectedSport(null);
    setIsDialogOpen(true);
  };
  
  const handleEdit = (sport: WithId<SportProfile>) => {
    setSelectedSport(sport);
    setIsDialogOpen(true);
  };
  
  const handleDelete = async (sportId: string) => {
    if (!user) return;
    const result = await deleteSportProfile(user.uid, sportId);
    if (result.success) {
      toast({ title: result.message });
    } else {
      toast({ variant: "destructive", title: "Fout", description: result.message });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleAddNew}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nieuwe Sport Toevoegen
        </Button>
      </div>

      {isLoading && <div className="flex justify-center p-8"><Spinner /></div>}
      {error && <Alert variant="destructive"><FileWarning className="h-4 w-4" /><AlertTitle>Fout</AlertTitle><AlertDescription>Kon sportprofielen niet laden.</AlertDescription></Alert>}
      
      {!isLoading && sports && (
        <div className="border rounded-lg">
          {sports.map(sport => (
            <div key={sport.id} className="flex items-center p-3 border-b last:border-b-0">
              <div className="flex-1">
                <p className="font-semibold">{sport.name}</p>
                <p className="text-sm text-muted-foreground">{sport.slogan}</p>
              </div>
              <div className="flex items-center gap-2">
                 <Button variant="ghost" size="icon" onClick={() => handleEdit(sport)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Weet je het zeker?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Deze actie kan niet ongedaan worden gemaakt. Dit verwijdert het sportprofiel '{sport.name}' permanent.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuleren</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(sport.id)}>Verwijderen</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}

      <SportProfileFormDialog
        isOpen={isDialogOpen}
        setIsOpen={setIsDialogOpen}
        sportProfile={selectedSport}
      />
    </div>
  );
}

