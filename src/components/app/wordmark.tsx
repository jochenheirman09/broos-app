import { cn } from "@/lib/utils";

export function Wordmark({
  size = "normal",
  className,
  children,
}: {
  size?: "normal" | "large";
  className?: string;
  children: React.ReactNode;
}) {
  const isLarge = size === "large";
  return (
    <span
      className={cn(
        "font-headline font-bold",
        isLarge ? "text-5xl" : "text-2xl",
        className
      )}
    >
      {children}
    </span>
  );
}
