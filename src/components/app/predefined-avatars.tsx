import { cn } from "@/lib/utils";

interface AvatarProps {
    className?: string;
    size?: 'normal' | 'large';
}

export function LogoAvatar({ className, size = 'large' }: AvatarProps) {
    const isLarge = size === "large";
    return (
        <div className={cn("p-4 bg-muted rounded-full flex items-center justify-center", className)}>
            <svg
                width={isLarge ? "128" : "32"}
                height={isLarge ? "128" : "32"}
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-primary"
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
        </div>
    );
}

export function TsubasaAvatar({ className }: AvatarProps) {
  return (
    <div className={cn("bg-muted rounded-full flex items-center justify-center overflow-hidden", className)}>
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        {/* Background */}
        <circle cx="50" cy="50" r="50" fill="#E0E0E0"/>
        {/* Neck */}
        <path d="M 45 60 L 55 60 L 55 65 L 45 65 Z" fill="#F5D4B7"/>
        {/* Head */}
        <circle cx="50" cy="45" r="20" fill="#F5D4B7"/>
        {/* Hair */}
        <path d="M 30 45 Q 50 20, 70 45 L 70 50 Q 50 60, 30 50 Z" fill="#2C2C2C"/>
        <path d="M 50 25 Q 60 30, 68 40" stroke="#2C2C2C" strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M 50 25 Q 40 30, 32 40" stroke="#2C2C2C" strokeWidth="5" fill="none" strokeLinecap="round" />
        {/* Eyes */}
        <circle cx="42" cy="48" r="2" fill="black" />
        <circle cx="58" cy="48" r="2" fill="black" />
        {/* Mouth */}
        <path d="M 45 55 Q 50 58, 55 55" stroke="black" strokeWidth="1" fill="none" />
        {/* Jersey */}
        <path d="M 35 65 L 65 65 L 60 90 L 40 90 Z" fill="#FFC107"/>
        <path d="M 35 65 L 65 65 L 65 75 L 35 75 Z" fill="#3F51B5"/>
      </svg>
    </div>
  );
}

export function RobotAvatar({ className }: AvatarProps) {
  return (
     <div className={cn("bg-muted rounded-full flex items-center justify-center overflow-hidden", className)}>
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            {/* Head */}
            <rect x="25" y="20" width="50" height="50" rx="10" fill="#B0BEC5"/>
            {/* Antenna */}
            <line x1="50" y1="20" x2="50" y2="10" stroke="#78909C" strokeWidth="3"/>
            <circle cx="50" cy="8" r="4" fill="#FFC107"/>
            {/* Eye */}
            <circle cx="50" cy="45" r="10" fill="#263238"/>
            <circle cx="53" cy="42" r="3" fill="white"/>
             {/* Ears */}
            <rect x="18" y="35" width="7" height="20" rx="3" fill="#90A4AE" />
            <rect x="75" y="35" width="7" height="20" rx="3" fill="#90A4AE" />
        </svg>
    </div>
  );
}
