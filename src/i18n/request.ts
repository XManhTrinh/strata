import { getRequestConfig } from "next-intl/server";
import messages from "@/messages/en.json";

// English is the only locale for now; every string still goes through next-intl so more
// languages can be added without touching screens.
export default getRequestConfig(async () => ({
  locale: "en",
  messages,
}));
