import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Send, 
  Bot, 
  User, 
  ShieldAlert, 
  CheckCircle2, 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  Sparkles, 
  RefreshCw, 
  Copy, 
  Check,
  Layers,
  Cpu
} from 'lucide-react';
import { queryRAG, queryRAGStream } from '../../services/api';

export default function ChatView({ sessionId }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I am your **Enterprise Agentic RAG Assistant**. I use **LangGraph reasoning**, **Qdrant vector search**, and **NeMo Guardrails** to provide accurate, verified answers backed by your enterprise documentation. How can I assist you today?",
      thought_process: ["System initialized", "Guardrails active", "Qdrant Vector DB ready"],
      sources: [],
      guardrail_fired: false
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (queryText) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || loading) return;

    const userMessageId = Date.now().toString();
    const userMessage = {
      id: userMessageId,
      role: 'user',
      content: textToSend,
    };

    const assistantMessageId = (Date.now() + 1).toString();
    const initialAssistantMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      thought_process: ['Initializing agent...'],
      sources: [],
      guardrail_fired: false,
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMessage, initialAssistantMessage]);
    if (!queryText) setInputQuery('');
    setLoading(true);

    try {
      await queryRAGStream(textToSend, sessionId, {
        onMeta: (meta) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    thought_process: meta.thought_process || [],
                    sources: meta.sources || [],
                    guardrail_fired: meta.guardrail_fired || false,
                  }
                : msg
            )
          );
        },
        onToken: (token) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    content: msg.content + token,
                  }
                : msg
            )
          );
        },
        onError: (err) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    content: msg.content || "❌ **Error communicating with RAG backend streaming API.** Please verify that FastAPI backend server is running on `http://localhost:8000`.",
                    isError: true,
                  }
                : msg
            )
          );
        },
        onDone: () => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, isStreaming: false }
                : msg
            )
          );
        },
      });
    } catch (error) {
      console.error('Stream failure:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSteps = (id) => {
    setExpandedSteps((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const examplePrompts = [
    "What core features does this enterprise RAG system provide?",
    "How does NeMo Guardrails intercept off-topic or unsafe prompts?",
    "Explain the chunking strategy used during document ingestion.",
    "What vector distance metric is configured in Qdrant?"
  ];

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] bg-gray-950 overflow-hidden relative">
      {/* Background Ambient Glow */}
      <div className="absolute top-10 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none animate-glow" />
      <div className="absolute bottom-10 left-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none animate-glow" />

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex gap-3 md:gap-4 max-w-4xl ${
                msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                  msg.role === 'assistant'
                    ? msg.guardrail_fired
                      ? 'bg-amber-600/20 border border-amber-500/40 text-amber-400'
                      : 'bg-indigo-600/20 border border-indigo-500/40 text-indigo-400'
                    : 'bg-cyan-600/20 border border-cyan-500/40 text-cyan-400'
                }`}
              >
                {msg.role === 'assistant' ? (
                  msg.guardrail_fired ? <ShieldAlert className="w-5 h-5" /> : <Bot className="w-5 h-5" />
                ) : (
                  <User className="w-5 h-5" />
                )}
              </div>

              {/* Content Bubble */}
              <div
                className={`flex-1 rounded-2xl p-4 shadow-xl border ${
                  msg.role === 'user'
                    ? 'bg-indigo-900/40 border-indigo-700/40 text-gray-100 max-w-xl'
                    : 'glass-panel text-gray-200'
                }`}
              >
                {/* Guardrail Alert Header */}
                {msg.guardrail_fired && (
                  <div className="mb-3 px-3 py-2 rounded-lg bg-amber-950/60 border border-amber-800/60 flex items-center space-x-2 text-amber-300 text-xs font-medium">
                    <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>NeMo Guardrail Triggered • Prompt safely intercepted by dialog rules.</span>
                  </div>
                )}

                {/* Agent Thought Process Accordion */}
                {msg.role === 'assistant' && msg.thought_process && msg.thought_process.length > 0 && (
                  <div className="mb-4 border border-gray-800/80 rounded-xl bg-gray-900/60 overflow-hidden">
                    <button
                      onClick={() => toggleSteps(msg.id)}
                      className="w-full px-3.5 py-2 flex items-center justify-between text-xs font-semibold text-gray-400 hover:text-gray-200 transition-colors bg-gray-900/80 cursor-pointer"
                    >
                      <div className="flex items-center space-x-2">
                        <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Reasoning Steps ({msg.thought_process.length})</span>
                      </div>
                      {expandedSteps[msg.id] ? (
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                      )}
                    </button>

                    {expandedSteps[msg.id] && (
                      <div className="p-3 space-y-1.5 border-t border-gray-800/60 text-xs text-gray-300">
                        {msg.thought_process.map((step, idx) => (
                          <div key={idx} className="flex items-start space-x-2 font-mono text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span className="text-gray-300">{step}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Markdown Text Body with Typing Cursor indicator */}
                <div className="prose-dark text-sm leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content + (msg.isStreaming ? ' ▌' : '')}
                  </ReactMarkdown>
                </div>


                {/* Sources Section */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-800/80">
                    <div className="flex items-center space-x-2 text-xs font-semibold text-cyan-400 mb-2">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Retrieved Sources ({msg.sources.length})</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {msg.sources.map((src, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-lg bg-gray-900/80 border border-gray-800/80 text-xs text-gray-300 space-y-1"
                        >
                          <div className="flex items-center justify-between text-[11px] text-gray-400">
                            <span className="font-semibold text-cyan-300">Chunk #{i + 1}</span>
                            <button
                              onClick={() => handleCopy(src, `${msg.id}-src-${i}`)}
                              className="flex items-center space-x-1 text-gray-400 hover:text-white transition-colors cursor-pointer"
                            >
                              {copiedId === `${msg.id}-src-${i}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              <span>Copy</span>
                            </button>
                          </div>
                          <p className="font-mono text-[11px] text-gray-300 leading-relaxed bg-black/40 p-2 rounded border border-gray-800/50 max-h-28 overflow-y-auto">
                            {src}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading Indicator */}
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-4 max-w-4xl"
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shrink-0 shadow-md">
              <Sparkles className="w-5 h-5 animate-spin" />
            </div>
            <div className="flex-1 glass-panel p-4 rounded-2xl border border-indigo-500/30 flex items-center space-x-3">
              <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />
              <div className="space-y-1">
                <p className="text-sm text-indigo-300 font-medium">Agentic Graph Execution in Progress...</p>
                <p className="text-xs text-gray-400">Running Guardrails -&gt; LangGraph Planner -&gt; Qdrant Vector Retrieval -&gt; Groq Llama 3.3 70B</p>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts (if chat is fresh) */}
      {messages.length <= 2 && (
        <div className="px-6 pb-2">
          <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Suggested Queries:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {examplePrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(prompt)}
                className="text-left p-2.5 rounded-xl bg-gray-900/60 hover:bg-gray-800/80 border border-gray-800 text-xs text-gray-300 hover:text-indigo-300 transition-all cursor-pointer truncate"
              >
                💡 {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form Bar */}
      <div className="p-4 glass-panel border-t border-gray-800/60 sticky bottom-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2 max-w-5xl mx-auto"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask a question about your enterprise documentation..."
            disabled={loading}
            className="flex-1 bg-gray-900/90 border border-gray-700/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-gray-100 placeholder-gray-500 rounded-xl px-4 py-3 text-sm outline-none transition-all"
          />
          <button
            type="submit"
            disabled={loading || !inputQuery.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium px-5 py-3 rounded-xl flex items-center space-x-2 transition-all shadow-lg shadow-indigo-600/30 active:scale-95 cursor-pointer"
          >
            <span>Ask</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
