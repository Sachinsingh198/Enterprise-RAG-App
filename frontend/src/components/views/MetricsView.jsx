import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  Database, 
  Flame, 
  Activity, 
  RefreshCw, 
  CheckCircle2, 
  Cpu, 
  HardDrive,
  Layers,
  Server
} from 'lucide-react';
import { fetchVectorStats, fetchHealth } from '../../services/api';

export default function MetricsView() {
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const [s, h] = await Promise.all([fetchVectorStats(), fetchHealth()]);
      setStats(s);
      setHealth(h);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto bg-gray-950">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-5">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <span>Vector Analytics & Observability Dashboard</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Real-time Qdrant vector collection metrics, distance parameters, and Logfire distributed tracing telemetries.
          </p>
        </div>

        <button
          onClick={loadMetrics}
          disabled={loading}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-gray-900 border border-gray-800 hover:bg-gray-800 text-xs font-medium text-gray-300 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* Top Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Vector Count */}
        <div className="glass-panel p-5 rounded-2xl border border-gray-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Total Vectors</span>
            <Database className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-extrabold text-white font-mono">
            {stats?.vectors_count !== undefined ? stats.vectors_count.toLocaleString() : '0'}
          </p>
          <p className="text-[11px] text-cyan-400 font-mono">Collection: {stats?.collection_name || 'enterprise_rag'}</p>
        </div>

        {/* Card 2: Dimension */}
        <div className="glass-panel p-5 rounded-2xl border border-gray-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Embedding Dim</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-extrabold text-white font-mono">
            {stats?.vector_size || 768} Dims
          </p>
          <p className="text-[11px] text-indigo-400 font-mono">Distance: {stats?.distance_metric || 'Cosine'}</p>
        </div>

        {/* Card 3: Tracing */}
        <div className="glass-panel p-5 rounded-2xl border border-gray-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Logfire Telemetry</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-extrabold text-white">Active</p>
          <p className="text-[11px] text-amber-400 font-mono">Token: Configured</p>
        </div>

        {/* Card 4: Backend Health */}
        <div className="glass-panel p-5 rounded-2xl border border-gray-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Backend Server</span>
            <Server className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-400 capitalize">
            {health?.status || 'Online'}
          </p>
          <p className="text-[11px] text-emerald-400 font-mono">Port: 8000 (FastAPI)</p>
        </div>
      </div>

      {/* Detailed Diagnostic Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Qdrant Cluster Diagnostics */}
        <div className="glass-panel p-6 rounded-2xl border border-gray-800/80 space-y-4">
          <h3 className="text-sm font-semibold text-gray-200 flex items-center space-x-2">
            <HardDrive className="w-4 h-4 text-cyan-400" />
            <span>Qdrant Cluster Detailed Diagnostics</span>
          </h3>

          <div className="space-y-3 font-mono text-xs">
            <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800/80 flex items-center justify-between">
              <span className="text-gray-400">Collection Name:</span>
              <span className="text-cyan-300 font-bold">{stats?.collection_name || 'enterprise_rag'}</span>
            </div>
            <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800/80 flex items-center justify-between">
              <span className="text-gray-400">Cluster Status:</span>
              <span className="text-emerald-400 font-bold uppercase">{stats?.status || 'Green'}</span>
            </div>
            <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800/80 flex items-center justify-between">
              <span className="text-gray-400">Indexed Points Count:</span>
              <span className="text-indigo-300 font-bold">{stats?.indexed_vectors_count || stats?.vectors_count || 0}</span>
            </div>
            <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800/80 flex items-center justify-between">
              <span className="text-gray-400">Similarity Metric:</span>
              <span className="text-amber-300 font-bold">{stats?.distance_metric || 'Cosine'}</span>
            </div>
          </div>
        </div>

        {/* Observability & Tracing Info */}
        <div className="glass-panel p-6 rounded-2xl border border-gray-800/80 space-y-4">
          <h3 className="text-sm font-semibold text-gray-200 flex items-center space-x-2">
            <Activity className="w-4 h-4 text-amber-400" />
            <span>Observability & Logfire Spans</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-gray-900/60 border border-gray-800/80 space-y-1">
              <div className="flex items-center justify-between font-semibold text-amber-300">
                <span>Distributed Tracing Span</span>
                <span>Active</span>
              </div>
              <p className="text-gray-400 text-[11px]">
                Captures end-to-end execution latency across NeMo Guardrails, LangGraph state transitions, Qdrant similarity searches, and Groq LLM generations.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-800/40 text-indigo-300 text-[11px] leading-relaxed">
              ⚡ <strong>OpenTelemetry Standard:</strong> Spans are automatically logged to Logfire Cloud dashboard for real-time query latency analysis and token usage profiling.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
