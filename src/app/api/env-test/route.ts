import { NextResponse } from 'next/server';

export async function GET() {
    const apiKey = process.env.GEMINI_API_KEY;
    const adminKey = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
    
    // Log de status in de Cloud Run logs (essentieel voor debuggen)
    console.log(`[FINAL ENV TEST LOG] GEMINI_API_KEY status: ${apiKey ? 'SET' : 'MISSING'}`);
    console.log(`[FINAL ENV TEST LOG] GEMINI_API_KEY length: ${apiKey ? apiKey.length : 0}`);

    // Stuur een object terug naar de client.
    return NextResponse.json({
        success: true,
        test: "Secret Injection Check Status",
        geminiApiKeyStatus: apiKey && apiKey.length > 10 ? 'AVAILABLE' : 'MISSING',
        geminiApiKeyLength: apiKey ? apiKey.length : 0,
        firebaseAdminKeyStatus: adminKey && adminKey.length > 100 ? 'AVAILABLE' : 'MISSING',
    });
}
