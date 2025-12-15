import React, { useState } from 'react';
import Avatar from './components/Avatar';
import Controls from './components/Controls';
import { useGeminiLive, VoiceName } from './hooks/useGeminiLive';

const App: React.FC = () => {
  const [voice, setVoice] = useState<VoiceName>('Puck');
  
  const { 
    isConnected, 
    start, 
    stop, 
    volume, 
    error 
  } = useGeminiLive({ voiceName: voice });

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-between py-12 relative overflow-hidden">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-cyan-900/20 rounded-full blur-[120px] mix-blend-screen"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[100px] mix-blend-screen"></div>
      </div>

      {/* Header */}
      <header className="z-10 text-center space-y-2">
        <div className="inline-block p-2 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm">
            <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent px-4">
            MR. Girish
            </h1>
        </div>
      </header>

      {/* Main Visualizer Area */}
      <main className="flex-1 flex flex-col items-center justify-center w-full z-10 min-h-[400px]">
        
        {/* Error Notification */}
        {error && (
            <div className="absolute top-24 px-4 py-2 bg-red-500/10 border border-red-500/50 text-red-400 rounded-lg text-sm mb-8 animate-fade-in">
                {error}
            </div>
        )}

        {/* The Face */}
        <div className="transform scale-100 md:scale-125 transition-transform duration-700">
            <Avatar 
                volume={volume} 
                isListening={isConnected} 
            />
        </div>

      </main>

      {/* Controls Area */}
      <footer className="z-10 w-full flex justify-center pb-8">
        <Controls 
            isConnected={isConnected}
            onConnect={start}
            onDisconnect={stop}
            selectedVoice={voice}
            onVoiceChange={setVoice}
        />
      </footer>

    </div>
  );
};

export default App;
