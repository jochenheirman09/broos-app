"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClub } from "@/actions/club";
import { useUser } from "@/context/user-context";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "../ui/spinner";
import { Card, CardContent, CardFooter, CardHeader } from "../ui/card";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending && <Spinner size="small" className="mr-2" />}
      {pending ? "Creating Club..." : "Create Club"}
    </Button>
  );
}

export function CreateClubForm() {
  const { user } = useUser();
  const { toast } = useToast();
  const [state, formAction] = useFormState(createClub, { error: undefined });
  
  useEffect(() => {
    if (state?.error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: state.error,
      });
    }
  }, [state, toast]);

  return (
    <form action={formAction}>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Club Name</Label>
          <Input id="name" name="name" placeholder="e.g. Real Madrid" required />
        </div>
        {user && <input type="hidden" name="userId" value={user.uid} />}
        <SubmitButton />
      </div>
    </form>
  );
}
