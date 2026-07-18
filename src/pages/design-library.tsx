import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { HiOutlineArrowPath, HiOutlineFolderPlus, HiOutlinePhoto } from "react-icons/hi2";
import { queryKeys } from "@/api/queryKeys";
import { designLibraryApi } from "@/api/services";
import { Button, FilterSelect, ResourceToolbar, SearchInput } from "@/components/ui";
import { ErrorState, Spinner } from "@/components/feedback";
import type { DesignAsset, DesignFolder, DesignLibraryParams } from "@/types/api";
import {
  AssetDialog,
  DesignLibraryBreadcrumbs,
  DesignLibraryGrid,
  DesignPreviewDialog,
  FolderDialog,
  useDesignLibraryMutations,
} from "@/features/design-library/components";

export function DesignLibraryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const folderId = searchParams.get("folder");
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [status, setStatus] = useState<"active" | "inactive" | "all">((searchParams.get("status") as "active" | "inactive" | "all") || "active");
  const [folderDialog, setFolderDialog] = useState<DesignFolder | "new" | null>(null);
  const [assetDialog, setAssetDialog] = useState<DesignAsset | "new" | null>(null);
  const [preview, setPreview] = useState<DesignAsset | null>(null);
  const mutations = useDesignLibraryMutations(folderId);
  const params: DesignLibraryParams = useMemo(() => ({
    folder_id: folderId || undefined,
    search: search || undefined,
    status,
    type: "all",
    scope: search ? "all" : "current",
    sort: "name",
    direction: "asc",
    page: 1,
    page_size: 100,
  }), [folderId, search, status]);
  const query = useQuery({ queryKey: queryKeys.designLibrary.browse(params), queryFn: () => designLibraryApi.browse(params) });
  const data = query.data;
  function openFolder(id?: string | null) {
    const next = new URLSearchParams(searchParams);
    if (id) next.set("folder", id);
    else next.delete("folder");
    setSearchParams(next);
  }
  function updateSearch(value: string) {
    setSearch(value);
    const next = new URLSearchParams(searchParams);
    if (value) next.set("search", value);
    else next.delete("search");
    setSearchParams(next, { replace: true });
  }
  return (
    <div className="grid gap-5">
      <ResourceToolbar
        search={<SearchInput value={search} placeholder="Search designs and folders..." onChange={(event) => updateSearch(event.target.value)} />}
        filters={
          <FilterSelect value={status} onChange={(event) => setStatus(event.target.value as "active" | "inactive" | "all")}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All statuses</option>
          </FilterSelect>
        }
        actions={
          <>
            <Button type="button" variant="secondary" onClick={() => void query.refetch()}><HiOutlineArrowPath />Refresh</Button>
            <Button type="button" variant="secondary" onClick={() => setFolderDialog("new")}><HiOutlineFolderPlus />New Folder</Button>
            <Button type="button" onClick={() => setAssetDialog("new")}><HiOutlinePhoto />Upload Design</Button>
          </>
        }
      />
      {data ? <DesignLibraryBreadcrumbs breadcrumbs={data.breadcrumbs} onOpen={openFolder} /> : null}
      {query.isLoading ? <Spinner label="Loading Design Library" /> : null}
      {query.isError ? <ErrorState title="Design Library unavailable" message="Unable to load designs." onRetry={() => void query.refetch()} /> : null}
      {data ? (
        <DesignLibraryGrid
          folders={data.folders}
          assets={data.assets}
          onOpenFolder={(folder) => openFolder(folder.id)}
          onPreview={setPreview}
          onEditAsset={setAssetDialog}
          onEditFolder={setFolderDialog}
          onMoveAsset={(asset) => {
            const destination = window.prompt("Destination folder ID. Leave blank for root.", asset.folder_id || "");
            if (destination !== null) mutations.moveAsset.mutate({ id: asset.id, folderId: destination.trim() || null });
          }}
          onMoveFolder={(folder) => {
            const destination = window.prompt("Destination folder ID. Leave blank for root.", folder.parent_id || "");
            if (destination !== null) mutations.moveFolder.mutate({ id: folder.id, parentId: destination.trim() || null });
          }}
          onToggleAsset={(asset) => mutations.toggleAsset.mutate({ id: asset.id, active: !asset.is_active })}
          onToggleFolder={(folder) => mutations.toggleFolder.mutate({ id: folder.id, active: !folder.is_active })}
          onDeleteAsset={(asset) => {
            if (window.confirm("This design will be removed from the library. Existing Orders that already use it will keep their saved production file.")) mutations.deleteAsset.mutate(asset.id);
          }}
          onDeleteFolder={(folder) => {
            if (window.confirm("Only empty folders can be deleted.")) mutations.deleteFolder.mutate(folder.id);
          }}
        />
      ) : null}
      {folderDialog ? (
        <FolderDialog
          folder={folderDialog === "new" ? null : folderDialog}
          parentId={folderId}
          loading={mutations.createFolder.isPending || mutations.updateFolder.isPending}
          onClose={() => setFolderDialog(null)}
          onSubmit={(name) => {
            if (folderDialog === "new") mutations.createFolder.mutate(name, { onSuccess: () => setFolderDialog(null) });
            else mutations.updateFolder.mutate({ id: folderDialog.id, name }, { onSuccess: () => setFolderDialog(null) });
          }}
        />
      ) : null}
      {assetDialog ? (
        <AssetDialog
          asset={assetDialog === "new" ? null : assetDialog}
          folderId={folderId}
          loading={mutations.uploadAsset.isPending || mutations.updateAsset.isPending}
          onClose={() => setAssetDialog(null)}
          onSubmit={(value) => {
            if (assetDialog === "new" && value.file) mutations.uploadAsset.mutate({ ...value, file: value.file }, { onSuccess: () => setAssetDialog(null) });
            else if (assetDialog !== "new") mutations.updateAsset.mutate({ id: assetDialog.id, body: value }, { onSuccess: () => setAssetDialog(null) });
          }}
        />
      ) : null}
      {preview ? <DesignPreviewDialog asset={preview} onClose={() => setPreview(null)} /> : null}
    </div>
  );
}
