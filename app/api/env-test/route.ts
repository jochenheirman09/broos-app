
// app/api/env-test/route.ts

// Zorg ervoor dat dit een Server Component/Route Handler is
export async function GET() {
    const apiKey = process.env.GEMINI_API_KEY;
    const adminKey = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT ? 'SET' : 'NOT SET';

    console.log(`[ENV TEST LOG] GEMINI_API_KEY raw value: ${apiKey}`);
    console.log(`[ENV TEST LOG] FIREBASE_ADMIN_SERVICE_ACCOUNT status: ${adminKey}`);

    // Stuur een object terug naar de client, maar toon de volledige sleutel NIET.
    return Response.json({
        success: true,
        apiKeyStatus: apiKey ? 'AVAILABLE' : 'MISSING',
        apiKeyLength: apiKey ? apiKey.length : 0,
        adminKeyStatus: adminKey
    });
}
