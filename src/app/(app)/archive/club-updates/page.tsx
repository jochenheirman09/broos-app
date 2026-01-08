
"use client";

import { useUser } from "@/context/user-context";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ClubUpdates } from "@/components/app/club-updates";
import { Spinner } from "@/components/ui/spinner";
import { Building, ArrowLeft } from "lucide-react";
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ClubUpdatesArchivePage() {
    const { userProfile, loading } = useUser();
    
    if (loading) {
        return <div className="flex h-64 items-center justify-center"><Spinner /></div>;
    }

    if (userProfile?.role !== 'responsible') {
        return (
            <div className="space-y-6">
                <p>Geen toegang.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <CardTitle className="flex items-center text-2xl">
                                <Building className="h-6 w-6 mr-3 text-muted-foreground" />
                                Archief Club-inzichten
                            </CardTitle>
                            <CardDescription>
                                Een overzicht van alle eerder gegenereerde club-brede inzichten.
                            </CardDescription>
                        </div>
                        <Link href="/dashboard" passHref>
                        <Button variant="outline">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Terug naar Dashboard
                        </Button>
                        </Link>
                    </div>
                </CardHeader>
                <CardContent>
                    <ClubUpdates clubId={userProfile.clubId!} status="archived" />
                </CardContent>
            </Card>
        </div>
    )
}
