import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface LeaveTypeConfig {
  id: string;
  name: string;
  color: string;
  defaultAllocation: number;
  requiresApproval: boolean;
}

export interface LeaveBalance {
  id: string;
  userId: string;
  leaveTypeId: string;
  year: number;
  allocated: number;
  used: number;
  adjustment: number;
  carriedOver: number;
  leaveType?: LeaveTypeConfig;
}

export interface CalendarLeaveRequest {
  id: string;
  calendarEventId: string;
  leaveTypeId: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  workingDays: number;
  reviewerId: string | null;
  reviewNotes: string | null;
  calendarEvent?: import("./calendar.service").CalendarEvent;
  leaveType?: LeaveTypeConfig;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeaveRequestData {
  companyId: string;
  calendarEventId: string;
  leaveTypeId: string;
  workingDays: number;
}

export interface UpdateLeaveRequestData {
  id: string;
  companyId: string;
  status?: CalendarLeaveRequest["status"];
  reviewerId?: string | null;
  reviewNotes?: string | null;
}

export function useLeaveRequests(companyId: string) {
  return useQuery({
    queryKey: ["leave-requests", companyId],
    queryFn: () =>
      apiClient<CalendarLeaveRequest[]>(`/api/v2/companies/${companyId}/calendar/leave-requests`),
    enabled: !!companyId,
  });
}

export function useLeaveBalances(companyId: string, userId: string) {
  return useQuery({
    queryKey: ["leave-balances", companyId, userId],
    queryFn: () =>
      apiClient<LeaveBalance[]>(`/api/v2/companies/${companyId}/calendar/balances/${userId}`),
    enabled: !!companyId && !!userId,
  });
}

export function useCreateLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLeaveRequestData) =>
      apiClient<CalendarLeaveRequest>(`/api/v2/companies/${data.companyId}/calendar/leave-requests`, {
        method: "POST",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["leave-balances"] });
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
    },
  });
}

export function useUpdateLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, companyId, ...data }: UpdateLeaveRequestData) =>
      apiClient<CalendarLeaveRequest>(`/api/v2/companies/${companyId}/calendar/leave-requests/${id}`, {
        method: "PUT",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["leave-balances"] });
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
    },
  });
}
