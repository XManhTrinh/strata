"use client";

import { useState, useCallback } from "react";
import { AIProvider, ChatMessage, Person } from "./types";

interface UseAIChatReturn {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  sendMessage: (text: string) => Promise<void>;
}

export function useAIChat(
  provider: AIProvider,
  persons: Person[]
): UseAIChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      if (text.trim() === "") return;

      const userMessage: ChatMessage = { role: "user", content: text };
      const nextMessages = [...messages, userMessage];

      setMessages(nextMessages);
      setLoading(true);
      setError(null);

      try {
        const response = await provider.chat(nextMessages, { persons });
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: response },
        ]);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to get a response."
        );
      } finally {
        setLoading(false);
      }
    },
    [messages, provider, persons]
  );

  return { messages, loading, error, sendMessage };
}
