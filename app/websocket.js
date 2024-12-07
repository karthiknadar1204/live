require('dotenv').config();
const WebSocket = require('ws');
const OpenAI = require('openai');

if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is not set in .env file');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  console.log('Speech recognition started - WebSocket connected');

  ws.on('message', async (message) => {
    try {
      const transcript = message.toString();
      console.log('\n--- New Speech Segment ---');
      console.log('Transcript:', transcript);
      
      const embedding = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: transcript,
        encoding_format: "float"
      });

      console.log('Generated embeddings (first 5 values):', embedding.data[0].embedding.slice(0, 5));
      console.log('Total embedding dimensions:', embedding.data[0].embedding.length);
      console.log('------------------------\n');
      
      ws.send(JSON.stringify({
        type: 'embedding',
        data: embedding.data[0].embedding
      }));
    } catch (error) {
      console.error('Error processing speech:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
  });

  ws.on('close', () => {
    console.log('Speech recognition stopped - WebSocket disconnected');
  });
});

console.log('Speech-to-Embeddings server running on port 8080');
