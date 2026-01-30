// src/components/app/new_logo_proposal.tsx
import { cn } from "@/lib/utils";

export function NewLogoProposal({ size = "normal", className, showBackground = false }: { size?: "normal" | "large" | "xl"; className?: string; showBackground?: boolean; }) {
  const dimensions = { normal: "32", large: "64", xl: "128" }[size];
  return (
    <svg width={dimensions} height={dimensions} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className={cn(className)}>
      <defs>
        <linearGradient id="proposalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: 'hsl(var(--accent))', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      {showBackground && <rect width="100" height="100" rx="24" fill="#0B203A" />}
      <path d="M 20 80 Q 50 20, 80 80" stroke="url(#proposalGradient)" strokeWidth="10" fill="none" strokeLinecap="round" />
      <circle cx="50" cy="45" r="12" fill="url(#proposalGradient)" />
      <path d="M 35 60 L 65 60" stroke="hsl(var(--foreground))" strokeWidth="6" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}
