"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Database,
  FileText,
  Globe,
  GraduationCap,
  HelpCircle,
  MessageCircle,
  TrendingUp,
  Zap,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { trainingApi, chatApi } from "@/lib/api";

interface Stats {
  totalEmbeddings: number;
  totalSources: number;
  byType: { _id: string; count: number; totalChunks: number }[];
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [user, setUser] = useState<{ name?: string } | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) setUser(JSON.parse(userData));

    trainingApi
      .getStats()
      .then(({ data }) => setStats(data.data))
      .catch(() => {});

    chatApi
      .getSessions()
      .then(({ data }) => setSessionCount(data.data?.length || 0))
      .catch(() => {});
  }, []);

  const getTypeCount = (type: string) =>
    stats?.byType?.find((t) => t._id === type)?.count || 0;
  const getTypeChunks = (type: string) =>
    stats?.byType?.find((t) => t._id === type)?.totalChunks || 0;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-foreground">
          Welcome back, <span className="gradient-text">{user?.name || "there"}</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s an overview of your RAG chatbot&apos;s knowledge base.
        </p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
      >
        <motion.div variants={item} className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">Total Embeddings</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Database className="w-4 h-4 text-blue-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground">
            {stats?.totalEmbeddings?.toLocaleString() || "0"}
          </p>
          <p className="text-xs text-muted-foreground">vector chunks stored</p>
        </motion.div>

        <motion.div variants={item} className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">Data Sources</span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-purple-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground">
            {stats?.totalSources || 0}
          </p>
          <p className="text-xs text-muted-foreground">files, URLs &amp; Q&amp;As</p>
        </motion.div>

        <motion.div variants={item} className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">Chat Sessions</span>
            <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-green-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground">{sessionCount}</p>
          <p className="text-xs text-muted-foreground">conversations</p>
        </motion.div>

        <motion.div variants={item} className="stat-card pulse-glow">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">Bot Status</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <p className="text-xl font-bold text-emerald-400">
            {(stats?.totalEmbeddings || 0) > 0 ? "Ready" : "Not Trained"}
          </p>
          <p className="text-xs text-muted-foreground">
            {(stats?.totalEmbeddings || 0) > 0
              ? "accepting queries"
              : "upload data to start"}
          </p>
        </motion.div>
      </motion.div>

      {/* Training Breakdown + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Training Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 glass-card p-6"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            Knowledge Base Breakdown
          </h2>

          <div className="space-y-4">
            {[
              {
                label: "PDF Documents",
                icon: FileText,
                count: getTypeCount("pdf"),
                chunks: getTypeChunks("pdf"),
                color: "text-red-400",
                bg: "bg-red-500/10",
                bar: "bg-red-500",
              },
              {
                label: "Web URLs",
                icon: Globe,
                count: getTypeCount("url"),
                chunks: getTypeChunks("url"),
                color: "text-green-400",
                bg: "bg-green-500/10",
                bar: "bg-green-500",
              },
              {
                label: "Q&A Pairs",
                icon: HelpCircle,
                count: getTypeCount("qna"),
                chunks: getTypeChunks("qna"),
                color: "text-yellow-400",
                bg: "bg-yellow-500/10",
                bar: "bg-yellow-500",
              },
              {
                label: "Text / DOCX",
                icon: FileText,
                count: getTypeCount("txt") + getTypeCount("docx"),
                chunks: getTypeChunks("txt") + getTypeChunks("docx"),
                color: "text-blue-400",
                bg: "bg-blue-500/10",
                bar: "bg-blue-500",
              },
            ].map((item) => {
              const totalChunks = stats?.totalEmbeddings || 1;
              const pct = Math.round((item.chunks / totalChunks) * 100) || 0;
              return (
                <div key={item.label} className="flex items-center gap-4">
                  <div
                    className={`w-9 h-9 rounded-lg ${item.bg} flex items-center justify-center flex-shrink-0`}
                  >
                    <item.icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">
                        {item.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {item.count} sources · {item.chunks} chunks
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/[0.06]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: 0.5 }}
                        className={`h-full rounded-full ${item.bar}`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-6"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Quick Actions
          </h2>
          <div className="space-y-3">
            <Link href="/dashboard/training" className="block">
              <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.04] transition-colors group cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    Train Your Bot
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Upload files, URLs, or Q&amp;A
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </Link>

            <Link href="/dashboard/chat" className="block">
              <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.04] transition-colors group cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    Start Chatting
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Ask your trained AI questions
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
