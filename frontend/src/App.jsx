import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import ChatView from './components/views/ChatView';
import KnowledgeBaseView from './components/views/KnowledgeBaseView';
import GraphView from './components/views/GraphView';
import GuardrailsView from './components/views/GuardrailsView';
import MetricsView from './components/views/MetricsView';
import ConfigView from './components/views/ConfigView';

import { fetchHealth, fetchVectorStats, clearMemory } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [sessionId, setSessionId] = useState(() => 'sess_' + Math.random().toString(36).substr(2, 9));
  const [healthStatus, setHealthStatus] = useState(null);
  const [vectorStats, setVectorStats] = useState(null);

  const loadSystemStatus = async () => {
    try {
      const [h, v] = await Promise.all([fetchHealth(), fetchVectorStats()]);
      setHealthStatus(h);
      setVectorStats(v);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadSystemStatus();
    const interval = setInterval(loadSystemStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleClearMemory = async () => {
    try {
      await clearMemory(sessionId);
      const newSess = 'sess_' + Math.random().toString(36).substr(2, 9);
      setSessionId(newSess);
      alert('Memory and session state cleared successfully.');
    } catch (err) {
      console.error('Failed to clear memory:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Header Bar */}
      <Navbar
        healthStatus={healthStatus}
        vectorStats={vectorStats}
        sessionId={sessionId}
        onClearMemory={handleClearMemory}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Responsive Sidebar */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Mobile Tab Navigation Bar */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 glass-panel border-t border-gray-800 z-40 flex justify-around p-2 text-xs">
          <button
            onClick={() => setActiveTab('chat')}
            className={`p-2 rounded-lg flex flex-col items-center cursor-pointer ${activeTab === 'chat' ? 'text-indigo-400 font-bold' : 'text-gray-400'}`}
          >
            💬 Assistant
          </button>
          <button
            onClick={() => setActiveTab('kb')}
            className={`p-2 rounded-lg flex flex-col items-center cursor-pointer ${activeTab === 'kb' ? 'text-indigo-400 font-bold' : 'text-gray-400'}`}
          >
            📁 Knowledge
          </button>
          <button
            onClick={() => setActiveTab('graph')}
            className={`p-2 rounded-lg flex flex-col items-center cursor-pointer ${activeTab === 'graph' ? 'text-indigo-400 font-bold' : 'text-gray-400'}`}
          >
            🕸️ Graph
          </button>
          <button
            onClick={() => setActiveTab('guardrails')}
            className={`p-2 rounded-lg flex flex-col items-center cursor-pointer ${activeTab === 'guardrails' ? 'text-indigo-400 font-bold' : 'text-gray-400'}`}
          >
            🛡️ Guardrails
          </button>
          <button
            onClick={() => setActiveTab('metrics')}
            className={`p-2 rounded-lg flex flex-col items-center cursor-pointer ${activeTab === 'metrics' ? 'text-indigo-400 font-bold' : 'text-gray-400'}`}
          >
            📊 Analytics
          </button>
        </div>

        {/* Dynamic View Panel */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative mb-14 lg:mb-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              {activeTab === 'chat' && <ChatView sessionId={sessionId} />}
              {activeTab === 'kb' && <KnowledgeBaseView onDocumentUploaded={loadSystemStatus} />}
              {activeTab === 'graph' && <GraphView />}
              {activeTab === 'guardrails' && <GuardrailsView sessionId={sessionId} />}
              {activeTab === 'metrics' && <MetricsView />}
              {activeTab === 'config' && <ConfigView />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
