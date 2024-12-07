'use client';
import React, { useState, useRef } from 'react';

const MicrophoneIcon = ({ isListening }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`${isListening ? 'animate-pulse' : ''}`}
  >
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" x2="12" y1="19" y2="22" />
  </svg>
);

const Page = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);

  const toggleListening = () => {
    if (!isListening) {
      if ('webkitSpeechRecognition' in window) {
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
        alert('Speech recognition is not supported in your browser.');
      }
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div>page</div>
      <div className="fixed bottom-4 left-4 flex flex-col items-start gap-2">
        <button
          onClick={toggleListening}
          className={`p-4 rounded-full ${
            isListening 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-blue-500 hover:bg-blue-600'
          } text-white transition-colors flex items-center justify-center`}
          aria-label={isListening ? 'Stop listening' : 'Start listening'}
        >
          <MicrophoneIcon isListening={isListening} />
        </button>
        {transcript && (
          <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded max-w-md">
            <p className="text-sm">{transcript}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Page;