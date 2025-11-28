
import { LoginForm } from "@/components/auth/login-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import Link from "next/link";

export default function LoginPage() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Welkom terug</CardTitle>
        <CardDescription>Log in om verder te gaan naar Broos 2.0.</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Heb je nog geen account?{" "}
          <Link
            href="/"
            className="font-semibold text-primary hover:underline"
          >
            Registreer
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
