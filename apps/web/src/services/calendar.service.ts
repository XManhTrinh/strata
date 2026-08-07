import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface EventType {
  id: string;
  name: string;
  color: string;
  icon: string | null;
}

export interface CalendarEvent {
  id: string;
  companyId: string;
  ownerUserId: string;
  eventTypeId: string;
  title: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  visibility: "PERSONAL" | "SHARED";
  notes: string | null;
  isRecurring: boolean;
  eventType?: EventType;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEventsParams {
  startDate?: string;
  endDate?: string;
  eventTypeId?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateCalendarEventRequest {
  companyId: string;
  eventTypeId: string;
  title: string;
  startDate: string;
  endDate: string;
  allDay?: boolean;
  visibility?: CalendarEvent["visibility"];
  notes?: string | null;
  isRecurring?: boolean;
}

export interface UpdateCalendarEventRequest
  extends Partial<Omit<CreateCalendarEventRequest, "companyId">> {
  id: string;
  companyId: string;
}

export function useCalendarEvents(
  companyId: string,
  params?: CalendarEventsParams
) {
  return useQuery({
    queryKey: ["calendar-events", companyId, params],
    queryFn: () =>
      apiClient<CalendarEvent[]>(`/api/v2/companies/${companyId}/calendar/events`, {
        params: {
          startDate: params?.startDate,
          endDate: params?.endDate,
          eventTypeId: params?.eventTypeId,
          page: params?.page,
          pageSize: params?.pageSize,
        },
      }),
    enabled: !!companyId,
  });
}

export function useCreateCalendarEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCalendarEventRequest) =>
      apiClient<CalendarEvent>(`/api/v2/companies/${data.companyId}/calendar/events`, {
        method: "POST",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    },
  });
}

export function useUpdateCalendarEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, companyId, ...data }: UpdateCalendarEventRequest) =>
      apiClient<CalendarEvent>(`/api/v2/companies/${companyId}/calendar/events/${id}`, {
        method: "PUT",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    },
  });
}

export function useDeleteCalendarEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, id }: { companyId: string; id: string }) =>
      apiClient<void>(`/api/v2/companies/${companyId}/calendar/events/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    },
  });
}
