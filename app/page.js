'use client';
import React, { useState, useRef } from 'react';

const Page = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [embeddings, setEmbeddings] = useState(null);
  const recognitionRef = useRef(null);
  const wsRef = useRef(null);

  const initializeWebSocket = () => {
    wsRef.current = new WebSocket('ws://localhost:8080');
    
    wsRef.current.onmessage = (event) => {
      const response = JSON.parse(event.data);
      if (response.type === 'embedding') {
        console.log('Speech Embeddings:', response.data);
        setEmbeddings(response.data);
      } else if (response.type === 'error') {
        console.error('Server error:', response.message);
      }
    };
  };

  const toggleListening = () => {
    if ('webkitSpeechRecognition' in window) {
      if (!isListening) {
        // Initialize WebSocket when starting to listen
        initializeWebSocket();
        
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
          
          // Send transcript to WebSocket server if connection is open
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(transcript);
          }
        };

        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
          console.log('Stopped listening.');
          // Close WebSocket connection when stopping
          if (wsRef.current) {
            wsRef.current.close();
          }
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

      {transcript && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold">Transcript:</h2>
          <p className="mt-2 p-4 bg-gray-100 dark:bg-gray-800 rounded">{transcript}</p>
        </div>
      )}

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