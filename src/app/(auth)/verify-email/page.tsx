import { VerifyEmailNotice } from "@/components/auth/verify-email-notice";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Suspense } from "react";

export default function VerifyEmailPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Verify Your Email</CardTitle>
        <CardDescription>Check your inbox to continue.</CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<div>Loading...</div>}>
          <VerifyEmailNotice />
        </Suspense>
      </CardContent>
    </Card>
  );
}
