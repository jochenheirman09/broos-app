
"use server";

import { z } from 'genkit';
import { getFirebaseAdmin, getAiInstance } from '@/ai/genkit';
import { serverTimestamp } from 'firebase-admin/firestore';
import type { KnowledgeDocument } from '@/lib/types';
import { IngestInputSchema, type IngestInput } from '@/ai/types';

/**
 * Server action to ingest a text-based document into the knowledge base.
 * This is a simplified version and does not yet generate vector embeddings.
 */
export async function ingestDocument(input: IngestInput): Promise<{ success: boolean, docId?: string, message: string }> {
  console.log(`[SERVER ACTION] ingestDocument invoked for file: ${input.fileName}`);
  const { adminDb } = await getFirebaseAdmin();
  const ai = await getAiInstance(); // Although not used, it's good practice for consistency
  
  const { fileName, fileContent, clubId } = input;

  if (!fileName || !fileContent || !clubId) {
    return { success: false, message: "Bestandsnaam, inhoud en club-ID zijn vereist." };
  }

  // In a real RAG implementation, you would generate embeddings here.
  // For now, we'll just store the content and mark it as 'completed'.

  const newDocRef = adminDb.collection('knowledge_base').doc();
  
  const documentData: Omit<KnowledgeDocument, 'id' | 'embedding'> = {
    name: fileName,
    content: fileContent,
    status: 'completed', // Simulate immediate completion
    ingestedAt: serverTimestamp() as any,
  };

  try {
    await newDocRef.set(documentData);
    console.log(`[SERVER ACTION] Successfully saved document ${fileName} with ID ${newDocRef.id}`);
    return { success: true, docId: newDocRef.id, message: "Document succesvol opgeslagen." };
  } catch (error: any) {
    console.error("[SERVER ACTION] Error saving document to Firestore:", error);
    return { success: false, message: "Fout bij het opslaan van het document in de database." };
  }
}
