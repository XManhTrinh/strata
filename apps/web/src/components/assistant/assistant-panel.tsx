"use client";

import { useEffect, useRef, useState } from "react";
import { IconButton, TextField } from "@vkieu/mui";
import { Icon } from "@/components/ui/icon";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { useCompanyId } from "@/hooks/use-company";
import { useAssistantChat, type AssistantMessage } from "@/services";

interface ChatMessage extends AssistantMessage {
  id: string;
  error?: boolean;
}

let idSeq = 0;
const nextId = () => `m${++idSeq}`;

/**
 * Floating, read-only AI assistant. A launcher button toggles a chat panel.
 * The panel keeps local conversation state and posts to the assistant endpoint;
 * all permission enforcement and LLM access happen server-side.
 */
export function AssistantPanel() {
  const companyId = useCompanyId();
  const chat = useAssistantChat(companyId);

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep the transcript scrolled to the latest message.
  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open, chat.isPending]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = () => {
    const text = input.trim();
    if (!text || chat.isPending) return;

    if (!companyId) {
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "user", content: text },
        {
          id: nextId(),
          role: "assistant",
          content: "Your workspace is still loading — please try again in a moment.",
          error: true,
        },
      ]);
      setInput("");
      return;
    }

    const userMsg: ChatMessage = { id: nextId(), role: "user", content: text };
    const history: AssistantMessage[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    chat.mutate(
      { message: text, history },
      {
        onSuccess: (res) => {
          setMessages((prev) => [
            ...prev,
            { id: nextId(), role: "assistant", content: res.reply },
          ]);
        },
        onError: (err) => {
          setMessages((prev) => [
            ...prev,
            {
              id: nextId(),
              role: "assistant",
              content: err.message || "Something went wrong. Please try again.",
              error: true,
            },
          ]);
        },
      },
    );
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {/* Launcher */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open assistant"
          className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-on-primary shadow-lg hover:shadow-xl transition-shadow"
        >
          <Icon name="smart_toy" size={24} />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div
          className="fixed bottom-6 right-6 z-40 flex flex-col w-[min(24rem,calc(100vw-3rem))] h-[min(32rem,calc(100vh-6rem))] rounded-2xl bg-surface-container-high border border-outline-variant shadow-2xl overflow-hidden"
          role="dialog"
          aria-label="Strata assistant"
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-outline-variant bg-surface-container">
            <Icon name="smart_toy" size={20} className="text-primary" />
            <Typography variant="title-small" className="flex-1">
              Assistant
            </Typography>
            <IconButton
              variant="standard"
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              icon={<Icon name="close" size={20} />}
            />
          </div>

          {/* Transcript */}
          <div
            ref={scrollRef}
            role="log"
            aria-live="polite"
            aria-label="Conversation"
            className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3"
          >
            {messages.length === 0 && (
              <div className="text-center py-8">
                <Typography variant="body-medium" color="surface-variant-foreground">
                  Ask about your rate cards, people, or org — for example,
                  &ldquo;how many people are in the UK?&rdquo;
                </Typography>
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "flex",
                  m.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-[14px] whitespace-pre-wrap wrap-break-word",
                    m.role === "user"
                      ? "bg-primary text-on-primary"
                      : m.error
                        ? "bg-error-container text-on-error-container"
                        : "bg-surface-container-highest text-surface-foreground",
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {chat.isPending && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-3 py-2 bg-surface-container-highest text-surface-variant-foreground text-[14px]">
                  Thinking…
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="flex items-end gap-2 px-3 py-3 border-t border-outline-variant bg-surface-container">
            <div className="flex-1">
              <TextField
                ref={inputRef}
                variant="outlined"
                label="Message"
                className="w-full"
                value={input}
                onChange={(value) => setInput(value)}
                onKeyDown={onKeyDown}
                disabled={chat.isPending}
              />
            </div>
            <IconButton
              icon={<Icon name="send" />}
              type="button"
              onClick={send}
              disabled={chat.isPending || !input.trim()}
              aria-label="Send message"
            />
          </div>
        </div>
      )}
    </>
  );
}
