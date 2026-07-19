import { describe, expect, it } from "vitest";
import type { Order, OrderItem } from "@/types/api";
import {
  activeShippingLabel,
  allowedWorkflowActions,
  itemProductionComplete,
  listingSupplierReady,
  orderStatusAccent,
  readinessProgress,
  workflowTransitions,
} from "./orderUtils";

const baseOrder: Order = {
  id: "order-1",
  etsy_order_id: "ORD-1",
  shop: { id: "shop-1", name: "Lurevo US", platform: "etsy" },
  status: { id: "status-1", name: "Draft", code: "draft" },
  created_by: { id: "user-1", full_name: "Anna" },
  supplier: {},
  version: 1,
  products_count: 0,
  items_count: 0,
  configured_items_count: 0,
  designs_count: 0,
  has_active_shipping_label: false,
  created_at: "2026-07-16T10:00:00Z",
  updated_at: "2026-07-16T10:00:00Z",
};

describe("order utilities", () => {
  it("calculates readiness progress", () => {
    expect(
      readinessProgress({
        ready: false,
        quantity: 1,
        items: 1,
        checks: [
          { code: "label", message: "Label", passed: true },
          { code: "design", message: "Design", passed: false },
        ],
      }),
    ).toEqual({ passed: 1, total: 2, percent: 50 });
  });

  it("detects complete item production config", () => {
    const item = {
      option: "L",
      color: "White",
      print_method: "DTF",
      main_position: "front",
    } as OrderItem;
    expect(itemProductionComplete(item)).toBe(true);
  });

  it("detects listing supplier readiness", () => {
    expect(
      listingSupplierReady({
        supplier: {
          sku: "TSHIRT-001",
          options: ["L"],
          colors: ["White"],
          print_methods: ["DTF"],
          positions: ["front"],
          ready: true,
        },
      } as never),
    ).toBe(true);
  });

  it("returns active shipping label and valid draft actions", () => {
    const order = {
      ...baseOrder,
      shipping_labels: [
        {
          id: "label-1",
          file_id: "file-1",
          version: 1,
          status: "uploaded",
          is_active: true,
          original_name: "label.pdf",
          mime_type: "application/pdf",
          size: 100,
          uploaded_at: "2026-07-16T10:00:00Z",
        },
      ],
    };
    expect(activeShippingLabel(order)?.original_name).toBe("label.pdf");
    expect(allowedWorkflowActions(order, false).has("submit_for_review")).toBe(true);
  });

  it("centralizes subtle order row status accents", () => {
    expect(orderStatusAccent({ id: "status-2", name: "Ready", code: "ready_to_send" }).marker).toBe("bg-blue-500");
    expect(orderStatusAccent({ id: "status-3", name: "Cancelled", code: "cancelled" }).row).toContain("bg-slate");
  });

  it("does not expose workflow actions for cancelled orders", () => {
    const order = {
      ...baseOrder,
      status: { id: "status-3", name: "Cancelled", code: "cancelled" },
    };
    expect(allowedWorkflowActions(order, true).size).toBe(0);
  });

  it("keeps awaiting review primary transition visible when readiness is missing", () => {
    const order = {
      ...baseOrder,
      status: { id: "status-2", name: "Awaiting Review", code: "awaiting_review" },
      readiness: {
        ready: false,
        quantity: 1,
        items: 1,
        checks: [{ code: "main_design", message: "Main design selected.", passed: false }],
      },
    };
    const markReady = workflowTransitions(order, true).find((transition) => transition.action === "mark_ready");
    expect(markReady?.primary).toBe(true);
    expect(markReady?.disabled).toBe(true);
    expect(markReady?.requires_ready).toBe(true);
  });
});
