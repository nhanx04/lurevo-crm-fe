import { ChangeEvent, KeyboardEvent as ReactKeyboardEvent, ReactNode, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  HiOutlineCheck,
  HiOutlineChevronRight,
  HiOutlineCloudArrowUp,
  HiOutlineEllipsisVertical,
  HiOutlineFolder,
  HiOutlinePhoto,
} from "react-icons/hi2";
import clsx from "clsx";
import { queryKeys } from "@/api/queryKeys";
import { designLibraryApi } from "@/api/services";
import { Badge, Button, Field, Input, SearchInput, Switch, Textarea } from "@/components/ui";
import { EmptyState, ErrorState, SkeletonRows, Spinner, useToast } from "@/components/feedback";
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
      {breadcrumbs.map((crumb, index) => {
        const current = index === breadcrumbs.length - 1;
        return (
        <span key={`${crumb.id || "root"}-${index}`} className="flex min-w-0 items-center gap-1">
          {index > 0 ? <span className="text-muted">/</span> : null}
          {current ? (
            <span className="max-w-[220px] truncate rounded px-1 font-semibold text-foreground" title={crumb.name}>
              {crumb.name}
            </span>
          ) : (
            <button type="button" className="max-w-[180px] truncate rounded px-1 font-semibold text-blue-700 hover:bg-blue-50" title={crumb.name} onClick={() => onOpen(crumb.id || null)}>
              {crumb.name}
            </button>
          )}
        </span>
        );
      })}
    </nav>
  );
}

export function DesignLibraryGrid({
  folders,
  assets,
  selectedAssetId,
  variant = "page",
  search,
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
  onCreateFolder,
  onUploadAsset,
}: {
  folders: DesignFolder[];
  assets: DesignAsset[];
  selectedAssetId?: string | null;
  variant?: "page" | "picker";
  search?: string;
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
  onCreateFolder?: () => void;
  onUploadAsset?: () => void;
}) {
  if (!folders.length && !assets.length) {
    if (search?.trim()) {
      return <EmptyState title={`No folders or designs match "${search.trim()}"`} message="Try a different search or status filter." />;
    }
    return (
      <EmptyState
        title="This folder is empty."
        message="Create a folder or upload a design to get started."
        action={
          variant === "page" ? (
            <div className="flex flex-wrap justify-center gap-2">
              {onCreateFolder ? <Button type="button" variant="secondary" onClick={onCreateFolder}>New Folder</Button> : null}
              {onUploadAsset ? <Button type="button" onClick={onUploadAsset}>Upload Design</Button> : null}
            </div>
          ) : undefined
        }
      />
    );
  }
  return (
    <div className="grid gap-8">
      {folders.length ? (
        <LibrarySection title="Folders" count={folders.length}>
          <FolderGrid
            folders={folders}
            variant={variant}
            onOpenFolder={onOpenFolder}
            onEditFolder={variant === "page" ? onEditFolder : undefined}
            onMoveFolder={variant === "page" ? onMoveFolder : undefined}
            onToggleFolder={variant === "page" ? onToggleFolder : undefined}
            onDeleteFolder={variant === "page" ? onDeleteFolder : undefined}
          />
        </LibrarySection>
      ) : null}
      {assets.length ? (
        <LibrarySection title="Designs" count={assets.length}>
          <DesignGrid
            assets={assets}
            selectedAssetId={selectedAssetId}
            onPreview={onPreview}
            onEditAsset={onEditAsset}
            onMoveAsset={onMoveAsset}
            onToggleAsset={onToggleAsset}
            onDeleteAsset={onDeleteAsset}
            onSelectAsset={onSelectAsset}
          />
        </LibrarySection>
      ) : (
        <LibrarySection title="Designs" count={0}>
          <EmptyState
            title={search?.trim() ? "No designs match this search." : "No designs in this folder."}
            message={search?.trim() ? "Matching folders are shown above." : "Upload a design to start building your library."}
            action={variant === "page" && onUploadAsset ? <Button type="button" onClick={onUploadAsset}>Upload Design</Button> : undefined}
          />
        </LibrarySection>
      )}
    </div>
  );
}

function LibrarySection({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <section className="grid gap-3" aria-label={title}>
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
        <span className="text-sm text-muted">· {count}</span>
      </div>
      {children}
    </section>
  );
}

