
import { cn } from "@/lib/utils";

export function Logo({
  size = "normal",
  className,
}: {
  size?: "normal" | "large";
  className?: string;
}) {
  const isLarge = size === "large";
  return (
    <svg
      width={isLarge ? "64" : "32"}
      height={isLarge ? "64" : "32"}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-primary", className)}
    >
      <path
        d="M11 16C11 18.7614 13.2386 21 16 21C18.7614 21 21 18.7614 21 16C21 13.2386 18.7614 11 16 11C13.2386 11 11 13.2386 11 16Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M5 16C5 12.134 8.13401 9 12 9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M27 16C27 19.866 23.866 23 20 23"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
