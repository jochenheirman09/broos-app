
"use client";

import { useUser } from "@/context/user-context";
import { useDoc, useFirestore, useMemoFirebase, useCollection } from "@/firebase";
import { doc, collection, query, limit } from "firebase/firestore";
import type { Club, Team, Chat } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Users, Shield, ArrowRight } from "lucide-react";
import { Spinner } from "../ui/spinner";
import { Button } from "../ui/button";
import Link from 'next/link';

const roleIcons: { [key: string]: React.ReactNode } = {
  player: <User className="h-5 w-5 mr-2" />,
  staff: <Users className="h-5 w-5 mr-2" />,
  responsible: <Shield className="h-5 w-5 mr-2" />,
};

export function WelcomeHeader() {
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

    const previousChatsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(db, "users", user.uid, "chats"), limit(1));
    }, [user, db]);
    const { data: previousChats } = useCollection<Chat>(previousChatsQuery);

    const isLoadingAffiliation = userLoading || teamLoading || clubLoading;
    const { role, name } = userProfile || {};

    const getInitials = (name: string = '') => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
    };
    
    const buddyName = userProfile?.buddyName || "Broos";
    const hasChatHistory = previousChats ? previousChats.length > 0 : false;

    return (
        <Card>
            <CardHeader className="flex-col items-start sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 pb-4">
                <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 border-2 border-primary/20">
                        <AvatarImage src={clubData?.logoURL} />
                        <AvatarFallback className="text-xl font-bold bg-muted">
                            {clubData ? getInitials(clubData.name) : '?'}
                        </AvatarFallback>
                    </Avatar>
                    
                    <div>
                        <CardTitle className="text-2xl font-bold">Welkom, {name}!</CardTitle>
                        <CardDescription>
                            {isLoadingAffiliation ? (
                                "Laden..."
                            ) : role === 'responsible' ? (
                                `Je beheert de club ${clubData?.name || 'Onbekend'}.`
                            ) : (
                                <>Lid van <strong>{teamData?.name || 'Team'}</strong> bij <strong>{clubData?.name || 'Club'}</strong></>
                            )}
                        </CardDescription>
                    </div>
                </div>
                {role && (
                    <div className="flex items-center bg-secondary text-secondary-foreground px-3 py-1.5 rounded-full text-sm font-medium shadow-clay-inset">
                        {roleIcons[role]}
                        <span className="capitalize">{role}</span>
                    </div>
                )}
            </CardHeader>

            {role === 'player' && (
                 <CardContent>
                    <Link href="/chat">
                        <Button size="lg" className="w-full sm:w-auto">
                        {hasChatHistory
                            ? `Zet je gesprek verder met ${buddyName}`
                            : `Start Gesprek met ${buddyName}`}
                        <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    </Link>
                </CardContent>
            )}
        </Card>
    );
}
