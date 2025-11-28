// src/ai/genkit.ts

// HOUD DEZE LIJN: Dit bestand bevat server-side logica
'use server';

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';

// --- Genkit AI Configuratie ---

// We maken een Genkit-instantie aan die we hergebruiken.
// Deze wordt nu pas geïnitialiseerd wanneer getAiInstance() wordt aangeroepen.
let genkitInstance: ReturnType<typeof genkit> | null = null;

export async function getAiInstance(): Promise<ReturnType<typeof genkit>> {
    if (genkitInstance) {
        return genkitInstance;
    }

    // Haal de API-sleutel op van de environment variables (Secret Manager live)
    const apiKey = process.env.GEMINI_API_KEY;

    // ----- START DEBUGGING LOGS -----
    console.log("[DEBUG Genkit] Attempting to initialize Genkit...");
    console.log(`[DEBUG Genkit] API Key Status: ${apiKey ? 'Available (Length: ' + apiKey.length + ')' : 'MISSING'}`);
    
    if (!apiKey) {
        console.error("[DEBUG Genkit] CRITICAL: GEMINI_API_KEY is undefined. Cannot initialize Genkit.");
        throw new Error("Mijn excuses, ik kan momenteel niet functioneren omdat mijn configuratie onvolledig is.");
    }
    // ----- EINDE DEBUGGING LOGS -----

    // DE FIX: Initialiseer HIER pas, wanneer de sleutel geverifieerd is!
    genkitInstance = genkit({
        plugins: [googleAI({ apiKey: apiKey })], 
        logLevel: 'debug',
        enableTracingAndMetrics: true,
    });
    
    return genkitInstance;
}


// --- Firebase Admin SDK --- (Ongewijzigd)
let _firebaseAdminApp: App | null = null;
let _adminDb: Firestore | null = null;
let _adminAuth: Auth | null = null;
let _adminMessaging: Messaging | null = null;

/**
 * Initializes and returns the Firebase Admin SDK instances.
 * It uses a singleton pattern to ensure it's only initialized once.
 *
 * @returns An object containing the admin app, db, and auth instances.
 */
export async function getFirebaseAdmin() {
    if (_firebaseAdminApp) {
        return {
            adminApp: _firebaseAdminApp,
            adminDb: _adminDb!,
            adminAuth: _adminAuth!,
            adminMessaging: _adminMessaging!,
        };
    }

    const serviceAccountKey = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
    if (!serviceAccountKey) {
        throw new Error('FIREBASE_ADMIN_SERVICE_ACCOUNT environment variable is not set. This is required for server-side actions.');
    }

    try {
        const serviceAccount = JSON.parse(serviceAccountKey);

        if (getApps().length === 0) {
            _firebaseAdminApp = initializeApp({
                credential: cert(serviceAccount),
            });
            console.log('[Firebase Admin] Initialized new app.');
        } else {
            _firebaseAdminApp = getApps()[0];
            console.log('[Firebase Admin] Using existing app.');
        }

        _adminDb = getFirestore(_firebaseAdminApp);
        _adminAuth = getAuth(_firebaseAdminApp);
        _adminMessaging = getMessaging(_firebaseAdminApp);

        return {
            adminApp: _firebaseAdminApp,
            adminDb: _adminDb,
            adminAuth: _adminAuth,
            adminMessaging: _adminMessaging,
        };
    } catch (error: any) {
        console.error('[Firebase Admin] CRITICAL: Failed to parse service account key or initialize app.', error.message);
        throw new Error('Failed to initialize Firebase Admin SDK. Check your service account credentials.');
    }
}
