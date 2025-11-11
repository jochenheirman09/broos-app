'use server';
/**
 * @fileOverview A flow for setting a custom claim on a user.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK if not already initialized
if (admin.apps.length === 0) {
  try {
    // In a deployed Firebase environment (like App Hosting), this will work automatically.
    // For local dev, it would need GOOGLE_APPLICATION_CREDENTIALS set.
    admin.initializeApp();
    console.log('Firebase Admin SDK initialized successfully.');
  } catch(e) {
    console.error("Could not initialize Firebase Admin SDK. Make sure the environment is set up correctly.", e);
  }
}

const SetClaimInputSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
});
export type SetClaimInput = z.infer<typeof SetClaimInputSchema>;

const SetClaimOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type SetClaimOutput = z.infer<typeof SetClaimOutputSchema>;


export async function setResponsibleClaim(input: SetClaimInput): Promise<SetClaimOutput> {
  return setClaimFlow(input);
}


const setClaimFlow = ai.defineFlow(
  {
    name: 'setClaimFlow',
    inputSchema: SetClaimInputSchema,
    outputSchema: SetClaimOutputSchema,
    authPolicy: (auth, input) => {
        if (!auth) {
            throw new Error("User must be authenticated.");
        }
        // Security check: Only the specific user can run this flow for themselves.
        if (input.email !== 'jochen.heirman@gmail.com') {
            throw new Error("You are not authorized to perform this action for this email.");
        }
    }
  },
  async (input) => {
    // Check if the admin SDK was initialized. If not, admin.apps will be empty.
    if (admin.apps.length === 0) {
        const errorMessage = "Firebase Admin SDK is not initialized. Cannot set claims.";
        console.error(errorMessage);
        return {
            success: false,
            message: errorMessage,
        };
    }
      
    try {
        // Hardcoded for security, only this specific user can get the claim via this flow.
        const targetUid = 'DKsO1eHpocf8QxwfjQUwcC5UOkm2'; 
        if (input.uid !== targetUid) {
            return {
                success: false,
                message: `This action is only for the designated responsible user. Your UID ${input.uid} does not match the target UID.`,
            }
        }
        
        await admin.auth().setCustomUserClaims(targetUid, { role: 'responsible' });

        return {
            success: true,
            message: `Successfully set { role: 'responsible' } for user ${targetUid}. Please log out and log back in to apply the changes.`,
        };

    } catch (error: any) {
        console.error('Error setting custom claim:', error);
        return {
            success: false,
            message: `Failed to set custom claim: ${error.message}`,
        };
    }
  }
);
