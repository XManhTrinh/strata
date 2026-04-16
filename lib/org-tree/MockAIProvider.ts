import { AIProvider, ChatMessage, Person } from "./types";

export class MockAIProvider implements AIProvider {
  async chat(
    messages: ChatMessage[],
    context: { persons: Person[] }
  ): Promise<string> {
    const { persons } = context;
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== "user") {
      return "I can help you find people in your org. Try asking about a squad, title, or reporting structure.";
    }

    const query = lastMessage.content.toLowerCase();

    // Find people by squad
    const squadMatch = persons.filter((p) =>
      p.squads.some((s) => query.includes(s.toLowerCase()))
    );
    if (squadMatch.length > 0) {
      const names = squadMatch.map((p) => `• ${p.fullName} (${p.title})`).join("\n");
      return `People in that squad:\n${names}`;
    }

    // Find people by title keyword
    const titleKeywords = ["designer", "engineer", "manager", "lead", "director", "cto", "ceo", "vp", "analyst", "developer", "product"];
    const matchedTitle = titleKeywords.find((kw) => query.includes(kw));
    if (matchedTitle) {
      const matches = persons.filter((p) =>
        p.title.toLowerCase().includes(matchedTitle)
      );
      if (matches.length > 0) {
        const names = matches.map((p) => `• ${p.fullName} (${p.title})`).join("\n");
        return `People with "${matchedTitle}" in their title:\n${names}`;
      }
    }

    // Find reporting structure
    if (query.includes("report") || query.includes("who reports") || query.includes("children") || query.includes("direct")) {
      // Try to find a person mentioned by name
      const mentioned = persons.find((p) =>
        query.includes(p.fullName.toLowerCase())
      );
      if (mentioned) {
        const reports = persons.filter((p) => p.parentId === mentioned.id);
        if (reports.length === 0) {
          return `${mentioned.fullName} has no direct reports.`;
        }
        const names = reports.map((p) => `• ${p.fullName} (${p.title})`).join("\n");
        return `${mentioned.fullName}'s direct reports:\n${names}`;
      }
    }

    // Find person by name
    const namedPerson = persons.find((p) =>
      query.includes(p.fullName.toLowerCase())
    );
    if (namedPerson) {
      const manager = namedPerson.parentId
        ? persons.find((p) => p.id === namedPerson.parentId)
        : null;
      const reports = persons.filter((p) => p.parentId === namedPerson.id);
      const squadStr =
        namedPerson.squads.length > 0
          ? `Squads: ${namedPerson.squads.join(", ")}`
          : "No squad memberships.";
      const managerStr = manager
        ? `Reports to: ${manager.fullName} (${manager.title})`
        : "No manager (root or unallocated).";
      const reportsStr =
        reports.length > 0
          ? `Direct reports: ${reports.map((r) => r.fullName).join(", ")}`
          : "No direct reports.";
      return `${namedPerson.fullName}\nTitle: ${namedPerson.title}\n${squadStr}\n${managerStr}\n${reportsStr}`;
    }

    // List all people
    if (query.includes("everyone") || query.includes("all people") || query.includes("list")) {
      const names = persons.map((p) => `• ${p.fullName} (${p.title})`).join("\n");
      return `Here are all ${persons.length} people in the org:\n${names}`;
    }

    return `I can help you find people in your org. Try asking:\n• "Who is in the Platform squad?"\n• "Show me all engineers"\n• "Who reports to [name]?"\n• "Tell me about [name]"`;
  }
}