function FolderGrid({
  folders,
  variant,
  onOpenFolder,
  onEditFolder,
  onMoveFolder,
  onToggleFolder,
  onDeleteFolder,
}: {
  folders: DesignFolder[];
  variant: "page" | "picker";
  onOpenFolder: (folder: DesignFolder) => void;
  onEditFolder?: (folder: DesignFolder) => void;
  onMoveFolder?: (folder: DesignFolder) => void;
  onToggleFolder?: (folder: DesignFolder) => void;
  onDeleteFolder?: (folder: DesignFolder) => void;
}) {
  return (
    <div className={clsx("grid gap-3", variant === "page" ? "grid-cols-[repeat(auto-fill,minmax(240px,300px))]" : "grid-cols-[repeat(auto-fill,minmax(210px,1fr))]")}>
      {folders.map((folder) => (
        <FolderCard
          key={folder.id}
          folder={folder}
          variant={variant}
          onOpen={() => onOpenFolder(folder)}
          onEdit={onEditFolder ? () => onEditFolder(folder) : undefined}
          onMove={onMoveFolder ? () => onMoveFolder(folder) : undefined}
          onToggle={onToggleFolder ? () => onToggleFolder(folder) : undefined}
          onDelete={onDeleteFolder ? () => onDeleteFolder(folder) : undefined}
        />
      ))}
    </div>
  );
}

