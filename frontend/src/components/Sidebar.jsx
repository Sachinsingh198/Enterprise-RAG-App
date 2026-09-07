import React from 'react';
import { 
  MessageSquare, 
  FolderSearch, 
  GitFork, 
  ShieldCheck, 
  BarChart3, 
  Settings2,
  ChevronRight,
  Cpu
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const menuItems = [
    { id: 'chat', label: 'RAG Assistant', icon: MessageSquare, badge: 'Live' },
    { id: 'kb', label: 'Knowledge Base', icon: FolderSearch, badge: 'Ingest' },
    { id: 'graph', label: 'LangGraph Agent', icon: GitFork, badge: 'State' },
    { id: 'guardrails', label: 'Guardrails & Safety', icon: ShieldCheck, badge: 'NeMo' },
    { id: 'metrics', label: 'Vector Analytics', icon: BarChart3, badge: 'Qdrant' },
    { id: 'config', label: 'System Architecture', icon: Settings2 },
  ];

  return (
    <aside className="w-64 glass-panel border-r border-gray-800/60 p-4 flex flex-col justify-between hidden lg:flex shrink-0">
      <div className="space-y-6">
        <div>
          <h2 className="px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            Navigation Menu
          </h2>
          <nav className="mt-3 space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-md shadow-indigo-950/40'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-indigo-400' : 'text-gray-400 group-hover:text-gray-300'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono ${
                      isActive 
                        ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-400/30' 
                        : 'bg-gray-800/80 text-gray-400'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Engine Card */}
        <div className="p-3.5 rounded-xl glass-card border border-indigo-900/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl animate-glow" />
          <div className="flex items-center space-x-2 text-indigo-400 mb-1">
            <Cpu className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Agent Engine</span>
          </div>
          <p className="text-xs text-gray-300 font-medium">Llama-3.3-70B Versatile</p>
          <p className="text-[11px] text-gray-400 mt-1">Multi-stage planner & Qdrant hybrid retriever active.</p>
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-4 border-t border-gray-800/60 text-[11px] text-gray-400 text-center">
        Enterprise RAG v2.0 • Production Ready
      </div>
    </aside>
  );
}
