import React from 'react';
import { 
  Bot, 
  Activity, 
  Database, 
  Flame, 
  Trash2, 
  Sparkles,
  ShieldCheck
} from 'lucide-react';

export default function Navbar({ 
  healthStatus, 
  vectorStats, 
  sessionId, 
  onClearMemory 
}) {
  const isOnline = healthStatus?.status === 'online';

  return (
    <header className="h-16 border-b border-gray-800/60 glass-panel px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left Title & Branding */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-bold text-white tracking-tight">Agentic RAG OS</h1>
            <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider text-cyan-400 bg-cyan-950/80 border border-cyan-800/60 rounded-full uppercase">
              Enterprise v2.0
            </span>
          </div>
          <p className="text-xs text-gray-400">LangGraph • NeMo Guardrails • Qdrant • Groq</p>
        </div>
      </div>

      {/* Center Status Indicators */}
      <div className="hidden md:flex items-center space-x-4">
        {/* Server Status */}
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-gray-900/60 border border-gray-800 text-xs">
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-gray-300 font-medium">Backend:</span>
          <span className={isOnline ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
            {isOnline ? 'Connected' : 'Offline'}
          </span>
        </div>

        {/* Vector DB status */}
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-gray-900/60 border border-gray-800 text-xs">
          <Database className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-gray-300 font-medium">Qdrant:</span>
          <span className="text-cyan-400 font-semibold">
            {vectorStats?.vectors_count !== undefined ? `${vectorStats.vectors_count} Chunks` : 'Connecting...'}
          </span>
        </div>

        {/* Logfire Tracing status */}
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-gray-900/60 border border-gray-800 text-xs">
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-gray-300 font-medium">Logfire:</span>
          <span className="text-amber-400 font-semibold">Tracing Active</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-3">
        {/* Session ID Pill */}
        <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-indigo-950/40 border border-indigo-800/40 text-xs text-indigo-300">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-mono">{sessionId.slice(0, 8)}...</span>
        </div>

        {/* Clear Memory Action */}
        <button
          onClick={onClearMemory}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-red-950/40 border border-red-900/40 hover:bg-red-900/60 text-red-300 hover:text-red-100 text-xs font-medium transition-all shadow-sm active:scale-95 cursor-pointer"
          title="Wipe current thread memory"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-400" />
          <span>Wipe Memory</span>
        </button>
      </div>
    </header>
  );
}
