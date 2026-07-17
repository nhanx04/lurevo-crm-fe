import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { Order } from "@/types/api";
import { CompactReadinessBar, OrderDetailsDrawer, OrdersTable } from "./components";
import { ToastProvider } from "@/components/feedback";

const order: Order = {
  id: "order-1",
  etsy_order_id: "ORD-2024-005",
  shop: { id: "shop-1", name: "Lurevo US", platform: "etsy" },
  status: { id: "status-1", name: "Draft", code: "draft" },
  customer_name: "John Doe",
  created_by: { id: "user-1", full_name: "Anna" },
  supplier: { status: null },
  version: 1,
  products_count: 2,
  items_count: 3,
  configured_items_count: 2,
  designs_count: 1,
  has_active_shipping_label: false,
  readiness: {
    ready: false,
    quantity: 4,
    items: 3,
    checks: [
      { code: "label", message: "Shipping label uploaded", passed: false, section: "shipping_label" },
      { code: "config", message: "Supplier configuration selected", passed: true },
    ],
  },
  lines: [
    {
      id: "line-1",
      listing_id: "listing-1",
      listing_title: "DCS301S Decanter",
      listing_sku: "DCS301S",
      supplier_sku: "SUP-DCS",
      quantity: 3,
      personalization_mode: "different",
      supplier: {
        sku: "SUP-DCS",
        options: ["Decanter"],
        colors: ["Clear"],
        print_methods: ["UV Print"],
        positions: ["Front"],
        ready: true,
      },
      items: [
        {
          id: "item-1",
          order_line_id: "line-1",
          item_number: 1,
          quantity: 1,
          supplier_sku: "SUP-DCS",
          option: "Decanter",
          color: "Clear",
          print_method: "UV Print",
          main_position: "Front",
          files: [
            {
              id: "file-1",
              file_id: "asset-1",
              file_type: "design",
              usage: "main_design",
              position: "Front",
              sort_order: 1,
              is_selected: true,
              original_name: "main.png",
              mime_type: "image/png",
              size: 1000,
              created_at: "2026-07-16T10:00:00Z",
            },
            {
              id: "file-2",
              file_id: "asset-2",
              file_type: "mockup",
              usage: "mockup",
              sort_order: 1,
              is_selected: true,
              original_name: "mockup.png",
              mime_type: "image/png",
              size: 1000,
              created_at: "2026-07-16T10:00:00Z",
            },
          ],
        },
        {
          id: "item-2",
          order_line_id: "line-1",
          item_number: 2,
          quantity: 2,
          supplier_sku: "SUP-DCS",
          option: "Decanter",
          color: "Blue",
          print_method: "UV Print",
          main_position: "Back",
          files: [
            {
              id: "file-3",
              file_id: "asset-3",
              file_type: "design",
              usage: "main_design",
              position: "Back",
              sort_order: 1,
              is_selected: true,
              original_name: "main-2.png",
              mime_type: "image/png",
              size: 1000,
              created_at: "2026-07-16T10:00:00Z",
            },
          ],
        },
      ],
    },
  ],
  created_at: "2026-07-16T10:00:00Z",
  updated_at: "2026-07-16T10:00:00Z",
};

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{ui}</ToastProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe("order components", () => {
  it("renders the simplified orders table with previews", () => {
    renderWithProviders(
      <OrdersTable
        orders={[order]}
        loading={false}
        error={false}
        onRetry={vi.fn()}
        page={1}
        totalPages={1}
        totalItems={1}
        onPage={vi.fn()}
      />,
    );
    expect(screen.getByText("ORD-2024-005")).toBeInTheDocument();
    expect(screen.getByText("Lurevo US")).toBeInTheDocument();
    expect(screen.getByText(/2 products \/ 3 items \/ Qty 3/)).toBeInTheDocument();
    expect(screen.getByText("Product and Configuration")).toBeInTheDocument();
    expect(screen.getByText("Design")).toBeInTheDocument();
    expect(screen.getByText("Mockup")).toBeInTheDocument();
    expect(screen.queryByText("Created By")).not.toBeInTheDocument();
    expect(screen.getAllByText("DCS301S Decanter")).toHaveLength(2);
    expect(screen.getByText("Item 1 / Decanter / Clear")).toBeInTheDocument();
    expect(screen.getByText("Item 2 / Decanter / Blue")).toBeInTheDocument();
    expect(screen.getByText("UV Print / Front")).toBeInTheDocument();
    expect(screen.getByText("UV Print / Back")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getAllByText("Draft")).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: /Send to Supplier/i })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: /Delete/i })).toHaveLength(1);
    expect(screen.getByLabelText("Preview design for item 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Preview design for item 2")).toBeInTheDocument();
    expect(screen.getByLabelText("Preview mockup for item 1")).toBeInTheDocument();
  });

  it("keeps readiness failures collapsed until requested", () => {
    renderWithProviders(<CompactReadinessBar order={order} />);
    expect(screen.getByText("Order readiness")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Shipping label uploaded" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("View 1 missing requirements"));
    expect(screen.getByRole("button", { name: "Shipping label uploaded" })).toBeInTheDocument();
  });

  it("renders secondary information in the drawer", () => {
    renderWithProviders(<OrderDetailsDrawer order={order} activeTab="supplier" onClose={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "Order details" })).toBeInTheDocument();
    expect(screen.getByText("Supplier Summary")).toBeInTheDocument();
    expect(screen.getByText("Supplier Order ID")).toBeInTheDocument();
  });
});
