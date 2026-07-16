export type Role = 'owner' | 'collaborator';
export type SortOrder = 'asc' | 'desc';

export type ApiEnvelope<T> = { success: true; data: T } | { success: false; error: ApiErrorBody };
export type FieldError = { field: string; message: string };
export type ApiErrorBody = { code: string; message: string; details?: FieldError[] };

export class ApiError extends Error {
  status: number;
  code: string;
  details: FieldError[];

  constructor(status: number, body?: ApiErrorBody) {
    super(body?.message || 'Request failed');
    this.name = 'ApiError';
    this.status = status;
    this.code = body?.code || 'REQUEST_FAILED';
    this.details = body?.details || [];
  }
}

export type Pagination = {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
};

export type ListResponse<T> = {
  data: T[];
  pagination: Pagination;
};

export type User = {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type AuthUser = Pick<User, 'id' | 'email' | 'full_name' | 'role' | 'is_active'>;

export type LoginRequest = { email: string; password: string };
export type TokenPairResponse = {
  token_type: string;
  access_token: string;
  access_token_expires_in: number;
  refresh_token: string;
  refresh_token_expires_in: number;
  user: AuthUser;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  parent_id?: string | null;
  sort_order: number;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type CategoryRequest = Partial<Pick<Category, 'name' | 'slug' | 'description' | 'parent_id' | 'sort_order' | 'is_active' | 'metadata'>>;

export type ListingStatus = {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  color?: string | null;
  sort_order: number;
  is_default: boolean;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ListingStatusRequest = Partial<Pick<ListingStatus, 'name' | 'code' | 'description' | 'color' | 'sort_order' | 'is_default' | 'is_active' | 'metadata'>>;

export type CategorySummary = { id: string; name: string; slug?: string };
export type StatusSummary = { id: string; name: string; code: string; color?: string | null };

export type ListingImage = {
  id: string;
  url: string;
  object_key?: string;
  original_filename: string;
  content_type: string;
  size_bytes: number;
  width?: number | null;
  height?: number | null;
  sort_order: number;
  is_primary: boolean;
  metadata?: Record<string, unknown>;
  created_at?: string;
};

export type ListingSupplier = {
  sku?: string | null;
  options: string[];
  colors: string[];
  print_methods: string[];
  positions: string[];
  ready: boolean;
};

export type Listing = {
  id: string;
  title: string;
  short_name: string;
  slug: string;
  description: string;
  short_description?: string | null;
  sku?: string | null;
  supplier: ListingSupplier;
  price: string;
  compare_at_price?: string | null;
  currency: string;
  tags: string[];
  is_active: boolean;
  category: CategorySummary;
  status?: StatusSummary | null;
  images?: ListingImage[];
  primary_image?: ListingImage | null;
  image_count?: number;
  metadata: Record<string, unknown>;
  extra_fields: Record<string, unknown>;
  internal_note?: string | null;
  source?: string | null;
  external_url?: string | null;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type ListingRequest = {
  category_id?: string;
  status_id?: string | null;
  title?: string;
  short_name?: string;
  slug?: string;
  description?: string;
  short_description?: string | null;
  sku?: string | null;
  supplier?: {
    sku?: string | null;
    options?: string[];
    colors?: string[];
    print_methods?: string[];
    positions?: string[];
  };
  price?: string;
  compare_at_price?: string | null;
  currency?: string;
  tags?: string[];
  is_active?: boolean;
  metadata?: Record<string, unknown>;
  extra_fields?: Record<string, unknown>;
  internal_note?: string | null;
  source?: string | null;
  external_url?: string | null;
  published_at?: string | null;
};

export type ShopSummary = { id: string; name: string; platform: string };

export type OrderReadiness = {
  ready: boolean;
  quantity: number;
  items: number;
  checks: { code: string; message: string; passed: boolean; order_item_id?: string; section?: string }[];
};

export type OrderItemFile = {
  id: string;
  file_id: string;
  file_type: string;
  usage?: string | null;
  position?: string | null;
  sort_order: number;
  is_selected: boolean;
  original_name: string;
  mime_type: string;
  size: number;
  created_at: string;
};

export type OrderItem = {
  id: string;
  order_line_id: string;
  item_number: number;
  quantity: number;
  personalization_text?: string | null;
  customer_note?: string | null;
  custom_fields?: Record<string, unknown> | null;
  supplier_sku: string;
  option?: string | null;
  color?: string | null;
  print_method?: string | null;
  main_position?: string | null;
  sub_position?: string | null;
  production_notice?: string | null;
  files?: OrderItemFile[];
};

export type OrderLine = {
  id: string;
  listing_id: string;
  listing_title: string;
  listing_sku?: string | null;
  supplier_sku: string;
  supplier: ListingSupplier;
  quantity: number;
  personalization_mode: 'same' | 'different';
  items: OrderItem[];
};

export type ShippingLabel = {
  id: string;
  file_id: string;
  version: number;
  status: string;
  is_active: boolean;
  original_name: string;
  mime_type: string;
  size: number;
  uploaded_at: string;
  replaced_at?: string | null;
};

export type Order = {
  id: string;
  etsy_order_id: string;
  shop: ShopSummary;
  status: StatusSummary;
  customer_name?: string | null;
  customer_note?: string | null;
  ordered_at?: string | null;
  created_by: { id: string; full_name: string };
  supplier: {
    order_id?: string | null;
    status?: string | null;
    tracking_number?: string | null;
    total_items?: number | null;
    total_quantity?: number | null;
    items_fee?: string | null;
    extra_services_fee?: string | null;
    shipping_fee?: string | null;
    total_fee?: string | null;
    label_buy?: string | null;
    created_at?: string | null;
  };
  version: number;
  products_count: number;
  items_count: number;
  configured_items_count: number;
  designs_count: number;
  has_active_shipping_label: boolean;
  readiness?: OrderReadiness;
  lines?: OrderLine[];
  shipping_labels?: ShippingLabel[];
  created_at: string;
  updated_at: string;
};

export type OrderRequest = {
  etsy_order_id?: string;
  shop_id?: string;
  ordered_at?: string | null;
  customer_name?: string | null;
  customer_note?: string | null;
};

export type FileMetadataRequest = {
  storage_key: string;
  original_name: string;
  mime_type: string;
  size: number;
  checksum?: string | null;
};

export type SupplierSubmission = {
  id: string;
  order_id: string;
  idempotency_key: string;
  status: string;
  attempt_count: number;
  last_error?: string | null;
  request_payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  submitted_at?: string | null;
};

export type ListParams = {
  page?: number;
  page_size?: number;
  search?: string;
  is_active?: boolean | '';
  sort_by?: string;
  sort_order?: SortOrder;
  parent_id?: string;
};

export type ListingParams = ListParams & {
  title?: string;
  short_name?: string;
  category_id?: string;
  status_id?: string;
  min_price?: string;
  max_price?: string;
  tag?: string;
  created_from?: string;
  created_to?: string;
};

export type OrderParams = ListParams & {
  shop_id?: string;
  status_id?: string;
  created_by?: string;
  supplier_status?: string;
  readiness?: string;
  sort?: string;
};
