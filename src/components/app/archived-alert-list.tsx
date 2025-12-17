
'use client';
import { AlertList } from './alert-list';

export function ArchivedAlertList() {
    // This component simply wraps the AlertList and tells it to fetch
    // alerts with a status of 'acknowledged' or 'resolved'.
    return <AlertList status="archived" />;
}
