import { ChangeEvent, DragEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  HiOutlineAdjustmentsHorizontal,
  HiOutlineArrowLeft,
  HiOutlineChevronDown,
  HiOutlineEye,
  HiOutlinePencilSquare,
  HiOutlinePhoto,
  HiOutlinePlus,
  HiOutlineSquares2X2,
  HiOutlineStar,
  HiOutlineTableCells,
  HiOutlineTrash,
  HiOutlineXMark,
} from "react-icons/hi2";
import clsx from "clsx";
import { categoryApi, imageApi, listingApi, statusApi } from "@/api/services";
import { queryKeys } from "@/api/queryKeys";
import { ApiError, Listing, ListingImage, ListingRequest } from "@/types/api";
import { ListingFormValues, listingSchema } from "@/schemas/forms";
import { appConfig } from "@/config/app";
import {
  Badge,
  Button,
  ActionIconButton,
  Card,
  Field,
  FilterSelect,
  Input,
  PageHeader,
  PaginationControls,
  ResourceToolbar,
  SearchInput,
  Select,
  SoftPanel,
  Switch,
  Table,
  Textarea,
} from "@/components/ui";
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  SkeletonRows,
  Spinner,
  useToast,
} from "@/components/feedback";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatFileSize,
  sanitizeColor,
} from "@/utils/format";
import { jsonObjectFromText, normalizeTags } from "@/utils/forms";
import { useUrlParams } from "@/hooks/useUrlParams";

const VIEW_KEY = "lurevo.listings.view";
const MAX_IMAGES = appConfig.upload.maxImagesPerListing;

type ListingView = "grid" | "list";
type PendingImage = { id: string; file: File; url: string; error?: string };

function activeParam(value?: string): boolean | "" {
  if (value === "true") return true;
  if (value === "false") return false;
  return "";
}

