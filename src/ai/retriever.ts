'use server';

import { Document } from 'genkit/retriever';
import { ai } from '@/ai/genkit';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';

// Ensure Firebase Admin is initialized
if (!getApps().length) {
  initializeApp();
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) {
    return 0;
  }
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }
  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * A simple async function that acts as a custom retriever for Genkit.
 * It's passed directly to the `retriever` property of a prompt.
 * @param query The user's query text.
 * @returns A promise that resolves to an array of Document objects.
 */
export async function customFirestoreRetriever(query: string): Promise<Document[]> {
  const firestore = getFirestore();

  // 1. Generate embedding for the user's query.
  const { embedding: queryEmbedding } = await ai.embed({
    model: 'googleai/text-embedding-004',
    content: query,
  });

  // 2. Fetch all documents from the 'knowledge_base' collection.
  const snapshot = await firestore.collection('knowledge_base').get();
  if (snapshot.empty) {
    return [];
  }

  // 3. Manually compute cosine similarity between the query and each document's embedding.
  const scoredDocs = snapshot.docs
    .map((doc) => {
      const data = doc.data();
      if (!data.content || !Array.isArray(data.embedding) || data.embedding.length === 0) {
        return null;
      }
      return {
        id: doc.id,
        text: data.content,
        metadata: { ...data.metadata, source: doc.ref.path },
        score: cosineSimilarity(queryEmbedding, data.embedding),
      };
    })
    .filter((d): d is NonNullable<typeof d> => d !== null);

  // 4. Sort documents by score and return the top 'k' results.
  const topKDocs = scoredDocs
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  // 5. Format the results as Genkit Document objects.
  return topKDocs.map((d) => Document.fromText(d.text, d.metadata));
}
