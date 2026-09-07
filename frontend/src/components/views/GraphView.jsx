import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  GitFork, 
  RefreshCw, 
  ExternalLink, 
  ShieldCheck, 
  Cpu, 
  Database, 
  Bot,
  Layers,
  ArrowRight
} from 'lucide-react';
import { getGraphUrl } from '../../services/api';

export default function GraphView() {
  const [graphUrl, setGraphUrl] = useState(getGraphUrl());
  const [loadingGraph, setLoadingGraph] = useState(false);

  const reloadGraph = () => {
    setLoadingGraph(true);
    setGraphUrl(getGraphUrl());
    setTimeout(() => setLoadingGraph(false), 500);
  };

  const nodes = [
    {
      id: 'guardrails',
      title: 'Gate 1: NeMo Guardrails',
      icon: ShieldCheck,
      color: 'border-amber-500/40 bg-amber-950/20 text-amber-400',
      description: 'First defensive line. Validates prompt against Colang rules, blocks jailbreaks, off-topic requests, and handles predefined conversation flows.'
    },
    {
      id: 'planner',
      title: 'Node 1: LangGraph Planner',
      icon: Cpu,
      color: 'border-indigo-500/40 bg-indigo-950/20 text-indigo-400',
      description: 'Analyzes user query, formulates step-by-step reasoning plan, and sets execution status variables in the graph state.'
    },
    {
      id: 'retriever',
      title: 'Node 2: Qdrant Retriever',
      icon: Database,
      color: 'border-cyan-500/40 bg-cyan-950/20 text-cyan-400',
      description: 'Generates Gemini embeddings for query and retrieves top matching chunk vectors from Qdrant cluster using Cosine similarity.'
    },
    {
      id: 'responder',
      title: 'Node 3: LLM Synthesizer',
      icon: Bot,
      color: 'border-emerald-500/40 bg-emerald-950/20 text-emerald-400',
      description: 'Synthesizes final answer using Groq Llama-3.3-70B Versatile based on retrieved document chunks and conversation history.'
    }
  ];

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto bg-gray-950">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-5">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <GitFork className="w-5 h-5 text-indigo-400" />
            <span>LangGraph Agent State Machine Visualizer</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Real-time Mermaid representation of the cyclic graph nodes and state transitions.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={reloadGraph}
            disabled={loadingGraph}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-gray-900 border border-gray-800 hover:bg-gray-800 text-xs font-medium text-gray-300 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingGraph ? 'animate-spin text-indigo-400' : ''}`} />
            <span>Reload Graph</span>
          </button>
          <a
            href={graphUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition-all shadow-md cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>View Full Image</span>
          </a>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graph Image Render Card */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-gray-800/80 flex flex-col items-center justify-center min-h-[400px]">
          <h3 className="text-sm font-semibold text-gray-200 mb-4 flex items-center space-x-2 self-start">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Mermaid Workflow Diagram</span>
          </h3>

          <div className="bg-gray-900/90 border border-gray-800/90 rounded-2xl p-6 w-full flex items-center justify-center overflow-auto shadow-inner">
            <img
              src={graphUrl}
              alt="LangGraph Workflow Diagram"
              className="max-h-[450px] object-contain rounded-lg filter drop-shadow-lg"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://via.placeholder.com/600x300/111827/38BDF8?text=LangGraph+Agent+State+Machine+(Start+->+Planner+->+Retriever+->+Responder)';
              }}
            />
          </div>
        </div>

        {/* Node Breakdown List */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-200 flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <span>State Machine Node Pipeline</span>
          </h3>

          <div className="space-y-3">
            {nodes.map((node, index) => {
              const Icon = node.icon;
              return (
                <motion.div
                  key={node.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-4 rounded-xl border ${node.color} space-y-2 relative overflow-hidden`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Icon className="w-4 h-4" />
                      <span className="text-xs font-bold">{node.title}</span>
                    </div>
                    <span className="text-[10px] font-mono opacity-70">Step {index + 1}</span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed font-sans opacity-90">
                    {node.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
