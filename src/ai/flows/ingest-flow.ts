
"use server";
/**
 * @fileOverview A Genkit flow for ingesting documents into the knowledge base.
 */
import { ingestFlow } from './ingest-flow-internal';
import type { DocInput } from '@/ai/types';


// This file now only contains the 'use server' export wrapper
export async function ingestDocument(
  input: DocInput
): Promise<{ success: boolean; message: string }> {
    return ingestFlow(input);
};
