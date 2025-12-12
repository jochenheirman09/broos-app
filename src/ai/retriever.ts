
"use server";

import type { KnowledgeDocument } from "@/lib/types";
import { getFirebaseAdmin } from "@/ai/genkit";
import { FieldValue } from "firebase-admin/firestore";

/**
 * A simple keyword-based retriever for the knowledge base.
 * In a real-world RAG implementation, this would be replaced by a
 * vector search against an embedding index.
 * It now also logs the usage of the retrieved documents.
 *
 * @param userMessage The user's message to search for.
 * @param clubId The club to which the knowledge belongs (for future multi-tenancy).
 * @returns A promise that resolves to an array of relevant knowledge documents.
 */
export async function retrieveSimilarDocuments(
  userMessage: string,
  clubId: string
): Promise<KnowledgeDocument[]> {
  console.log(`[Retriever] Searching for documents related to: "${userMessage}"`);
  const { adminDb } = await getFirebaseAdmin();

  if (!userMessage.trim()) {
    return [];
  }

  // Simple keyword extraction: split message into unique, lowercased words.
  const keywords = [
    ...new Set(userMessage.toLowerCase().match(/\b(\w{3,})\b/g) || []),
  ];

  if (keywords.length === 0) {
    console.log("[Retriever] No suitable keywords found in message.");
    return [];
  }

  console.log(`[Retriever] Using keywords: ${keywords.join(", ")}`);

  try {
    const knowledgeBaseRef = adminDb.collection("knowledge_base");
    const snapshot = await knowledgeBaseRef.where('status', '==', 'completed').get();

    if (snapshot.empty) {
      console.log("[Retriever] Knowledge base is empty or no documents are completed.");
      return [];
    }

    const allDocs = snapshot.docs.map(doc => ({id: doc.id, ...doc.data() } as KnowledgeDocument));
    
    const relevantDocs: KnowledgeDocument[] = [];
    
    for (const doc of allDocs) {
        let score = 0;
        const content = doc.content.toLowerCase();
        for (const keyword of keywords) {
            if (content.includes(keyword)) {
                score++;
            }
        }
        if (score > 0) {
            relevantDocs.push(doc);
        }
    }
    
    const sortedDocs = relevantDocs.sort((a, b) => {
        const scoreA = keywords.filter(k => a.content.toLowerCase().includes(k)).length;
        const scoreB = keywords.filter(k => b.content.toLowerCase().includes(k)).length;
        return scoreB - scoreA;
    });

    const topDocs = sortedDocs.slice(0, 2);

    // --- Log Usage Statistics (Fire-and-forget) ---
    if (topDocs.length > 0) {
      console.log(`[Retriever] Logging usage for ${topDocs.length} documents.`);
      const batch = adminDb.batch();
      topDocs.forEach(doc => {
        const statRef = adminDb.collection('knowledge_stats').doc(doc.id);
        batch.set(statRef, {
          id: doc.id,
          queryCount: FieldValue.increment(1),
          lastQueried: FieldValue.serverTimestamp(),
        }, { merge: true });
      });
      batch.commit().catch(err => {
        console.error('[Retriever] Failed to log knowledge base usage stats:', err);
      });
    }

    console.log(`[Retriever] Found ${topDocs.length} relevant documents.`);
    return topDocs;

  } catch (error) {
    console.error("[Retriever] Error fetching from knowledge base:", error);
    return []; // Return empty array on error to not break the chat flow.
  }
}
