import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

// BELANGRIJK: Vervang de placeholder hieronder door uw daadwerkelijke Gemini API-sleutel.
// Deze sleutel wordt veilig op de server gebruikt en komt niet in de browser terecht.
const geminiApiKey = "AIzaSyD8gdD87XpyXooiZNBLpDzOsrlMUURVddI";

if (geminiApiKey === "AIzaSyD8gdD87XpyXooiZNBLpDzOsrlMUURVddI") {
  console.warn("Gemini API key is not configured. Please add it to src/ai/genkit.ts");
}

export const ai = genkit({
  plugins: [googleAI({apiKey: geminiApiKey})],
  model: 'googleai/gemini-2.5-flash',
});
