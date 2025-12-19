'use server';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';

// --- Genkit AI Configuratie ---
let genkitInstance: ReturnType<typeof genkit> | null = null;

export async function getAiInstance(): Promise<ReturnType<typeof genkit>> {
    if (genkitInstance) {
        return genkitInstance;
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error("[Genkit] CRITICAL: GEMINI_API_KEY is undefined. Cannot initialize Genkit.");
        throw new Error("AI service is niet geconfigureerd. De GEMINI_API_KEY ontbreekt in de serveromgeving.");
    }
    
    console.log("[Genkit] Initializing Genkit with a valid API key.");

    genkitInstance = genkit({
        plugins: [googleAI({ apiKey: apiKey })], 
    });
    
    return genkitInstance;
}

// --- Firebase Admin SDK --- 
let _firebaseAdminApp: App | null = null;
let _adminDb: Firestore | null = null;
let _adminAuth: Auth | null = null;
let _adminMessaging: Messaging | null = null;

/**
 * Initializes and/or returns the Firebase Admin SDK services.
 * It uses Application Default Credentials in a Google Cloud environment
 * and falls back to a service account key for local development.
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

    if (getApps().length > 0) {
        _firebaseAdminApp = getApps()[0];
        console.log('[Firebase Admin] Using existing app.');
    } else if (process.env.GCLOUD_PROJECT) {
        // In Google Cloud environment, initialize without credentials.
        _firebaseAdminApp = initializeApp();
        console.log('[Firebase Admin] Initialized using Application Default Credentials.');
    } else {
        // For local development, use the service account key.
        const serviceAccountKey = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
        if (!serviceAccountKey) {
            throw new Error('FIREBASE_ADMIN_SERVICE_ACCOUNT environment variable not set for local development.');
        }

        try {
            const serviceAccount = JSON.parse(serviceAccountKey);
            _firebaseAdminApp = initializeApp({
                credential: cert(serviceAccount),
            });
            console.log('[Firebase Admin] Initialized using service account key for local dev.');
        } catch (error: any) {
            console.error('[Firebase Admin] CRITICAL: Failed to parse service account key or initialize app locally.', error.message);
            throw new Error('Failed to initialize Firebase Admin SDK. Check your service account credentials.');
        }
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
}
