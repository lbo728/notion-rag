"use client";

import { useState } from "react";

interface Citation {
  title: string;
  url: string;
  snippet: string;
  relevance_score: number;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    const userMessage: Message = { role: "user", content: query };
    setMessages((prev) => [...prev, userMessage]);
    setQuery("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();
      const assistantMessage: Message = {
        role: "assistant",
        content: data.content,
        citations: data.citations,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Notion RAG Chatbot</h1>
          <p className="text-sm text-gray-600">
            Personal knowledge archive with Notion integration
          </p>
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

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`rounded-lg p-4 ${
                msg.role === "user"
                  ? "ml-auto max-w-[80%] bg-blue-100"
                  : "mr-auto max-w-[90%] bg-gray-100"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-3 border-t pt-3">
                  <p className="mb-2 text-xs font-semibold">Sources:</p>
                  <ul className="space-y-1">
                    {msg.citations.map((cite, i) => (
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
          ))}

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
          <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
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
      </footer>
    </main>
  );
}
