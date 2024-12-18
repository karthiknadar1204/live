'use client';
import React, { useState, useRef, useEffect } from 'react';
import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";

const Page = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const deepgramRef = useRef(null);
  const connectionRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const processorRef = useRef(null);
  const audioContextRef = useRef(null);

  const toggleListening = async () => {
    if (!isListening) {
      try {
        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 16000 // Lower sample rate for faster processing
          } 
        });
        mediaStreamRef.current = stream;

        // Initialize Deepgram client
        deepgramRef.current = createClient(process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY);

        // Create live transcription connection with optimized settings
        connectionRef.current = deepgramRef.current.listen.live({
          model: "nova-2",
          language: "en-US",
          smart_format: true,
          encoding: 'linear16',
          sample_rate: 16000,
          interim_results: true, // Enable interim results for faster feedback
          punctuate: false, // Disable punctuation for faster processing
          endpointing: 100, // Reduce endpointing duration
        });

        // Set up event listeners
        connectionRef.current.on(LiveTranscriptionEvents.Open, () => {
          console.log("Connection opened");
          setIsListening(true);

          // Create audio context and processor with smaller buffer
          audioContextRef.current = new AudioContext({
            sampleRate: 16000,
            latencyHint: 'interactive'
          });
          
          const source = audioContextRef.current.createMediaStreamSource(stream);
          processorRef.current = audioContextRef.current.createScriptProcessor(512, 1, 1);

          source.connect(processorRef.current);
          processorRef.current.connect(audioContextRef.current.destination);

          // Send audio data to Deepgram with minimal processing
          processorRef.current.onaudioprocess = (e) => {
            if (connectionRef.current?.getReadyState() === 1) {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16Data = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                int16Data[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
              }
              connectionRef.current.send(int16Data.buffer);
            }
          };
        });

        connectionRef.current.on(LiveTranscriptionEvents.Close, () => {
          console.log("Connection closed");
          cleanup();
        });

        connectionRef.current.on(LiveTranscriptionEvents.Transcript, (data) => {
          const transcriptText = data.channel.alternatives[0].transcript;
          if (transcriptText.trim()) {
            setTranscript(prev => {
              // Only update if we have new content
              if (transcriptText !== prev) {
                return transcriptText;
              }
              return prev;
            });
          }
        });

        connectionRef.current.on(LiveTranscriptionEvents.Error, (err) => {
          console.error("Deepgram error:", err);
          cleanup();
        });

      } catch (error) {
        console.error("Error initializing:", error);
        cleanup();
      }
    } else {
      cleanup();
    }
  };

  const cleanup = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (connectionRef.current) {
      connectionRef.current.finish();
      connectionRef.current = null;
    }
    setIsListening(false);
  };

  useEffect(() => {
    return cleanup;
  }, []);

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-4">Speech to Text Assistant</h1>
      
      <button
        onClick={toggleListening}
        className={`px-4 py-2 rounded ${
          isListening ? 'bg-red-500' : 'bg-blue-500'
        } text-white`}
      >
        {isListening ? 'Stop Listening' : 'Start Listening'}
      </button>

      <div className="mt-4">
        <h2 className="text-xl font-semibold">Live Speech:</h2>
        <div className="mt-2 p-4 bg-gray-100 dark:bg-gray-800 rounded min-h-[100px]">
          {transcript || 'Start speaking to see transcription...'}
        </div>
      </div>
    </div>
  );
};

export default Page;