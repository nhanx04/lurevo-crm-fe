import { ChangeEvent, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  HiOutlineClipboardDocument,
  HiOutlineEye,
  HiOutlinePencilSquare,
  HiOutlinePhoto,
  HiOutlinePlus,
  HiOutlineSparkles,
  HiOutlineTrash,
} from "react-icons/hi2";
import { categoryApi, promptApi, promptImageApi } from "@/api/services";
import { queryKeys } from "@/api/queryKeys";
import { ApiError, Prompt, PromptImage, PromptState, PromptType } from "@/types/api";
import { PromptFormValues, promptSchema } from "@/schemas/forms";
import { Modal } from "@/components/layout";
import {
  ActionIconButton,
  Badge,
  Button,
  Field,
  FilterSelect,
  IconBadge,
  Input,
  PaginationControls,
  ResourceToolbar,
  SearchInput,
  Select,
  Table,
  Textarea,
} from "@/components/ui";
import { ConfirmDialog, EmptyState, ErrorState, SkeletonRows, Spinner, useToast } from "@/components/feedback";
import { formatDate } from "@/utils/format";
import { firstFieldError } from "@/utils/forms";
import { useUrlParams } from "@/hooks/useUrlParams";

function tagsFromText(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function truncateContent(value: string) {
  return value.length > 180 ? `${value.slice(0, 180)}...` : value;
}

export function PromptLibraryPage() {
  const { params, setParam, setPage } = useUrlParams();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState<Prompt | null>(null);
  const [viewing, setViewing] = useState<Prompt | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Prompt | null>(null);
  const [previewImage, setPreviewImage] = useState<PromptImage | null>(null);
  const listParams = useMemo(
    () => ({
      page: Number(params.page || 1),
      limit: Number(params.limit || params.page_size || 20),
      search: params.search,
      type: (params.type || "") as PromptType | "",
      category_id: params.category_id,
      state: (params.state || "") as PromptState | "",
      sort: params.sort || "newest",
    }),
    [params],
  );
  const prompts = useQuery({
    queryKey: queryKeys.prompts.list(listParams),
    queryFn: () => promptApi.list(listParams),
  });
  const categories = useQuery({
    queryKey: queryKeys.categories.list({ page_size: 200 }),
    queryFn: () => categoryApi.list({ page: 1, page_size: 200 }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => promptApi.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["prompts"] });
      toast.push({ type: "success", title: "Prompt deleted" });
      setDeleteTarget(null);
    },
    onError: (error) => toast.push({ type: "error", title: "Delete failed", message: error instanceof ApiError ? error.message : "Unable to delete prompt" }),
  });
  const state = useMutation({
    mutationFn: (prompt: Prompt) => promptApi.setState(prompt.id, prompt.state === "active" ? "inactive" : "active"),
    onSuccess: async (_, prompt) => {
      await queryClient.invalidateQueries({ queryKey: ["prompts"] });
      toast.push({ type: "success", title: prompt.state === "active" ? "Prompt deactivated" : "Prompt activated" });
    },
  });
  async function copyPrompt(prompt: Prompt) {
    await navigator.clipboard.writeText(prompt.content);
    toast.push({ type: "success", title: "Prompt copied" });
  }
  return (
    <div className="space-y-5">
      <ResourceToolbar
        search={<SearchInput placeholder="Search prompts, content, descriptions, or tags" value={params.search || ""} onChange={(event) => setParam("search", event.target.value)} />}
        filters={
          <>
            <FilterSelect value={params.type || ""} onChange={(event) => setParam("type", event.target.value)}>
              <option value="">All types</option>
              <option value="design">Design</option>
              <option value="mockup">Mockup</option>
              <option value="other">Other</option>
            </FilterSelect>
            <FilterSelect value={params.category_id || ""} onChange={(event) => setParam("category_id", event.target.value)}>
              <option value="">All categories</option>
              {categories.data?.data.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </FilterSelect>
            <FilterSelect value={params.state || ""} onChange={(event) => setParam("state", event.target.value)}>
              <option value="">All states</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </FilterSelect>
            <FilterSelect value={params.sort || "newest"} onChange={(event) => setParam("sort", event.target.value)}>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="name_asc">Name A-Z</option>
              <option value="name_desc">Name Z-A</option>
              <option value="updated">Recently updated</option>
            </FilterSelect>
          </>
        }
        actions={<Button className="shrink-0" onClick={() => setCreateOpen(true)}><HiOutlinePlus />Create prompt</Button>}
      />
      {prompts.isLoading ? (
        <SkeletonRows />
      ) : prompts.isError ? (
        <ErrorState message="Could not load prompts." onRetry={() => void prompts.refetch()} />
      ) : prompts.data?.data.length ? (
        <div>
          <Table>
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Prompt</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Images</th>
                <th className="px-4 py-3">Tags</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {prompts.data.data.map((prompt) => (
                <tr key={prompt.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <IconBadge className="h-9 w-9 bg-blue-50 text-blue-700"><HiOutlineSparkles className="h-5 w-5" /></IconBadge>
                      <div className="min-w-[260px] max-w-xl">
                        <p className="font-semibold">{prompt.name}</p>
                        <p className="max-h-9 overflow-hidden text-xs text-muted">{truncateContent(prompt.content)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 capitalize">{prompt.type}</td>
                  <td className="px-4 py-3 text-muted">{prompt.category?.name || "None"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {prompt.images.slice(0, 3).map((image) => (
                        <button key={image.id} className="h-10 w-10 overflow-hidden rounded-lg border border-border bg-slate-50" onClick={() => setPreviewImage(image)} aria-label={`Preview ${image.file_name}`}>
                          <img src={image.url} alt={image.alt_text || image.file_name} className="h-full w-full object-contain" />
                        </button>
                      ))}
                      {prompt.image_count > 3 ? <span className="text-xs font-semibold text-muted">+{prompt.image_count - 3}</span> : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex max-w-[220px] flex-wrap gap-1">
                      {prompt.tags.slice(0, 3).map((tag) => <Badge key={tag}>{tag}</Badge>)}
                      {prompt.tags.length > 3 ? <Badge>+{prompt.tags.length - 3}</Badge> : null}
                    </div>
                  </td>
                  <td className="px-4 py-3"><Badge tone={prompt.state === "active" ? "success" : "neutral"}>{prompt.state === "active" ? "Active" : "Inactive"}</Badge></td>
                  <td className="px-4 py-3 text-muted">{formatDate(prompt.updated_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <ActionIconButton tone="preview" label={`View ${prompt.name}`} onClick={() => setViewing(prompt)}><HiOutlineEye className="h-4 w-4" /></ActionIconButton>
                      <ActionIconButton tone="primary" label={`Copy ${prompt.name}`} onClick={() => void copyPrompt(prompt)}><HiOutlineClipboardDocument className="h-4 w-4" /></ActionIconButton>
                      <ActionIconButton tone="edit" label={`Edit ${prompt.name}`} onClick={() => setEditing(prompt)}><HiOutlinePencilSquare className="h-4 w-4" /></ActionIconButton>
                      <ActionIconButton tone="primary" label={prompt.state === "active" ? `Deactivate ${prompt.name}` : `Activate ${prompt.name}`} onClick={() => state.mutate(prompt)}><HiOutlineSparkles className="h-4 w-4" /></ActionIconButton>
                      <ActionIconButton tone="delete" label={`Delete ${prompt.name}`} onClick={() => setDeleteTarget(prompt)}><HiOutlineTrash className="h-4 w-4" /></ActionIconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <PaginationControls page={prompts.data.pagination.page} totalPages={prompts.data.pagination.total_pages} totalItems={prompts.data.pagination.total_items} onPage={setPage} />
        </div>
      ) : (
        <EmptyState title="No prompts yet" message="Save your design and mockup prompts here for quick reuse." action={<Button onClick={() => setCreateOpen(true)}>Create your first prompt</Button>} />
      )}
      {createOpen || editing ? <PromptModal prompt={editing} categories={categories.data?.data || []} onClose={() => { setCreateOpen(false); setEditing(null); }} /> : null}
      {viewing ? <PromptDetail prompt={viewing} onClose={() => setViewing(null)} onCopy={() => void copyPrompt(viewing)} onPreview={setPreviewImage} /> : null}
      {previewImage ? <ImagePreview image={previewImage} onClose={() => setPreviewImage(null)} /> : null}
      <ConfirmDialog open={Boolean(deleteTarget)} title={`Delete ${deleteTarget?.name}?`} message="This removes the prompt and its image relations. Shared images stay available for other prompts." danger confirmLabel="Delete" onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && remove.mutate(deleteTarget.id)} />
    </div>
  );
}

function PromptModal({ prompt, categories, onClose }: { prompt: Prompt | null; categories: { id: string; name: string }[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [serverErrors, setServerErrors] = useState<ApiError | null>(null);
  const [selectedImages, setSelectedImages] = useState<PromptImage[]>(prompt?.images || []);
  const [pickerOpen, setPickerOpen] = useState(false);
  const form = useForm<PromptFormValues>({
    resolver: zodResolver(promptSchema),
    defaultValues: {
      name: prompt?.name || "",
      type: prompt?.type || "design",
      category_id: prompt?.category_id || "",
      content: prompt?.content || "",
      description: prompt?.description || "",
      tagsText: (prompt?.tags || []).join(", "),
      state: prompt?.state || "active",
    },
  });
  const upload = useMutation({
    mutationFn: (files: File[]) => promptImageApi.upload(files),
    onSuccess: (images) => {
      setSelectedImages((items) => [...items, ...images.filter((image) => !items.some((item) => item.id === image.id))]);
      toast.push({ type: "success", title: "Images uploaded" });
    },
    onError: (error) => toast.push({ type: "error", title: "Upload failed", message: error instanceof ApiError ? error.message : "Unsupported image or upload failed" }),
  });
  const save = useMutation({
    mutationFn: (values: PromptFormValues) =>
      (prompt ? promptApi.update(prompt.id, {
        name: values.name, type: values.type, category_id: values.category_id || null, content: values.content,
        description: values.description || null, tags: tagsFromText(values.tagsText), state: values.state,
        image_ids: selectedImages.map((image) => image.id),
      }) : promptApi.create({
        name: values.name, type: values.type, category_id: values.category_id || null, content: values.content,
        description: values.description || null, tags: tagsFromText(values.tagsText), state: values.state,
        image_ids: selectedImages.map((image) => image.id),
      })),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["prompts"] });
      toast.push({ type: "success", title: prompt ? "Prompt updated" : "Prompt created" });
      onClose();
    },
    onError: (error) => setServerErrors(error instanceof ApiError ? error : new ApiError(0)),
  });
  function onFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (files.length) upload.mutate(files);
    event.target.value = "";
  }
  const content = form.watch("content") || "";
  return (
    <Modal title={prompt ? "Edit prompt" : "Create prompt"} onClose={onClose} width="max-w-4xl">
      <form className="grid gap-4" onSubmit={form.handleSubmit((values) => save.mutate(values))}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prompt name" error={form.formState.errors.name?.message || firstFieldError(serverErrors?.details, "name")}><Input {...form.register("name")} /></Field>
          <Field label="Prompt type" error={form.formState.errors.type?.message || firstFieldError(serverErrors?.details, "type")}>
            <Select {...form.register("type")}><option value="design">Design</option><option value="mockup">Mockup</option><option value="other">Other</option></Select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category"><Select {...form.register("category_id")}><option value="">No category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</Select></Field>
          <Field label="State"><Select {...form.register("state")}><option value="active">Active</option><option value="inactive">Inactive</option></Select></Field>
        </div>
        <Field label="Prompt content" error={form.formState.errors.content?.message || firstFieldError(serverErrors?.details, "content")}>
          <Textarea className="min-h-44 font-mono leading-6" {...form.register("content")} />
        </Field>
        <div className="flex items-center justify-between gap-3 text-xs text-muted">
          <span>{content.length.toLocaleString()} characters</span>
          <Button type="button" variant="secondary" size="sm" onClick={() => void navigator.clipboard.writeText(content)}>Copy</Button>
        </div>
        <Field label="Description"><Textarea {...form.register("description")} /></Field>
        <Field label="Tags" hint="Separate tags with commas."><Input {...form.register("tagsText")} /></Field>
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[12px] font-semibold text-slate-700">Reference/result images</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => setPickerOpen(true)}><HiOutlinePhoto />Choose existing</Button>
              <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-blue-700 px-3.5 text-sm font-semibold text-white hover:bg-blue-800">
                <HiOutlinePlus />Upload images
                <input className="hidden" type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={onFiles} />
              </label>
            </div>
          </div>
          {selectedImages.length ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {selectedImages.map((image) => (
                <div key={image.id} className="relative aspect-square overflow-hidden rounded-lg border border-border bg-slate-50">
                  <img src={image.url} alt={image.alt_text || image.file_name} className="h-full w-full object-contain" />
                  <button type="button" className="absolute right-1 top-1 rounded-md bg-white/90 px-2 py-1 text-xs font-semibold text-danger shadow" onClick={() => setSelectedImages((items) => items.filter((item) => item.id !== image.id))}>Remove</button>
                </div>
              ))}
            </div>
          ) : <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted">No images selected.</p>}
        </div>
        {serverErrors ? <p className="text-sm text-danger">{serverErrors.message}</p> : null}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button disabled={save.isPending || upload.isPending}>{save.isPending ? <Spinner label="Saving" /> : "Save prompt"}</Button>
        </div>
      </form>
      {pickerOpen ? <ImagePicker selected={selectedImages} onClose={() => setPickerOpen(false)} onSelect={(images) => setSelectedImages(images)} /> : null}
    </Modal>
  );
}

function ImagePicker({ selected, onSelect, onClose }: { selected: PromptImage[]; onSelect: (images: PromptImage[]) => void; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<PromptImage[]>(selected);
  const images = useQuery({ queryKey: queryKeys.prompts.images({ search }), queryFn: () => promptImageApi.list({ page: 1, limit: 60, search }) });
  function toggle(image: PromptImage) {
    setDraft((items) => items.some((item) => item.id === image.id) ? items.filter((item) => item.id !== image.id) : [...items, image]);
  }
  return (
    <Modal title="Choose existing images" onClose={onClose} width="max-w-3xl">
      <div className="grid gap-4">
        <SearchInput placeholder="Search file name" value={search} onChange={(event) => setSearch(event.target.value)} />
        {images.isLoading ? <SkeletonRows rows={3} /> : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {images.data?.data.map((image) => {
              const active = draft.some((item) => item.id === image.id);
              return (
                <button key={image.id} className={`relative aspect-square overflow-hidden rounded-lg border bg-slate-50 ${active ? "border-blue-700 ring-2 ring-blue-200" : "border-border"}`} onClick={() => toggle(image)}>
                  <img src={image.url} alt={image.alt_text || image.file_name} className="h-full w-full object-contain" />
                  {active ? <span className="absolute right-2 top-2 rounded-full bg-blue-700 px-2 py-0.5 text-xs font-bold text-white">Check</span> : null}
                </button>
              );
            })}
          </div>
        )}
        <div className="flex justify-end gap-3"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => { onSelect(draft); onClose(); }}>Use selected</Button></div>
      </div>
    </Modal>
  );
}

function PromptDetail({ prompt, onClose, onCopy, onPreview }: { prompt: Prompt; onClose: () => void; onCopy: () => void; onPreview: (image: PromptImage) => void }) {
  return (
    <Modal title={prompt.name} onClose={onClose} width="max-w-5xl">
      <div className="grid gap-5">
        <div className="flex flex-wrap gap-2"><Badge tone="primary">{prompt.type}</Badge><Badge tone={prompt.state === "active" ? "success" : "neutral"}>{prompt.state}</Badge>{prompt.category ? <Badge>{prompt.category.name}</Badge> : null}{prompt.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}</div>
        {prompt.description ? <p className="text-sm text-muted">{prompt.description}</p> : null}
        <div className="rounded-lg border border-border bg-slate-50 p-4">
          <pre className="max-h-[45vh] whitespace-pre-wrap font-mono text-sm leading-6 text-slate-800">{prompt.content}</pre>
        </div>
        <Button className="w-fit" onClick={onCopy}><HiOutlineClipboardDocument />Copy prompt</Button>
        {prompt.images.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{prompt.images.map((image) => <button key={image.id} className="aspect-square rounded-lg border border-border bg-slate-50" onClick={() => onPreview(image)}><img src={image.url} alt={image.alt_text || image.file_name} className="h-full w-full object-contain" /></button>)}</div> : null}
        <div className="grid gap-1 text-sm text-muted sm:grid-cols-3"><span>Created by: {prompt.created_by?.full_name || "Unknown"}</span><span>Created: {formatDate(prompt.created_at)}</span><span>Updated: {formatDate(prompt.updated_at)}</span></div>
      </div>
    </Modal>
  );
}

function ImagePreview({ image, onClose }: { image: PromptImage; onClose: () => void }) {
  const [dark, setDark] = useState(false);
  return (
    <Modal title={image.file_name} onClose={onClose} width="max-w-5xl">
      <div className="grid gap-4">
        <Button variant="secondary" className="w-fit" onClick={() => setDark((value) => !value)}>{dark ? "Light background" : "Dark background"}</Button>
        <div className={`flex min-h-[60vh] items-center justify-center rounded-lg border border-border ${dark ? "bg-slate-900" : "bg-[linear-gradient(45deg,#e5e7eb_25%,transparent_25%),linear-gradient(-45deg,#e5e7eb_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e5e7eb_75%),linear-gradient(-45deg,transparent_75%,#e5e7eb_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0]"}`}>
          <img src={image.url} alt={image.alt_text || image.file_name} className="max-h-[70vh] max-w-full object-contain" />
        </div>
      </div>
    </Modal>
  );
}
