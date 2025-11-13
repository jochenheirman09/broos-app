'use server';

import { firestoreRetriever } from "@genkit-ai/firebase/retrievers";
import { textEmbeddingGecko } from "@genkit-ai/google-genai";

/**
 * Creates a Firestore-based retriever.
 * This retriever connects to the 'knowledge_base' collection in Firestore.
 * It uses the 'textEmbeddingGecko' model to generate embeddings for documents
 * and queries, allowing for semantic search over your Firestore data.
 */
export const retriever = firestoreRetriever({
  collection: "knowledge_base",
  embeddingModel: textEmbeddingGecko,
});
