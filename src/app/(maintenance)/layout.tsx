import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Wordmark } from "@/components/app/wordmark";

export default function MaintenanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-xl">
        <div className="flex flex-col items-center justify-center mb-8 gap-2">
          <Wordmark size="large">Broos 2.0 - Onderhoud</Wordmark>
        </div>
        {children}
      </div>
    </div>
  );
}
