"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Bot,
  User,
  Sparkles,
  Plus,
  MessageCircle,
  Trash2,
  ChevronDown,
  BookOpen,
} from "lucide-react";
import { chatApi } from "@/lib/api";
import { io, Socket } from "socket.io-client";
import ReactMarkdown from "react-markdown";

interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  sources?: { chunk: string; score: number; sourceType: string; sourceName: string }[];
  confidence?: number;
  timestamp?: string;
}

interface ChatSession {
  _id: string;
  title: string;
  messageCount: number;
  updatedAt: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [showSources, setShowSources] = useState<string | null>(null);
  const [showSidebar] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // Load sessions
  useEffect(() => {
    chatApi
      .getSessions()
      .then(({ data }) => setSessions(data.data || []))
      .catch(() => {});
  }, []);

  // Socket connection
  useEffect(() => {
    const socket = io(API_URL.replace("/api", ""));
    socketRef.current = socket;

    socket.on("connect", () => {
      if (sessionId) {
        socket.emit("joinSession", { sessionId });
      }
    });

    socket.on("botTyping", ({ isTyping: typing }) => {
      setIsTyping(typing);
    });

    socket.on("botMessage", (data) => {
      setIsTyping(false);
      setIsLoading(false);
      setMessages((prev) => [
        ...prev,
        {
          id: data.id,
          role: "assistant",
          content: data.content,
          sources: data.sources,
          confidence: data.confidence,
          timestamp: data.timestamp,
        },
      ]);
    });

    socket.on("sessionCreated", ({ sessionId: newId, title }) => {
      setSessionId(newId);
      setSessions((prev) => [
        { _id: newId, title, messageCount: 0, updatedAt: new Date().toISOString() },
        ...prev,
      ]);
      socket.emit("joinSession", { sessionId: newId });
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Send message
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput("");
    setIsLoading(true);

    // Add user message
    setMessages((prev) => [
      ...prev,
      { role: "user", content: text, timestamp: new Date().toISOString() },
    ]);

    // Use REST API for reliability
    try {
      const { data } = await chatApi.query(text, sessionId || undefined);
      const result = data.data;

      if (!sessionId && result.sessionId) {
        setSessionId(result.sessionId);
        setSessions((prev) => {
          const exists = prev.find((s) => s._id === result.sessionId);
          if (exists) return prev;
          return [
            {
              _id: result.sessionId,
              title: text.substring(0, 60),
              messageCount: 2,
              updatedAt: new Date().toISOString(),
            },
            ...prev,
          ];
        });
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: result.response,
          sources: result.sources,
          confidence: result.confidence,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  // Load session messages
  const loadSession = async (session: ChatSession) => {
    setSessionId(session._id);
    try {
      const { data } = await chatApi.getSessionMessages(session._id);
      setMessages(
        data.data.messages.map((m: { _id: string; role: string; content: string; sources?: ChatMessage['sources']; confidence?: number; createdAt: string }) => ({
          id: m._id,
          role: m.role,
          content: m.content,
          sources: m.sources,
          confidence: m.confidence,
          timestamp: m.createdAt,
        }))
      );
    } catch {
      setMessages([]);
    }
  };

  // New chat
  const newChat = () => {
    setSessionId(null);
    setMessages([]);
    inputRef.current?.focus();
  };

  // Delete session
  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await chatApi.deleteSession(id);
      setSessions((prev) => prev.filter((s) => s._id !== id));
      if (sessionId === id) newChat();
    } catch {}
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="h-full flex">
      {/* Chat History Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-r border-white/[0.06] flex flex-col bg-sidebar overflow-hidden"
          >
            <div className="p-3">
              <button
                onClick={newChat}
                className="btn-gradient w-full flex items-center justify-center gap-2 py-2.5"
              >
                <Plus className="w-4 h-4" />
                New Chat
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-2">
              {sessions.length === 0 ? (
                <p className="text-center text-muted-foreground/50 text-xs py-8">
                  No conversations yet
                </p>
              ) : (
                sessions.map((session) => (
                  <button
                    key={session._id}
                    onClick={() => loadSession(session)}
                    className={`w-full text-left p-3 rounded-xl mb-1 transition-colors group flex items-center gap-2 ${
                      sessionId === session._id
                        ? "bg-blue-500/10 text-blue-400"
                        : "hover:bg-white/[0.04] text-muted-foreground"
                    }`}
                  >
                    <MessageCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 text-sm truncate">
                      {session.title}
                    </span>
                    <button
                      onClick={(e) => deleteSession(session._id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/10 rounded transition-all"
                    >
                      <Trash2 className="w-3 h-3 text-red-400" />
                    </button>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center max-w-md"
              >
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="w-9 h-9 text-blue-400" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Chat with your data
                </h2>
                <p className="text-muted-foreground text-sm">
                  Ask questions about the documents, URLs, and Q&amp;A pairs
                  you&apos;ve trained the bot with.
                </p>
              </motion.div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className={`max-w-[80%] ${msg.role === "user" ? "order-first" : ""}`}>
                    <div
                      className={
                        msg.role === "user"
                          ? "chat-bubble-user"
                          : "chat-bubble-bot"
                      }
                    >
                      {msg.role === "assistant" ? (
                        <div className="prose prose-invert prose-sm max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:mb-2 [&>ol]:mb-2">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p>{msg.content}</p>
                      )}
                    </div>

                    {/* Source citations */}
                    {msg.role === "assistant" &&
                      msg.sources &&
                      msg.sources.length > 0 && (
                        <div className="mt-2">
                          <button
                            onClick={() =>
                              setShowSources(
                                showSources === `msg-${i}` ? null : `msg-${i}`
                              )
                            }
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <BookOpen className="w-3 h-3" />
                            <span>
                              {msg.sources.length} source
                              {msg.sources.length > 1 ? "s" : ""} · 
                              {msg.confidence
                                ? ` ${Math.round(msg.confidence * 100)}% confidence`
                                : ""}
                            </span>
                            <ChevronDown
                              className={`w-3 h-3 transition-transform ${
                                showSources === `msg-${i}` ? "rotate-180" : ""
                              }`}
                            />
                          </button>

                          <AnimatePresence>
                            {showSources === `msg-${i}` && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-2 space-y-2 overflow-hidden"
                              >
                                {msg.sources.map((source, j) => (
                                  <div
                                    key={j}
                                    className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.04] text-xs"
                                  >
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-blue-400 font-medium">
                                        [{source.sourceType}]
                                      </span>
                                      <span className="text-muted-foreground">
                                        {source.sourceName}
                                      </span>
                                      <span className="ml-auto text-emerald-400">
                                        {Math.round(source.score * 100)}%
                                      </span>
                                    </div>
                                    <p className="text-muted-foreground/80 leading-relaxed">
                                      {source.chunk}
                                    </p>
                                  </div>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <User className="w-4 h-4 text-foreground" />
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Typing indicator */}
              {(isLoading || isTyping) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="chat-bubble-bot flex items-center gap-1.5 py-4">
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                  </div>
                </motion.div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-white/[0.06] bg-background/80 backdrop-blur-xl">
          <div className="max-w-3xl mx-auto flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask something about your trained data..."
                rows={1}
                className="input-field pr-4 resize-none min-h-[48px] max-h-[120px]"
                style={{ height: "48px" }}
                disabled={isLoading}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="btn-gradient p-3 rounded-xl disabled:opacity-40 flex-shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
