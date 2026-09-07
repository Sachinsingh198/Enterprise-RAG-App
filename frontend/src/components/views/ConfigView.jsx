import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings2, 
  Cpu, 
  Database, 
  ShieldCheck, 
  Zap, 
  Key, 
  CheckCircle2, 
  AlertCircle,
  Layers,
  Globe
} from 'lucide-react';
import { fetchHealth } from '../../services/api';

export default function ConfigView() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetchHealth().then(setHealth).catch(console.error);
  }, []);

  const components = [
    {
      title: 'Reasoning LLM Engine',
      value: 'Groq Llama-3.3-70B Versatile',
      status: health?.groq_configured ? 'Configured' : 'Key Missing',
      icon: Cpu,
      color: 'text-indigo-400',
      description: 'Ultra-low-latency LPU inference powering multi-step planning and final answer synthesis.'
    },
    {
      title: 'Embedding Model',
      value: 'Google Gemini Embeddings (768-dim)',
      status: health?.gemini_configured ? 'Configured' : 'Key Missing',
      icon: Zap,
      color: 'text-cyan-400',
      description: 'High-dimensional semantic vector representations for document chunks.'
    },
    {
      title: 'Vector Store Cluster',
      value: `Qdrant (${health?.vector_collection || 'enterprise_rag'})`,
      status: health?.qdrant_connected ? 'Connected' : 'Offline',
      icon: Database,
      color: 'text-emerald-400',
      description: 'Distributed vector database supporting Cosine similarity index and metadata payload filtering.'
    },
    {
      title: 'Defensive Guardrails Engine',
      value: 'NeMo Guardrails + Colang 2.0',
      status: 'Active',
      icon: ShieldCheck,
      color: 'text-amber-400',
      description: 'Safety gate preventing prompt injection, off-topic queries, and policy violations.'
    },
    {
      title: 'LLM Gateway',
      value: 'Portkey AI Gateway',
      status: 'Fallback Active',
      icon: Globe,
      color: 'text-purple-400',
      description: 'Unified routing, load balancing, rate limiting, and failover across multiple API keys.'
    },
    {
      title: 'Observability & Tracing',
      value: 'Pydantic Logfire',
      status: health?.logfire_token_present ? 'Active' : 'Standby',
      icon: Layers,
      color: 'text-pink-400',
      description: 'End-to-end OpenTelemetry distributed tracing and span instrumentation.'
    }
  ];

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto bg-gray-950">
      {/* Header */}
      <div className="border-b border-gray-800 pb-5">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
          <Settings2 className="w-5 h-5 text-indigo-400" />
          <span>Enterprise Architecture & System Configuration</span>
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          Detailed blueprint of the production multi-model AI infrastructure, gateways, and security guardrails.
        </p>
      </div>

      {/* Grid of System Components */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {components.map((item, idx) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="glass-panel p-6 rounded-2xl border border-gray-800/80 space-y-3 relative overflow-hidden group hover:border-indigo-500/40 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center">
                    <Icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <h3 className="text-xs font-bold text-gray-200">{item.title}</h3>
                </div>

                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  item.status === 'Configured' || item.status === 'Connected' || item.status === 'Active'
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
                    : 'bg-amber-950/80 text-amber-300 border-amber-800/60'
                }`}>
                  {item.status}
                </span>
              </div>

              <div>
                <p className="text-sm font-semibold text-white font-mono">{item.value}</p>
                <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{item.description}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Environment Variables Verification Box */}
      <div className="glass-panel p-6 rounded-2xl border border-gray-800/80 space-y-4">
        <h3 className="text-sm font-semibold text-gray-200 flex items-center space-x-2">
          <Key className="w-4 h-4 text-amber-400" />
          <span>Environment Keys & Secrets Diagnostic</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800/80 flex items-center justify-between font-mono">
            <span className="text-gray-400">GROQ_API_KEY</span>
            {health?.groq_configured ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400" />
            )}
          </div>

          <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800/80 flex items-center justify-between font-mono">
            <span className="text-gray-400">GEMINI_API_KEY</span>
            {health?.gemini_configured ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400" />
            )}
          </div>

          <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800/80 flex items-center justify-between font-mono">
            <span className="text-gray-400">QDRANT_CLUSTER_ENDPOINT</span>
            {health?.qdrant_connected ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400" />
            )}
          </div>

          <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800/80 flex items-center justify-between font-mono">
            <span className="text-gray-400">LOGFIRE_TOKEN</span>
            {health?.logfire_token_present ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
