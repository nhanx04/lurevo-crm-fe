import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HiOutlineArrowLeft, HiOutlinePhoto, HiOutlinePlus, HiOutlineStar, HiOutlineTrash } from 'react-icons/hi2';
import { categoryApi, imageApi, listingApi, statusApi } from '@/api/services';
import { queryKeys } from '@/api/queryKeys';
import { ApiError, Listing, ListingImage, ListingRequest } from '@/types/api';
import { ListingFormValues, listingSchema } from '@/schemas/forms';
import { appConfig } from '@/config/app';
import { Badge, Button, Card, Field, Input, PageHeader, PaginationControls, Select, Table, Textarea } from '@/components/ui';
import { ConfirmDialog, EmptyState, ErrorState, SkeletonRows, Spinner, useToast } from '@/components/feedback';
import { formatCurrency, formatDateTime, formatFileSize, sanitizeColor } from '@/utils/format';
import { jsonObjectFromText, normalizeTags } from '@/utils/forms';
import { useUrlParams } from '@/hooks/useUrlParams';

function activeParam(value?: string): boolean | '' {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return '';
}

export function ListingsPage() {
  const { params, setParam, setPage } = useUrlParams();
  const [deleteTarget, setDeleteTarget] = useState<Listing | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();
  const listParams = useMemo(() => ({
    page: Number(params.page || 1),
    page_size: Number(params.page_size || 20),
    search: params.search,
    short_name: params.short_name,
    category_id: params.category_id,
    status_id: params.status_id,
    is_active: activeParam(params.is_active),
    min_price: params.min_price,
    max_price: params.max_price,
    tag: params.tag,
    sort_by: params.sort_by || 'created_at',
    sort_order: (params.sort_order || 'desc') as 'asc' | 'desc',
  }), [params]);
  const listings = useQuery({ queryKey: queryKeys.listings.list(listParams), queryFn: () => listingApi.list(listParams) });
  const categories = useQuery({ queryKey: queryKeys.categories.list({ page_size: 200 }), queryFn: () => categoryApi.list({ page: 1, page_size: 200 }) });
  const statuses = useQuery({ queryKey: queryKeys.statuses.list({ page_size: 200 }), queryFn: () => statusApi.list({ page: 1, page_size: 200 }) });
  const remove = useMutation({
    mutationFn: (id: string) => listingApi.remove(id),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['listings'] }); toast.push({ type: 'success', title: 'Listing deleted' }); setDeleteTarget(null); },
    onError: (error) => toast.push({ type: 'error', title: 'Delete failed', message: error instanceof ApiError ? error.message : 'Unable to delete listing' }),
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Listings" description="Search, filter, and maintain the internal listing repository." action={<Link to="/app/listings/new"><Button><HiOutlinePlus />Create Listing</Button></Link>} />
      <div className="grid gap-3 rounded-lg border border-border bg-surface p-4 lg:grid-cols-4">
        <Input placeholder="Search title, short name, SKU" value={params.search || ''} onChange={(event) => setParam('search', event.target.value)} />
        <Input placeholder="Short name" value={params.short_name || ''} onChange={(event) => setParam('short_name', event.target.value)} />
        <Select value={params.category_id || ''} onChange={(event) => setParam('category_id', event.target.value)}><option value="">All categories</option>{categories.data?.data.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</Select>
        <Select value={params.status_id || ''} onChange={(event) => setParam('status_id', event.target.value)}><option value="">All statuses</option>{statuses.data?.data.map((status) => <option key={status.id} value={status.id}>{status.name}</option>)}</Select>
        <Select value={params.is_active || ''} onChange={(event) => setParam('is_active', event.target.value)}><option value="">All states</option><option value="true">Active</option><option value="false">Inactive</option></Select>
        <Input placeholder="Min price" value={params.min_price || ''} onChange={(event) => setParam('min_price', event.target.value)} />
        <Input placeholder="Max price" value={params.max_price || ''} onChange={(event) => setParam('max_price', event.target.value)} />
        <Input placeholder="Tag" value={params.tag || ''} onChange={(event) => setParam('tag', event.target.value)} />
        <Select value={params.sort_by || 'created_at'} onChange={(event) => setParam('sort_by', event.target.value)}><option value="created_at">Created</option><option value="updated_at">Updated</option><option value="short_name">Short name</option><option value="price">Price</option></Select>
        <Select value={params.sort_order || 'desc'} onChange={(event) => setParam('sort_order', event.target.value)}><option value="desc">Descending</option><option value="asc">Ascending</option></Select>
        <Button variant="secondary" onClick={() => window.history.replaceState(null, '', '/app/listings')}>Clear filters</Button>
      </div>
      {listings.isLoading ? <SkeletonRows /> : listings.isError ? <ErrorState message="Could not load listings." onRetry={() => void listings.refetch()} /> : listings.data?.data.length ? (
        <div>
          <Table>
            <thead className="bg-slate-50 text-xs uppercase text-muted"><tr><th className="px-4 py-3">Listing</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Images</th><th className="px-4 py-3">Updated</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-border">
              {listings.data.data.map((listing) => (
                <tr key={listing.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img src={listing.primary_image?.url || ''} alt="" className="h-12 w-12 rounded-md bg-slate-100 object-cover" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
                      <div><Link to={`/app/listings/${listing.id}`} className="font-semibold text-primary">{listing.short_name}</Link><p className="max-w-md truncate text-xs text-muted">{listing.title}</p><p className="text-xs text-muted">{listing.sku || 'No SKU'}</p></div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{listing.category.name}</td>
                  <td className="px-4 py-3"><StatusBadge listing={listing} /></td>
                  <td className="px-4 py-3">{formatCurrency(listing.price, listing.currency)}</td>
                  <td className="px-4 py-3">{listing.image_count || listing.images?.length || 0}</td>
                  <td className="px-4 py-3 text-muted">{formatDateTime(listing.updated_at)}</td>
                  <td className="px-4 py-3 text-right"><Link to={`/app/listings/${listing.id}/edit`}><Button variant="ghost">Edit</Button></Link><Button variant="ghost" className="text-danger" onClick={() => setDeleteTarget(listing)}>Delete</Button></td>
                </tr>
              ))}
            </tbody>
          </Table>
          <PaginationControls page={listings.data.pagination.page} totalPages={listings.data.pagination.total_pages} totalItems={listings.data.pagination.total_items} onPage={setPage} />
        </div>
      ) : <EmptyState title="No listings found" message="Create a listing or adjust filters." action={<Link to="/app/listings/new"><Button>Create listing</Button></Link>} />}
      <ConfirmDialog open={Boolean(deleteTarget)} title={`Delete ${deleteTarget?.short_name}?`} message="This action cannot be undone. Images will be deleted through the backend storage flow." danger confirmLabel="Delete" onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && remove.mutate(deleteTarget.id)} />
    </div>
  );
}

