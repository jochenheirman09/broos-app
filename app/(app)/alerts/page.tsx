
'use client';

import { AlertList } from '@/components/app/alert-list';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function AlertsPage() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <AlertTriangle className="h-6 w-6 mr-3 text-destructive" />
            Gegenereerde Alerts
          </CardTitle>
          <CardDescription>
            Een overzicht van door de AI gedetecteerde zorgwekkende signalen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertList />
        </CardContent>
      </Card>
    </div>
  );
}
