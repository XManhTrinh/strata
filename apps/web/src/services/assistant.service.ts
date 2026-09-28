import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface AssistantMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  message: string;
  history: AssistantMessage[];
}

export interface ChatResponse {
  reply: string;
  toolsUsed: string[];
}

/**
 * Sends a message to the read-only AI assistant for the given company.
 * The server holds the LLM credentials and enforces the caller's permissions;
 * the client only ships the message and prior conversation.
 */
export function useAssistantChat(companyId: string) {
  return useMutation({
    mutationFn: (input: ChatRequest) =>
      apiClient<ChatResponse>(`/companies/${companyId}/assistant/chat`, {
        method: "POST",
        body: input,
      }),
  });
}