function StatusBadge({ listing }: { listing: Listing }) {
  return <span className="inline-flex items-center gap-2 rounded-md border border-border px-2 py-1 text-xs font-semibold"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: sanitizeColor(listing.status?.color) || '#64748b' }} />{listing.status?.name || 'No status'} · {listing.is_active ? 'Active' : 'Inactive'}</span>;
}

function listingToDefaults(listing?: Listing): ListingFormValues {
  return {
    title: listing?.title || '',
    short_name: listing?.short_name || '',
    slug: listing?.slug || '',
    description: listing?.description || '',
    short_description: listing?.short_description || '',
    sku: listing?.sku || '',
    category_id: listing?.category.id || '',
    status_id: listing?.status?.id || '',
    price: listing?.price || '0.00',
    compare_at_price: listing?.compare_at_price || '',
    currency: listing?.currency || 'USD',
    tagsText: (listing?.tags || []).join(', '),
    is_active: listing?.is_active ?? true,
    internal_note: listing?.internal_note || '',
    source: listing?.source || '',
    external_url: listing?.external_url || '',
    published_at: listing?.published_at ? listing.published_at.slice(0, 16) : '',
    metadataText: JSON.stringify(listing?.metadata || {}, null, 2),
    extraFieldsText: JSON.stringify(listing?.extra_fields || {}, null, 2),
  };
}

