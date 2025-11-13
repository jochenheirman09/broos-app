'use server';

import { defineRetriever, Document } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
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

export const retriever = defineRetriever(
  {
    name: 'custom-firestore-retriever',
  },
  async (query, options) => {
    const firestore = getFirestore();

    // 1. Generate embedding for the user's query.
    const embeddingResponse = await googleAI.embed({
      model: 'text-embedding-004',
      content: query,
    });
    const queryEmbedding = embeddingResponse.embedding;

    // 2. Fetch all documents from the 'knowledge_base' collection.
    // In a production scenario, you would implement a more efficient strategy,
    // like using vector search extensions (e.g., pgvector) or approximate nearest neighbor search.
    const snapshot = await firestore.collection('knowledge_base').get();
    if (snapshot.empty) {
      return { documents: [] };
    }

    // 3. Manually compute cosine similarity between the query and each document's embedding.
    const scoredDocs = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        // Ensure the document has content and an embedding.
        if (
          !data.content ||
          !Array.isArray(data.embedding) ||
          data.embedding.length === 0
        ) {
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

    // 4. Sort documents by score in descending order and return the top 'k' results.
    const k = options?.k ?? 3;
    const topKDocs = scoredDocs
      .sort((a, b) => b.score - a.score)
      .slice(0, k);

    // 5. Format the results as Genkit Document objects.
    return {
      documents: topKDocs.map((d) =>
        Document.fromText(d.text, d.metadata)
      ),
    };
  }
);
