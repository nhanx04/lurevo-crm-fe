export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  categories: {
    list: (params?: object) => ['categories', params] as const,
    detail: (id: string) => ['categories', id] as const,
  },
  statuses: {
    list: (params?: object) => ['listing-statuses', params] as const,
    detail: (id: string) => ['listing-statuses', id] as const,
  },
  listings: {
    list: (params?: object) => ['listings', params] as const,
    detail: (id: string) => ['listings', id] as const,
  },
  images: {
    list: (listingId: string) => ['listing-images', listingId] as const,
  },
  shops: {
    list: ['shops'] as const,
  },
  orders: {
    list: (params?: object) => ['orders', params] as const,
    detail: (id: string) => ['orders', id] as const,
    readiness: (id: string) => ['orders', id, 'readiness'] as const,
    labels: (id: string) => ['orders', id, 'labels'] as const,
    activities: (id: string, params?: object) => ['orders', id, 'activities', params] as const,
  },
  orderItems: {
    files: (itemId: string) => ['order-items', itemId, 'files'] as const,
  },
  listingSelector: {
    list: (params?: object) => ['listings', 'selector', params] as const,
  },
};
