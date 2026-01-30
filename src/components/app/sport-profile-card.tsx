
"use client";

import { useUser } from "@/context/user-context";
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import type { Club, Team, SportProfile } from "@/lib/types";
import { defaultSportProfile } from "@/lib/sport-profiles";
import {
  Card,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { useMemo } from "react";
import { User, Users, Shield, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from 'next/link';

const roleIcons: { [key: string]: React.ReactNode } = {
  player: <User className="h-5 w-5 mr-2" />,
  staff: <Users className="h-5 w-5 mr-2" />,
  responsible: <Shield className="h-5 w-5 mr-2" />,
};

export function SportProfileCard() {
    const { userProfile, user, loading: userLoading } = useUser();
    const db = useFirestore();

    const clubRef = useMemoFirebase(() => {
        if (!userProfile?.clubId) return null;
        return doc(db, "clubs", userProfile.clubId);
    }, [db, userProfile?.clubId]);
    const { data: clubData, isLoading: clubLoading } = useDoc<Club>(clubRef);

    const teamRef = useMemoFirebase(() => {
        if (!userProfile?.clubId || !userProfile?.teamId) return null;
        return doc(db, "clubs", userProfile.clubId, "teams", userProfile.teamId);
    }, [db, userProfile?.clubId, userProfile?.teamId]);
    const { data: teamData, isLoading: teamLoading } = useDoc<Team>(teamRef);

    const sportProfileRef = useMemoFirebase(() => {
        if (!clubData?.sport) return null;
        return doc(db, "sport_profiles", clubData.sport);
    }, [db, clubData?.sport]);
    const { data: sportProfileData, isLoading: sportLoading } = useDoc<SportProfile>(sportProfileRef);

    const isLoading = userLoading || clubLoading || teamLoading || (clubData?.sport && sportLoading);
    const { role, name } = userProfile || {};

    const sportProfile = sportProfileData || defaultSportProfile;

    const affiliationText = useMemo(() => {
        if (isLoading) return "Laden...";
        if (role === 'responsible') return `Je beheert de club ${clubData?.name || 'Onbekend'}.`;
        return <>Lid van <strong>{teamData?.name || 'Team'}</strong> bij <strong>{clubData?.name || 'Club'}</strong></>;
    }, [isLoading, role, clubData, teamData]);
    
    const buddyName = userProfile?.buddyName || "Broos";
    
    const getInitials = (name: string = '') => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
    };
    
    if (isLoading) {
        return (
            <Card className="h-[160px] flex items-center justify-center">
                <Spinner />
            </Card>
        );
    }
    
    return (
        <Card className="shadow-clay-card bg-gradient-to-br from-primary/80 to-accent/80 text-primary-foreground border-primary/20">
            <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <Avatar className="h-20 w-20 border-4 border-background/20 shadow-lg shrink-0">
                        <AvatarImage src={clubData?.logoURL} className="object-cover" />
                        <AvatarFallback className="text-3xl font-bold bg-muted text-foreground">
                            {clubData ? getInitials(clubData.name) : '?'}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-grow min-w-0">
                        <div>
                            <CardTitle className="text-2xl font-bold">Welkom, {name}!</CardTitle>
                            <p className="text-primary-foreground/80 !mt-1">
                                {affiliationText}
                            </p>
                        </div>
                        <div className="my-3 border-t border-background/30"></div>
                        <div className="flex justify-between items-end gap-4">
                             <div className="min-w-0">
                                <span className="font-semibold text-background/80">{sportProfile.name}</span>
                                <p className="italic text-primary-foreground/90 text-lg">{sportProfile.slogan}</p>
                             </div>
                             <div className="shrink-0">
                                {role && role !== 'player' ? (
                                    <div className="flex items-center bg-background/20 text-primary-foreground px-3 py-1.5 rounded-full text-sm font-medium">
                                        {roleIcons[role]}
                                        <span className="capitalize">{role}</span>
                                    </div>
                                ) : (
                                    <Link href="/chat">
                                        <Button size="lg" className="bg-background/90 text-foreground hover:bg-background shadow-lg">
                                            {`Ga verder met ${buddyName}`}
                                            <ArrowRight className="ml-2 h-5 w-5" />
                                        </Button>
                                    </Link>
                                )}
                             </div>
                        </div>
                    </div>
                </div>
            </CardHeader>
        </Card>
    );
}
