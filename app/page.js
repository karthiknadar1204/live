'use client';
import React, { useState, useRef } from 'react';

const Page = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);

  const toggleListening = () => {
    if ('webkitSpeechRecognition' in window) {
      if (!isListening) {
        // Start listening
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
          console.log('Audio transcript:', transcript);
          setTranscript(transcript);
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
        // Stop listening
        recognitionRef.current?.stop();
        setIsListening(false);
      }
    } else {
      alert('Speech recognition is not supported in your browser.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div>page</div>
      <div className="fixed bottom-4 left-4">
        <button
          type="button"
          onClick={toggleListening}
          className={`px-4 py-2 rounded-full ${
            isListening 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-blue-500 hover:bg-blue-600'
          } text-white transition-colors`}
        >
          {isListening ? 'Stop Listening' : 'Start Listening'}
        </button>
        {transcript && (
          <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded">
            <p className="text-sm">{transcript}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Page;