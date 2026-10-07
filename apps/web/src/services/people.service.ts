import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MemberRole {
  id: string;
  name: string;
}

export interface Person {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  address: string | null;
  dateOfBirth: string;
  userId: string;
  membershipId: string;
  isSuperAdmin: boolean;
  orgUnitId: string | null;
  orgUnitName: string | null;
  orgPath: { type: string; name: string }[];
  positionId: string | null;
  positionName: string | null;
  roles: MemberRole[];
  employmentType: string | null;
  annualSalary: number | null;
  dayRate: number | null;
  annualCost: number | null;
  metadata: Record<string, string>;
  createdAt: string;
}

export interface CreatePersonRequest {
  fullName: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  dateOfBirth?: string;
  roleId?: string;
  metadata?: Record<string, string>;
}

export interface UpdatePersonRequest {
  id: string;
  fullName?: string;
  email?: string;
  phone?: string | null;
  address?: string | null;
  dateOfBirth?: string;
  metadata?: Record<string, string>;
}

export interface ImportMemberRow {
  fullName: string;
  email?: string;
  orgStructure?: string;
  orgLevelTypes?: string[]; // ["Division", "Tribe", "Squad"] — type name per level
  orgLevelIcons?: string[]; // ["domain", "hub", "lan"] — icon per level
  orgLevelColors?: string[]; // ["#6366F1", "#14B8A6", "#F59E0B"] — color per level
  position?: string;
  grade?: string;
  lineManagerEmail?: string; // kept for backward compat
  lineManagerIdentifier?: string; // raw value from CSV (email, UIN, name, etc.)
  lineManagerMatchField?: string; // "email" | "fullName" | any metadata key
  employmentType?: string;
  annualSalary?: string;
  dayRate?: string;
  roleId?: string;
  metadata?: Record<string, string>;
}

export interface ImportResult {
  total: number;
  created: number;
  updated: number;
  errors: { status: string; email: string; error?: string }[];
}

export interface TableView {
  id: string;
  companyId: string;
  name: string;
  table: string;
  columns: string[];
  isDefault: boolean;
}

export interface PeopleParams {
  companyId: string;
  page?: number;
  pageSize?: number;
  search?: string;
}

// ─── Members ──────────────────────────────────────────────────────────────────

export function usePeople(params: PeopleParams) {
  return useQuery({
    queryKey: ["members", params.companyId, params],
    queryFn: () =>
      apiClient<PaginatedResponse<Person>>(
        `/companies/${params.companyId}/members`,
        {
          params: {
            page: params.page,
            pageSize: params.pageSize,
            search: params.search,
          },
        },
      ),
    enabled: !!params.companyId,
  });
}

export function usePerson(companyId: string, id: string) {
  return useQuery({
    queryKey: ["members", companyId, id],
    queryFn: () =>
      apiClient<Person>(`/companies/${companyId}/members/${id}`),
    enabled: !!companyId && !!id,
  });
}

export function useMetadataKeys(companyId: string) {
  return useQuery({
    queryKey: ["members", companyId, "metadata-keys"],
    queryFn: () =>
      apiClient<string[]>(`/companies/${companyId}/members/metadata-keys`),
    enabled: !!companyId,
  });
}

export function useCreatePerson(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePersonRequest) =>
      apiClient<Person>(`/companies/${companyId}/members`, {
        method: "POST",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", companyId] });
    },
  });
}

export function useUpdatePerson(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdatePersonRequest) =>
      apiClient<Person>(`/companies/${companyId}/members/${id}`, {
        method: "PUT",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", companyId] });
    },
  });
}

export function useDeletePerson(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<void>(`/companies/${companyId}/members/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", companyId] });
    },
  });
}

export function useDeleteAllMembers(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient<{ removed: number }>(`/companies/${companyId}/members/all`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", companyId] });
    },
  });
}

export function useBulkImport(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rows: ImportMemberRow[]) =>
      apiClient<ImportResult>(`/companies/${companyId}/members/import`, {
        method: "POST",
        body: { rows },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", companyId] });
    },
  });
}

// ─── Background import + progress ──────────────────────────────────────────────

/** Returned when an import job is started. */
export interface ImportJobStart {
  jobId: string;
  total: number;
}

/** Live progress for a running/finished import job. */
export interface ImportJobProgress {
  jobId: string;
  companyId: string;
  total: number;
  processed: number;
  status: "running" | "completed" | "failed" | "unknown";
  created: number;
  updated: number;
  errorCount: number;
  startedAt: number;
  updatedAt: number;
}

/**
 * Start a background import. Returns a jobId immediately; the server processes
 * rows in the background and reports progress via fetchImportProgress. Uses the
 * plain apiClient (not a hook) so it survives the dialog unmounting.
 */
export function startMemberImport(
  companyId: string,
  rows: ImportMemberRow[],
): Promise<ImportJobStart> {
  return apiClient<ImportJobStart>(`/companies/${companyId}/members/import`, {
    method: "POST",
    body: { rows },
  });
}

/** Poll a single import job's progress. */
export function fetchImportProgress(
  companyId: string,
  jobId: string,
): Promise<ImportJobProgress> {
  return apiClient<ImportJobProgress>(
    `/companies/${companyId}/members/import/${jobId}/progress`,
  );
}

export function useAssignRole(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ personId, roleId }: { personId: string; roleId: string }) =>
      apiClient<Person>(
        `/companies/${companyId}/members/${personId}/roles/${roleId}`,
        { method: "POST" },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", companyId] });
    },
  });
}

export function useRemoveRole(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ personId, roleId }: { personId: string; roleId: string }) =>
      apiClient<Person>(
        `/companies/${companyId}/members/${personId}/roles/${roleId}`,
        { method: "DELETE" },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", companyId] });
    },
  });
}

// ─── Table Views ──────────────────────────────────────────────────────────────

export function useTableViews(companyId: string, table: string = "members") {
  return useQuery({
    queryKey: ["table-views", companyId, table],
    queryFn: () =>
      apiClient<TableView[]>(`/companies/${companyId}/table-views/${table}`),
    enabled: !!companyId,
  });
}

export function useCreateTableView(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; table: string; columns: string[]; isDefault?: boolean }) =>
      apiClient<TableView>(`/companies/${companyId}/table-views`, {
        method: "POST",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["table-views", companyId] });
    },
  });
}

export function useDeleteTableView(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<void>(`/companies/${companyId}/table-views/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["table-views", companyId] });
    },
  });
}
