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

export type Listing = {
  id: string;
  title: string;
  short_name: string;
  slug: string;
  description: string;
  short_description?: string | null;
  sku?: string | null;
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
