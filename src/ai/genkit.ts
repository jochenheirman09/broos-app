import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

// BELANGRIJK: Vervang "YOUR_GEMINI_API_KEY" met uw daadwerkelijke
// Gemini API-sleutel die u kunt aanmaken in Google AI Studio.
export const ai = genkit({
  plugins: [googleAI({apiKey: "AIzaSyD8gdD87XpyXooiZNBLpDzOsrlMUURVddI"})],
  model: 'googleai/gemini-2.5-flash',
});
