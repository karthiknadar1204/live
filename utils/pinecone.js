const { Pinecone } = require("@pinecone-database/pinecone");

require('dotenv').config();

const apiKey = process.env.PINECONE_API_KEY;

if (!apiKey) {
  throw Error("PINECONE_API_KEY is not set");
}

const pinecone = new Pinecone({ apiKey: apiKey });

const notesIndex = pinecone.Index("live");
module.exports = { notesIndex };