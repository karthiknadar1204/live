import { pgTable, serial, text, timestamp, varchar,numeric } from 'drizzle-orm/pg-core';

// Table for storing speech transcripts
export const speechTranscripts = pgTable('speech_transcripts', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id').notNull(),
  transcript: text('transcript').notNull(),
  embedding: text('embedding'), // Store embedding as JSON string
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Table for storing chat interactions
export const chatInteractions = pgTable('chat_interactions', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id').notNull(),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  context: text('context'), // Store related transcript context
  similarity: numeric('similarity'), // Store similarity score
  createdAt: timestamp('created_at').defaultNow().notNull()
});
