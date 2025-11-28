
"use client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/user-context";
import { LogoAvatar, TsubasaAvatar, RobotAvatar } from "./predefined-avatars";
import { useMemo } from "react";

const predefinedAvatars: { [key: string]: React.FC<any> } = {
  logo: LogoAvatar,
  tsubasa: TsubasaAvatar,
  robot: RobotAvatar,
};

export function BuddyAvatar({ className }: { className?: string }) {
  const { userProfile } = useUser();
  const buddyName = userProfile?.buddyName || "Broos";
  const buddyAvatar = userProfile?.buddyAvatar || 'logo';

  const SelectedAvatar = useMemo(() => {
    // Case 1: Custom uploaded avatar (data URL)
    if (buddyAvatar.startsWith('data:image')) {
      return <img src={buddyAvatar} alt={buddyName} className="h-full w-full object-cover" />;
    }

    // Case 2: Predefined avatar
    const PredefinedComponent = predefinedAvatars[buddyAvatar];
    if (PredefinedComponent) {
      return <PredefinedComponent className="h-full w-full" size="normal" />;
    }

    // Fallback to default logo avatar
    return <LogoAvatar className="h-full w-full" size="normal" />;
  }, [buddyAvatar, buddyName]);

  return (
    <Avatar className={cn(className)}>
      {/* AvatarImage is meant for external URLs, so we render the content directly or inside the fallback */}
      <AvatarFallback className={cn("bg-muted", buddyAvatar.startsWith('data:image') ? 'p-0' : '')}>
        {SelectedAvatar}
      </AvatarFallback>
    </Avatar>
  );
}
