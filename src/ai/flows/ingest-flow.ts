"use server";
/**
 * @fileOverview A Genkit flow for ingesting documents into the knowledge base.
 */

import { z } from "genkit";
import { DocInputSchema } from '@/ai/types';
import { ingestFlow } from './ingest-flow-internal'; // <<< NEW IMPORT

// This file now only wraps the flow function for server action export.
export const ingestDocument = async (
  input: z.infer<typeof DocInputSchema>
): Promise<{ success: boolean; message: string }> => {
    return ingestFlow(input);
};
// All flow definition is now in ingest-flow-internal.ts