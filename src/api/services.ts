import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from './client';
import { appConfig } from '@/config/app';
import type {
  AnalyticsOverview,
  AnalyticsParams,
  AuthUser,
  Category,
  CategoryRequest,
  DesignAsset,
  DesignAssetRequest,
  DesignFolder,
  DesignFolderRequest,
  DesignLibraryBrowse,
  DesignLibraryParams,
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
  OrderActivity,
  OrderItem,
  OrderItemFile,
  OrderParams,
  OrderReadiness,
  OrderRequest,
  OrderLine,
  ShippingLabel,
  Shop,
  ShopRequest,
  SyncSupplierOrdersResponse,
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
  list: () => apiGet<Shop[]>('/shops'),
  detail: (id: string) => apiGet<Shop>(`/shops/${id}`),
  create: (body: ShopRequest) => apiPost<Shop>('/shops', body),
  update: (id: string, body: ShopRequest) => apiPatch<Shop>(`/shops/${id}`, body),
  remove: (id: string) => apiDelete(`/shops/${id}`),
};

export const orderApi = {
  list: (params: OrderParams) => apiGet<ListResponse<Order>>('/orders', { params }),
  syncSupplierData: (orderIds: string[]) => apiPost<SyncSupplierOrdersResponse>('/orders/sync-supplier-data', { order_ids: orderIds }),
  detail: (id: string) => apiGet<Order>(`/orders/${id}`),
  create: (body: OrderRequest) => apiPost<Order>('/orders', body),
  update: (id: string, body: OrderRequest) => apiPatch<Order>(`/orders/${id}`, body),
  remove: (id: string) => apiDelete(`/orders/${id}`),
  addLine: (orderId: string, body: { listing_id: string; quantity: number; personalization_mode: 'same' | 'different' }) =>
    apiPost<OrderLine>(`/orders/${orderId}/lines`, body),
  deleteLine: (orderId: string, lineId: string) => apiDelete(`/orders/${orderId}/lines/${lineId}`),
  updateLine: (orderId: string, lineId: string, body: { quantity?: number; personalization_mode?: 'same' | 'different' }) =>
    apiPatch<OrderLine>(`/orders/${orderId}/lines/${lineId}`, body),
  itemDetail: (itemId: string) => apiGet<OrderItem>(`/order-items/${itemId}`),
  updateItem: (orderId: string, itemId: string, body: Partial<Pick<OrderItem, 'personalization_text' | 'customer_note' | 'option' | 'color' | 'print_method' | 'main_position' | 'sub_position' | 'production_notice'>> & { custom_fields?: Record<string, unknown> | null }) =>
    apiPatch<OrderItem>(`/orders/${orderId}/items/${itemId}`, body),
  updateItemProductionConfig: (itemId: string, body: Pick<OrderItem, 'option' | 'color' | 'print_method' | 'main_position' | 'sub_position'>) =>
    apiPut<OrderItem>(`/order-items/${itemId}/production-config`, body),
  bulkUpdateItems: (body: { item_ids: string[]; patch: Partial<OrderItem> }) => apiPatch<OrderItem[]>('/order-items/bulk', body),
  itemFiles: (itemId: string) => apiGet<OrderItemFile[]>(`/order-items/${itemId}/files`),
  addItemFile: (orderId: string, itemId: string, body: { file: FileMetadataRequest; file_type: string; usage?: string | null; position?: string | null }) =>
    apiPost<OrderItemFile>(`/orders/${orderId}/items/${itemId}/files`, body),
  addLibraryDesign: (orderId: string, itemId: string, body: { design_asset_id: string; file_type: 'design'; usage: 'main_design' | 'sub_design' | 'additional_design'; position?: string | null }) =>
    apiPost<OrderItemFile>(`/orders/${orderId}/items/${itemId}/files`, { ...body, source_type: 'design_library' }),
  addItemFileFromUrl: (orderId: string, itemId: string, body: { url: string; file_type: string; usage?: string | null; position?: string | null }) =>
    apiPost<OrderItemFile>(`/orders/${orderId}/items/${itemId}/files`, body),
  uploadItemFile: (orderId: string, itemId: string, body: { file: File; file_type: string; usage?: string | null; position?: string | null }) => {
    const form = new FormData();
    form.append('file', body.file);
    form.append('file_type', body.file_type);
    if (body.usage) form.append('usage', body.usage);
    if (body.position) form.append('position', body.position);
    return apiPost<OrderItemFile>(`/orders/${orderId}/items/${itemId}/files`, form, { headers: { 'Content-Type': undefined } });
  },
  patchItemFile: (itemId: string, orderItemFileId: string, body: Partial<OrderItemFile>) =>
    apiPatch<OrderItemFile>(`/order-items/${itemId}/files/${orderItemFileId}`, body),
  deleteItemFile: (itemId: string, orderItemFileId: string) => apiDelete(`/order-items/${itemId}/files/${orderItemFileId}`),
  shippingLabels: (orderId: string) => apiGet<ShippingLabel[]>(`/orders/${orderId}/shipping-labels`),
  activeShippingLabel: (orderId: string) => apiGet<ShippingLabel>(`/orders/${orderId}/shipping-labels/active`),
  addShippingLabel: (orderId: string, body: { file: FileMetadataRequest }) =>
    apiPost<ShippingLabel>(`/orders/${orderId}/shipping-labels`, body),
  uploadShippingLabel: (orderId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiPost<ShippingLabel>(`/orders/${orderId}/shipping-labels`, form, { headers: { 'Content-Type': undefined } });
  },
  readiness: (orderId: string) => apiGet<OrderReadiness>(`/orders/${orderId}/readiness`),
  activities: (orderId: string, params?: ListParams) => apiGet<ListResponse<OrderActivity>>(`/orders/${orderId}/activities`, { params }),
  submitForReview: (orderId: string) => apiPost<Order>(`/orders/${orderId}/submit-for-review`, {}),
  requestRevision: (orderId: string, body: { note: string; order_item_id?: string }) => apiPost<Order>(`/orders/${orderId}/request-revision`, body),
  markReady: (orderId: string) => apiPost<Order>(`/orders/${orderId}/mark-ready`, {}),
  sendToSupplier: (orderId: string) => apiPost<Order>(`/orders/${orderId}/send-to-supplier`, {}),
  retrySupplier: (orderId: string) => apiPost<Order>(`/orders/${orderId}/retry-supplier`, {}),
  syncSupplier: (orderId: string) => apiPost<Order>(`/orders/${orderId}/sync-supplier`, {}),
  cancel: (orderId: string, body?: { reason?: string }) => apiPost<Order>(`/orders/${orderId}/cancel`, body || {}),
  putOnHold: (orderId: string, body?: { note?: string }) => apiPost<Order>(`/orders/${orderId}/put-on-hold`, body || {}),
  resume: (orderId: string) => apiPost<Order>(`/orders/${orderId}/resume`, {}),
};

