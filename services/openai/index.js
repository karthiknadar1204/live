const OpenAI = require('openai');

if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is not set in .env file');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generateEmbedding(text) {
  const embedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    encoding_format: "float"
  });
  return embedding.data[0].embedding;
}

async function generateSummary(question, context) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant. Summarize and analyze the provided context to answer the user's question concisely."
      },
      {
        role: "user",
        content: `Question: ${question}\n\nContext from similar entries:\n${context}`
      }
    ],
    temperature: 0.7,
    max_tokens: 500
  });
  return completion.choices[0].message.content;
}

module.exports = {
  generateEmbedding,
  generateSummary
};