function valuesToRequest(values: ListingFormValues): ListingRequest {
  return {
    title: values.title,
    short_name: values.short_name,
    slug: values.slug || undefined,
    description: values.description,
    short_description: values.short_description || undefined,
    sku: values.sku || undefined,
    category_id: values.category_id,
    status_id: values.status_id || undefined,
    price: values.price,
    compare_at_price: values.compare_at_price || undefined,
    currency: values.currency,
    tags: normalizeTags(values.tagsText.split(',')),
    is_active: values.is_active,
    internal_note: values.internal_note || undefined,
    source: values.source || undefined,
    external_url: values.external_url || undefined,
    published_at: values.published_at ? new Date(values.published_at).toISOString() : undefined,
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

function ListingFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const detail = useQuery({ queryKey: queryKeys.listings.detail(id || ''), queryFn: () => listingApi.detail(id || ''), enabled: mode === 'edit' && Boolean(id) });
  const categories = useQuery({ queryKey: queryKeys.categories.list({ page_size: 200, is_active: true }), queryFn: () => categoryApi.list({ page: 1, page_size: 200, is_active: true }) });
  const statuses = useQuery({ queryKey: queryKeys.statuses.list({ page_size: 200, is_active: true }), queryFn: () => statusApi.list({ page: 1, page_size: 200, is_active: true }) });
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<ListingFormValues>({ resolver: zodResolver(listingSchema), values: listingToDefaults(mode === 'edit' ? detail.data : undefined) });
  const save = useMutation({
    mutationFn: (values: ListingFormValues) => mode === 'edit' && id ? listingApi.update(id, valuesToRequest(values)) : listingApi.create(valuesToRequest(values)),
    onSuccess: async (listing) => {
      await queryClient.invalidateQueries({ queryKey: ['listings'] });
      toast.push({ type: 'success', title: mode === 'edit' ? 'Listing updated' : 'Listing created' });
      navigate(mode === 'edit' ? `/app/listings/${listing.id}` : `/app/listings/${listing.id}/edit`);
    },
    onError: (error) => setServerError(error instanceof ApiError ? error.message : 'Unable to save listing'),
  });
  if (mode === 'edit' && detail.isLoading) return <SkeletonRows rows={8} />;
  if (mode === 'edit' && detail.isError) return <ErrorState title="Listing not found" message="The listing could not be loaded." />;
  return (
    <div className="space-y-5">
      <PageHeader title={mode === 'edit' ? `Edit ${detail.data?.short_name}` : 'Create Listing'} description="Short Name is a concise internal name used for quick search and selection, such as Pet Wood Slice or Wedding Decanter." action={<Link to="/app/listings"><Button variant="secondary"><HiOutlineArrowLeft />Back</Button></Link>} />
      <form className="grid gap-5" onSubmit={form.handleSubmit((values) => save.mutate(values))}>
        <Card className="grid gap-4 p-5">
          <h2 className="font-semibold">Main information</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Short Name" error={form.formState.errors.short_name?.message}><Input {...form.register('short_name')} /></Field>
            <Field label="Full title" error={form.formState.errors.title?.message}><Input {...form.register('title')} /></Field>
            <Field label="Slug"><Input {...form.register('slug')} /></Field>
            <Field label="SKU"><Input {...form.register('sku')} /></Field>
            <Field label="Category" error={form.formState.errors.category_id?.message}><Select {...form.register('category_id')}><option value="">Select category</option>{categories.data?.data.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</Select></Field>
            <Field label="Listing Status"><Select {...form.register('status_id')}><option value="">Use backend default</option>{statuses.data?.data.map((status) => <option key={status.id} value={status.id}>{status.name}</option>)}</Select></Field>
          </div>
          <Field label="Short description"><Textarea {...form.register('short_description')} /></Field>
          <Field label="Description" error={form.formState.errors.description?.message}><Textarea {...form.register('description')} /></Field>
          <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" {...form.register('is_active')} /> Active</label>
        </Card>
        <Card className="grid gap-4 p-5">
          <h2 className="font-semibold">Pricing and tags</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Price" error={form.formState.errors.price?.message}><Input inputMode="decimal" {...form.register('price')} /></Field>
            <Field label="Compare-at price" error={form.formState.errors.compare_at_price?.message}><Input inputMode="decimal" {...form.register('compare_at_price')} /></Field>
            <Field label="Currency" error={form.formState.errors.currency?.message}><Input maxLength={3} {...form.register('currency')} /></Field>
          </div>
          <Field label="Tags" hint="Separate tags with commas. Duplicates are removed before submit."><Input {...form.register('tagsText')} /></Field>
        </Card>
        <Card className="grid gap-4 p-5">
          <h2 className="font-semibold">Additional information</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Source"><Input {...form.register('source')} /></Field>
            <Field label="External URL" error={form.formState.errors.external_url?.message}><Input {...form.register('external_url')} /></Field>
          </div>
          <Field label="Internal note"><Textarea {...form.register('internal_note')} /></Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Metadata JSON"><Textarea className="font-mono" {...form.register('metadataText')} /></Field>
            <Field label="Extra fields JSON"><Textarea className="font-mono" {...form.register('extraFieldsText')} /></Field>
          </div>
        </Card>
        {mode === 'edit' && id ? <ImageManager listingId={id} /> : null}
        {serverError ? <ErrorState title="Save failed" message={serverError} /> : null}
        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-border bg-background/95 py-4 backdrop-blur"><Link to="/app/listings"><Button type="button" variant="secondary">Cancel</Button></Link><Button disabled={save.isPending}>{save.isPending ? <Spinner label="Saving" /> : mode === 'edit' ? 'Save changes' : 'Create listing'}</Button></div>
      </form>
    </div>
  );
}

export function ListingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const detail = useQuery({ queryKey: queryKeys.listings.detail(id || ''), queryFn: () => listingApi.detail(id || ''), enabled: Boolean(id) });
  const remove = useMutation({
    mutationFn: () => listingApi.remove(id || ''),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['listings'] }); toast.push({ type: 'success', title: 'Listing deleted' }); navigate('/app/listings'); },
    onError: (error) => toast.push({ type: 'error', title: 'Delete failed', message: error instanceof ApiError ? error.message : 'Unable to delete listing' }),
  });
  if (detail.isLoading) return <SkeletonRows rows={8} />;
  if (detail.isError || !detail.data) return <ErrorState title="Listing not found" message="The listing could not be loaded." />;
  const listing = detail.data;
  return (
    <div className="space-y-5">
      <PageHeader title={listing.short_name} description={listing.title} action={<><Link to={`/app/listings/${listing.id}/edit`}><Button>Edit</Button></Link><Button variant="danger" onClick={() => setConfirmDelete(true)}>Delete</Button></>} />
      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <Card className="p-5"><ImageGallery listing={listing} /></Card>
        <Card className="p-5">
          <div className="mb-5 flex flex-wrap gap-2"><StatusBadge listing={listing} /><Badge tone={listing.is_active ? 'success' : 'neutral'}>{listing.is_active ? 'Active' : 'Inactive'}</Badge></div>
          <dl className="grid gap-4 text-sm md:grid-cols-2">
            <Info label="Category" value={listing.category.name} /><Info label="Price" value={formatCurrency(listing.price, listing.currency)} /><Info label="SKU" value={listing.sku || 'None'} /><Info label="Images" value={String(listing.image_count || listing.images?.length || 0)} /><Info label="Created" value={formatDateTime(listing.created_at)} /><Info label="Updated" value={formatDateTime(listing.updated_at)} />
          </dl>
        </Card>
      </div>
      <Card className="p-5"><h2 className="font-semibold">Description</h2><p className="mt-3 whitespace-pre-wrap text-sm text-muted">{listing.description}</p></Card>
      <Card className="p-5"><h2 className="font-semibold">Internal fields</h2><pre className="mt-3 overflow-auto rounded-md bg-slate-50 p-4 text-xs">{JSON.stringify({ tags: listing.tags, metadata: listing.metadata, extra_fields: listing.extra_fields, internal_note: listing.internal_note, source: listing.source, external_url: listing.external_url }, null, 2)}</pre></Card>
      <ConfirmDialog open={confirmDelete} title={`Delete ${listing.short_name}?`} message="This action cannot be undone." danger confirmLabel="Delete" onClose={() => setConfirmDelete(false)} onConfirm={() => remove.mutate()} />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-semibold uppercase text-muted">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>;
}

