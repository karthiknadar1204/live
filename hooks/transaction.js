
import { db } from '@/configs/db';
import { chatInteractions, speechTranscripts } from '@/configs/schema';


export async function storeSpeechTranscript(userId, transcript, embedding) {
  return await db.insert(speechTranscripts).values({
    userId,
    transcript,
    embedding: JSON.stringify(embedding),
  }).returning();
}

export async function storeChatInteraction(userId, question, answer, context, similarity) {
  return await db.insert(chatInteractions).values({
    userId,
    question,
    answer,
    context,
    similarity,
  }).returning();
}
