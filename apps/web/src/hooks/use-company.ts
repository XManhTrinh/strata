"use client";

import { createContext, useContext } from "react";

interface CompanyContextValue {
  companyId: string;
  companyName: string;
  isLoading: boolean;
}

export const CompanyContext = createContext<CompanyContextValue>({
  companyId: "",
  companyName: "",
  isLoading: true,
});

/**
 * Returns the current user's active workspace ID.
 * Must be used within a CompanyProvider.
 */
export function useCompanyId(): string {
  const { companyId } = useContext(CompanyContext);
  return companyId;
}

/**
 * Returns the full company context (id, name, loading state).
 */
export function useCompany(): CompanyContextValue {
  return useContext(CompanyContext);
}
