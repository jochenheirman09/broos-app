'use server';
/**
 * @fileOverview A flow for the AI buddy "Broos" who acts as an empathetic psychologist for young athletes.
 *
 * - chatWithBuddy - A function that handles the chat interaction with the AI buddy.
 * - BuddyInput - The input type for the chatWithbuddy function.
 * - BuddyOutput - The return type for the chatWithBuddy function.
 */

import { type BuddyInput, type BuddyOutput } from '@/ai/types';
import { buddyFlow } from './buddy-flow-internal'; // <<< NEW IMPORT

// This function is the only export from this file.
// It is an async function that can be called from server-side components.
export async function chatWithBuddy(
  input: BuddyInput
): Promise<BuddyOutput> {
  return buddyFlow(input);
}
// All flow and prompt definitions are now in buddy-flow-internal.ts