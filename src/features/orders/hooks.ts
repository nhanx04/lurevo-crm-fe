import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listingApi, orderApi, shopApi, statusApi } from "@/api/services";
import { queryKeys } from "@/api/queryKeys";
import type { OrderParams } from "@/types/api";

export function useOrders(params: OrderParams) {
  return useQuery({
    queryKey: queryKeys.orders.list(params),
    queryFn: () => orderApi.list(params),
  });
}

export function useOrder(orderId: string) {
  return useQuery({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: () => orderApi.detail(orderId),
    enabled: Boolean(orderId),
  });
}

export function useRefreshOrder(orderId: string) {
  const queryClient = useQueryClient();
  return useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.readiness(orderId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.labels(orderId) }),
      queryClient.invalidateQueries({ queryKey: ["orders"] }),
    ]);
  }, [orderId, queryClient]);
}

export function useOrderReadiness(orderId: string) {
  return useQuery({
    queryKey: queryKeys.orders.readiness(orderId),
    queryFn: () => orderApi.readiness(orderId),
    enabled: Boolean(orderId),
  });
}

export function useOrderActivities(orderId: string) {
  return useQuery({
    queryKey: queryKeys.orders.activities(orderId, { page_size: 20 }),
    queryFn: () => orderApi.activities(orderId, { page: 1, page_size: 20 }),
    enabled: Boolean(orderId),
    retry: false,
  });
}

export function useShops() {
  return useQuery({ queryKey: queryKeys.shops.list, queryFn: shopApi.list });
}

export function useWorkflowStatuses() {
  return useQuery({
    queryKey: queryKeys.statuses.list({ page_size: 200 }),
    queryFn: () => statusApi.list({ page: 1, page_size: 200 }),
  });
}

export function useListingSelector(params: object) {
  return useQuery({
    queryKey: queryKeys.listingSelector.list(params),
    queryFn: () => listingApi.list(params),
  });
}

export function useOrderMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  orderId: string,
) {
  const refresh = useRefreshOrder(orderId);
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await refresh();
    },
  });
}
