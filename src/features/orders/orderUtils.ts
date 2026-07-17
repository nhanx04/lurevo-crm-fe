import type {
  FileMetadataRequest,
  Listing,
  ListingSupplier,
  Order,
  OrderItem,
  OrderReadiness,
  ShippingLabel,
  StatusSummary,
} from "@/types/api";
import { sanitizeColor } from "@/utils/format";

export const orderStatusCodes = {
  draft: "draft",
  awaitingReview: "awaiting_review",
  needsRevision: "needs_revision",
  readyToSend: "ready_to_send",
  supplierSubmitted: "supplier_submitted",
  supplierError: "supplier_error",
  cancelled: "cancelled",
} as const;

export type WorkflowAction =
  | "submit_for_review"
  | "request_revision"
  | "mark_ready"
  | "send_to_supplier"
  | "retry_supplier"
  | "put_on_hold"
  | "resume"
  | "cancel";

export function statusColor(status?: StatusSummary | null) {
  return sanitizeColor(status?.color) || "#334155";
}

export function orderStatusAccent(status?: StatusSummary | null) {
  const code = status?.code || "";
  const accents: Record<string, { marker: string; row: string }> = {
    draft: { marker: "bg-slate-400", row: "bg-white" },
    awaiting_review: { marker: "bg-amber-400", row: "bg-amber-50/20" },
    needs_revision: { marker: "bg-orange-500", row: "bg-orange-50/20" },
    ready_to_send: { marker: "bg-blue-500", row: "bg-blue-50/20" },
    supplier_error: { marker: "bg-red-500", row: "bg-red-50/20" },
    supplier_submitted: { marker: "bg-indigo-500", row: "bg-indigo-50/20" },
    completed: { marker: "bg-green-500", row: "bg-green-50/20" },
    cancelled: { marker: "bg-slate-500", row: "bg-slate-50/70" },
  };
  return accents[code] || { marker: "bg-slate-300", row: "bg-white" };
}

export function readinessProgress(readiness?: OrderReadiness | null) {
  const checks = readiness?.checks || [];
  if (!checks.length) return { passed: 0, total: 0, percent: 0 };
  const passed = checks.filter((check) => check.passed).length;
  return { passed, total: checks.length, percent: Math.round((passed / checks.length) * 100) };
}

export function activeShippingLabel(order: Order): ShippingLabel | undefined {
  return order.active_shipping_label || order.shipping_labels?.find((label) => label.is_active);
}

export function itemProductionComplete(item: OrderItem) {
  return Boolean(item.option && item.color && item.print_method && item.main_position);
}

export function itemMainDesign(item: OrderItem) {
  return item.files?.find((file) => file.usage === "main_design" && file.is_selected);
}

export function itemMockupCount(item: OrderItem) {
  return (item.files || []).filter((file) => file.file_type === "mockup" && file.is_selected).length;
}

export function supplierVariantCounts(supplier?: ListingSupplier | null) {
  return {
    options: supplier?.options?.length || 0,
    colors: supplier?.colors?.length || 0,
    printMethods: supplier?.print_methods?.length || 0,
    positions: supplier?.positions?.length || 0,
  };
}

export function listingSupplierReady(listing: Listing) {
  const counts = supplierVariantCounts(listing.supplier);
  return Boolean(
    listing.supplier?.sku &&
      counts.options &&
      counts.colors &&
      counts.printMethods &&
      counts.positions,
  );
}

export function orderTotalQuantity(order: Order) {
  return (order.lines || []).reduce(
    (sum, line) => sum + line.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0,
  );
}

export function supplierConfigSummary(item: OrderItem) {
  return [item.supplier_sku, item.option, item.color, item.print_method, item.main_position]
    .filter(Boolean)
    .join(" / ");
}

export function allowedWorkflowActions(order: Order, isOwner: boolean) {
  const code = order.status.code;
  const ready = Boolean(order.readiness?.ready);
  const actions = new Set<WorkflowAction>();
  if (code === orderStatusCodes.cancelled) return actions;
  if (code === orderStatusCodes.draft || code === orderStatusCodes.needsRevision) {
    actions.add("submit_for_review");
    actions.add("cancel");
  }
  if (isOwner && code === orderStatusCodes.awaitingReview) {
    actions.add("request_revision");
    if (ready) actions.add("mark_ready");
  }
  if (isOwner && code === orderStatusCodes.readyToSend && ready) {
    actions.add("send_to_supplier");
  }
  if (isOwner && code === orderStatusCodes.supplierError && ready) {
    actions.add("retry_supplier");
  }
  if (isOwner && code === orderStatusCodes.supplierSubmitted) actions.add("cancel");
  if (code === "on_hold") actions.add("resume");
  return actions;
}

export function fileToMetadata(file: File, scope: string): FileMetadataRequest {
  return {
    storage_key: `${scope}/${crypto.randomUUID()}/${file.name}`,
    original_name: file.name,
    mime_type: file.type || "application/octet-stream",
    size: file.size,
  };
}

export function isRetryableSupplierError(code?: string) {
  return ["SUPPLIER_TIMEOUT", "SUPPLIER_RATE_LIMITED", "SUPPLIER_SERVER_ERROR"].includes(code || "");
}

export function apiMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
