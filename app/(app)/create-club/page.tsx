
import { CreateClubForm } from "@/components/app/create-club-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Building } from "lucide-react";

export default function CreateClubPage() {
  return (
    <div className="flex justify-center items-start pt-8">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center mb-4">
            <Building className="h-8 w-8 mr-3 text-primary" />
            <div>
              <CardTitle className="text-2xl">Creëer of Sluit je aan bij een Club</CardTitle>
              <CardDescription>
                Maak een nieuwe club aan of gebruik een code om lid te worden.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <CreateClubForm />
        </CardContent>
      </Card>
    </div>
  );
}
