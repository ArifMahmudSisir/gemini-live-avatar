import React from 'react';
import { VoiceName } from '../hooks/useGeminiLive';

interface ControlsProps {
  isConnected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  selectedVoice: VoiceName;
  onVoiceChange: (voice: VoiceName) => void;
}

const VOICES: VoiceName[] = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];

const Controls: React.FC<ControlsProps> = ({ 
  isConnected, 
  onConnect, 
  onDisconnect, 
  selectedVoice, 
  onVoiceChange 
}) => {
  return (
    <div className="flex flex-col items-center gap-6 z-10 w-full max-w-md px-4">
      
      {/* Voice Selector */}
      <div className="flex flex-wrap justify-center gap-2">
        {VOICES.map((voice) => (
          <button
            key={voice}
            onClick={() => onVoiceChange(voice)}
            disabled={isConnected}
            className={`px-3 py-1 text-sm rounded-full transition-all border ${
              selectedVoice === voice 
                ? 'bg-cyan-600 border-cyan-400 text-white shadow-lg shadow-cyan-500/20' 
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
            } ${isConnected ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {voice}
          </button>
        ))}
      </div>

      {/* Main Action Button */}
      <button
        onClick={isConnected ? onDisconnect : onConnect}
        className={`
            group relative px-8 py-4 rounded-2xl font-bold text-lg tracking-wide transition-all transform hover:scale-105 active:scale-95
            ${isConnected 
                ? 'bg-red-500/10 text-red-400 border border-red-500/50 hover:bg-red-500/20' 
                : 'bg-cyan-500 text-slate-900 shadow-xl shadow-cyan-500/20 hover:shadow-cyan-500/40'
            }
        `}
      >
        <span className="flex items-center gap-3">
            {isConnected ? (
                <>
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                    End Conversation
                </>
            ) : (
                <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    Start Talking
                </>
            )}
        </span>
      </button>

      {/* Status Text */}
      <p className="text-slate-500 text-sm h-4">
        {isConnected ? "Listening & Responding..." : "Ready to connect"}
      </p>
    </div>
  );
};

export default Controls;
