
"use server";
/**
 * @fileOverview A Genkit flow for ingesting documents into the knowledge base.
 */
import { ai } from "@/ai/genkit";
import { z } from "zod";
import { textEmbeddingGecko } from "@genkit-ai/google-genai";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";


// This flow is a placeholder for the document ingestion logic.
// In a real application, you would add logic here to:
// 1. Download the file from the provided URL (e.g., from Firebase Storage).
// 2. Extract text content from the document (e.g., from a PDF).
// 3. Split the text into manageable chunks.
// 4. Use the retriever to add these chunks to the vector database.
//
// This flow can be triggered by a Cloud Function when a new file is uploaded to Storage.

const DocInputSchema = z.object({
  url: z.string().describe("The URL of the document to ingest."),
});

export async function ingestDocument(url: string) {
  // This is a mock implementation.
  console.log(`Starting ingestion for document at: ${url}`);

  const firestore = getFirestore();
  const storage = getStorage().bucket();

  // List all files in your "documents" folder in Firebase Storage
  const [files] = await storage.getFiles({ prefix: "documents/" });

  for (const file of files) {
    if (await firestore.collection('knowledge_base').doc(file.name).get().then(d => d.exists)) {
        console.log(`Skipping ${file.name}, already ingested.`);
        continue;
    }

    const [buffer] = await file.download();
    const text = buffer.toString("utf8");

    // 1️⃣ Generate embedding using Gemini embedding model
    const { embedding } = await textEmbeddingGecko.embed({ content: text });

    // 2️⃣ Save embedding and metadata in Firestore
    await firestore.collection("knowledge_base").doc(file.name).set({
      name: file.name,
      content: text,
      embedding,
      createdAt: new Date(),
    });

    console.log(`✅ Ingested ${file.name}`);
  }
}

export const ingestFlow = ai.defineFlow(
  {
    name: "ingestDocumentFlow",
    inputSchema: z.object({ path: z.string() }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string(),
    }),
  },
  async ({ path }) => {
    try {
        await ingestDocument(path);
        return { success: true, message: "Document processed successfully." };
    } catch (e: any) {
        return { success: false, message: e.message || "Failed to process document." };
    }
  }
);