export function ListingsPage() {
  const { params, setParam, setPage } = useUrlParams();
  const [deleteTarget, setDeleteTarget] = useState<Listing | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [search, setSearch] = useState(params.search || "");
  const [view, setView] = useState<ListingView>(() =>
    localStorage.getItem(VIEW_KEY) === "list" ? "list" : "grid",
  );
  const queryClient = useQueryClient();
  const toast = useToast();

  useEffect(() => setSearch(params.search || ""), [params.search]);
  useEffect(() => localStorage.setItem(VIEW_KEY, view), [view]);
  useEffect(() => {
    const handle = window.setTimeout(() => {
      if ((params.search || "") !== search) setParam("search", search);
    }, 350);
    return () => window.clearTimeout(handle);
  }, [params.search, search, setParam]);

  const listParams = useMemo(
    () => ({
      page: Number(params.page || 1),
      page_size: Number(params.page_size || 20),
      search: params.search,
      category_id: params.category_id,
      status_id: params.status_id,
      is_active: activeParam(params.is_active),
      min_price: params.min_price,
      max_price: params.max_price,
      tag: params.tag,
      sort_by: params.sort_by || "created_at",
      sort_order: (params.sort_order || "desc") as "asc" | "desc",
    }),
    [params],
  );

  const listings = useQuery({
    queryKey: queryKeys.listings.list(listParams),
    queryFn: () => listingApi.list(listParams),
  });
  const categories = useQuery({
    queryKey: queryKeys.categories.list({ page_size: 200 }),
    queryFn: () => categoryApi.list({ page: 1, page_size: 200 }),
  });
  const statuses = useQuery({
    queryKey: queryKeys.statuses.list({ page_size: 200 }),
    queryFn: () => statusApi.list({ page: 1, page_size: 200 }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => listingApi.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["listings"] });
      toast.push({ type: "success", title: "Listing deleted" });
      setDeleteTarget(null);
    },
    onError: (error) =>
      toast.push({
        type: "error",
        title: "Delete failed",
        message:
          error instanceof ApiError
            ? error.message
            : "Unable to delete listing",
      }),
  });

  const activeChips = [
    params.status_id
      ? {
          key: "status_id",
          label: `Status: ${statuses.data?.data.find((status) => status.id === params.status_id)?.name || "Selected"}`,
        }
      : null,
    params.category_id
      ? {
          key: "category_id",
          label: `Category: ${categories.data?.data.find((category) => category.id === params.category_id)?.name || "Selected"}`,
        }
      : null,
    params.is_active
      ? {
          key: "is_active",
          label: params.is_active === "true" ? "Active" : "Inactive",
        }
      : null,
    params.min_price || params.max_price
      ? {
          key: "price",
          label: `Price: ${params.min_price || "0"}-${params.max_price || "any"}`,
        }
      : null,
    params.tag ? { key: "tag", label: `Tag: ${params.tag}` } : null,
  ].filter(Boolean) as { key: string; label: string }[];

  function clearAll() {
    [
      "search",
      "category_id",
      "status_id",
      "is_active",
      "min_price",
      "max_price",
      "tag",
      "sort_by",
      "sort_order",
      "page",
    ].forEach((key) => setParam(key, ""));
    setSearch("");
  }

  return (
    <div className="space-y-3">
      <PageHeader title="Listings" />
      <ResourceToolbar
        search={
          <SearchInput
            placeholder="Search title, short name, or SKU..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        }
        filters={
          <>
            <FilterSelect
              value={params.status_id || ""}
              onChange={(event) => setParam("status_id", event.target.value)}
            >
              <option value="">All statuses</option>
              {statuses.data?.data.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.name}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              value={params.category_id || ""}
              onChange={(event) => setParam("category_id", event.target.value)}
            >
              <option value="">All categories</option>
              {categories.data?.data.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              value={`${params.sort_by || "created_at"}:${params.sort_order || "desc"}`}
              onChange={(event) => {
                const [sortBy, sortOrder] = event.target.value.split(":");
                setParam("sort_by", sortBy);
                setParam("sort_order", sortOrder);
              }}
            >
              <option value="created_at:desc">Newest</option>
              <option value="updated_at:desc">Recently updated</option>
              <option value="short_name:asc">Short name</option>
              <option value="price:asc">Price low-high</option>
              <option value="price:desc">Price high-low</option>
            </FilterSelect>
            <Button
              variant="toolbar"
              type="button"
              onClick={() => setAdvancedOpen((value) => !value)}
              aria-expanded={advancedOpen}
            >
              <HiOutlineAdjustmentsHorizontal />
              Filters
            </Button>
            <div className="flex rounded-full border border-border bg-white p-1">
              <button
                type="button"
                aria-label="Grid view"
                className={clsx(
                  "rounded-full p-2 transition",
                  view === "grid"
                    ? "bg-blue-900 text-white"
                    : "text-muted hover:bg-slate-100",
                )}
                onClick={() => setView("grid")}
              >
                <HiOutlineSquares2X2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="List view"
                className={clsx(
                  "rounded-full p-2 transition",
                  view === "list"
                    ? "bg-blue-900 text-white"
                    : "text-muted hover:bg-slate-100",
                )}
                onClick={() => setView("list")}
              >
                <HiOutlineTableCells className="h-4 w-4" />
              </button>
            </div>
          </>
        }
        actions={
          <Link to="/app/listings/new" className="shrink-0">
            <Button className="w-full sm:w-auto">
              <HiOutlinePlus />
              Create listing
            </Button>
          </Link>
        }
      />
      {advancedOpen ? (
        <div className="mb-5 grid gap-3 md:grid-cols-4">
          <FilterSelect
            value={params.is_active || ""}
            onChange={(event) => setParam("is_active", event.target.value)}
          >
            <option value="">All states</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </FilterSelect>
          <Input
            placeholder="Min price"
            value={params.min_price || ""}
            onChange={(event) => setParam("min_price", event.target.value)}
          />
          <Input
            placeholder="Max price"
            value={params.max_price || ""}
            onChange={(event) => setParam("max_price", event.target.value)}
          />
          <Input
            placeholder="Tag"
            value={params.tag || ""}
            onChange={(event) => setParam("tag", event.target.value)}
          />
        </div>
      ) : null}
      {activeChips.length ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700"
              onClick={() =>
                chip.key === "price"
                  ? (setParam("min_price", ""), setParam("max_price", ""))
                  : setParam(chip.key, "")
              }
            >
              {chip.label}
              <HiOutlineXMark className="h-3.5 w-3.5" />
            </button>
          ))}
          <Button variant="link" size="sm" onClick={clearAll}>
            Clear all
          </Button>
        </div>
      ) : null}

      {listings.isLoading ? (
        <SkeletonRows />
      ) : listings.isError ? (
        <ErrorState
          message="Could not load listings."
          onRetry={() => void listings.refetch()}
        />
      ) : listings.data?.data.length ? (
        <div>
          {view === "grid" ? (
            <ListingGrid
              listings={listings.data.data}
              onDelete={setDeleteTarget}
            />
          ) : (
            <ListingTable
              listings={listings.data.data}
              onDelete={setDeleteTarget}
            />
          )}
          <PaginationControls
            page={listings.data.pagination.page}
            totalPages={listings.data.pagination.total_pages}
            totalItems={listings.data.pagination.total_items}
            onPage={setPage}
          />
        </div>
      ) : (
        <EmptyState
          title="No listings found"
          message="Create a listing or adjust filters."
          action={
            <Link to="/app/listings/new">
              <Button>Create listing</Button>
            </Link>
          }
        />
      )}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.short_name}?`}
        message="This action cannot be undone. Images will be deleted through the backend storage flow."
        danger
        confirmLabel="Delete"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget.id)}
      />
    </div>
  );
}

function ListingGrid({
  listings,
  onDelete,
}: {
  listings: Listing[];
  onDelete: (listing: Listing) => void;
}) {
  return (
    <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
      {listings.map((listing) => (
        <Card
          key={listing.id}
          className="group overflow-hidden hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-soft"
        >
          <Link to={`/app/listings/${listing.id}`} className="block">
            <div className="relative aspect-square bg-slate-100">
              {listing.primary_image?.url ? (
                <img
                  src={listing.primary_image.url}
                  alt={listing.primary_image.original_filename}
                  className="h-full w-full object-contain"
                  loading="lazy"
                />
              ) : (
                <ImagePlaceholder />
              )}
              <div className="absolute left-3 top-3 flex gap-2">
                <StatusPill listing={listing} />
              </div>
              <Badge
                tone={listing.is_active ? "success" : "neutral"}
                className="absolute right-3 top-3"
              >
                {listing.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
          </Link>
          <div className="p-4">
            <div className="min-w-0">
              <Link
                to={`/app/listings/${listing.id}`}
                className="font-bold text-foreground hover:text-blue-700"
              >
                {listing.short_name}
              </Link>
              <p className="mt-1 line-clamp-2 text-xs text-muted">
                {listing.title}
              </p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted">
              <span className="truncate">{listing.category.name}</span>
              <span className="truncate text-right">
                {listing.sku || "No SKU"}
              </span>
              <span>
                {listing.image_count || listing.images?.length || 0} images
              </span>
              <span className="text-right">
                {formatDate(listing.updated_at)}
              </span>
            </div>
            <div className="mt-3 rounded-lg bg-slate-50 p-2">
              <SupplierSummary listing={listing} />
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
              <p className="text-base font-bold">
                {formatCurrency(listing.price, listing.currency)}
              </p>
              <div className="flex items-center gap-1.5">
                <Link to={`/app/listings/${listing.id}/edit`}>
                  <ActionIconButton
                    tone="edit"
                    label={`Edit ${listing.short_name}`}
                  >
                    <HiOutlinePencilSquare className="h-4 w-4" />
                  </ActionIconButton>
                </Link>
                <ActionIconButton
                  tone="delete"
                  label={`Delete ${listing.short_name}`}
                  onClick={() => onDelete(listing)}
                >
                  <HiOutlineTrash className="h-4 w-4" />
                </ActionIconButton>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function ListingTable({
  listings,
  onDelete,
}: {
  listings: Listing[];
  onDelete: (listing: Listing) => void;
}) {
  return (
    <Table>
      <thead className="bg-slate-50 text-[11px] font-semibold uppercase text-muted">
        <tr>
          <th className="px-4 py-3">Listing</th>
          <th className="px-4 py-3">Category</th>
          <th className="px-4 py-3">Status</th>
          <th className="px-4 py-3">Price</th>
          <th className="px-4 py-3">Images</th>
          <th className="px-4 py-3">Supplier</th>
          <th className="px-4 py-3">Updated</th>
          <th className="px-4 py-3 text-right">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {listings.map((listing) => (
          <tr key={listing.id} className="hover:bg-slate-50/70">
            <td className="px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 overflow-hidden rounded-xl bg-slate-100">
                  {listing.primary_image?.url ? (
                    <img
                      src={listing.primary_image.url}
                      alt=""
                      className="h-full w-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <ImagePlaceholder compact />
                  )}
                </div>
                <div>
                  <Link
                    to={`/app/listings/${listing.id}`}
                    className="font-semibold text-foreground hover:text-blue-700"
                  >
                    {listing.short_name}
                  </Link>
                  <p className="max-w-md truncate text-xs text-muted">
                    {listing.title}
                  </p>
                  <p className="text-xs text-muted">
                    {listing.sku || "No SKU"}
                  </p>
                </div>
              </div>
            </td>
            <td className="px-4 py-3">{listing.category.name}</td>
            <td className="px-4 py-3">
              <div className="flex flex-wrap gap-1">
                <StatusPill listing={listing} />
                <Badge tone={listing.is_active ? "success" : "neutral"}>
                  {listing.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </td>
            <td className="px-4 py-3 font-semibold">
              {formatCurrency(listing.price, listing.currency)}
            </td>
            <td className="px-4 py-3">
              {listing.image_count || listing.images?.length || 0}
            </td>
            <td className="px-4 py-3">
              <SupplierSummary listing={listing} />
            </td>
            <td className="px-4 py-3 text-muted">
              {formatDateTime(listing.updated_at)}
            </td>
            <td className="px-4 py-3 text-right">
              <div className="inline-flex items-center gap-1.5">
                <Link to={`/app/listings/${listing.id}/edit`}>
                  <ActionIconButton
                    tone="edit"
                    label={`Edit ${listing.short_name}`}
                  >
                    <HiOutlinePencilSquare className="h-4 w-4" />
                  </ActionIconButton>
                </Link>
                <ActionIconButton
                  tone="delete"
                  label={`Delete ${listing.short_name}`}
                  onClick={() => onDelete(listing)}
                >
                  <HiOutlineTrash className="h-4 w-4" />
                </ActionIconButton>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

function StatusPill({ listing }: { listing: Listing }) {
  return (
    <Badge tone="neutral">
      <span
        className="h-2 w-2 rounded-full"
        style={{
          backgroundColor: sanitizeColor(listing.status?.color) || "#98a2b3",
        }}
      />
      {listing.status?.name || "No status"}
    </Badge>
  );
}

function SupplierSummary({ listing }: { listing: Listing }) {
  const supplier = listing.supplier;
  if (!supplier?.sku) {
    return <span className="text-xs text-muted">Supplier config missing</span>;
  }
  return (
    <div className="text-xs text-muted">
      <p className="font-semibold text-slate-700">Supplier SKU: {supplier.sku}</p>
      <p>
        {supplier.options.length} options · {supplier.colors.length} colors ·{" "}
        {supplier.print_methods.length} print methods ·{" "}
        {supplier.positions.length} positions
      </p>
    </div>
  );
}

function ImagePlaceholder({ compact }: { compact?: boolean }) {
  return (
    <div
      className={clsx(
        "flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 text-muted",
        compact && "text-[10px]",
      )}
    >
      <HiOutlinePhoto className={clsx(compact ? "h-4 w-4" : "h-8 w-8")} />
      {!compact ? (
        <span className="mt-1 text-xs font-semibold">No image</span>
      ) : null}
    </div>
  );
}

function listingToDefaults(listing?: Listing): ListingFormValues {
  return {
    title: listing?.title || "",
    short_name: listing?.short_name || "",
    slug: listing?.slug || "",
    description: listing?.description || "",
    short_description: listing?.short_description || "",
    sku: listing?.sku || "",
    category_id: listing?.category.id || "",
    status_id: listing?.status?.id || "",
    price: listing?.price || "0.00",
    compare_at_price: listing?.compare_at_price || "",
    currency: listing?.currency || "USD",
    tagsText: (listing?.tags || []).join(", "),
    is_active: listing?.is_active ?? true,
    internal_note: listing?.internal_note || "",
    source: listing?.source || "",
    external_url: listing?.external_url || "",
    published_at: listing?.published_at
      ? listing.published_at.slice(0, 16)
      : "",
    metadataText: JSON.stringify(listing?.metadata || {}, null, 2),
    extraFieldsText: JSON.stringify(listing?.extra_fields || {}, null, 2),
  };
}

function valuesToRequest(
  values: ListingFormValues,
  supplier?: Listing["supplier"],
): ListingRequest {
  return {
    title: values.title,
    short_name: values.short_name,
    slug: values.slug || undefined,
    description: values.description,
    short_description: values.short_description || undefined,
    sku: values.sku || undefined,
    supplier: supplier
      ? {
          sku: supplier.sku || undefined,
          options: supplier.options,
          colors: supplier.colors,
          print_methods: supplier.print_methods,
          positions: supplier.positions,
        }
      : undefined,
    category_id: values.category_id,
    status_id: values.status_id || undefined,
    price: values.price,
    compare_at_price: values.compare_at_price || undefined,
    currency: values.currency,
    tags: normalizeTags(values.tagsText.split(",")),
    is_active: values.is_active,
    internal_note: values.internal_note || undefined,
    source: values.source || undefined,
    external_url: values.external_url || undefined,
    published_at: values.published_at
      ? new Date(values.published_at).toISOString()
      : undefined,
    metadata: jsonObjectFromText(values.metadataText),
    extra_fields: jsonObjectFromText(values.extraFieldsText),
  };
}

export function ListingCreatePage() {
  return <ListingFormPage mode="create" />;
}

export function ListingEditPage() {
  return <ListingFormPage mode="edit" />;
}

function ListingFormPage({ mode }: { mode: "create" | "edit" }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const detail = useQuery({
    queryKey: queryKeys.listings.detail(id || ""),
    queryFn: () => listingApi.detail(id || ""),
    enabled: mode === "edit" && Boolean(id),
  });
  const categories = useQuery({
    queryKey: queryKeys.categories.list({ page_size: 200, is_active: true }),
    queryFn: () =>
      categoryApi.list({ page: 1, page_size: 200, is_active: true }),
  });
  const statuses = useQuery({
    queryKey: queryKeys.statuses.list({ page_size: 200, is_active: true }),
    queryFn: () => statusApi.list({ page: 1, page_size: 200, is_active: true }),
  });
  const [serverError, setServerError] = useState<string | null>(null);
  const [supplierOpen, setSupplierOpen] = useState(mode === "create");
  const [supplier, setSupplier] = useState<Listing["supplier"]>({
    sku: "",
    options: [],
    colors: [],
    print_methods: [],
    positions: [],
    ready: false,
  });
  const form = useForm<ListingFormValues>({
    resolver: zodResolver(listingSchema),
    values: listingToDefaults(mode === "edit" ? detail.data : undefined),
  });
  useEffect(() => {
    if (mode === "edit" && detail.data?.supplier) {
      setSupplier(detail.data.supplier);
    }
  }, [detail.data, mode]);
  const save = useMutation({
    mutationFn: (values: ListingFormValues) =>
      mode === "edit" && id
        ? listingApi.update(id, valuesToRequest(values, supplier))
        : listingApi.create(valuesToRequest(values, supplier)),
    onSuccess: async (listing) => {
      await queryClient.invalidateQueries({ queryKey: ["listings"] });
      toast.push({
        type: "success",
        title: mode === "edit" ? "Listing updated" : "Listing created",
      });
      navigate(
        mode === "edit"
          ? `/app/listings/${listing.id}`
          : `/app/listings/${listing.id}/edit`,
      );
    },
    onError: (error) =>
      setServerError(
        error instanceof ApiError ? error.message : "Unable to save listing",
      ),
  });
  if (mode === "edit" && detail.isLoading) return <SkeletonRows rows={8} />;
  if (mode === "edit" && detail.isError)
    return (
      <ErrorState
        title="Listing not found"
        message="The listing could not be loaded."
      />
    );
  return (
    <div className="space-y-5">
      <PageHeader
        title={
          mode === "edit" ? `Edit ${detail.data?.short_name}` : "Create Listing"
        }
        description="Maintain operational listing data with compact sections and full image management after save."
        action={
          <Link to="/app/listings">
            <Button variant="secondary">
              <HiOutlineArrowLeft />
              Back
            </Button>
          </Link>
        }
      />
      <form
        className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]"
        onSubmit={form.handleSubmit((values) => save.mutate(values))}
      >
        <div className="space-y-5">
          <Card className="grid gap-4 p-5">
            <SectionTitle
              title="General information"
              description="Core searchable fields and product copy."
            />
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Short name"
                error={form.formState.errors.short_name?.message}
              >
                <Input {...form.register("short_name")} />
              </Field>
              <Field
                label="Full title"
                error={form.formState.errors.title?.message}
              >
                <Input {...form.register("title")} />
              </Field>
              <Field label="Slug">
                <Input {...form.register("slug")} />
              </Field>
              <Field label="SKU">
                <Input {...form.register("sku")} />
              </Field>
            </div>
            <Field label="Short description">
              <Textarea
                className="min-h-20"
                {...form.register("short_description")}
              />
            </Field>
            <Field
              label="Description"
              error={form.formState.errors.description?.message}
            >
              <Textarea {...form.register("description")} />
            </Field>
          </Card>
          {mode === "edit" && id ? (
            <ImageManager listingId={id} />
          ) : (
            <Card className="p-5">
              <SectionTitle
                title="Images"
                description="Save the listing first to unlock the 15-slot image manager."
              />
            </Card>
          )}
          <Card className="grid gap-4 p-5">
            <SectionTitle
              title="Additional metadata"
              description="Optional source, notes, and structured JSON fields."
            />
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Source">
                <Input {...form.register("source")} />
              </Field>
              <Field
                label="External URL"
                error={form.formState.errors.external_url?.message}
              >
                <Input {...form.register("external_url")} />
              </Field>
            </div>
            <Field label="Internal note">
              <Textarea {...form.register("internal_note")} />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Metadata JSON">
                <Textarea
                  className="font-mono text-xs"
                  {...form.register("metadataText")}
                />
              </Field>
              <Field label="Extra fields JSON">
                <Textarea
                  className="font-mono text-xs"
                  {...form.register("extraFieldsText")}
                />
              </Field>
            </div>
          </Card>
        </div>
        <aside className="space-y-5 xl:sticky xl:top-20 xl:self-start">
          <Card className="grid gap-4 p-5">
            <SectionTitle title="Publishing" />
            <Switch
              checked={form.watch("is_active")}
              onChange={(checked) => form.setValue("is_active", checked)}
              label={form.watch("is_active") ? "Active" : "Inactive"}
            />
            <Field label="Published at">
              <Input type="datetime-local" {...form.register("published_at")} />
            </Field>
          </Card>
          <Card className="grid gap-4 p-5">
            <button
              type="button"
              className="flex items-center justify-between gap-3 text-left"
              onClick={() => setSupplierOpen((value) => !value)}
              aria-expanded={supplierOpen}
            >
              <SectionTitle
                title="Supplier Production Configuration"
                description={
                  supplier.sku
                    ? `${supplier.options.length} options, ${supplier.colors.length} colors, ${supplier.print_methods.length} print methods, ${supplier.positions.length} positions`
                    : "Supplier values are selected by employees on orders."
                }
              />
              <HiOutlineChevronDown
                className={clsx(
                  "h-5 w-5 text-muted transition",
                  supplierOpen && "rotate-180",
                )}
              />
            </button>
            {supplierOpen ? (
              <div className="grid gap-4">
                <Field label="Supplier SKU">
                  <Input
                    placeholder="TSHIRT-001"
                    value={supplier.sku || ""}
                    onChange={(event) =>
                      setSupplier((current) => ({
                        ...current,
                        sku: event.target.value,
                      }))
                    }
                  />
                </Field>
                <TagInput
                  label="Options"
                  values={supplier.options}
                  placeholder="S, M, L, XL"
                  onChange={(values) =>
                    setSupplier((current) => ({
                      ...current,
                      options: values,
                    }))
                  }
                />
                <TagInput
                  label="Colors"
                  values={supplier.colors}
                  placeholder="White, Black"
                  onChange={(values) =>
                    setSupplier((current) => ({
                      ...current,
                      colors: values,
                    }))
                  }
                />
                <TagInput
                  label="Print Methods"
                  values={supplier.print_methods}
                  placeholder="DTF Print, UV Print"
                  onChange={(values) =>
                    setSupplier((current) => ({
                      ...current,
                      print_methods: values,
                    }))
                  }
                />
                <TagInput
                  label="Positions"
                  values={supplier.positions}
                  placeholder="front, back"
                  onChange={(values) =>
                    setSupplier((current) => ({
                      ...current,
                      positions: values,
                    }))
                  }
                />
              </div>
            ) : null}
          </Card>
          <Card className="grid gap-4 p-5">
            <SectionTitle title="Classification" />
            <Field
              label="Category"
              error={form.formState.errors.category_id?.message}
            >
              <Select {...form.register("category_id")}>
                <option value="">Select category</option>
                {categories.data?.data.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Listing status">
              <Select {...form.register("status_id")}>
                <option value="">Use backend default</option>
                {statuses.data?.data.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.name}
                  </option>
                ))}
              </Select>
            </Field>
          </Card>
          <Card className="grid gap-4 p-5">
            <SectionTitle title="Pricing and tags" />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <Field label="Price" error={form.formState.errors.price?.message}>
                <Input inputMode="decimal" {...form.register("price")} />
              </Field>
              <Field
                label="Compare-at price"
                error={form.formState.errors.compare_at_price?.message}
              >
                <Input
                  inputMode="decimal"
                  {...form.register("compare_at_price")}
                />
              </Field>
            </div>
            <Field
              label="Currency"
              error={form.formState.errors.currency?.message}
            >
              <Input maxLength={3} {...form.register("currency")} />
            </Field>
            <Field label="Tags" hint="Separate tags with commas.">
              <Input {...form.register("tagsText")} />
            </Field>
          </Card>
          {serverError ? (
            <ErrorState title="Save failed" message={serverError} />
          ) : null}
          <Card className="flex justify-end gap-3 p-3">
            <Link to="/app/listings">
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </Link>
            <Button disabled={save.isPending}>
              {save.isPending ? (
                <Spinner label="Saving" />
              ) : mode === "edit" ? (
                "Save changes"
              ) : (
                "Create listing"
              )}
            </Button>
          </Card>
        </aside>
      </form>
    </div>
  );
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div>
      <h2 className="text-base font-bold text-foreground">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm text-muted">{description}</p>
      ) : null}
    </div>
  );
}

export function ListingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const detail = useQuery({
    queryKey: queryKeys.listings.detail(id || ""),
    queryFn: () => listingApi.detail(id || ""),
    enabled: Boolean(id),
  });
  const remove = useMutation({
    mutationFn: () => listingApi.remove(id || ""),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["listings"] });
      toast.push({ type: "success", title: "Listing deleted" });
      navigate("/app/listings");
    },
    onError: (error) =>
      toast.push({
        type: "error",
        title: "Delete failed",
        message:
          error instanceof ApiError
            ? error.message
            : "Unable to delete listing",
      }),
  });
  if (detail.isLoading) return <SkeletonRows rows={8} />;
  if (detail.isError || !detail.data)
    return (
      <ErrorState
        title="Listing not found"
        message="The listing could not be loaded."
      />
    );
  const listing = detail.data;
  return (
    <div className="space-y-5">
      <PageHeader
        title={listing.short_name}
        description={listing.title}
        action={
          <>
            <Link to={`/app/listings/${listing.id}/edit`}>
              <Button variant="soft">
                <HiOutlinePencilSquare />
                Edit
              </Button>
            </Link>
            <Button
              variant="ghost"
              className="text-red-600 hover:bg-red-50"
              onClick={() => setConfirmDelete(true)}
            >
              <HiOutlineTrash />
              Delete
            </Button>
          </>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <Card className="p-4">
          <ImageGallery listing={listing} />
        </Card>
        <Card className="p-5">
          <div className="mb-5 flex flex-wrap gap-2">
            <StatusPill listing={listing} />
            <Badge tone={listing.is_active ? "success" : "neutral"}>
              {listing.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
          <dl className="grid gap-4 text-sm md:grid-cols-2">
            <Info label="Category" value={listing.category.name} />
            <Info
              label="Price"
              value={formatCurrency(listing.price, listing.currency)}
            />
            <Info label="SKU" value={listing.sku || "None"} />
            <div>
              <dt className="text-xs font-semibold uppercase text-muted">
                Supplier
              </dt>
              <dd className="mt-1">
                <SupplierSummary listing={listing} />
              </dd>
            </div>
            <Info
              label="Images"
              value={String(listing.image_count || listing.images?.length || 0)}
            />
            <Info label="Created" value={formatDateTime(listing.created_at)} />
            <Info label="Updated" value={formatDateTime(listing.updated_at)} />
          </dl>
        </Card>
      </div>
      <Card className="p-5">
        <SectionTitle title="Description" />
        <p className="mt-3 whitespace-pre-wrap text-sm text-muted">
          {listing.description}
        </p>
      </Card>
      <Card className="p-5">
        <SectionTitle title="Internal fields" />
        <pre className="mt-3 overflow-auto rounded-xl bg-slate-50 p-4 text-xs">
          {JSON.stringify(
            {
              tags: listing.tags,
              metadata: listing.metadata,
              extra_fields: listing.extra_fields,
              internal_note: listing.internal_note,
              source: listing.source,
              external_url: listing.external_url,
            },
            null,
            2,
          )}
        </pre>
      </Card>
      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${listing.short_name}?`}
        message="This action cannot be undone."
        danger
        confirmLabel="Delete"
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => remove.mutate()}
      />
    </div>
  );
}

