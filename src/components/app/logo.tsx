
import { cn } from "@/lib/utils";

export function Logo({
  size = "normal",
  className,
  showBackground = false, // Default is now false
}: {
  size?: "normal" | "large" | "xl";
  className?: string;
  showBackground?: boolean;
}) {
  const dimensions = {
    normal: "32",
    large: "64",
    xl: "128"
  }[size];

  return (
    <svg
      width={dimensions}
      height={dimensions}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("drop-shadow-sm", className)}
    >
      <defs>
        {/* De vloeiende verloopkleuren gebaseerd op je afbeelding */}
        <linearGradient id="mGradient" x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" style={{ stopColor: '#76FF03', stopOpacity: 1 }} /> {/* Fel groen */}
          <stop offset="50%" style={{ stopColor: '#A020F0', stopOpacity: 1 }} /> {/* Paars midden */}
          <stop offset="100%" style={{ stopColor: '#00E5FF', stopOpacity: 1 }} /> {/* Cyaan rechts */}
        </linearGradient>
        
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Optionele achtergrond: alleen tekenen als showBackground true is */}
      {showBackground && (
        <rect width="100" height="100" rx="24" fill="#0B203A" />
      )}

      <g transform="translate(0, 5)">
        {/* Het hoofdje (menselijke figuur aspect) */}
        <circle cx="50" cy="25" r="9" fill="#CBD5E1" />

        {/* De 'M' vorm - geoptimaliseerd voor vloeiende curves */}
        <path
          d="M 25 75 
             V 55 
             C 25 40, 35 40, 40 48 
             L 50 62 
             L 60 48 
             C 65 40, 75 40, 75 55 
             V 75"
          stroke="url(#mGradient)"
          strokeWidth="11"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        
        {/* Subtiele schaduw onder de M voor diepte */}
        <path
          d="M 25 75 V 55 C 25 40, 35 40, 40 48 L 50 62 L 60 48 C 65 40, 75 40, 75 55 V 75"
          stroke="black"
          strokeWidth="11"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.1"
          transform="translate(0, 2)"
        />
      </g>
    </svg>
  );
}