export const designLibraryApi = {
  browse: (params: DesignLibraryParams) => apiGet<DesignLibraryBrowse>('/design-library', { params }),
  createFolder: (body: DesignFolderRequest) => apiPost<DesignFolder>('/design-library/folders', body),
  updateFolder: (id: string, body: DesignFolderRequest) => apiPatch<DesignFolder>(`/design-library/folders/${id}`, body),
  moveFolder: (id: string, parentId?: string | null) => apiPost<DesignFolder>(`/design-library/folders/${id}/move`, { parent_id: parentId || null }),
  activateFolder: (id: string) => apiPost<DesignFolder>(`/design-library/folders/${id}/activate`, {}),
  deactivateFolder: (id: string) => apiPost<DesignFolder>(`/design-library/folders/${id}/deactivate`, {}),
  removeFolder: (id: string) => apiDelete(`/design-library/folders/${id}`),
  detailAsset: (id: string) => apiGet<DesignAsset>(`/design-library/assets/${id}`),
  createAsset: (body: DesignAssetRequest) => apiPost<DesignAsset>('/design-library/assets', body),
  uploadAsset: (body: { file: File; name: string; folder_id?: string | null; description?: string | null; tags?: string[]; is_active?: boolean }) => {
    const form = new FormData();
    form.append('file', body.file);
    form.append('name', body.name);
    if (body.folder_id) form.append('folder_id', body.folder_id);
    if (body.description) form.append('description', body.description);
    if (body.tags?.length) form.append('tags', body.tags.join(','));
    if (body.is_active !== undefined) form.append('is_active', String(body.is_active));
    return apiPost<DesignAsset>('/design-library/assets', form, { headers: { 'Content-Type': undefined } });
  },
  updateAsset: (id: string, body: DesignAssetRequest) => apiPatch<DesignAsset>(`/design-library/assets/${id}`, body),
  moveAsset: (id: string, folderId?: string | null) => apiPost<DesignAsset>(`/design-library/assets/${id}/move`, { folder_id: folderId || null }),
  activateAsset: (id: string) => apiPost<DesignAsset>(`/design-library/assets/${id}/activate`, {}),
  deactivateAsset: (id: string) => apiPost<DesignAsset>(`/design-library/assets/${id}/deactivate`, {}),
  removeAsset: (id: string) => apiDelete(`/design-library/assets/${id}`),
  downloadAssetUrl: (id: string) => `${appConfig.apiBaseUrl}/design-library/assets/${id}/download`,
};

export const analyticsApi = {
  overview: (params: AnalyticsParams) => apiGet<AnalyticsOverview>('/analytics/overview', { params }),
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
