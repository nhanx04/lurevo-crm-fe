import { ChangeEvent, ReactNode, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  HiOutlineCheck,
  HiOutlineCloudArrowUp,
  HiOutlineEllipsisVertical,
  HiOutlineFolder,
  HiOutlinePhoto,
} from "react-icons/hi2";
import clsx from "clsx";
import { queryKeys } from "@/api/queryKeys";
import { designLibraryApi } from "@/api/services";
import { Badge, Button, Field, Input, SearchInput, Switch, Textarea } from "@/components/ui";
import { EmptyState, ErrorState, Spinner, useToast } from "@/components/feedback";
import { Modal } from "@/components/layout";
import { formatFileSize } from "@/utils/format";
import type { DesignAsset, DesignFolder, DesignFolderBreadcrumb, DesignLibraryParams } from "@/types/api";
import { ApiError } from "@/types/api";

type PreviewBackground = "checkerboard" | "white" | "black" | "gray";

export function TransparencyBackground({
  background,
  children,
  className,
}: {
  background: PreviewBackground;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "flex items-center justify-center overflow-hidden rounded border border-border",
        background === "checkerboard" &&
          "bg-[linear-gradient(45deg,#d1d5db_25%,transparent_25%),linear-gradient(-45deg,#d1d5db_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#d1d5db_75%),linear-gradient(-45deg,transparent_75%,#d1d5db_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0px]",
        background === "white" && "bg-white",
        background === "black" && "bg-slate-950",
        background === "gray" && "bg-slate-200",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DesignThumbnail({ asset, className }: { asset: DesignAsset; className?: string }) {
  const isImage = asset.file.mime_type.startsWith("image/");
  return (
    <TransparencyBackground background="checkerboard" className={clsx("aspect-square text-slate-500", className)}>
      {asset.file.preview_url && isImage ? (
        <img src={asset.file.preview_url} alt={asset.name} className="h-full w-full object-contain" />
      ) : (
        <HiOutlinePhoto className="h-8 w-8" />
      )}
    </TransparencyBackground>
  );
}

export function DesignPreviewDialog({
  asset,
  onClose,
  onSelect,
}: {
  asset: DesignAsset;
  onClose: () => void;
  onSelect?: (asset: DesignAsset) => void;
}) {
  const [background, setBackground] = useState<PreviewBackground>("checkerboard");
  const isImage = asset.file.mime_type.startsWith("image/");
  const isPdf = asset.file.mime_type === "application/pdf";
  return (
    <Modal title="Design preview" onClose={onClose} width="max-w-4xl">
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold">{asset.name}</p>
            <p className="text-sm text-muted">{asset.file.original_name} / {formatFileSize(asset.file.size)}</p>
          </div>
          <div className="flex gap-1" aria-label="Preview background">
            {(["checkerboard", "white", "black", "gray"] as PreviewBackground[]).map((item) => (
              <button
                key={item}
                type="button"
                className={clsx("h-8 rounded-lg border px-2 text-xs font-semibold capitalize", background === item ? "border-blue-700 text-blue-700" : "border-border text-slate-600")}
                onClick={() => setBackground(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <TransparencyBackground background={background} className="min-h-[360px] max-h-[70vh]">
          {asset.file.preview_url && isImage ? (
            <img src={asset.file.preview_url} alt={asset.name} className="max-h-[68vh] max-w-full object-contain" />
          ) : asset.file.preview_url && isPdf ? (
            <iframe src={asset.file.preview_url} title={asset.name} className="h-[68vh] w-full bg-white" />
          ) : (
            <div className="grid justify-items-center gap-2 text-slate-500">
              <HiOutlinePhoto className="h-10 w-10" />
              <p className="text-sm">Preview URL is not available.</p>
            </div>
          )}
        </TransparencyBackground>
        <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-4">
          <div className="flex flex-wrap gap-2">
            {asset.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
            {onSelect ? <Button type="button" disabled={!asset.is_active} onClick={() => onSelect(asset)}>Select</Button> : null}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function DesignLibraryBreadcrumbs({
  breadcrumbs,
  onOpen,
}: {
  breadcrumbs: DesignFolderBreadcrumb[];
  onOpen: (folderId?: string | null) => void;
}) {
  return (
    <nav className="flex min-w-0 flex-wrap items-center gap-1 text-sm" aria-label="Design Library breadcrumbs">
      {breadcrumbs.map((crumb, index) => (
        <span key={`${crumb.id || "root"}-${index}`} className="flex min-w-0 items-center gap-1">
          {index > 0 ? <span className="text-muted">/</span> : null}
          <button type="button" className="max-w-[180px] truncate rounded px-1 font-semibold text-blue-700 hover:bg-blue-50" onClick={() => onOpen(crumb.id || null)}>
            {crumb.name}
          </button>
        </span>
      ))}
    </nav>
  );
}

export function DesignLibraryGrid({
  folders,
  assets,
  selectedAssetId,
  onOpenFolder,
  onPreview,
  onEditAsset,
  onEditFolder,
  onMoveAsset,
  onMoveFolder,
  onToggleAsset,
  onToggleFolder,
  onDeleteAsset,
  onDeleteFolder,
  onSelectAsset,
}: {
  folders: DesignFolder[];
  assets: DesignAsset[];
  selectedAssetId?: string | null;
  onOpenFolder: (folder: DesignFolder) => void;
  onPreview: (asset: DesignAsset) => void;
  onEditAsset?: (asset: DesignAsset) => void;
  onEditFolder?: (folder: DesignFolder) => void;
  onMoveAsset?: (asset: DesignAsset) => void;
  onMoveFolder?: (folder: DesignFolder) => void;
  onToggleAsset?: (asset: DesignAsset) => void;
  onToggleFolder?: (folder: DesignFolder) => void;
  onDeleteAsset?: (asset: DesignAsset) => void;
  onDeleteFolder?: (folder: DesignFolder) => void;
  onSelectAsset?: (asset: DesignAsset) => void;
}) {
  if (!folders.length && !assets.length) {
    return <EmptyState title="No designs here" message="Create a folder or upload a design to start building the library." />;
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-6">
      {folders.map((folder) => (
        <button
          key={folder.id}
          type="button"
          className="group rounded-lg border border-border bg-white p-3 text-left shadow-sm transition hover:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onDoubleClick={() => onOpenFolder(folder)}
          onClick={() => undefined}
        >
          <div className="flex items-start justify-between gap-2">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <HiOutlineFolder className="h-7 w-7" />
            </span>
            <EntryMenu>
              <MenuButton onClick={() => onOpenFolder(folder)}>Open</MenuButton>
              {onEditFolder ? <MenuButton onClick={() => onEditFolder(folder)}>Rename</MenuButton> : null}
              {onMoveFolder ? <MenuButton onClick={() => onMoveFolder(folder)}>Move</MenuButton> : null}
              {onToggleFolder ? <MenuButton onClick={() => onToggleFolder(folder)}>{folder.is_active ? "Deactivate" : "Activate"}</MenuButton> : null}
              {onDeleteFolder ? <MenuButton danger onClick={() => onDeleteFolder(folder)}>Delete</MenuButton> : null}
            </EntryMenu>
          </div>
          <p className="mt-3 truncate text-sm font-bold">{folder.name}</p>
          <p className="mt-1 text-xs text-muted">{folder.child_folder_count} folders / {folder.design_count} designs</p>
          {!folder.is_active ? <Badge tone="warning" className="mt-2">Inactive</Badge> : null}
        </button>
      ))}
      {assets.map((asset) => (
        <button
          key={asset.id}
          type="button"
          className={clsx("group rounded-lg border bg-white p-2 text-left shadow-sm transition hover:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500", selectedAssetId === asset.id ? "border-blue-700 ring-2 ring-blue-100" : "border-border", !asset.is_active && "opacity-65")}
          onClick={() => onSelectAsset?.(asset)}
          onDoubleClick={() => onPreview(asset)}
        >
          <div className="relative">
            <DesignThumbnail asset={asset} />
            <div className="absolute right-1 top-1">
              <EntryMenu>
                <MenuButton onClick={() => onPreview(asset)}>Preview</MenuButton>
                {asset.file.download_url ? <MenuLink href={asset.file.download_url}>Download</MenuLink> : null}
                {onEditAsset ? <MenuButton onClick={() => onEditAsset(asset)}>Edit</MenuButton> : null}
                {onMoveAsset ? <MenuButton onClick={() => onMoveAsset(asset)}>Move</MenuButton> : null}
                {onToggleAsset ? <MenuButton onClick={() => onToggleAsset(asset)}>{asset.is_active ? "Deactivate" : "Activate"}</MenuButton> : null}
                {onDeleteAsset ? <MenuButton danger onClick={() => onDeleteAsset(asset)}>Delete</MenuButton> : null}
              </EntryMenu>
            </div>
            {selectedAssetId === asset.id ? <span className="absolute left-1 top-1 rounded-full bg-blue-700 p-1 text-white"><HiOutlineCheck className="h-4 w-4" /></span> : null}
          </div>
          <p className="mt-2 truncate text-sm font-bold" title={asset.name}>{asset.name}</p>
          <p className="truncate text-xs text-muted">{asset.file.mime_type} / {formatFileSize(asset.file.size)}</p>
          <div className="mt-2 flex items-center gap-1">
            <Badge tone={asset.is_active ? "success" : "warning"}>{asset.is_active ? "Active" : "Inactive"}</Badge>
          </div>
        </button>
      ))}
    </div>
  );
}

function EntryMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block" onClick={(event) => event.stopPropagation()}>
      <button type="button" className="rounded-full bg-white/90 p-1.5 text-slate-600 shadow-sm hover:bg-slate-100" aria-label="Open actions" onClick={() => setOpen((value) => !value)}>
        <HiOutlineEllipsisVertical className="h-4 w-4" />
      </button>
      {open ? <span className="absolute right-0 z-10 mt-1 grid min-w-32 gap-1 rounded-lg border border-border bg-white p-1 shadow-soft">{children}</span> : null}
    </span>
  );
}

function MenuButton({ children, danger, onClick }: { children: ReactNode; danger?: boolean; onClick: () => void }) {
  return <button type="button" className={clsx("rounded px-3 py-1.5 text-left text-xs font-semibold hover:bg-slate-100", danger && "text-danger hover:bg-red-50")} onClick={onClick}>{children}</button>;
}

function MenuLink({ children, href }: { children: ReactNode; href: string }) {
  return <a className="rounded px-3 py-1.5 text-left text-xs font-semibold hover:bg-slate-100" href={href} target="_blank" rel="noreferrer">{children}</a>;
}

export function FolderDialog({
  folder,
  parentId,
  loading,
  onClose,
  onSubmit,
}: {
  folder?: DesignFolder | null;
  parentId?: string | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: (name: string, parentId?: string | null) => void;
}) {
  const [name, setName] = useState(folder?.name || "");
  return (
    <Modal title={folder ? "Rename folder" : "New folder"} onClose={loading ? () => undefined : onClose} width="max-w-lg">
      <div className="grid gap-4">
        <Field label="Folder Name">
          <Input autoFocus value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" disabled={loading} onClick={onClose}>Cancel</Button>
          <Button type="button" disabled={!name.trim() || loading} onClick={() => onSubmit(name.trim(), folder ? folder.parent_id : parentId)}>
            {loading ? <Spinner label="Saving" /> : folder ? "Save" : "Create Folder"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function AssetDialog({
  asset,
  folderId,
  loading,
  onClose,
  onSubmit,
}: {
  asset?: DesignAsset | null;
  folderId?: string | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: (value: { file?: File; name: string; folder_id?: string | null; description?: string | null; tags: string[]; is_active: boolean }) => void;
}) {
  const [file, setFile] = useState<File | undefined>();
  const [name, setName] = useState(asset?.name || "");
  const [description, setDescription] = useState(asset?.description || "");
  const [tags, setTags] = useState(asset?.tags.join(", ") || "");
  const [active, setActive] = useState(asset?.is_active ?? true);
  function onFile(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0];
    if (!next) return;
    setFile(next);
    if (!name.trim()) setName(next.name.replace(/\.[^.]+$/, ""));
    event.target.value = "";
  }
  return (
    <Modal title={asset ? "Edit design" : "Upload design"} description={asset ? "The design file is immutable. Create a new asset to use a different file." : undefined} onClose={loading ? () => undefined : onClose} width="max-w-2xl">
      <div className="grid gap-4">
        {!asset ? (
          <Field label="Design File" hint="SVG, PNG, JPG, WebP, or PDF">
            <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm font-semibold text-slate-600 hover:border-blue-700">
              <HiOutlineCloudArrowUp className="mb-2 h-6 w-6" />
              {file ? file.name : "Choose file"}
              <input type="file" className="sr-only" accept="image/svg+xml,image/png,image/jpeg,image/webp,application/pdf" onChange={onFile} />
            </label>
          </Field>
        ) : null}
        <Field label="Design Name"><Input value={name} onChange={(event) => setName(event.target.value)} /></Field>
        <Field label="Description"><Textarea value={description} onChange={(event) => setDescription(event.target.value)} /></Field>
        <Field label="Tags"><Input value={tags} placeholder="wedding, evergreen" onChange={(event) => setTags(event.target.value)} /></Field>
        <Switch checked={active} onChange={setActive} label={active ? "Active" : "Inactive"} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" disabled={loading} onClick={onClose}>Cancel</Button>
          <Button type="button" disabled={!name.trim() || (!asset && !file) || loading} onClick={() => onSubmit({ file, name: name.trim(), folder_id: asset?.folder_id ?? folderId ?? null, description: description.trim() || null, tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean), is_active: active })}>
            {loading ? <Spinner label="Saving" /> : asset ? "Save" : "Create Design"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function DesignLibraryPicker({
  orderLabel,
  onClose,
  onSelect,
}: {
  orderLabel?: string;
  onClose: () => void;
  onSelect: (asset: DesignAsset) => void;
}) {
  const [folderId, setFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<DesignAsset | null>(null);
  const [preview, setPreview] = useState<DesignAsset | null>(null);
  const params: DesignLibraryParams = useMemo(() => ({
    folder_id: folderId || undefined,
    search: search || undefined,
    status: "active",
    type: "all",
    scope: search ? "all" : "current",
    page: 1,
    page_size: 80,
  }), [folderId, search]);
  const query = useQuery({ queryKey: queryKeys.designLibrary.picker(params), queryFn: () => designLibraryApi.browse(params) });
  const data = query.data;
  return (
    <Modal title="Choose Design" description={orderLabel} onClose={onClose} width="max-w-6xl">
      <div className="grid gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <SearchInput value={search} placeholder="Search designs and folders..." onChange={(event) => setSearch(event.target.value)} />
          {data ? <DesignLibraryBreadcrumbs breadcrumbs={data.breadcrumbs} onOpen={(id) => setFolderId(id || null)} /> : null}
        </div>
        {query.isLoading ? <Spinner label="Loading designs" /> : null}
        {query.isError ? <ErrorState title="Designs unavailable" message={apiMessage(query.error, "Unable to load Design Library")} /> : null}
        {data ? (
          <DesignLibraryGrid
            folders={data.folders}
            assets={data.assets}
            selectedAssetId={selected?.id}
            onOpenFolder={(folder) => setFolderId(folder.id)}
            onPreview={setPreview}
            onSelectAsset={setSelected}
          />
        ) : null}
        <div className="sticky bottom-0 -mx-5 -mb-5 flex justify-end gap-2 border-t border-border bg-surface px-5 py-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="button" disabled={!selected || !selected.is_active} onClick={() => selected && onSelect(selected)}>Select Design</Button>
        </div>
        {preview ? <DesignPreviewDialog asset={preview} onClose={() => setPreview(null)} onSelect={(asset) => { setSelected(asset); setPreview(null); }} /> : null}
      </div>
    </Modal>
  );
}

export function useDesignLibraryMutations(folderId?: string | null) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const invalidate = async () => queryClient.invalidateQueries({ queryKey: ["design-library"] });
  const onError = (title: string) => (error: unknown) => toast.push({ type: "error", title, message: apiMessage(error, "Please try again.") });
  return {
    createFolder: useMutation({ mutationFn: (name: string) => designLibraryApi.createFolder({ name, parent_id: folderId || null }), onSuccess: async () => { toast.push({ type: "success", title: "Folder created" }); await invalidate(); }, onError: onError("Folder failed") }),
    updateFolder: useMutation({ mutationFn: ({ id, name }: { id: string; name: string }) => designLibraryApi.updateFolder(id, { name }), onSuccess: async () => { toast.push({ type: "success", title: "Folder saved" }); await invalidate(); }, onError: onError("Folder failed") }),
    moveFolder: useMutation({ mutationFn: ({ id, parentId }: { id: string; parentId?: string | null }) => designLibraryApi.moveFolder(id, parentId), onSuccess: async () => { toast.push({ type: "success", title: "Folder moved" }); await invalidate(); }, onError: onError("Move failed") }),
    toggleFolder: useMutation({ mutationFn: ({ id, active }: { id: string; active: boolean }) => active ? designLibraryApi.activateFolder(id) : designLibraryApi.deactivateFolder(id), onSuccess: async () => { toast.push({ type: "success", title: "Folder updated" }); await invalidate(); }, onError: onError("Folder failed") }),
    deleteFolder: useMutation({ mutationFn: designLibraryApi.removeFolder, onSuccess: async () => { toast.push({ type: "success", title: "Folder deleted" }); await invalidate(); }, onError: onError("Delete failed") }),
    uploadAsset: useMutation({ mutationFn: designLibraryApi.uploadAsset, onSuccess: async () => { toast.push({ type: "success", title: "Design uploaded" }); await invalidate(); }, onError: onError("Upload failed") }),
    updateAsset: useMutation({ mutationFn: ({ id, body }: { id: string; body: { name: string; description?: string | null; tags: string[]; is_active: boolean } }) => designLibraryApi.updateAsset(id, body), onSuccess: async () => { toast.push({ type: "success", title: "Design saved" }); await invalidate(); }, onError: onError("Design failed") }),
    moveAsset: useMutation({ mutationFn: ({ id, folderId }: { id: string; folderId?: string | null }) => designLibraryApi.moveAsset(id, folderId), onSuccess: async () => { toast.push({ type: "success", title: "Design moved" }); await invalidate(); }, onError: onError("Move failed") }),
    toggleAsset: useMutation({ mutationFn: ({ id, active }: { id: string; active: boolean }) => active ? designLibraryApi.activateAsset(id) : designLibraryApi.deactivateAsset(id), onSuccess: async () => { toast.push({ type: "success", title: "Design updated" }); await invalidate(); }, onError: onError("Design failed") }),
    deleteAsset: useMutation({ mutationFn: designLibraryApi.removeAsset, onSuccess: async () => { toast.push({ type: "success", title: "Design deleted" }); await invalidate(); }, onError: onError("Delete failed") }),
  };
}

function apiMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}
