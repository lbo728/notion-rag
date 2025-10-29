"use client";

import { useState, useCallback } from "react";
import {
  ChatMessage,
  Citation,
  ChatApiRequest,
  ChatApiResponse,
} from "@/app/types/chat";

export interface UseChatOptions {
  onError?: (error: Error) => void;
  onSuccess?: (response: ChatApiResponse) => void;
}

export function useChat(options: UseChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [sessionId, setSessionId] = useState<string | undefined>();

  const sendMessage = useCallback(
    async (query: string) => {
      if (!query.trim() || loading) return;

      const userMessage: ChatMessage = {
        role: "user",
        content: query,
      };

      setMessages((prev) => [...prev, userMessage]);
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query,
            session_id: sessionId,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to get response: ${response.statusText}`);
        }

        const data: ChatApiResponse = await response.json();

        // Update session_id if provided
        if (data.metadata?.session_id && !sessionId) {
          setSessionId(data.metadata.session_id);
        }

        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: data.content,
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setCitations(data.citations);

        if (options.onSuccess) {
          options.onSuccess(data);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "I'm sorry, I encountered an error. Please try again.",
          },
        ]);

        if (options.onError) {
          options.onError(error);
        }
      } finally {
        setLoading(false);
      }
    },
    [loading, options, sessionId]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setCitations([]);
    setError(null);
    setSessionId(undefined);
  }, []);

  return {
    messages,
    citations,
    loading,
    error,
    sessionId,
    sendMessage,
    clearMessages,
  };
}
