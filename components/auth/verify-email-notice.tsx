
"use client";

import { useUser } from "@/context/user-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { useToast } from "@/hooks/use-toast";
import { sendEmailVerification } from "firebase/auth";
import { MailCheck } from "lucide-react";
import { Spinner } from "../ui/spinner";
import { Card, CardContent } from "../ui/card";

export function VerifyEmailNotice() {
  const { user, loading, logout } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!loading && user && user.emailVerified) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return; // Don't run the interval if there's no user

    const interval = setInterval(async () => {
      // It's possible for user to be null if they log out
      if (user) {
        await user.reload();
        // The user object is mutated directly by `reload()`, so we re-check it
        if (user.emailVerified) {
          router.replace("/dashboard");
        }
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [user, router]);

  const handleResend = async () => {
    if (!user) return;
    setIsSending(true);
    try {
      await sendEmailVerification(user);
      toast({
        title: "E-mail verzonden",
        description: "Er is een nieuwe verificatie-e-mail verzonden.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Kon de verificatie-e-mail niet verzenden.",
      });
    } finally {
      setIsSending(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex justify-center items-center p-8">
        <Spinner />
      </div>
    );
  }

  return (
    <Card>
      <CardContent>
        <div className="text-center">
          <MailCheck className="mx-auto h-16 w-16 text-primary" />
          <p className="mt-4 text-muted-foreground">
            Er is een verificatielink gestuurd naar{" "}
            <span className="font-semibold text-foreground">{user?.email}</span>
            . Klik op de link om je account te verifiëren.
          </p>
          <div className="mt-6 flex flex-col gap-4">
            <Button onClick={handleResend} disabled={isSending} size="lg">
              {isSending && <Spinner size="small" className="mr-2" />}
              {isSending ? "Verzenden..." : "Verificatie-e-mail opnieuw verzenden"}
            </Button>
            <Button variant="outline" onClick={logout} size="lg">
              Uitloggen
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
