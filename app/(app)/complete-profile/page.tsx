
"use client";

import { CompleteProfileForm } from "@/components/app/complete-profile-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUser } from "@/context/user-context";

export default function CompleteProfilePage() {
  const { userProfile } = useUser();

  return (
    <div className="flex justify-center items-start pt-8">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">
            {userProfile?.name ? `Bijna klaar, ${userProfile.name}!` : "Profiel Aanvullen"}
          </CardTitle>
          <CardDescription>
            Voltooi je profiel om verder te gaan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CompleteProfileForm />
        </CardContent>
      </Card>
    </div>
  );
}
