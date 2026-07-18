import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { DesignLibraryGrid } from "./components";
import type { DesignAsset, DesignFolder } from "@/types/api";

const folder: DesignFolder = {
  id: "folder-1",
  name: "DTF Print Hat",
  is_active: true,
  child_folder_count: 0,
  design_count: 1,
  created_at: "2026-07-19T00:00:00Z",
  updated_at: "2026-07-19T00:00:00Z",
};

const asset: DesignAsset = {
  id: "asset-1",
  name: "Hat Front Logo",
  folder_id: "folder-1",
  is_active: true,
  tags: ["hat"],
  file: {
    id: "file-1",
    original_name: "hat-front.png",
    mime_type: "image/png",
    size: 2048,
    preview_url: "https://example.com/hat-front.png",
    download_url: "https://example.com/hat-front.png",
  },
  created_by: { id: "user-1", full_name: "Anna" },
  created_at: "2026-07-19T00:00:00Z",
  updated_at: "2026-07-19T00:00:00Z",
};

describe("DesignLibraryGrid", () => {
  it("renders folders and designs in separate sections", () => {
    render(
      <DesignLibraryGrid
        folders={[folder]}
        assets={[asset]}
        onOpenFolder={vi.fn()}
        onPreview={vi.fn()}
      />,
    );

    const foldersSection = screen.getByRole("region", { name: "Folders" });
    const designsSection = screen.getByRole("region", { name: "Designs" });
    expect(within(foldersSection).getByText("DTF Print Hat")).toBeInTheDocument();
    expect(within(foldersSection).queryByText("Hat Front Logo")).not.toBeInTheDocument();
    expect(within(designsSection).getByText("Hat Front Logo")).toBeInTheDocument();
    expect(within(designsSection).queryByText("DTF Print Hat")).not.toBeInTheDocument();
    expect(foldersSection.compareDocumentPosition(designsSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("opens a folder on card click but not when using the folder action menu", () => {
    const onOpenFolder = vi.fn();
    const onEditFolder = vi.fn();
    render(
      <DesignLibraryGrid
        folders={[folder]}
        assets={[]}
        onOpenFolder={onOpenFolder}
        onPreview={vi.fn()}
        onEditFolder={onEditFolder}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "More actions for DTF Print Hat" }));
    fireEvent.click(screen.getByRole("button", { name: "Rename" }));
    expect(onEditFolder).toHaveBeenCalledWith(folder);
    expect(onOpenFolder).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Open folder DTF Print Hat" }));
    expect(onOpenFolder).toHaveBeenCalledWith(folder);
  });

  it("uses picker variant without folder management actions and selects only designs", () => {
    const onOpenFolder = vi.fn();
    const onSelectAsset = vi.fn();
    render(
      <DesignLibraryGrid
        folders={[folder]}
        assets={[asset]}
        variant="picker"
        selectedAssetId="asset-1"
        onOpenFolder={onOpenFolder}
        onPreview={vi.fn()}
        onSelectAsset={onSelectAsset}
      />,
    );

    expect(screen.queryByRole("button", { name: /More actions for DTF Print Hat/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open folder DTF Print Hat" }));
    expect(onOpenFolder).toHaveBeenCalledWith(folder);
    expect(onSelectAsset).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("Hat Front Logo"));
    expect(onSelectAsset).toHaveBeenCalledWith(asset);
    expect(screen.getByLabelText("Selected design")).toBeInTheDocument();
  });
});