function TagInput({
  label,
  values,
  placeholder,
  onChange,
}: {
  label: string;
  values: string[];
  placeholder: string;
  onChange: (values: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  function addValue(raw: string) {
    const value = raw.trim();
    if (!value) return;
    if (values.some((item) => item.toLowerCase() === value.toLowerCase())) {
      setError("Duplicate values are ignored.");
      setDraft("");
      return;
    }
    setError("");
    onChange([...values, value]);
    setDraft("");
  }

  return (
    <Field label={label} error={error}>
      <div className="rounded-[10px] border border-border bg-white p-2 shadow-sm focus-within:border-primary">
        <div className="flex flex-wrap gap-1.5">
          {values.map((value) => (
            <span
              key={value}
              className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700"
            >
              {value}
              <button
                type="button"
                aria-label={`Remove ${value}`}
                onClick={() =>
                  onChange(values.filter((item) => item !== value))
                }
              >
                <HiOutlineXMark className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
          <input
            value={draft}
            placeholder={values.length ? "" : placeholder}
            className="min-w-[120px] flex-1 bg-transparent px-1 py-1 text-sm outline-none"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addValue(draft);
              }
              if (event.key === "Backspace" && !draft && values.length) {
                onChange(values.slice(0, -1));
              }
            }}
            onBlur={() => addValue(draft)}
          />
        </div>
      </div>
    </Field>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-muted">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}

function ImageGallery({ listing }: { listing: Listing }) {
  const images = listing.images || [];
  const primary =
    listing.primary_image ||
    images.find((image) => image.is_primary) ||
    images[0];
  if (!primary)
    return (
      <EmptyState
        title="No images"
        message="Images can be uploaded from the edit page."
      />
    );
  return (
    <div>
      <img
        src={primary.url}
        alt={primary.original_filename}
        className="aspect-square w-full rounded-xl bg-slate-100 object-contain"
      />
      <div className="mt-3 grid grid-cols-5 gap-2">
        {images.map((image) => (
          <img
            key={image.id}
            src={image.url}
            alt={image.original_filename}
            className="aspect-square rounded-lg bg-slate-100 object-contain"
          />
        ))}
      </div>
    </div>
  );
}

function ImageManager({ listingId }: { listingId: string }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const images = useQuery({
    queryKey: queryKeys.images.list(listingId),
    queryFn: () => imageApi.list(listingId),
  });
  const [pending, setPending] = useState<PendingImage[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<ListingImage | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(
    () => () => pending.forEach((item) => URL.revokeObjectURL(item.url)),
    [pending],
  );

  const invalidate = async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.images.list(listingId),
    });
    await queryClient.invalidateQueries({ queryKey: ["listings"] });
  };
  const upload = useMutation({
    mutationFn: () =>
      imageApi.upload(
        listingId,
        pending.map((item) => item.file),
      ),
    onSuccess: async () => {
      pending.forEach((item) => URL.revokeObjectURL(item.url));
      setPending([]);
      await invalidate();
      toast.push({ type: "success", title: "Images uploaded" });
    },
    onError: (error) =>
      toast.push({
        type: "error",
        title: "Upload failed",
        message:
          error instanceof ApiError ? error.message : "Unable to upload images",
      }),
  });
  const setPrimary = useMutation({
    mutationFn: (imageId: string) => imageApi.setPrimary(listingId, imageId),
    onSuccess: async () => {
      await invalidate();
      toast.push({ type: "success", title: "Primary image updated" });
    },
  });
  const remove = useMutation({
    mutationFn: (imageId: string) => imageApi.remove(listingId, imageId),
    onSuccess: async () => {
      setDeleteTarget(null);
      await invalidate();
      toast.push({ type: "success", title: "Image deleted" });
    },
  });
  const reorder = useMutation({
    mutationFn: (ids: string[]) => imageApi.reorder(listingId, ids),
    onSuccess: async () => {
      await invalidate();
      toast.push({ type: "success", title: "Images reordered" });
    },
    onError: () =>
      toast.push({
        type: "error",
        title: "Reorder failed",
        message: "The previous order was kept.",
      }),
  });

  const existing = useMemo(
    () => [...(images.data || [])].sort((a, b) => a.sort_order - b.sort_order),
    [images.data],
  );
  const used = existing.length + pending.length;
  const slots = Array.from({ length: MAX_IMAGES });
  const firstEmpty = used;

  function validateFiles(files: File[]) {
    const available = MAX_IMAGES - used;
    const selected = files.slice(0, available);
    const next = selected.map((file) => ({
      id: crypto.randomUUID(),
      file,
      url: URL.createObjectURL(file),
      error: !appConfig.upload.allowedTypes.includes(file.type)
        ? "Unsupported type"
        : file.size > appConfig.upload.maxFileSizeBytes
          ? "File too large"
          : undefined,
    }));
    if (files.length > available)
      toast.push({
        type: "error",
        title: "Too many images",
        message: `${available} slots are available.`,
      });
    setPending((current) => [...current, ...next]);
  }

  function onFileInput(event: ChangeEvent<HTMLInputElement>) {
    validateFiles(Array.from(event.target.files || []));
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    validateFiles(Array.from(event.dataTransfer.files || []));
  }

  function moveImage(from: number, to: number) {
    if (
      from === to ||
      from < 0 ||
      to < 0 ||
      from >= existing.length ||
      to >= existing.length
    )
      return;
    const next = [...existing];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    reorder.mutate(next.map((image) => image.id));
  }

  const previewImage = previewIndex === null ? null : existing[previewIndex];

  return (
    <Card className="grid gap-4 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <SectionTitle
          title="Images"
          description="Uploads are saved as one batch. If one file fails, none of the selected files will be saved."
        />
        <div className="text-sm text-muted">
          <span className="font-semibold text-foreground">
            {used} of {MAX_IMAGES}
          </span>{" "}
          images - {MAX_IMAGES - used} slots available
        </div>
      </div>
      {pending.length ? (
        <SoftPanel className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            <span className="font-semibold">{pending.length}</span> pending
            image{pending.length === 1 ? "" : "s"}
          </div>
          <Button
            type="button"
            disabled={upload.isPending || pending.some((item) => item.error)}
            onClick={() => upload.mutate()}
          >
            {upload.isPending ? (
              <Spinner label="Uploading" />
            ) : (
              "Upload selected images"
            )}
          </Button>
        </SoftPanel>
      ) : null}
      <div
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5"
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
      >
        {slots.map((_, index) => {
          const image = existing[index];
          const pendingImage = pending[index - existing.length];
          const empty = !image && !pendingImage;
          return (
            <div
              key={image?.id || pendingImage?.id || index}
              className={clsx(
                "group relative aspect-square overflow-hidden rounded-xl border bg-slate-50",
                image?.is_primary
                  ? "border-primary ring-2 ring-blue-100"
                  : empty
                    ? "border-dashed border-slate-300 hover:border-primary"
                    : "border-border",
              )}
              draggable={Boolean(image)}
              onDragStart={() => setDragIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                if (dragIndex !== null) moveImage(dragIndex, index);
                setDragIndex(null);
              }}
            >
              {image ? (
                <>
                  <button
                    type="button"
                    className="h-full w-full bg-[linear-gradient(45deg,#f8fafc_25%,transparent_25%),linear-gradient(-45deg,#f8fafc_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f8fafc_75%),linear-gradient(-45deg,transparent_75%,#f8fafc_75%)] bg-[length:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0px]"
                    onClick={() => setPreviewIndex(index)}
                  >
                    <img
                      src={image.url}
                      alt={image.original_filename}
                      className="h-full w-full object-contain"
                    />
                  </button>
                  <Badge tone="neutral" className="absolute left-2 top-2">
                    #{index + 1}
                  </Badge>
                  {image.is_primary ? (
                    <Badge tone="primary" className="absolute right-2 top-2">
                      <HiOutlineStar />
                      Primary
                    </Badge>
                  ) : null}
                  <div className="absolute inset-x-2 bottom-2 flex justify-end gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                    <ActionIconButton
                      type="button"
                      tone="preview"
                      label="Preview image"
                      onClick={() => setPreviewIndex(index)}
                    >
                      <HiOutlineEye className="h-4 w-4" />
                    </ActionIconButton>
                    <ActionIconButton
                      type="button"
                      tone="primary"
                      label="Set primary image"
                      disabled={image.is_primary}
                      onClick={() => setPrimary.mutate(image.id)}
                    >
                      <HiOutlineStar className="h-4 w-4" />
                    </ActionIconButton>
                    <ActionIconButton
                      type="button"
                      tone="delete"
                      label="Delete image"
                      onClick={() => setDeleteTarget(image)}
                    >
                      <HiOutlineTrash className="h-4 w-4" />
                    </ActionIconButton>
                  </div>
                </>
              ) : pendingImage ? (
                <>
                  <img
                    src={pendingImage.url}
                    alt={pendingImage.file.name}
                    className="h-full w-full object-contain"
                  />
                  <Badge
                    tone={pendingImage.error ? "danger" : "warning"}
                    className="absolute left-2 top-2"
                  >
                    {pendingImage.error || "Pending"}
                  </Badge>
                  <button
                    type="button"
                    className="absolute right-2 top-2 rounded-full bg-white p-1 text-danger shadow"
                    aria-label="Remove pending image"
                    onClick={() => {
                      URL.revokeObjectURL(pendingImage.url);
                      setPending((current) =>
                        current.filter((item) => item.id !== pendingImage.id),
                      );
                    }}
                  >
                    <HiOutlineXMark className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <label
                  className={clsx(
                    "flex h-full w-full cursor-pointer flex-col items-center justify-center text-center text-muted transition hover:bg-blue-50",
                    index === firstEmpty && "bg-blue-50/60 text-blue-700",
                  )}
                >
                  <HiOutlinePhoto className="h-7 w-7" />
                  <span className="mt-2 text-xs font-semibold">
                    {index === firstEmpty ? "Add images" : `Slot ${index + 1}`}
                  </span>
                  <input
                    type="file"
                    multiple
                    accept={appConfig.upload.allowedTypes.join(",")}
                    className="sr-only"
                    onChange={onFileInput}
                  />
                </label>
              )}
            </div>
          );
        })}
      </div>
      {images.isLoading ? <SkeletonRows rows={3} /> : null}
      {!images.isLoading && !existing.length && !pending.length ? (
        <EmptyState
          title="No images uploaded"
          message="Use any empty slot or drag files onto the grid."
        />
      ) : null}
      {previewImage ? (
        <ImagePreview
          image={previewImage}
          index={previewIndex || 0}
          total={existing.length}
          onClose={() => setPreviewIndex(null)}
          onPrevious={() =>
            setPreviewIndex((value) =>
              value === null ? 0 : Math.max(0, value - 1),
            )
          }
          onNext={() =>
            setPreviewIndex((value) =>
              value === null ? 0 : Math.min(existing.length - 1, value + 1),
            )
          }
          onPrimary={() => setPrimary.mutate(previewImage.id)}
          onDelete={() => setDeleteTarget(previewImage)}
        />
      ) : null}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.original_filename}?`}
        message="This image will be removed from the listing after the backend confirms deletion."
        danger
        confirmLabel="Delete image"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget.id)}
      />
    </Card>
  );
}

function ImagePreview({
  image,
  index,
  total,
  onClose,
  onPrevious,
  onNext,
  onPrimary,
  onDelete,
}: {
  image: ListingImage;
  index: number;
  total: number;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onPrimary: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="grid max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-soft lg:grid-cols-[1fr_320px]">
        <div className="flex min-h-[360px] items-center justify-center bg-slate-100 p-4">
          <img
            src={image.url}
            alt={image.original_filename}
            className="max-h-[78vh] max-w-full object-contain"
          />
        </div>
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-bold">{image.original_filename}</h2>
              <p className="text-sm text-muted">
                Position {index + 1} of {total}
              </p>
            </div>
            <Button
              variant="icon"
              onClick={onClose}
              aria-label="Close image preview"
            >
              <HiOutlineXMark className="h-5 w-5" />
            </Button>
          </div>
          <dl className="grid gap-3 text-sm">
            <Info
              label="Dimensions"
              value={
                image.width && image.height
                  ? `${image.width} x ${image.height}`
                  : "Not provided"
              }
            />
            <Info label="File size" value={formatFileSize(image.size_bytes)} />
            <Info label="Content type" value={image.content_type} />
          </dl>
          <div className="mt-auto flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onPrevious}
              disabled={index === 0}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onNext}
              disabled={index >= total - 1}
            >
              Next
            </Button>
            <Button
              type="button"
              variant="soft"
              onClick={onPrimary}
              disabled={image.is_primary}
            >
              <HiOutlineStar />
              Set primary
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="text-red-600 hover:bg-red-50"
              onClick={onDelete}
            >
              <HiOutlineTrash />
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
