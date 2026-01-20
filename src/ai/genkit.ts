
'use server';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { getFirebaseAdmin } from '@/lib/server/firebase-admin'; // Use the centralized admin instance

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

// Re-export getFirebaseAdmin for any files that might still be importing it from here.
export { getFirebaseAdmin };
