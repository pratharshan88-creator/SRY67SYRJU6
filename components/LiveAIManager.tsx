
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Mic, ShieldAlert, RotateCw } from 'lucide-react';

interface LiveAIManagerProps {
  onClose: () => void;
}

// Manual implementation of encode/decode as per @google/genai guidelines
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Manual decoding logic for raw PCM audio data streaming
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const LiveAIManager: React.FC<LiveAIManagerProps> = ({ onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [transcription, setTranscription] = useState<string>('');
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  // Store the session promise to avoid stale closures in callbacks
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const audioContextsRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);

  const init = async () => {
    setPermissionError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: { facingMode: 'environment' } 
      });
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextsRef.current = { input: inputAudioContext, output: outputAudioContext };

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            const source = inputAudioContext.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              // Ensure data is sent only after the session promise resolves to prevent race conditions
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
              setTranscription(prev => prev + message.serverContent.outputTranscription.text);
            }

            // Correctly access raw PCM audio data from model turn
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              setIsAiResponding(true);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
              const source = outputAudioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputAudioContext.destination);
              
              // Maintain smooth gapless playback using a running timestamp
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              
              source.onended = () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setIsAiResponding(false);
              };
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => {
                try { s.stop(); } catch (e) {}
              });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsAiResponding(false);
            }
          },
          onerror: (e) => console.error("Live AI Session Error:", e),
          onclose: (e) => console.log("Live AI Session Closed:", e),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {},
          systemInstruction: `You are Gittu AR Lens AI, a spatial measurement expert. Analyze video frames to estimate room dimensions, lengths, and areas. Provide measurements in the user's preferred unit. Be helpful, precise, and educational about geometry.`,
        }
      });

      sessionPromiseRef.current = sessionPromise;

      // Stream visual data as image frames to supplement audio interaction
      intervalRef.current = window.setInterval(() => {
        if (videoRef.current && canvasRef.current && sessionPromiseRef.current) {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            canvas.width = 320;
            canvas.height = 240;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const base64Frame = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
            // Use session promise chain to avoid stale closure issues in the interval
            sessionPromiseRef.current.then((session) => {
              session.sendRealtimeInput({
                media: { data: base64Frame, mimeType: 'image/jpeg' }
              });
            });
          }
        }
      }, 1500);

    } catch (err: any) {
      console.error("Live AI Initialization Error:", err);
      setPermissionError(err.message || "Permission dismissed");
    }
  };

  useEffect(() => {
    init();
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      if (sessionPromiseRef.current) sessionPromiseRef.current.then(s => s.close());
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (audioContextsRef.current) {
        audioContextsRef.current.input.close();
        audioContextsRef.current.output.close();
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {!permissionError && (
        <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover grayscale opacity-60" />
      )}
      <canvas ref={canvasRef} className="hidden" />
      
      {permissionError ? (
        <div className="flex h-full flex-col items-center justify-center p-8 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/20 text-red-500">
            <ShieldAlert size={40} />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-white">Access Required</h2>
          <p className="mb-8 text-neutral-400 max-w-xs">
            Gittu AI needs both Camera and Microphone access to measure your space in real-time.
          </p>
          <div className="flex flex-col w-full gap-3 max-w-xs">
            <button 
              onClick={init}
              className="flex items-center justify-center gap-2 rounded-xl bg-yellow-400 py-4 font-bold text-black"
            >
              <RotateCw size={20} />
              Try Again
            </button>
            <button 
              onClick={onClose}
              className="rounded-xl bg-neutral-800 py-4 font-bold text-neutral-300"
            >
              Go Back
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute top-0 h-1 w-full bg-yellow-400 shadow-[0_0_20px_#FACC15] animate-[scan_3s_linear_infinite]" />
          </div>

          <div className="absolute inset-0 flex flex-col p-6">
            <div className="flex items-center justify-between">
              <button onClick={onClose} className="rounded-full bg-red-500/80 px-4 py-2 text-sm font-bold text-white backdrop-blur-md pointer-events-auto">
                Exit AI Scan
              </button>
              <div className="flex items-center gap-2 rounded-full bg-yellow-400/20 px-4 py-2 text-yellow-400 backdrop-blur-md border border-yellow-400/40">
                <div className={`h-2 w-2 rounded-full bg-yellow-400 ${isAiResponding ? 'animate-ping' : ''}`} />
                <span className="text-xs font-bold uppercase tracking-widest">Live Spatial AI</span>
              </div>
            </div>

            <div className="mt-auto mb-24 max-w-lg self-center w-full">
              {transcription && (
                <div className="rounded-2xl bg-black/60 p-4 text-center text-lg font-bold text-yellow-400 backdrop-blur-xl border border-yellow-400/30 shadow-2xl">
                  {transcription}
                </div>
              )}
              {!transcription && !isAiResponding && (
                <div className="animate-pulse rounded-2xl bg-black/40 p-4 text-center text-sm font-medium text-neutral-300 backdrop-blur-md">
                  Ask: "How wide is this wall?"
                </div>
              )}
            </div>

            <div className="absolute bottom-32 left-1/2 -translate-x-1/2 flex flex-col items-center">
              <div className={`flex h-16 w-16 items-center justify-center rounded-full border-2 transition-all duration-500 ${isAiResponding ? 'bg-yellow-400 scale-125 border-white shadow-[0_0_30px_#FACC15]' : 'bg-neutral-800 border-neutral-600'}`}>
                {isAiResponding ? <div className="h-4 w-4 bg-black rounded-sm animate-spin" /> : <Mic className="text-yellow-400" size={32} />}
              </div>
              <span className="mt-3 text-[10px] font-bold text-yellow-400 uppercase tracking-tighter bg-black/50 px-3 py-1 rounded-full">
                {isAiResponding ? 'AI Speaking' : 'Listening...'}
              </span>
            </div>
          </div>
        </>
      )}
      <style>{`
        @keyframes scan {
          0% { top: 0; }
          100% { top: 100%; }
        }
      `}</style>
    </div>
  );
};

export default LiveAIManager;
