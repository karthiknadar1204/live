const { Pinecone } = require("@pinecone-database/pinecone");
const { v4: uuidv4 } = require('uuid');

require('dotenv').config();

const apiKey = process.env.PINECONE_API_KEY;

if (!apiKey) {
  throw Error("PINECONE_API_KEY is not set");
}

const pinecone = new Pinecone({ apiKey: apiKey });
const notesIndex = pinecone.Index("live");

async function storeEmbedding(text, embeddingVector) {
  const noteId = uuidv4();
  await notesIndex.upsert([{
    id: noteId,
    values: embeddingVector,
    metadata: { 
      userId: 'default-user',
      transcript: text,
      timestamp: new Date().toISOString()
    },
  }]);
  return noteId;
}

async function querySimilarEmbeddings(embeddingVector) {
  const queryResponse = await notesIndex.query({
    vector: embeddingVector,
    topK: 10,
    includeMetadata: true
  });
  
  return queryResponse.matches.map(match => ({
    score: match.score,
    transcript: match.metadata.transcript
  }));
}

async function deleteAllVectors() {
  try {
    await notesIndex.deleteAll();
    console.log("Successfully deleted all vectors from the index");
    return { success: true, message: "All vectors deleted successfully" };
  } catch (error) {
    console.error("Error deleting vectors:", error);
    throw error;
  }
}

module.exports = {
  storeEmbedding,
  querySimilarEmbeddings,
  deleteAllVectors
};
