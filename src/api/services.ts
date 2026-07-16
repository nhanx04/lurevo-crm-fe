import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from './client';
import type {
  AuthUser,
  Category,
  CategoryRequest,
  ListParams,
  ListResponse,
  Listing,
  ListingImage,
  ListingParams,
  ListingRequest,
  ListingStatus,
  ListingStatusRequest,
  LoginRequest,
  FileMetadataRequest,
  Order,
  OrderItem,
  OrderItemFile,
  OrderParams,
  OrderReadiness,
  OrderRequest,
  OrderLine,
  ShippingLabel,
  ShopSummary,
  SupplierSubmission,
  TokenPairResponse,
  User,
} from '@/types/api';

export const authApi = {
  login: (body: LoginRequest) => apiPost<TokenPairResponse>('/auth/login', body, { skipAuthRefresh: true }),
  me: () => apiGet<User>('/auth/me'),
  refresh: (refreshToken: string) => apiPost<TokenPairResponse>('/auth/refresh', { refresh_token: refreshToken }, { skipAuthRefresh: true }),
  logout: (refreshToken: string) => apiPost<void>('/auth/logout', { refresh_token: refreshToken }),
  logoutAll: () => apiPost<void>('/auth/logout-all'),
  changePassword: (body: { current_password: string; new_password: string; new_password_confirmation: string }) =>
    apiPost<void>('/auth/change-password', body),
};

export const userApi = {
  createCollaborator: (body: { email: string; password: string; full_name: string }) => apiPost<AuthUser>('/users/collaborators', body),
};

export const categoryApi = {
  list: (params: ListParams) => apiGet<ListResponse<Category>>('/categories', { params }),
  detail: (id: string) => apiGet<Category>(`/categories/${id}`),
  create: (body: CategoryRequest) => apiPost<Category>('/categories', body),
  update: (id: string, body: CategoryRequest) => apiPatch<Category>(`/categories/${id}`, body),
  remove: (id: string) => apiDelete(`/categories/${id}`),
};

export const statusApi = {
  list: (params: ListParams) => apiGet<ListResponse<ListingStatus>>('/listing-statuses', { params }),
  detail: (id: string) => apiGet<ListingStatus>(`/listing-statuses/${id}`),
  create: (body: ListingStatusRequest) => apiPost<ListingStatus>('/listing-statuses', body),
  update: (id: string, body: ListingStatusRequest) => apiPatch<ListingStatus>(`/listing-statuses/${id}`, body),
  remove: (id: string) => apiDelete(`/listing-statuses/${id}`),
};

export const listingApi = {
  list: (params: ListingParams) => apiGet<ListResponse<Listing>>('/listings', { params }),
  detail: (id: string) => apiGet<Listing>(`/listings/${id}`),
  productionConfig: (id: string) => apiGet<Listing['supplier'] & { listing_id: string; internal_sku?: string | null; supplier_sku?: string | null }>(`/listings/${id}/production-config`),
  create: (body: ListingRequest) => apiPost<Listing>('/listings', body),
  update: (id: string, body: ListingRequest) => apiPatch<Listing>(`/listings/${id}`, body),
  remove: (id: string) => apiDelete(`/listings/${id}`),
};

export const shopApi = {
  list: () => apiGet<ShopSummary[]>('/shops'),
};

export const orderApi = {
  list: (params: OrderParams) => apiGet<ListResponse<Order>>('/orders', { params }),
  detail: (id: string) => apiGet<Order>(`/orders/${id}`),
  create: (body: OrderRequest) => apiPost<Order>('/orders', body),
  update: (id: string, body: OrderRequest) => apiPatch<Order>(`/orders/${id}`, body),
  addLine: (orderId: string, body: { listing_id: string; quantity: number; personalization_mode: 'same' | 'different' }) =>
    apiPost<OrderLine>(`/orders/${orderId}/lines`, body),
  deleteLine: (orderId: string, lineId: string) => apiDelete(`/orders/${orderId}/lines/${lineId}`),
  updateItem: (orderId: string, itemId: string, body: Partial<Pick<OrderItem, 'personalization_text' | 'customer_note' | 'option' | 'color' | 'print_method' | 'main_position' | 'sub_position' | 'production_notice'>> & { custom_fields?: Record<string, unknown> | null }) =>
    apiPatch<OrderItem>(`/orders/${orderId}/items/${itemId}`, body),
  addItemFile: (orderId: string, itemId: string, body: { file: FileMetadataRequest; file_type: string; usage?: string | null; position?: string | null }) =>
    apiPost<OrderItemFile>(`/orders/${orderId}/items/${itemId}/files`, body),
  addShippingLabel: (orderId: string, body: { file: FileMetadataRequest }) =>
    apiPost<ShippingLabel>(`/orders/${orderId}/shipping-labels`, body),
  readiness: (orderId: string) => apiGet<OrderReadiness>(`/orders/${orderId}/readiness`),
  sendToSupplier: (orderId: string) => apiPost<SupplierSubmission>(`/orders/${orderId}/send-to-supplier`, {}),
};

export const imageApi = {
  list: (listingId: string) => apiGet<ListingImage[]>(`/listings/${listingId}/images`),
  upload: (listingId: string, files: File[]) => {
    const body = new FormData();
    files.forEach((file) => body.append('images', file));
    return apiPost<ListingImage[]>(`/listings/${listingId}/images`, body, { headers: { 'Content-Type': undefined } });
  },
  patch: (listingId: string, imageId: string, body: { sort_order?: number; is_primary?: boolean; metadata?: Record<string, unknown> }) =>
    apiPatch<ListingImage>(`/listings/${listingId}/images/${imageId}`, body),
  remove: (listingId: string, imageId: string) => apiDelete(`/listings/${listingId}/images/${imageId}`),
  reorder: (listingId: string, imageIds: string[]) => apiPut<void>(`/listings/${listingId}/images/reorder`, { image_ids: imageIds }),
  setPrimary: (listingId: string, imageId: string) => apiPatch<void>(`/listings/${listingId}/images/${imageId}/primary`, {}),
};
