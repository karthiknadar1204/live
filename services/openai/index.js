const OpenAI = require('openai');

if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is not set in .env file');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generateEmbedding(text) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error("Input text is required for generating embeddings");
  }
  
  const embedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text.trim(),
    encoding_format: "float"
  });
  return embedding.data[0].embedding;
}

async function generateSummary(question, results) {
  const context = results
    .sort((a, b) => b.score - a.score) // Sort by similarity score
    .map(r => ({
      similarity: (r.score * 100).toFixed(2) + '%',
      text: r.transcript
    }));

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant analyzing a large dataset of transcripts. Provide a comprehensive answer to the user's question by analyzing all available entries, focusing on the most relevant information while considering the full context. Prioritize entries with higher similarity scores but don't ignore potentially relevant information from lower-scoring entries."
      },
      {
        role: "user",
        content: `Question: ${question}\n\nAvailable context (${context.length} entries):\n${context.map(c => `[${c.similarity}] ${c.text}`).join('\n\n')}`
      }
    ],
    temperature: 0.7,
    max_tokens: 1000 // Increased for more detailed responses
  });
  return completion.choices[0].message.content;
}

module.exports = {
  generateEmbedding,
  generateSummary
};
