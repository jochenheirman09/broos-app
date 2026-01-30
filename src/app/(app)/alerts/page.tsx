
'use client';

import { AlertList } from '@/components/app/alert-list';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Archive, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AlertsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
           <div className="flex flex-wrap justify-between items-start gap-4">
            <div className="flex-grow">
              <CardTitle className="flex items-center text-2xl">
                <AlertTriangle className="h-6 w-6 mr-3 text-destructive" />
                Actieve Alerts
              </CardTitle>
              <CardDescription>
                Een overzicht van zorgwekkende signalen die aandacht vereisen. Alerts blijven hier staan totdat ze worden behandeld of afgesloten.
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Link href="/dashboard" passHref>
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Terug naar Dashboard
                </Button>
              </Link>
              <Link href="/alerts/archive" passHref>
                <Button variant="secondary" className="w-full">
                  Bekijk Archief
                  <Archive className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <AlertList status="new" />
        </CardContent>
      </Card>
    </div>
  );
}
