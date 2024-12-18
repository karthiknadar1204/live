"use client";
import React, { useState, useRef, useEffect } from "react";
import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";
import { generateUsername } from "../utils/usernameGenerator";

const Page = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [embedding, setEmbedding] = useState(null);
  const [username, setUsername] = useState("");
  const [query, setQuery] = useState("");
  const [queryResults, setQueryResults] = useState(null);
  const [bufferTimer, setBufferTimer] = useState(5);
  const [isBuffering, setIsBuffering] = useState(false);
  const [bufferedTranscript, setBufferedTranscript] = useState("");
  
  const deepgramRef = useRef(null);
  const connectionRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const processorRef = useRef(null);
  const audioContextRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    const newUsername = generateUsername();
    setUsername(newUsername);
    localStorage.setItem('tempUsername', newUsername);

    wsRef.current = new WebSocket("ws://localhost:8080");

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("WebSocket message received:", data);
      if (data.type === "embedding") {
        setEmbedding(data.data);
      } else if (data.type === "queryResult") {
        setQueryResults(data);
      } else if (data.type === "deleteAllSuccess") {
        alert(data.message);
        setQueryResults(null);
        setEmbedding(null);
      }
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const sendToWebSocket = (text) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "store",
          text: text.trim(),
          userId: username,
        })
      );
    }
  };

  const toggleListening = async () => {
    if (!isListening) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 16000,
          },
        });
        mediaStreamRef.current = stream;

        deepgramRef.current = createClient(
          process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY
        );

        connectionRef.current = deepgramRef.current.listen.live({
          model: "nova-2",
          language: "en-US",
          smart_format: true,
          encoding: "linear16",
          sample_rate: 16000,
          interim_results: true,
          punctuate: false,
          endpointing: 100,
        });

        connectionRef.current.on(LiveTranscriptionEvents.Open, () => {
          console.log("Connection opened");
          setIsListening(true);

          audioContextRef.current = new AudioContext({
            sampleRate: 16000,
            latencyHint: "interactive",
          });

          const source =
            audioContextRef.current.createMediaStreamSource(stream);
          processorRef.current = audioContextRef.current.createScriptProcessor(
            512,
            1,
            1
          );

          source.connect(processorRef.current);
          processorRef.current.connect(audioContextRef.current.destination);

          processorRef.current.onaudioprocess = (e) => {
            if (connectionRef.current?.getReadyState() === 1) {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16Data = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                int16Data[i] = Math.max(
                  -32768,
                  Math.min(32767, inputData[i] * 32768)
                );
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
            setBufferedTranscript(prev => prev + " " + transcriptText);
            setTranscript(prev => prev + " " + transcriptText);
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
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
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

  const handleQuerySubmit = (e) => {
    e.preventDefault();
    const trimmedQuery = query.trim();
    if (trimmedQuery && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "query",
          text: trimmedQuery,
          userId: username,
        })
      );
    }
  };

  const QueryResults = ({ results }) => {
    if (!results || !results.results || results.results.length === 0) return null;
    
    // Sort results by similarity score in descending order
    const sortedResults = [...results.results].sort((a, b) => b.score - a.score);
    
    return (
      <div className="mt-4">
        <h2 className="text-xl font-semibold">Similar Entries (Top {sortedResults.length}):</h2>
        <div className="mt-2 space-y-4 max-h-[500px] overflow-y-auto">
          {sortedResults.slice(0, 10).map((result, index) => (
            <div key={index} className="p-4 bg-gray-100 dark:bg-gray-800 rounded">
              <div className="text-sm text-gray-500 mb-1">
                Rank: #{index + 1} | Similarity: {(result.score * 100).toFixed(2)}%
              </div>
              <div className="text-sm">{result.transcript}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  useEffect(() => {
    let interval;
    if (isListening && bufferTimer > 0) {
      setIsBuffering(true);
      interval = setInterval(() => {
        setBufferTimer((prev) => {
          if (prev <= 1) {
            if (bufferedTranscript.trim()) {
              sendToWebSocket(bufferedTranscript);
              setBufferedTranscript("");
              setTranscript("");
            }
            setIsBuffering(false);
            return 5;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isListening, bufferTimer, bufferedTranscript]);

  const handleDeleteAll = async () => {
    if (window.confirm('Are you sure you want to delete all vectors? This action cannot be undone.')) {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "deleteAll",
            userId: username,
          })
        );
      }
    }
  };

  return (
    <div className="min-h-screen p-8 relative">
      <div className="absolute top-4 right-4 bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2">
        <span className="text-sm text-gray-600 dark:text-gray-300">Logged in as:</span>
        <span className="ml-2 font-semibold">{username}</span>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div>
          <h1 className="text-2xl font-bold mb-4">Speech to Text Assistant</h1>
          
          <button
            onClick={toggleListening}
            className={`px-4 py-2 rounded ${
              isListening ? "bg-red-500" : "bg-blue-500"
            } text-white`}
          >
            {isListening ? "Stop Listening" : "Start Listening"}
          </button>

          <div className="mt-4">
            <h2 className="text-xl font-semibold">Live Speech:</h2>
            <div className="mt-2 p-4 bg-gray-100 dark:bg-gray-800 rounded min-h-[100px] relative">
              {isBuffering && (
                <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-sm">
                  Buffering: {bufferTimer}s
                </div>
              )}
              {transcript || "Start speaking to see transcription..."}
            </div>
          </div>

          {embedding && (
            <div className="mt-4">
              <h2 className="text-xl font-semibold">Embeddings:</h2>
              <div className="mt-2 p-4 bg-gray-100 dark:bg-gray-800 rounded overflow-auto max-h-[200px]">
                <pre className="text-sm whitespace-pre-wrap">
                  {Array.isArray(embedding)
                    ? `[${embedding
                        .slice(0, 10)
                        .map((n) => n.toFixed(6))
                        .join(", ")}...]`
                    : JSON.stringify(embedding, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">Query Similar Content</h2>
          <form onSubmit={handleQuerySubmit} className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1 px-4 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleQuerySubmit(e);
                }
              }}
            />
            <button
              type="submit"
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              →
            </button>
          </form>

          {queryResults && (
            <div className="mt-4">
              <h3 className="text-xl font-semibold mb-2">Results:</h3>
              <div className="space-y-4">
                {queryResults.results.map((result, index) => (
                  <div
                    key={index}
                    className="p-4 bg-gray-100 dark:bg-gray-800 rounded"
                  >
                    <div className="text-sm text-gray-500 mb-1">
                      Similarity: {(result.score * 100).toFixed(2)}%
                    </div>
                    <div className="font-medium">{result.transcript}</div>
                  </div>
                ))}
                {queryResults.summary && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900 rounded">
                    <h4 className="font-semibold mb-2">Summary:</h4>
                    <p>{queryResults.summary}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={handleDeleteAll}
        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
      >
        Clear All Vectors
      </button>
    </div>
  );
};

export default Page;
