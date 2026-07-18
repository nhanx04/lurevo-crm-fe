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

export type Shop = {
  id: string;
  name: string;
  platform: string;
  external_shop_id?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ShopSummary = {
  id: string;
  name: string;
  platform: string;
  external_shop_id?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type ShopRequest = {
  name?: string;
  platform?: string;
  external_shop_id?: string | null;
  is_active?: boolean;
};

export type OrderReadiness = {
  ready: boolean;
  quantity: number;
  items: number;
  checks: { code: string; message: string; passed: boolean; order_item_id?: string; section?: string }[];
};

export type OrderItemFile = {
  id: string;
  file_id: string;
  design_asset_id?: string | null;
  source_type?: 'uploaded' | 'design_library';
  asset_name_snapshot?: string | null;
  storage_key?: string;
  url?: string;
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

export type DesignFolderBreadcrumb = {
  id?: string | null;
  name: string;
};

export type DesignFolder = {
  id: string;
  name: string;
  parent_id?: string | null;
  is_active: boolean;
  child_folder_count: number;
  design_count: number;
  created_at: string;
  updated_at: string;
};

export type DesignAsset = {
  id: string;
  name: string;
  description?: string | null;
  folder_id?: string | null;
  folder_path?: DesignFolderBreadcrumb[];
  is_active: boolean;
  tags: string[];
  file: {
    id: string;
    original_name: string;
    mime_type: string;
    size: number;
    preview_url?: string;
    download_url?: string;
  };
  created_by: { id: string; full_name: string };
  updated_by?: { id: string; full_name: string } | null;
  created_at: string;
  updated_at: string;
};

export type DesignLibraryBrowse = {
  current_folder?: DesignFolder | null;
  breadcrumbs: DesignFolderBreadcrumb[];
  folders: DesignFolder[];
  assets: DesignAsset[];
  meta: Pagination;
};

export type DesignLibraryParams = {
  folder_id?: string;
  search?: string;
  status?: 'active' | 'inactive' | 'all';
  type?: 'folder' | 'design' | 'all';
  scope?: 'current' | 'recursive' | 'all';
  sort?: 'name' | 'created_at' | 'updated_at';
  direction?: SortOrder;
  page?: number;
  page_size?: number;
};

export type DesignFolderRequest = {
  name?: string;
  parent_id?: string | null;
};

export type DesignAssetRequest = {
  file_id?: string;
  file?: FileMetadataRequest;
  folder_id?: string | null;
  name?: string;
  description?: string | null;
  tags?: string[];
  is_active?: boolean;
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
  storage_key?: string;
  url?: string;
  version: number;
  status: string;
  is_active: boolean;
  original_name: string;
  mime_type: string;
  size: number;
  uploaded_at: string;
  replaced_at?: string | null;
  uploaded_by?: { id: string; full_name: string } | null;
  supplier_detected_data?: Record<string, unknown> | null;
};

export type OrderActivity = {
  id: string;
  order_id: string;
  order_item_id?: string | null;
  actor?: { id: string; full_name: string } | null;
  activity_type: string;
  message: string;
  metadata?: Record<string, unknown> | null;
  created_at: string;
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
  reviewed_by?: { id: string; full_name: string } | null;
  reviewed_at?: string | null;
  supplier: {
    submitted?: boolean;
    sync_needed?: boolean;
    order_id?: string | null;
    customer_order_id?: string | null;
    status?: string | null;
    source?: string | null;
    carrier?: string | null;
    tracking_number?: string | null;
    total_items?: number | null;
    total_quantity?: number | null;
    items_fee?: string | null;
    extra_services_fee?: string | null;
    shipping_fee?: string | null;
    label_fee?: string | null;
    total_fee?: string | null;
    label_buy?: boolean | null;
    created_at?: string | null;
    submitted_at?: string | null;
    last_synced_at?: string | null;
    shipping?: {
      buyer?: string | null;
      phone?: string | null;
      street?: string | null;
      street_2?: string | null;
      city?: string | null;
      state?: string | null;
      zipcode?: string | null;
      country?: string | null;
    } | null;
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
  active_shipping_label?: ShippingLabel | null;
  activities?: OrderActivity[];
  supplier_cancellation?: SupplierCancellationResult | null;
  submitted_at?: string | null;
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

export type AnalyticsMetric = {
  value: string;
  previous_value: string;
  absolute_change: string;
  change_percent?: string | null;
  trend_direction: 'up' | 'down' | 'flat' | string;
  polarity: 'positive' | 'negative' | 'neutral' | string;
  unavailable?: boolean;
  note?: string;
};

export type AnalyticsTimeSeriesPoint = {
  bucket: string;
  label: string;
  orders_created: number;
  sent_to_supplier: number;
  supplier_submitted: number;
  cancelled_orders: number;
  supplier_errors: number;
  supplier_total_cost: string;
};

export type WorkflowDistributionPoint = {
  status_id: string;
  name: string;
  code: string;
  color?: string | null;
  count: number;
  percent: string;
  sort_order: number;
};

export type ReadinessBlockerPoint = {
  code: string;
  label: string;
  count: number;
  overlap?: boolean;
};

export type WorkflowFunnelStage = {
  code: string;
  label: string;
  count: number;
  conversion_percent: string;
  overall_percent: string;
  definition: string;
};

export type WorkflowAgingRow = {
  status_id: string;
  name: string;
  code: string;
  color?: string | null;
  less_than_one_day: number;
  one_to_two_days: number;
  three_to_five_days: number;
  six_to_seven_days: number;
  more_than_seven_days: number;
  age_source: string;
};

export type ProcessingDurationMetric = {
  code: string;
  label: string;
  average_seconds: number;
  median_seconds: number;
  p90_seconds: number;
  sample_size: number;
  source: string;
};

export type ShopPerformanceRow = {
  shop_id: string;
  shop_name: string;
  orders: number;
  items: number;
  quantity: number;
  ready_to_send: number;
  supplier_submitted: number;
  supplier_errors: number;
  cancelled_orders: number;
  supplier_cost: string;
  average_cost_per_order: string;
};

export type ProductPerformanceRow = {
  listing_id: string;
  listing_title: string;
  internal_sku?: string | null;
  supplier_sku: string;
  orders: number;
  items: number;
  quantity: number;
  supplier_cost: string;
  average_cost_per_item: string;
  supplier_errors: number;
  cancelled_orders: number;
  custom_design_percent: string;
  library_design_percent: string;
};

export type AnalyticsOverview = {
  period: {
    date_from: string;
    date_to: string;
    timezone: string;
    comparison_date_from?: string;
    comparison_date_to?: string;
    granularity: string;
  };
  kpis: Record<string, AnalyticsMetric>;
  order_trend: AnalyticsTimeSeriesPoint[];
  workflow_distribution: WorkflowDistributionPoint[];
  readiness_blockers: ReadinessBlockerPoint[];
  workflow_funnel: WorkflowFunnelStage[];
  workflow_aging: WorkflowAgingRow[];
  processing_times: ProcessingDurationMetric[];
  shop_performance: ShopPerformanceRow[];
  product_performance: ProductPerformanceRow[];
  supplier_performance: {
    submission_attempts: number;
    successful_submissions: number;
    failed_submissions: number;
    success_rate: string;
    retry_count: number;
    cancel_requests: number;
    successful_cancellations: number;
    failed_cancellations: number;
    error_breakdown: ReadinessBlockerPoint[];
  };
  supplier_cost: {
    total_cost: string;
    items_fee: string;
    extra_services_fee: string;
    shipping_fee: string;
    label_fee: string;
    average_cost_per_order: string;
    average_cost_per_item: string;
    malformed_fee_count: number;
    label: string;
  };
  design_usage: {
    uploaded_custom_orders: number;
    library_design_orders: number;
    mixed_design_orders: number;
    missing_design_orders: number;
    items_with_main_design: number;
    items_with_sub_design: number;
    items_with_mockup_1: number;
    items_with_mockup_2: number;
    items_missing_main_design: number;
    average_design_files_per_item: string;
  };
  cancellations: {
    cancelled_orders: number;
    cancellation_rate: string;
    supplier_cancellation_success_rate: string;
    refunded_items_fee: string;
    refunded_shipping: string;
    refunded_total: string;
  };
  employee_activity: {
    user_id: string;
    full_name: string;
    orders_created: number;
    files_uploaded: number;
    ready_to_send: number;
    supplier_submitted: number;
  }[];
  attention_orders: {
    order_id: string;
    etsy_order_id: string;
    shop_name: string;
    status_name: string;
    status_code: string;
    customer_name?: string | null;
    age_hours: number;
    missing_main_design: boolean;
    missing_shipping_label: boolean;
    supplier_error: boolean;
    updated_at: string;
  }[];
  revenue_note: string;
};

export type AnalyticsParams = {
  date_from?: string;
  date_to?: string;
  timezone?: string;
  compare?: 'previous_period' | 'none';
  shop_id?: string;
  status_id?: string;
  status_code?: string;
  supplier_status?: string;
  listing_id?: string;
  created_by?: string;
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

export type SupplierCancellationRefund = {
  items_fee: string;
  shipping_fee: string;
  total: string;
};

export type SupplierCancellationResult = {
  supplier_order_id?: string | null;
  customer_order_id: string;
  supplier_status?: string | null;
  refunded?: SupplierCancellationRefund | null;
  current_balance?: string | null;
  canceled_at?: string | null;
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