function ImageGallery({ listing }: { listing: Listing }) {
  const images = listing.images || [];
  const primary = listing.primary_image || images.find((image) => image.is_primary) || images[0];
  if (!primary) return <EmptyState title="No images" message="Images can be uploaded from the edit page." />;
  return <div><img src={primary.url} alt={primary.original_filename} className="aspect-square w-full rounded-lg bg-slate-100 object-contain" /><div className="mt-3 grid grid-cols-5 gap-2">{images.map((image) => <img key={image.id} src={image.url} alt={image.original_filename} className="aspect-square rounded-md bg-slate-100 object-cover" />)}</div></div>;
}

function ImageManager({ listingId }: { listingId: string }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const images = useQuery({ queryKey: queryKeys.images.list(listingId), queryFn: () => imageApi.list(listingId) });
  const [files, setFiles] = useState<File[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<ListingImage | null>(null);
  const invalidate = async () => { await queryClient.invalidateQueries({ queryKey: queryKeys.images.list(listingId) }); await queryClient.invalidateQueries({ queryKey: ['listings'] }); };
  const upload = useMutation({ mutationFn: () => imageApi.upload(listingId, files), onSuccess: async () => { setFiles([]); await invalidate(); toast.push({ type: 'success', title: 'Images uploaded' }); }, onError: (error) => toast.push({ type: 'error', title: 'Upload failed', message: error instanceof ApiError ? error.message : 'Unable to upload images' }) });
  const setPrimary = useMutation({ mutationFn: (imageId: string) => imageApi.setPrimary(listingId, imageId), onSuccess: async () => { await invalidate(); toast.push({ type: 'success', title: 'Primary image updated' }); } });
  const remove = useMutation({ mutationFn: (imageId: string) => imageApi.remove(listingId, imageId), onSuccess: async () => { setDeleteTarget(null); await invalidate(); toast.push({ type: 'success', title: 'Image deleted' }); } });
  const reorder = useMutation({ mutationFn: (ids: string[]) => imageApi.reorder(listingId, ids), onSuccess: async () => { await invalidate(); toast.push({ type: 'success', title: 'Images reordered' }); } });
  const existingCount = images.data?.length || 0;
  const onFiles = (selected: FileList | null) => {
    if (!selected) return;
    const next = Array.from(selected).filter((file) => appConfig.upload.allowedTypes.includes(file.type) && file.size <= appConfig.upload.maxFileSizeBytes);
    if (existingCount + files.length + next.length > appConfig.upload.maxImagesPerListing) {
      toast.push({ type: 'error', title: 'Too many images', message: 'A listing can have up to 15 images.' });
      return;
    }
    setFiles((current) => [...current, ...next]);
  };
  return (
    <Card className="grid gap-4 p-5">
      <h2 className="font-semibold">Images</h2>
      <div className="rounded-lg border border-dashed border-border bg-slate-50 p-5 text-center">
        <HiOutlinePhoto className="mx-auto h-8 w-8 text-muted" />
        <p className="mt-2 text-sm font-medium">Select JPEG, PNG, WEBP, GIF, or AVIF images. Uploads are all-or-nothing.</p>
        <p className="mt-1 text-xs text-muted">Maximum 15 images per listing, 10 MB per file.</p>
        <Input type="file" multiple accept={appConfig.upload.allowedTypes.join(',')} className="mt-4" onChange={(event) => onFiles(event.target.files)} />
      </div>
      {files.length ? <div className="space-y-2">{files.map((file, index) => <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"><span>{file.name} · {formatFileSize(file.size)} · {file.type}</span><Button type="button" variant="ghost" onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}>Remove</Button></div>)}<Button type="button" disabled={upload.isPending} onClick={() => upload.mutate()}>{upload.isPending ? <Spinner label="Uploading" /> : 'Upload selected images'}</Button></div> : null}
      {images.isLoading ? <SkeletonRows rows={3} /> : images.data?.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{images.data.map((image, index) => <div key={image.id} className="rounded-lg border border-border p-3"><img src={image.url} alt={image.original_filename} className="aspect-video w-full rounded-md bg-slate-100 object-cover" /><div className="mt-3 flex items-center justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-semibold">{image.original_filename}</p><p className="text-xs text-muted">{formatFileSize(image.size_bytes)}</p></div>{image.is_primary ? <Badge tone="primary">Primary</Badge> : null}</div><div className="mt-3 flex flex-wrap gap-2"><Button type="button" variant="secondary" disabled={image.is_primary} onClick={() => setPrimary.mutate(image.id)}><HiOutlineStar />Primary</Button><Button type="button" variant="secondary" disabled={index === 0} onClick={() => reorder.mutate([image.id, ...images.data.filter((item) => item.id !== image.id).map((item) => item.id)])}>Move first</Button><Button type="button" variant="ghost" className="text-danger" onClick={() => setDeleteTarget(image)}><HiOutlineTrash />Delete</Button></div></div>)}</div> : <EmptyState title="No images uploaded" message="Upload product images after saving the listing." />}
      <ConfirmDialog open={Boolean(deleteTarget)} title={`Delete ${deleteTarget?.original_filename}?`} message="This image will be removed from the listing after the backend confirms deletion." danger confirmLabel="Delete image" onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && remove.mutate(deleteTarget.id)} />
    </Card>
  );
}
