import { JoinClubForm } from "@/components/app/join-club-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Users } from "lucide-react";

export default function JoinClubPage() {
  return (
    <div className="flex justify-center items-start">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center mb-4">
            <Users className="h-8 w-8 mr-3 text-primary" />
            <div>
              <CardTitle className="text-2xl">Sluit je aan bij een Club</CardTitle>
              <CardDescription>
                Voer de unieke uitnodigingscode van de club in.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <JoinClubForm />
        </CardContent>
      </Card>
    </div>
  );
}
