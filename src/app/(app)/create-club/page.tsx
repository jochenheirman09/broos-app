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
    <div className="flex justify-center items-start">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center mb-4">
            <Building className="h-8 w-8 mr-3 text-primary" />
            <div>
              <CardTitle className="text-2xl">Creëer een Nieuwe Club</CardTitle>
              <CardDescription>
                Vul de gegevens in om je club op te zetten.
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
