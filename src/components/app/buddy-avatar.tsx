"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/user-context";
import { LogoAvatar, TsubasaAvatar, RobotAvatar } from "./predefined-avatars";
import { useMemo } from "react";

const predefinedAvatars = [
  { id: 'logo', component: LogoAvatar },
  { id: 'tsubasa', component: TsubasaAvatar },
  { id: 'robot', component: RobotAvatar },
];

export function BuddyAvatar({ className }: { className?: string }) {
  // In a real app, this would be loaded from a specific buddy profile setting.
  // For now, we'll imagine it's stored on the main user profile for simplicity.
  const { userProfile } = useUser();
  const buddyName = "Broos";

  const SelectedAvatar = useMemo(() => {
    // This is a placeholder for where you would fetch the buddy's specific profile
    const selectedAvatarId = "logo"; // Let's assume 'logo' is the default
    const customAvatarUrl = null; // Let's assume no custom URL for now

    if (customAvatarUrl) {
      return <AvatarImage src={customAvatarUrl} alt={buddyName} />;
    }

    const PredefinedComponent = predefinedAvatars.find(a => a.id === selectedAvatarId)?.component;

    if (PredefinedComponent) {
      return <PredefinedComponent className="h-full w-full" size="normal" />;
    }

    // Fallback to logo
    return <LogoAvatar className="h-full w-full" size="normal" />;
  }, []);

  return (
    <Avatar className={cn(className)}>
      <AvatarFallback className="bg-muted">
        {SelectedAvatar}
      </AvatarFallback>
    </Avatar>
  );
}
