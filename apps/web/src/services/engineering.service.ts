import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface Tribe {
  id: string;
  name: string;
  organizationId: string;
  clusters?: Cluster[];
  createdAt: string;
  updatedAt: string;
}

export interface Cluster {
  id: string;
  name: string;
  tribeId: string;
  squads?: Squad[];
  createdAt: string;
  updatedAt: string;
}

export interface Squad {
  id: string;
  name: string;
  clusterId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMembership {
  id: string;
  employeeId: string;
  squadId: string;
  role: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTribeRequest {
  name: string;
  organizationId: string;
}

export interface CreateClusterRequest {
  name: string;
  tribeId: string;
}

export interface CreateSquadRequest {
  name: string;
  clusterId: string;
}

export function useTribes() {
  return useQuery({
    queryKey: ["tribes"],
    queryFn: () => apiClient<Tribe[]>("/engineering/tribes"),
  });
}

export function useTribe(id: string) {
  return useQuery({
    queryKey: ["tribes", id],
    queryFn: () => apiClient<Tribe>(`/engineering/tribes/${id}`),
    enabled: !!id,
  });
}

export function useClusters(tribeId: string) {
  return useQuery({
    queryKey: ["clusters", tribeId],
    queryFn: () =>
      apiClient<Cluster[]>("/engineering/clusters", {
        params: { tribeId },
      }),
    enabled: !!tribeId,
  });
}

export function useSquads(clusterId: string) {
  return useQuery({
    queryKey: ["squads", clusterId],
    queryFn: () =>
      apiClient<Squad[]>("/engineering/squads", {
        params: { clusterId },
      }),
    enabled: !!clusterId,
  });
}

export function useTeamMemberships(squadId: string) {
  return useQuery({
    queryKey: ["team-memberships", squadId],
    queryFn: () =>
      apiClient<TeamMembership[]>("/engineering/memberships", {
        params: { squadId },
      }),
    enabled: !!squadId,
  });
}

export function useCreateTribe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTribeRequest) =>
      apiClient<Tribe>("/engineering/tribes", {
        method: "POST",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tribes"] });
    },
  });
}

export function useCreateCluster() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateClusterRequest) =>
      apiClient<Cluster>("/engineering/clusters", {
        method: "POST",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clusters"] });
    },
  });
}

export function useCreateSquad() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSquadRequest) =>
      apiClient<Squad>("/engineering/squads", {
        method: "POST",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["squads"] });
    },
  });
}
