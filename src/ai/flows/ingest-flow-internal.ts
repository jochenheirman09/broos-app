import { ai } from "@/ai/genkit";
import { z } from "genkit";
import { textEmbeddingGecko } from "@genkit-ai/google-genai";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { DocInputSchema } from '@/ai/types';

async function ingestDocument(url: string) {
  console.log(`Starting ingestion for document at: ${url}`);

  const firestore = getFirestore();
  const storage = getStorage().bucket();

  const [files] = await storage.getFiles({ prefix: "documents/" });

  for (const file of files) {
    if (await firestore.collection('knowledge_base').doc(file.name).get().then(d => d.exists)) {
        console.log(`Skipping ${file.name}, already ingested.`);
        continue;
    }

    const [buffer] = await file.download();
    const text = buffer.toString("utf8");

    const { embedding } = await textEmbeddingGecko.embed({ content: text });

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
    inputSchema: DocInputSchema,
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string(),
    }),
  },
  async ({ url }) => {
    try {
        await ingestDocument(url);
        return { success: true, message: "Document processed successfully." };
    } catch (e: any) {
        return { success: false, message: e.message || "Failed to process document." };
    }
  }
);
