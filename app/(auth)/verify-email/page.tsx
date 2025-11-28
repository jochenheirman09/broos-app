
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
        <CardTitle>Verifieer je e-mailadres</CardTitle>
        <CardDescription>Controleer je inbox om door te gaan.</CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<div>Laden...</div>}>
          <VerifyEmailNotice />
        </Suspense>
      </CardContent>
    </Card>
  );
}
