"use client";

import { ChatMessage, Citation } from "@/app/types/chat";
import { useChat } from "@/app/hooks/use-chat";
import { useState } from "react";
import { SyncTrigger } from "@/app/components/sync/SyncTrigger";
import { SyncStatus } from "@/app/components/sync/SyncStatus";

export default function Home() {
  const [query, setQuery] = useState("");
  const {
    messages,
    citations,
    loading,
    sessionId,
    sendMessage,
    clearMessages,
  } = useChat();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setQuery("");
    await sendMessage(query);
  };

  // Merge citations with messages
  const messagesWithCitations = messages.map((msg, idx) => {
    if (msg.role === "assistant" && idx === messages.length - 1) {
      return { ...msg, citations };
    }
    return msg;
  });

  return (
    <main className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Notion RAG Chatbot</h1>
              <p className="text-sm text-gray-600">
                Personal knowledge archive with Notion integration
              </p>
            </div>
            <div className="flex items-center gap-4">
              {sessionId && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    Session: {sessionId.slice(0, 8)}...
                  </span>
                  <button
                    onClick={clearMessages}
                    className="rounded px-3 py-1 text-xs text-gray-600 hover:bg-gray-100"
                  >
                    New Chat
                  </button>
                </div>
              )}
              <div className="border-l pl-4">
                <SyncTrigger />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Messages */}
      <div className="container mx-auto flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-4">
          {messages.length === 0 && (
            <div className="mt-20 text-center text-gray-500">
              <p className="text-lg">
                Start a conversation by asking a question about your Notion
                workspace.
              </p>
            </div>
          )}

          {messagesWithCitations.map((msg, idx) => {
            const citationsForMessage =
              msg.role === "assistant" && idx === messages.length - 1
                ? citations
                : undefined;

            return (
              <div
                key={idx}
                className={`rounded-lg p-4 ${
                  msg.role === "user"
                    ? "ml-auto max-w-[80%] bg-blue-100"
                    : "mr-auto max-w-[90%] bg-gray-100"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {citationsForMessage && citationsForMessage.length > 0 && (
                  <div className="mt-3 border-t pt-3">
                    <p className="mb-2 text-xs font-semibold">Sources:</p>
                    <ul className="space-y-1">
                      {citationsForMessage.map((cite, i) => (
                        <li key={i} className="text-xs">
                          <a
                            href={cite.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            • {cite.title}
                          </a>
                          <span className="ml-2 text-gray-500">
                            (relevance: {cite.relevance_score.toFixed(2)})
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="max-w-[90%] rounded-lg bg-gray-100 p-4">
              <p className="text-gray-600">Thinking...</p>
            </div>
          )}
        </div>
      </div>

      {/* Input Form */}
      <footer className="border-t bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="mx-auto max-w-3xl space-y-2">
            <SyncStatus />
            <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask a question about your Notion workspace..."
                className="flex-1 rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </form>
          </div>
        </div>
      </footer>
    </main>
  );
}
