"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Globe,
  HelpCircle,
  Trash2,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import { trainingApi } from "@/lib/api";
import axios from "axios";

interface Source {
  _id: string;
  type: string;
  name: string;
  source: string;
  chunkCount: number;
  characterCount: number;
  status: string;
  question?: string;
  answer?: string;
  createdAt: string;
}

export default function TrainingPage() {
  const [activeTab, setActiveTab] = useState<"file" | "url" | "qna">("file");
  const [sources, setSources] = useState<Source[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [url, setUrl] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoadingSources, setIsLoadingSources] = useState(true);

  const loadSources = useCallback(async () => {
    try {
      const { data } = await trainingApi.getSources();
      setSources(data.data || []);
    } catch {
      // silently fail
    } finally {
      setIsLoadingSources(false);
    }
  }, []);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  // File Upload via Drag & Drop
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      const file = acceptedFiles[0];

      setIsUploading(true);
      try {
        const { data } = await trainingApi.uploadFile(file);
        toast.success(data.message);
        loadSources();
      } catch (error) {
        const msg = axios.isAxiosError(error) ? error.response?.data?.error : "Upload failed";
        toast.error(msg || "Upload failed");
      } finally {
        setIsUploading(false);
      }
    },
    [loadSources]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "text/plain": [".txt"],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    disabled: isUploading,
  });

  // URL Submit
  const handleURLSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsUploading(true);
    try {
      const { data } = await trainingApi.uploadURL(url);
      toast.success(data.message);
      setUrl("");
      loadSources();
    } catch (error) {
      const msg = axios.isAxiosError(error) ? error.response?.data?.error : "URL processing failed";
      toast.error(msg || "URL processing failed");
    } finally {
      setIsUploading(false);
    }
  };

  // Q&A Submit
  const handleQnASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) return;

    setIsUploading(true);
    try {
      const { data } = await trainingApi.addQnA(question, answer);
      toast.success(data.message);
      setQuestion("");
      setAnswer("");
      loadSources();
    } catch (error) {
      const msg = axios.isAxiosError(error) ? error.response?.data?.error : "Failed to add Q&A";
      toast.error(msg || "Failed to add Q&A");
    } finally {
      setIsUploading(false);
    }
  };

  // Delete source
  const handleDelete = async (id: string) => {
    try {
      await trainingApi.deleteSource(id);
      toast.success("Source deleted");
      loadSources();
    } catch (error) {
      const msg = axios.isAxiosError(error) ? error.response?.data?.error : "Delete failed";
      toast.error(msg || "Delete failed");
    }
  };

  // Reset all
  const handleReset = async () => {
    if (!confirm("Are you sure? This will delete ALL training data.")) return;
    try {
      await trainingApi.reset();
      toast.success("All training data cleared");
      loadSources();
    } catch {
      toast.error("Reset failed");
    }
  };

  const tabs = [
    { key: "file" as const, label: "File Upload", icon: Upload },
    { key: "url" as const, label: "Web URL", icon: Globe },
    { key: "qna" as const, label: "Q&A Pair", icon: HelpCircle },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case "processing":
        return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return null;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "url":
        return <Globe className="w-4 h-4 text-green-400" />;
      case "qna":
        return <HelpCircle className="w-4 h-4 text-yellow-400" />;
      default:
        return <FileText className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-foreground">
          Train Your <span className="gradient-text">AI Bot</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          Upload documents, crawl websites, or add Q&amp;A pairs to teach your bot.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Input Section */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6"
          >
            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] mb-6">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.key
                      ? "bg-blue-500/20 text-blue-400"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* File Upload Tab */}
            <AnimatePresence mode="wait">
              {activeTab === "file" && (
                <motion.div
                  key="file"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                >
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
                      isDragActive
                        ? "border-blue-500 bg-blue-500/10"
                        : isUploading
                        ? "border-white/10 bg-white/[0.02] cursor-wait"
                        : "border-white/10 hover:border-blue-500/50 hover:bg-white/[0.02]"
                    }`}
                  >
                    <input {...getInputProps()} />
                    {isUploading ? (
                      <div className="space-y-3">
                        <Loader2 className="w-10 h-10 mx-auto text-blue-400 animate-spin" />
                        <p className="text-sm text-muted-foreground">
                          Processing file... extracting, chunking &amp; embedding
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto">
                          <Upload className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {isDragActive
                              ? "Drop your file here"
                              : "Drag & drop a file here"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            PDF, DOCX, or TXT — max 10MB
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* URL Tab */}
              {activeTab === "url" && (
                <motion.div
                  key="url"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                >
                  <form onSubmit={handleURLSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground/80 mb-2">
                        Website URL
                      </label>
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://example.com"
                        className="input-field"
                        disabled={isUploading}
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        The bot will crawl internal pages and extract text content.
                      </p>
                    </div>
                    <button
                      type="submit"
                      disabled={isUploading || !url.trim()}
                      className="btn-gradient w-full flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isUploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Globe className="w-4 h-4" />
                      )}
                      {isUploading ? "Crawling..." : "Crawl & Train"}
                    </button>
                  </form>
                </motion.div>
              )}

              {/* Q&A Tab */}
              {activeTab === "qna" && (
                <motion.div
                  key="qna"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                >
                  <form onSubmit={handleQnASubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground/80 mb-2">
                        Question
                      </label>
                      <input
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="What is your return policy?"
                        className="input-field"
                        disabled={isUploading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground/80 mb-2">
                        Answer
                      </label>
                      <textarea
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        placeholder="Our return policy allows returns within 30 days..."
                        rows={4}
                        className="input-field resize-none"
                        disabled={isUploading}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={
                        isUploading || !question.trim() || !answer.trim()
                      }
                      className="btn-gradient w-full flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isUploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      {isUploading ? "Adding..." : "Add Q&A Pair"}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Sources List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-3 glass-card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Training Sources
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={loadSources}
                className="p-2 hover:bg-white/[0.06] rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4 text-muted-foreground" />
              </button>
              {sources.length > 0 && (
                <button
                  onClick={handleReset}
                  className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Reset all"
                >
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                </button>
              )}
            </div>
          </div>

          {isLoadingSources ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
            </div>
          ) : sources.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
                <FileText className="w-7 h-7 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground text-sm">
                No training data yet
              </p>
              <p className="text-muted-foreground/60 text-xs mt-1">
                Upload a file, crawl a URL, or add Q&amp;A pairs to get started
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
              <AnimatePresence>
                {sources.map((source, i) => (
                  <motion.div
                    key={source._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                      {getTypeIcon(source.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {source.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {source.chunkCount} chunks ·{" "}
                        {(source.characterCount / 1000).toFixed(1)}k chars ·{" "}
                        {new Date(source.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getStatusIcon(source.status)}
                      <button
                        onClick={() => handleDelete(source._id)}
                        className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
