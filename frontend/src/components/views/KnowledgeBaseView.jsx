import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Layers, 
  Database, 
  Search,
  Tag,
  FileType
} from 'lucide-react';
import { uploadDocument, fetchDocuments } from '../../services/api';

export default function KnowledgeBaseView({ onDocumentUploaded }) {
  const [file, setFile] = useState(null);
  const [sourceType, setSourceType] = useState('general');
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  const loadDocs = async () => {
    setLoadingDocs(true);
    try {
      const data = await fetchDocuments();
      setDocuments(data.documents || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    loadDocs();
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadResult(null);
      setUploadError(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setUploadResult(null);
      setUploadError(null);
    }
  };

  const handleUpload = async () => {
    if (!file || uploading) return;

    setUploading(true);
    setUploadResult(null);
    setUploadError(null);

    try {
      const res = await uploadDocument(file, sourceType);
      setUploadResult(res);
      setFile(null);
      await loadDocs();
      if (onDocumentUploaded) onDocumentUploaded();
    } catch (err) {
      setUploadError(err.response?.data?.detail || err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const filteredDocs = documents.filter(doc => 
    doc.filename.toLowerCase().includes(searchFilter.toLowerCase()) ||
    doc.source_type.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto bg-gray-950">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-5">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <Database className="w-5 h-5 text-indigo-400" />
            <span>Knowledge Base & Universal Ingestion Engine</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Ingest PDF, TXT, HTML, and DOCX documents directly into Qdrant vector database with Gemini embeddings.
          </p>
        </div>

        <button
          onClick={loadDocs}
          disabled={loadingDocs}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-gray-900 border border-gray-800 hover:bg-gray-800 text-xs font-medium text-gray-300 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingDocs ? 'animate-spin text-indigo-400' : ''}`} />
          <span>Refresh List</span>
        </button>
      </div>

      {/* Grid Layout: Upload Box & Ingestion Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Card */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-gray-800/80 space-y-4">
          <h3 className="text-sm font-semibold text-gray-200 flex items-center space-x-2">
            <UploadCloud className="w-4 h-4 text-cyan-400" />
            <span>Document Ingestion Dropzone</span>
          </h3>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-gray-700/80 hover:border-indigo-500/80 rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all bg-gray-900/40 hover:bg-gray-900/80 group cursor-pointer"
          >
            <input
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.txt,.html,.htm,.docx,.pptx"
              className="hidden"
              id="file-input"
            />
            <label htmlFor="file-input" className="cursor-pointer flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-950/60 border border-indigo-800/60 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform mb-3">
                <FileType className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-gray-200">
                {file ? file.name : "Drag & drop files here, or click to browse"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Supports PDF, TXT, HTML, DOCX (Max size: 25MB)
              </p>
            </label>
          </div>

          {/* Controls: Source Type & Upload trigger */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <Tag className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-300 font-medium">Source Type:</span>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                className="bg-gray-900 border border-gray-700 text-gray-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-indigo-500"
              >
                <option value="general">General Documentation</option>
                <option value="true_data">True / Ground Truth Data</option>
                <option value="noisy_data">Noisy Benchmark Data</option>
              </select>
            </div>

            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold px-6 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/30 flex items-center justify-center space-x-2 cursor-pointer"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Parsing & Indexing...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Start Indexing</span>
                </>
              )}
            </button>
          </div>

          {/* Results Alerts */}
          {uploadResult && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/60 flex items-center space-x-2 text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{uploadResult.message}</span>
            </motion.div>
          )}
          {uploadError && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 rounded-xl bg-red-950/60 border border-red-800/60 flex items-center space-x-2 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{uploadError}</span>
            </motion.div>
          )}
        </div>

        {/* Quick Stats Panel */}
        <div className="glass-panel p-6 rounded-2xl border border-gray-800/80 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-200 mb-3 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Ingestion Statistics</span>
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800/80 flex items-center justify-between">
                <span className="text-xs text-gray-400">Total Ingested Files:</span>
                <span className="text-sm font-bold text-indigo-300">{documents.length}</span>
              </div>
              <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800/80 flex items-center justify-between">
                <span className="text-xs text-gray-400">Total Vector Chunks:</span>
                <span className="text-sm font-bold text-cyan-300">
                  {documents.reduce((acc, doc) => acc + (doc.chunk_count || 0), 0)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800/80 flex items-center justify-between">
                <span className="text-xs text-gray-400">Embedding Engine:</span>
                <span className="text-xs font-mono text-emerald-400">Gemini (768-dim)</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-800/40 text-[11px] text-indigo-300">
            💡 Uploaded files are automatically chunked using recursive character splitters and indexed directly into the Qdrant cluster.
          </div>
        </div>
      </div>

      {/* Processed Datasets List */}
      <div className="glass-panel p-6 rounded-2xl border border-gray-800/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-gray-200 flex items-center space-x-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Indexed Documents & Chunks Explorer</span>
          </h3>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter by filename or type..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="bg-gray-900 border border-gray-800 text-xs text-gray-200 rounded-xl pl-8 pr-3 py-1.5 outline-none focus:border-indigo-500 w-64"
            />
          </div>
        </div>

        {filteredDocs.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-xs">
            No indexed documents matching your search filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDocs.map((doc, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-gray-900/60 border border-gray-800/80 hover:border-indigo-500/30 transition-all space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 truncate">
                    <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="text-xs font-semibold text-gray-200 truncate">{doc.filename}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 font-mono">
                    {doc.source_type}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
                  <span>Chunks: <strong className="text-gray-200 font-mono">{doc.chunk_count}</strong></span>
                  <span className="text-[11px] text-gray-500 font-mono">Qdrant Cosine</span>
                </div>

                {doc.chunks_sample && doc.chunks_sample.length > 0 && (
                  <div className="pt-2">
                    <p className="text-[10px] uppercase font-semibold text-gray-500 mb-1">Sample Chunk Snippet:</p>
                    <p className="text-[11px] font-mono text-gray-400 bg-black/40 p-2 rounded border border-gray-800/60 line-clamp-2">
                      {doc.chunks_sample[0]}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
