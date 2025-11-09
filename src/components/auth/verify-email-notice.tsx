"use client";

import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { useToast } from "@/hooks/use-toast";
import { sendEmailVerification } from "firebase/auth";
import { MailCheck } from "lucide-react";
import { Spinner } from "../ui/spinner";

export function VerifyEmailNotice() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (user && user.emailVerified) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (user) {
        await user.reload();
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
        title: "Email Sent",
        description: "A new verification email has been sent.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send verification email.",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="text-center">
      <MailCheck className="mx-auto h-12 w-12 text-primary" />
      <p className="mt-4 text-muted-foreground">
        A verification link has been sent to{" "}
        <span className="font-semibold text-foreground">{user?.email}</span>.
        Please click the link to verify your account.
      </p>
      <div className="mt-6 flex flex-col gap-4">
        <Button onClick={handleResend} disabled={isSending}>
          {isSending && <Spinner size="small" className="mr-2" />}
          {isSending ? "Sending..." : "Resend Verification Email"}
        </Button>
        <Button variant="outline" onClick={logout}>
          Log out
        </Button>
      </div>
    </div>
  );
}
