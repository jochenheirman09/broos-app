// src/lib/server/admin-db-singleton.ts

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let adminDbInstance: Firestore | null = null;

export function getAdminDb(): Firestore {
    if (adminDbInstance) {
        return adminDbInstance;
    }

    // Alleen initialiseren als dit nog niet is gebeurd
    if (getApps().length === 0) {
        const serviceAccountKey = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
        if (!serviceAccountKey) {
            throw new Error('FIREBASE_ADMIN_SERVICE_ACCOUNT ontbreekt bij Admin DB init.');
        }

        try {
            const serviceAccount = JSON.parse(serviceAccountKey);
            initializeApp({
                credential: cert(serviceAccount),
            });
            console.log('[Admin DB] Synchrone initialisatie voltooid.');
        } catch (e) {
            console.error('[Admin DB] Fout bij parsen/initialiseren:', e);
            throw new Error('Fout bij het initialiseren van de Firebase Admin DB.');
        }
    }

    adminDbInstance = getFirestore();
    return adminDbInstance;
}
