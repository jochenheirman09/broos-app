"use server";
/**
 * @fileOverview A Genkit flow for generating a user avatar.
 *
 * - generateAvatar - A function that handles the avatar generation process.
 */

import { ai } from "@/ai/genkit";
import { z } from "genkit";

// No specific schema needed for input, we'll just take a string.
// No specific schema needed for output, we just want the image URL.
const AvatarOutputSchema = z.object({
  media: z.string().optional(),
});

export async function generateAvatar(
  promptText: string
): Promise<z.infer<typeof AvatarOutputSchema>> {
  return avatarFlow(promptText);
}

const avatarFlow = ai.defineFlow(
  {
    name: "avatarFlow",
    inputSchema: z.string(),
    outputSchema: AvatarOutputSchema,
  },
  async (prompt) => {
    const { media } = await ai.generate({
      model: "googleai/imagen-4.0-fast-generate-001",
      prompt: `Generate a friendly, approachable avatar for a therapy chatbot for young athletes. Style: simple, clean, vector illustration, centered on a plain background. Prompt: ${prompt}`,
    });

    if (!media) {
      return { media: undefined };
    }

    return {
      media: media.url,
    };
  }
);
