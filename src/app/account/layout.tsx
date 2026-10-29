import type { ReactNode } from "react";
import { AccountShell } from "@/features/account/components/account-shell";

export default function AccountLayout({ children }: { children: ReactNode }) {
  return <AccountShell>{children}</AccountShell>;
}
