"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/user-context";
import { Logo } from "./logo";

export function BuddyAvatar({ className }: { className?: string }) {
  const { userProfile } = useUser();

  // In a future step, we'll fetch the custom buddy profile.
  // For now, we use the default.
  const buddyProfile = {
    name: "Broos",
    avatarUrl: null, // We will use the Logo component for now.
  };

  return (
    <Avatar className={cn(className)}>
      {buddyProfile.avatarUrl ? (
        <AvatarImage src={buddyProfile.avatarUrl} alt={buddyProfile.name} />
      ) : (
        <AvatarFallback>
            <Logo size="normal" />
        </AvatarFallback>
      )}
    </Avatar>
  );
}
