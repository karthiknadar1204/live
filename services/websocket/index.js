const WebSocket = require('ws');
const { generateEmbedding, generateSummary } = require('../openai');
const { storeEmbedding, querySimilarEmbeddings, deleteAllVectors } = require('../pinecone');
const { chunkText } = require('../utils/textChunker');

function createWebSocketServer(port = 8080) {
  const wss = new WebSocket.Server({ port });
  
  let transcriptBuffer = '';
  const SPEECH_BUFFER_TIME = 5000; // 5 seconds
  let bufferTimeout;

  wss.on('connection', (ws) => {
    console.log('WebSocket connected');

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        const { text, type, userId } = data;

        if (type === 'store') {
          transcriptBuffer += text + ' ';

          // Clear existing timeout if any
          if (bufferTimeout) {
            clearTimeout(bufferTimeout);
          }

          // Set new timeout
          bufferTimeout = setTimeout(async () => {
            if (transcriptBuffer.trim().length > 0) {
              // Generate chunks with overlap
              const chunks = chunkText(transcriptBuffer);
              
              // Process each chunk
              for (const chunk of chunks) {
                const embeddingVector = await generateEmbedding(chunk);
                const noteId = await storeEmbedding(chunk, embeddingVector, userId);
                
                ws.send(JSON.stringify({
                  type: 'embedding',
                  data: embeddingVector,
                  noteId,
                  text: chunk,
                  isChunk: true,
                  totalChunks: chunks.length
                }));
              }

              // Reset buffer
              transcriptBuffer = '';
            }
          }, SPEECH_BUFFER_TIME);
        } else if (type === 'query') {
          if (!text || text.trim().length === 0) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Query text cannot be empty'
            }));
            return;
          }
          
          const embeddingVector = await generateEmbedding(text);
          const results = await querySimilarEmbeddings(embeddingVector);
          const summary = await generateSummary(text, results);

          ws.send(JSON.stringify({
            type: 'queryResult',
            results: results,
            summary
          }));
        } else if (type === 'deleteAll') {
          try {
            const result = await deleteAllVectors();
            ws.send(JSON.stringify({
              type: 'deleteAllSuccess',
              message: result.message
            }));
          } catch (error) {
            ws.send(JSON.stringify({
              type: 'error',
              message: error.message || 'Failed to delete vectors'
            }));
          }
        }
      } catch (error) {
        console.error('Error processing message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: error.message
        }));
      }
    });

    ws.on('close', () => {
      if (bufferTimeout) {
        clearTimeout(bufferTimeout);
      }
    });
  });

  return wss;
}

module.exports = { createWebSocketServer };

