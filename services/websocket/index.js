const WebSocket = require('ws');
const { generateEmbedding, generateSummary } = require('../openai');
const { storeEmbedding, querySimilarEmbeddings } = require('../pinecone');

function createWebSocketServer(port = 8080) {
  const wss = new WebSocket.Server({ port });

  wss.on('connection', (ws) => {
    console.log('WebSocket connected');

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        const { text, type } = data;

        // Generate embedding for the input text
        const embeddingVector = await generateEmbedding(text);

        if (type === 'query') {
          // Search for similar vectors
          const results = await querySimilarEmbeddings(embeddingVector);
          
          // Prepare context from the single best match
          const context = results[0]?.transcript || '';
          
          // Generate summary using GPT-4
          const summary = await generateSummary(text, context);

          // Send back the processed results
          ws.send(JSON.stringify({
            type: 'queryResult',
            results,
            summary
          }));
        } else {
          // Store new transcript
          const noteId = await storeEmbedding(text, embeddingVector);

          ws.send(JSON.stringify({
            type: 'embedding',
            data: embeddingVector,
            noteId
          }));
        }
      } catch (error) {
        console.error('Error processing message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: error.message
        }));
      }
    });
  });

  console.log(`Speech-to-Embeddings server running on port ${port}`);
  return wss;
}

module.exports = { createWebSocketServer };

