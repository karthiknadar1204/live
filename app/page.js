'use client';
import React, { useState, useRef, useEffect } from 'react';

const Page = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [embeddings, setEmbeddings] = useState(null);
  const [inputText, setInputText] = useState('');
  const recognitionRef = useRef(null);
  const wsRef = useRef(null);
  const [queryResults, setQueryResults] = useState([]);
  const [summary, setSummary] = useState('');

  const initializeWebSocket = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    wsRef.current = new WebSocket('ws://localhost:8080');
    
    wsRef.current.onmessage = (event) => {
      const response = JSON.parse(event.data);
      if (response.type === 'embedding') {
        console.log('Speech Embeddings:', response.data);
        setEmbeddings(response.data);
      } else if (response.type === 'queryResult') {
        setQueryResults(response.results);
        setSummary(response.summary);
      } else if (response.type === 'error') {
        console.error('Server error:', response.message);
      }
    };

    wsRef.current.onclose = () => {
      // Attempt to reconnect after a delay
      setTimeout(() => {
        initializeWebSocket();
      }, 3000);
    };
  };

  // Initialize WebSocket when component mounts
  useEffect(() => {
    initializeWebSocket();

    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const toggleListening = () => {
    if ('webkitSpeechRecognition' in window) {
      if (!isListening) {
        recognitionRef.current = new window.webkitSpeechRecognition();
        const recognition = recognitionRef.current;
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onstart = () => {
          setIsListening(true);
          console.log('Started listening...');
        };

        recognition.onresult = (event) => {
          const current = event.resultIndex;
          const transcript = event.results[current][0].transcript;
          console.log('Speech transcript:', transcript);
          setTranscript(transcript);
          
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: 'store',
              text: transcript,
              userId: 'default-user'
            }));
          }
        };

        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
          console.log('Stopped listening.');
        };

        recognition.start();
      } else {
        recognitionRef.current?.stop();
        setIsListening(false);
      }
    } else {
      alert('Speech recognition is not supported in your browser.');
    }
  };

  const handleSend = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN && inputText.trim()) {
      wsRef.current.send(JSON.stringify({
        type: 'query',
        text: inputText.trim(),
        userId: 'default-user'
      }));
      setInputText('');
    }
  };

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-4">Speech to Embeddings</h1>
      
      <button
        onClick={toggleListening}
        className={`px-4 py-2 rounded ${
          isListening ? 'bg-red-500' : 'bg-blue-500'
        } text-white`}
      >
        {isListening ? 'Stop Listening' : 'Start Listening'}
      </button>

      <div className="mt-4 flex gap-8">
        <div className="flex-1">
          <h2 className="text-xl font-semibold">Live Speech:</h2>
          <div className="mt-2 p-4 bg-gray-100 dark:bg-gray-800 rounded min-h-[100px]">
            {transcript || 'Start speaking to see transcription...'}
          </div>
        </div>

        <div className="flex-1">
          <h2 className="text-xl font-semibold">Ask a Question:</h2>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSend();
                }
              }}
              className="flex-1 px-4 py-2 border rounded dark:bg-gray-800"
              placeholder="Type your question..."
            />
            <button
              onClick={handleSend}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Send
            </button>
          </div>
          
          <div className="mt-4">
            {summary && (
              <div className="mb-4">
                <h2 className="text-xl font-semibold">AI Summary:</h2>
                <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded">
                  {summary}
                </div>
              </div>
            )}
            <h2 className="text-xl font-semibold">Related Entries:</h2>
            {queryResults.length > 0 ? (
              <div className="space-y-4">
                {queryResults.map((result, index) => (
                  <div key={index} className="p-4 bg-gray-100 dark:bg-gray-800 rounded">
                    <div className="font-medium">Similarity: {(result.score * 100).toFixed(2)}%</div>
                    <div>{result.transcript}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded mt-2">
                No results yet. Try asking a question!
              </div>
            )}
          </div>
        </div>
      </div>

      {embeddings && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold">Embeddings:</h2>
          <div className="mt-2 p-4 bg-gray-100 dark:bg-gray-800 rounded overflow-auto max-h-60">
            <pre className="text-sm">
              {JSON.stringify(embeddings.slice(0, 10), null, 2)} ...
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default Page;