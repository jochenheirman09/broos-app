import { pinecone } from "genkit/experimental/plugins/pinecone";
import { textEmbeddingGecko } from "@genkit-ai/google-genai";

export const pineconeRetriever = pinecone({
  indexId: "broos-knowledge-base",
  embedder: textEmbeddingGecko,
});
