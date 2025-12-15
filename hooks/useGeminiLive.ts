import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { decode, decodeAudioData, createPcmBlob } from '../utils/audioUtils';

export type VoiceName = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';

interface UseGeminiLiveProps {
  voiceName: VoiceName;
}

export const useGeminiLive = ({ voiceName }: UseGeminiLiveProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [volume, setVolume] = useState(0); // 0 to 1
  const [error, setError] = useState<string | null>(null);

  // Audio Contexts
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Stream Management
  const nextStartTimeRef = useRef<number>(0);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const animationFrameRef = useRef<number | null>(null);

  // Cleanup function
  const stop = useCallback(async () => {
    // Close Audio Contexts
    if (inputAudioContextRef.current) {
      await inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      await outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }

    // Stop all playing sources
    sourcesRef.current.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // ignore
      }
    });
    sourcesRef.current.clear();

    // Close Session (if possible, though API doesn't expose explicit close on promise easily, 
    // usually we just drop the connection or use the returned session object if available. 
    // The prompt says "use session.close()", so we need the session object.)
    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then(session => {
        session.close();
      }).catch(() => { });
      sessionPromiseRef.current = null;
    }

    // Stop Animation Loop
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setIsConnected(false);
    setIsSpeaking(false);
    setVolume(0);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    try {
      // 1. Setup Audio Contexts
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      inputAudioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;
      nextStartTimeRef.current = outputCtx.currentTime;

      // Setup Analyser for visualization
      const analyser = outputCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      // 2. Microphone Stream
      // 2. Microphone Stream
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Microphone access requires HTTPS on external devices. Please use localhost or enable HTTPS.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = inputCtx.createMediaStreamSource(stream);
      const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);

      source.connect(scriptProcessor);
      scriptProcessor.connect(inputCtx.destination);

      // 3. Initialize GenAI
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName } },
          },
          systemInstruction: "You are a warm, engaging human companion. You have a digital face that mimics human expressions. Speak naturally, casually, and with emotion, like a real friend would. Avoid robotic greetings like 'How can I help?'. Instead, use casual openers and react to what I say with personality.",
        },
        callbacks: {
          onopen: () => {
            console.log('Gemini Live Connected');
            setIsConnected(true);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;

            if (base64Audio) {
              try {
                const audioBuffer = await decodeAudioData(
                  decode(base64Audio),
                  outputCtx,
                  24000,
                  1
                );

                const source = outputCtx.createBufferSource();
                source.buffer = audioBuffer;

                // Connect source -> analyser -> destination
                source.connect(analyser);
                analyser.connect(outputCtx.destination);

                // Schedule playback
                // Ensure we don't schedule in the past
                const now = outputCtx.currentTime;
                const playTime = Math.max(nextStartTimeRef.current, now);

                source.start(playTime);
                nextStartTimeRef.current = playTime + audioBuffer.duration;

                sourcesRef.current.add(source);
                source.onended = () => {
                  sourcesRef.current.delete(source);
                  if (sourcesRef.current.size === 0) {
                    // Optionally reset volume if silence, but loop handles it
                  }
                };
              } catch (err) {
                console.error("Error decoding audio", err);
              }
            }

            // Handle Interruptions
            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = outputCtx.currentTime;
            }
          },
          onclose: () => {
            console.log('Gemini Live Closed');
            stop();
          },
          onerror: (err) => {
            console.error('Gemini Live Error', err);
            setError("Connection error.");
            stop();
          }
        }
      });

      sessionPromiseRef.current = sessionPromise;

      // 4. Send Audio Input
      scriptProcessor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmBlob = createPcmBlob(inputData);

        sessionPromise.then(session => {
          session.sendRealtimeInput({ media: pcmBlob });
        });
      };

      // 5. Start Animation Loop for Volume
      const updateVolume = () => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);

          // Calculate average volume
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;
          const normalizedVolume = Math.min(1, average / 128); // normalize roughly 0-1

          setVolume(normalizedVolume);
          setIsSpeaking(normalizedVolume > 0.05); // threshold
        }
        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to start session");
      stop();
    }
  }, [voiceName, stop]);

  return {
    isConnected,
    isSpeaking,
    volume,
    error,
    start,
    stop
  };
};