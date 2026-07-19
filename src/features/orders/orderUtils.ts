import type {
  FileMetadataRequest,
  Listing,
  ListingSupplier,
  Order,
  OrderItem,
  OrderTransition,
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

export type WorkflowActionState = OrderTransition & {
  action: WorkflowAction;
  disabled: boolean;
  disabled_reason?: string;
};

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

export function allowedWorkflowActions(order: Order, isOwner: boolean): Set<WorkflowAction> {
  return new Set(workflowTransitions(order, isOwner).map((transition) => transition.action));
}

export function workflowTransitions(order: Order, isOwner: boolean): WorkflowActionState[] {
  const backendTransitions = order.available_transitions?.length
    ? order.available_transitions
    : fallbackWorkflowTransitions(order);
  return backendTransitions
    .filter((transition): transition is OrderTransition & { action: WorkflowAction } =>
      isWorkflowAction(transition.action),
    )
    .filter((transition) => ownerTransitionAllowed(transition.action, isOwner))
    .map((transition) => {
      const missing = missingReadinessMessages(order);
      const disabled = Boolean(transition.requires_ready && !order.readiness?.ready);
      return {
        ...transition,
        action: transition.action,
        disabled,
        disabled_reason: disabled ? readinessDisabledReason(missing) : undefined,
      };
    });
}

function fallbackWorkflowTransitions(order: Order): OrderTransition[] {
  const code = order.status.code;
  if (code === orderStatusCodes.cancelled) return [];
  if (code === orderStatusCodes.draft || code === orderStatusCodes.needsRevision) {
    return [
      workflowTransition("submit_for_review", orderStatusCodes.awaitingReview, "Submit for Review", false, true),
      workflowTransition("cancel", orderStatusCodes.cancelled, "Cancel Order", false, false),
    ];
  }
  if (code === orderStatusCodes.awaitingReview) {
    return [
      workflowTransition("request_revision", orderStatusCodes.needsRevision, "Request Revision", false, false),
      workflowTransition("mark_ready", orderStatusCodes.readyToSend, "Mark Ready", true, true),
    ];
  }
  if (code === orderStatusCodes.readyToSend) {
    return [
      workflowTransition("request_revision", orderStatusCodes.needsRevision, "Request Revision", false, false),
      workflowTransition("send_to_supplier", orderStatusCodes.supplierSubmitted, "Send to Supplier", true, true),
    ];
  }
  if (code === orderStatusCodes.supplierError) {
    return [workflowTransition("retry_supplier", orderStatusCodes.supplierSubmitted, "Retry Supplier", true, true)];
  }
  if (code === orderStatusCodes.supplierSubmitted) {
    return [workflowTransition("cancel", orderStatusCodes.cancelled, "Cancel Order", false, false)];
  }
  if (code === "on_hold") return [workflowTransition("resume", orderStatusCodes.awaitingReview, "Resume", false, true)];
  return [];
}

function workflowTransition(action: WorkflowAction, target: string, label: string, requiresReady: boolean, primary: boolean): OrderTransition {
  return { action, target_status: target, target_status_code: target, label, requires_ready: requiresReady, primary };
}

function isWorkflowAction(action: string): action is WorkflowAction {
  return ["submit_for_review", "request_revision", "mark_ready", "send_to_supplier", "retry_supplier", "put_on_hold", "resume", "cancel"].includes(action);
}

function ownerTransitionAllowed(action: WorkflowAction, isOwner: boolean) {
  if (["request_revision", "mark_ready", "send_to_supplier", "retry_supplier"].includes(action)) return isOwner;
  return true;
}

export function missingReadinessMessages(order: Order) {
  return (order.readiness?.checks || [])
    .filter((check) => !check.passed)
    .map((check) => check.message.replace(/\.$/, ""));
}

export function readinessDisabledReason(missing: string[]) {
  if (!missing.length) return "Complete all readiness checks before continuing.";
  return `Complete ${missing[0].toLowerCase()}${missing.length > 1 ? ` and ${missing.length - 1} more requirement${missing.length > 2 ? "s" : ""}` : ""} before continuing.`;
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
