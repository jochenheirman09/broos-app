import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/app/logo";
import { Wordmark } from "@/components/app/wordmark";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <main className="relative flex min-h-screen flex-col items-center justify-center p-4 bg-background">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center justify-center mb-8 gap-2">
            <Wordmark size="large" />
          </div>
          {children}
        </div>
      </main>
    </ThemeProvider>
  );
}