function FolderCard({
  folder,
  variant,
  onOpen,
  onEdit,
  onMove,
  onToggle,
  onDelete,
}: {
  folder: DesignFolder;
  variant: "page" | "picker";
  onOpen: () => void;
  onEdit?: () => void;
  onMove?: () => void;
  onToggle?: () => void;
  onDelete?: () => void;
}) {
  const inactive = !folder.is_active;
  const metadata = `${folder.child_folder_count} folders · ${folder.design_count} designs`;
  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onOpen();
  };
  const hasMenu = variant === "page" && (onEdit || onMove || onToggle || onDelete);
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open folder ${folder.name}`}
      className={clsx(
        "group flex cursor-pointer items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left shadow-sm transition duration-200 hover:-translate-y-px hover:border-amber-400 hover:bg-amber-100 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500",
        variant === "picker" ? "min-h-[76px]" : "min-h-[92px]",
        inactive && "opacity-70",
      )}
      onClick={onOpen}
      onKeyDown={onKeyDown}
    >
      <span className={clsx("flex shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-100 text-amber-700", variant === "picker" ? "h-11 w-11" : "h-12 w-12")}>
        <HiOutlineFolder className={clsx(variant === "picker" ? "h-7 w-7" : "h-8 w-8")} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-slate-900" title={folder.name}>{folder.name}</span>
        <span className="mt-1 block truncate text-xs text-muted">{metadata}</span>
        {inactive ? <Badge tone="warning" className="mt-2">Inactive</Badge> : null}
      </span>
      {hasMenu ? (
        <EntryMenu label={`More actions for ${folder.name}`}>
          {onEdit ? <MenuButton onClick={onEdit}>Rename</MenuButton> : null}
          {onMove ? <MenuButton onClick={onMove}>Move</MenuButton> : null}
          {onToggle ? <MenuButton onClick={onToggle}>{folder.is_active ? "Deactivate" : "Activate"}</MenuButton> : null}
          {onDelete ? <MenuButton danger onClick={onDelete}>Delete</MenuButton> : null}
        </EntryMenu>
      ) : (
        <HiOutlineChevronRight className="h-5 w-5 shrink-0 text-amber-700" />
      )}
    </div>
  );
}

function DesignGrid({
  assets,
  selectedAssetId,
  onPreview,
  onEditAsset,
  onMoveAsset,
  onToggleAsset,
  onDeleteAsset,
  onSelectAsset,
}: {
  assets: DesignAsset[];
  selectedAssetId?: string | null;
  onPreview: (asset: DesignAsset) => void;
  onEditAsset?: (asset: DesignAsset) => void;
  onMoveAsset?: (asset: DesignAsset) => void;
  onToggleAsset?: (asset: DesignAsset) => void;
  onDeleteAsset?: (asset: DesignAsset) => void;
  onSelectAsset?: (asset: DesignAsset) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-6">
      {assets.map((asset) => (
        <DesignCard
          key={asset.id}
          asset={asset}
          selected={selectedAssetId === asset.id}
          onPreview={() => onPreview(asset)}
          onSelect={onSelectAsset ? () => onSelectAsset(asset) : undefined}
          onEdit={onEditAsset ? () => onEditAsset(asset) : undefined}
          onMove={onMoveAsset ? () => onMoveAsset(asset) : undefined}
          onToggle={onToggleAsset ? () => onToggleAsset(asset) : undefined}
          onDelete={onDeleteAsset ? () => onDeleteAsset(asset) : undefined}
        />
      ))}
    </div>
  );
}

function DesignCard({
  asset,
  selected,
  onPreview,
  onSelect,
  onEdit,
  onMove,
  onToggle,
  onDelete,
}: {
  asset: DesignAsset;
  selected: boolean;
  onPreview: () => void;
  onSelect?: () => void;
  onEdit?: () => void;
  onMove?: () => void;
  onToggle?: () => void;
  onDelete?: () => void;
}) {
  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    if (onSelect) onSelect();
    else onPreview();
  };
  return (
    <div
      role="button"
      tabIndex={0}
      className={clsx("group rounded-lg border bg-white p-2 text-left shadow-sm transition hover:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500", selected ? "border-blue-700 ring-2 ring-blue-100" : "border-border", !asset.is_active && "opacity-65")}
      aria-pressed={onSelect ? selected : undefined}
      onClick={() => onSelect?.()}
      onDoubleClick={onPreview}
      onKeyDown={onKeyDown}
    >
      <div className="relative">
        <DesignThumbnail asset={asset} />
        <div className="absolute right-1 top-1">
          <EntryMenu label={`More actions for ${asset.name}`}>
            <MenuButton onClick={onPreview}>Preview</MenuButton>
            {asset.file.download_url ? <MenuLink href={asset.file.download_url}>Download</MenuLink> : null}
            {onEdit ? <MenuButton onClick={onEdit}>Edit</MenuButton> : null}
            {onMove ? <MenuButton onClick={onMove}>Move</MenuButton> : null}
            {onToggle ? <MenuButton onClick={onToggle}>{asset.is_active ? "Deactivate" : "Activate"}</MenuButton> : null}
            {onDelete ? <MenuButton danger onClick={onDelete}>Delete</MenuButton> : null}
          </EntryMenu>
        </div>
        {selected ? <span className="absolute left-1 top-1 rounded-full bg-blue-700 p-1 text-white" aria-label="Selected design"><HiOutlineCheck className="h-4 w-4" /></span> : null}
      </div>
      <p className="mt-2 truncate text-sm font-bold" title={asset.name}>{asset.name}</p>
      <p className="truncate text-xs text-muted">{asset.file.mime_type} / {formatFileSize(asset.file.size)}</p>
      <div className="mt-2 flex items-center gap-1">
        <Badge tone={asset.is_active ? "success" : "warning"}>{asset.is_active ? "Active" : "Inactive"}</Badge>
        {selected ? <Badge tone="primary">Selected</Badge> : null}
      </div>
    </div>
  );
}

export function DesignLibraryLoadingState({ variant = "page" }: { variant?: "page" | "picker" }) {
  return (
    <div className="grid gap-8">
      <LibrarySection title="Folders" count={variant === "picker" ? 2 : 4}>
        <div className={clsx("grid gap-3", variant === "page" ? "grid-cols-[repeat(auto-fill,minmax(240px,300px))]" : "grid-cols-[repeat(auto-fill,minmax(210px,1fr))]")}>
          {Array.from({ length: variant === "picker" ? 2 : 4 }).map((_, index) => (
            <div key={index} className="flex min-h-[88px] animate-pulse items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4">
              <span className="h-12 w-12 rounded-xl bg-amber-100" />
              <span className="grid flex-1 gap-2">
                <span className="h-4 rounded bg-amber-100" />
                <span className="h-3 w-2/3 rounded bg-amber-100" />
              </span>
            </div>
          ))}
        </div>
      </LibrarySection>
      <LibrarySection title="Designs" count={variant === "picker" ? 6 : 8}>
        <SkeletonRows rows={variant === "picker" ? 3 : 4} />
      </LibrarySection>
    </div>
  );
}

function EntryMenu({ children, label = "Open actions" }: { children: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block" onClick={(event) => event.stopPropagation()}>
      <button type="button" className="rounded-full bg-white/90 p-1.5 text-slate-600 shadow-sm hover:bg-slate-100" aria-label={label} onClick={() => setOpen((value) => !value)}>
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
      <div className="grid max-h-[82vh] gap-4 overflow-y-auto pr-1">
        <div className="sticky top-0 z-10 -mx-1 grid gap-3 bg-surface px-1 pb-2 md:grid-cols-[minmax(240px,1fr)_auto] md:items-center">
          <SearchInput value={search} placeholder="Search designs and folders..." onChange={(event) => setSearch(event.target.value)} />
          {data ? <DesignLibraryBreadcrumbs breadcrumbs={data.breadcrumbs} onOpen={(id) => setFolderId(id || null)} /> : null}
        </div>
        {query.isLoading ? <DesignLibraryLoadingState variant="picker" /> : null}
        {query.isError ? <ErrorState title="Designs unavailable" message={apiMessage(query.error, "Unable to load Design Library")} /> : null}
        {data ? (
          <DesignLibraryGrid
            folders={data.folders}
            assets={data.assets}
            selectedAssetId={selected?.id}
            variant="picker"
            search={search}
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
