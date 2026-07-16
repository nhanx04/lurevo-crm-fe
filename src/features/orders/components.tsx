import { ChangeEvent, DragEvent, ReactNode, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import {
  HiOutlineArrowLeft,
  HiOutlineArrowDownTray,
  HiOutlineChevronDown,
  HiOutlineClipboardDocument,
  HiOutlineClock,
  HiOutlineCloudArrowUp,
  HiOutlineDocument,
  HiOutlineEye,
  HiOutlineExclamationTriangle,
  HiOutlineMagnifyingGlass,
  HiOutlinePaperAirplane,
  HiOutlinePhoto,
  HiOutlineTrash,
  HiOutlineXMark,
} from "react-icons/hi2";
import clsx from "clsx";
import { categoryApi, orderApi } from "@/api/services";
import { useListingSelector, useOrderActivities, useShops, useWorkflowStatuses } from "./hooks";
import type {
  Listing,
  Order,
  OrderActivity,
  OrderItem,
  OrderItemFile,
  OrderLine,
  ShippingLabel,
} from "@/types/api";
import {
  ActionIconButton,
  Badge,
  Button,
  Card,
  Field,
  Input,
  PaginationControls,
  SearchInput,
  Select,
  SoftPanel,
  Table,
  Textarea,
} from "@/components/ui";
import { ConfirmDialog, EmptyState, ErrorState, SkeletonRows, Spinner, useToast } from "@/components/feedback";
import { Modal } from "@/components/layout";
import { formatDateTime, formatFileSize } from "@/utils/format";
import {
  activeShippingLabel,
  allowedWorkflowActions,
  apiMessage,
  itemMainDesign,
  itemMockupCount,
  itemProductionComplete,
  listingSupplierReady,
  orderStatusCodes,
  orderTotalQuantity,
  readinessProgress,
  statusColor,
  supplierConfigSummary,
  supplierVariantCounts,
  type WorkflowAction,
} from "./orderUtils";

export function OrderStatusBadge({ status }: { status: Order["status"] }) {
  return (
    <Badge tone="neutral">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: statusColor(status) }} />
      {status.name}
    </Badge>
  );
}

export function SupplierStatusBadge({ status }: { status?: string | null }) {
  const normalized = (status || "not_submitted").toLowerCase();
  const tone =
    normalized.includes("error") || normalized.includes("failed")
      ? "danger"
      : normalized.includes("success") || normalized.includes("created") || normalized.includes("submitted")
        ? "success"
        : normalized.includes("pending") || normalized.includes("processing")
          ? "warning"
          : "neutral";
  return <Badge tone={tone}>{status || "Not submitted"}</Badge>;
}

export function OrdersQuickViews({
  params,
  statuses,
  setParam,
}: {
  params: Record<string, string | undefined>;
  statuses: { id: string; name: string; code: string }[];
  setParam: (key: string, value: string) => void;
}) {
  const statusByCode = new Map(statuses.map((status) => [status.code, status]));
  const views = [
    { label: "All", statusCode: "", readiness: "" },
    { label: "Draft", statusCode: orderStatusCodes.draft, readiness: "" },
    { label: "Awaiting Review", statusCode: orderStatusCodes.awaitingReview, readiness: "" },
    { label: "Needs Revision", statusCode: orderStatusCodes.needsRevision, readiness: "" },
    { label: "Missing Design", statusCode: "", readiness: "missing_design" },
    { label: "Missing Label", statusCode: "", readiness: "missing_label" },
    { label: "Missing Configuration", statusCode: "", readiness: "missing_configuration" },
    { label: "Ready to Send", statusCode: orderStatusCodes.readyToSend, readiness: "" },
    { label: "Supplier Error", statusCode: orderStatusCodes.supplierError, readiness: "" },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {views.map((view) => {
        const status = view.statusCode ? statusByCode.get(view.statusCode) : undefined;
        const active =
          (view.readiness && params.readiness === view.readiness) ||
          (!view.readiness && (params.status_id || "") === (status?.id || "") && (view.statusCode || params.readiness ? !params.readiness : true));
        return (
          <button
            key={`${view.label}-${view.statusCode}-${view.readiness}`}
            type="button"
            className={clsx(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
              active ? "border-blue-900 bg-blue-900 text-white" : "border-border bg-white text-slate-700 hover:bg-slate-50",
            )}
            onClick={() => {
              setParam("page", "");
              setParam("readiness", view.readiness);
              setParam("status_id", status?.id || "");
            }}
          >
            {view.label}
          </button>
        );
      })}
    </div>
  );
}

export function OrderFilters({
  params,
  search,
  setSearch,
  setParam,
  reset,
}: {
  params: Record<string, string | undefined>;
  search: string;
  setSearch: (value: string) => void;
  setParam: (key: string, value: string) => void;
  reset: () => void;
}) {
  const shops = useShops();
  const statuses = useWorkflowStatuses();
  useEffect(() => {
    const handle = window.setTimeout(() => {
      if ((params.search || "") !== search) setParam("search", search);
    }, 450);
    return () => window.clearTimeout(handle);
  }, [params.search, search, setParam]);

  return (
    <div className="grid gap-2 xl:grid-cols-[minmax(240px,1fr)_180px_210px_170px_170px_auto]">
      <SearchInput placeholder="Search order ID, customer, or SKU..." value={search} onChange={(event) => setSearch(event.target.value)} />
      <Select value={params.shop_id || ""} onChange={(event) => setParam("shop_id", event.target.value)}>
        <option value="">All shops</option>
        {shops.data?.map((shop) => (
          <option key={shop.id} value={shop.id}>
            {shop.name}
          </option>
        ))}
      </Select>
      <Select value={params.status_id || ""} onChange={(event) => setParam("status_id", event.target.value)}>
        <option value="">All workflow statuses</option>
        {statuses.data?.data.map((status) => (
          <option key={status.id} value={status.id}>
            {status.name}
          </option>
        ))}
      </Select>
      <Select value={params.supplier_status || ""} onChange={(event) => setParam("supplier_status", event.target.value)}>
        <option value="">Supplier status</option>
        <option value="pending">Pending</option>
        <option value="processing">Processing</option>
        <option value="success">Created</option>
        <option value="failed">Error</option>
      </Select>
      <Select value={params.readiness || ""} onChange={(event) => setParam("readiness", event.target.value)}>
        <option value="">All readiness</option>
        <option value="missing_label">Missing label</option>
        <option value="missing_design">Missing design</option>
        <option value="missing_configuration">Missing configuration</option>
        <option value="ready">Ready to send</option>
      </Select>
      <Button type="button" variant="secondary" onClick={reset}>
        Reset
      </Button>
    </div>
  );
}

export function OrdersTable({
  orders,
  loading,
  error,
  onRetry,
  page,
  totalPages,
  totalItems,
  onPage,
}: {
  orders?: Order[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  page: number;
  totalPages: number;
  totalItems: number;
  onPage: (page: number) => void;
}) {
  const navigate = useNavigate();
  if (loading) return <SkeletonRows rows={8} />;
  if (error) return <ErrorState message="Could not load orders." onRetry={onRetry} />;
  if (!orders?.length) {
    return <EmptyState title="No orders found." message="Create your first order to begin processing Etsy purchases." />;
  }
  return (
    <>
      <Table>
        <thead className="bg-slate-50 text-[11px] font-semibold uppercase text-muted">
          <tr>
            <th className="px-4 py-3">Order</th>
            <th className="px-4 py-3">Shop / Customer</th>
            <th className="px-4 py-3">Products and Items</th>
            <th className="px-4 py-3">Design Preview</th>
            <th className="px-4 py-3">Mockup Preview</th>
            <th className="px-4 py-3">Workflow Status</th>
            <th className="px-4 py-3">Supplier Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {orders.map((order) => {
            const missing = orderListMissing(order);
            return (
              <tr
                key={order.id}
                className="cursor-pointer hover:bg-slate-50/70"
                onClick={() => navigate(`/app/orders/${order.id}`)}
              >
                <td className="min-w-[150px] px-4 py-5 align-middle">
                  <Link
                    to={`/app/orders/${order.id}`}
                    onClick={(event) => event.stopPropagation()}
                    className="font-semibold text-foreground hover:text-blue-700"
                  >
                    {order.etsy_order_id}
                  </Link>
                  <p className="mt-1 text-xs text-muted">{formatDateTime(order.ordered_at || order.created_at)}</p>
                  <p className="mt-2 text-xs font-semibold text-slate-600">{order.status.name}</p>
                </td>
                <td className="min-w-[150px] px-4 py-5 align-middle">
                  <p className="font-semibold">{order.shop.name}</p>
                  <p className="mt-1 text-xs text-muted">{order.customer_name || "No customer"}</p>
                </td>
                <td className="min-w-[240px] px-4 py-5 align-middle">
                  <p className="text-sm font-semibold">
                    {order.products_count} products / {order.items_count} items / Qty {orderTotalQuantity(order) || order.items_count}
                  </p>
                  <ProductNameSummary order={order} />
                  {missing.length ? (
                    <p className="mt-2 text-xs font-medium text-amber-700">Missing: {missing.join(", ")}</p>
                  ) : null}
                </td>
                <td className="px-4 py-5 align-middle">
                  <OrderPreviewThumbnails order={order} kind="design" />
                </td>
                <td className="px-4 py-5 align-middle">
                  <OrderPreviewThumbnails order={order} kind="mockup" />
                </td>
                <td className="px-4 py-5 align-middle"><OrderStatusBadge status={order.status} /></td>
                <td className="px-4 py-5 align-middle"><SupplierStatusBadge status={order.supplier.status} /></td>
                <td className="px-4 py-5 text-right align-middle">
                  <Link to={`/app/orders/${order.id}`} onClick={(event) => event.stopPropagation()}>
                    <Button type="button" variant="secondary" size="sm">Open</Button>
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
      <PaginationControls page={page} totalPages={totalPages} totalItems={totalItems} onPage={onPage} />
    </>
  );
}

function ProductNameSummary({ order }: { order: Order }) {
  const names = order.lines?.map((line) => line.listing_sku || line.listing_title).filter(Boolean) || [];
  if (!names.length) return <p className="mt-1 text-xs text-muted">Product details load in the order workspace.</p>;
  return (
    <div className="mt-1 space-y-0.5 text-xs text-muted">
      {names.slice(0, 2).map((name) => <p key={name} className="truncate">{name}</p>)}
      {names.length > 2 ? <p>+{names.length - 2} more</p> : null}
    </div>
  );
}

function orderListMissing(order: Order) {
  const missing: string[] = [];
  if (!order.has_active_shipping_label) missing.push("label");
  const missingDesigns = Math.max(0, order.items_count - order.designs_count);
  if (missingDesigns) missing.push(`${missingDesigns} design${missingDesigns === 1 ? "" : "s"}`);
  const missingConfig = Math.max(0, order.items_count - order.configured_items_count);
  if (missingConfig) missing.push(`${missingConfig} config`);
  return missing;
}

export function OrderPreviewThumbnails({ order, kind }: { order: Order; kind: "design" | "mockup" }) {
  const [preview, setPreview] = useState<OrderItemFile | null>(null);
  const usages = kind === "design" ? ["main_design"] : ["mockup", "mockup2"];
  const files =
    order.lines?.flatMap((line) =>
      line.items.flatMap((item) =>
        (item.files || [])
          .filter((file) => file.is_selected && usages.includes(file.usage || ""))
          .map((file) => ({ ...file, itemNumber: item.item_number })),
      ),
    ) || [];
  const fallbackCount = kind === "design" ? order.designs_count : 0;
  const visible = files.slice(0, 4);
  const overflow = Math.max(0, files.length - visible.length);
  return (
    <>
      <div className="flex min-w-[112px] items-center gap-1.5">
        {visible.length ? (
          visible.map((file) => (
            <button
              key={file.id}
              type="button"
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded border border-border bg-white text-slate-500 hover:border-blue-700 hover:text-blue-700"
              aria-label={`Preview ${kind} for item ${file.itemNumber}`}
              title={`Item ${file.itemNumber}: ${file.original_name}`}
              onClick={(event) => {
                event.stopPropagation();
                setPreview(file);
              }}
            >
              <FileGlyph file={file} />
            </button>
          ))
        ) : fallbackCount ? (
          <span className="flex h-10 w-10 items-center justify-center rounded border border-border bg-slate-50 text-xs font-semibold text-muted">{fallbackCount}</span>
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded border border-dashed border-border bg-slate-50 text-slate-400">
            <HiOutlinePhoto className="h-5 w-5" />
          </span>
        )}
        {overflow ? <span className="text-xs font-semibold text-muted">+{overflow}</span> : null}
      </div>
      {preview ? <FilePreviewModal file={preview} onClose={() => setPreview(null)} /> : null}
    </>
  );
}

export function CreateOrderForm() {
  const navigate = useNavigate();
  const toast = useToast();
  const shops = useShops();
  const [serverError, setServerError] = useState("");
  const [form, setForm] = useState({
    etsy_order_id: "",
    shop_id: "",
    ordered_at: "",
    customer_name: "",
    customer_note: "",
  });
  const create = useMutation({
    mutationFn: () =>
      orderApi.create({
        etsy_order_id: form.etsy_order_id.trim(),
        shop_id: form.shop_id,
        ordered_at: form.ordered_at ? new Date(form.ordered_at).toISOString() : undefined,
        customer_name: form.customer_name || undefined,
        customer_note: form.customer_note || undefined,
      }),
    onSuccess: (order) => {
      toast.push({ type: "success", title: "Draft order created" });
      navigate(`/app/orders/${order.id}`);
    },
    onError: (error) => {
      const message = apiMessage(error, "Unable to create order");
      setServerError(message);
      toast.push({ type: "error", title: "Create failed", message });
    },
  });
  const dirty = Boolean(form.etsy_order_id || form.shop_id || form.customer_name || form.customer_note || form.ordered_at);
  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <BackToOrders />
        <div className="flex items-center gap-2 text-sm text-muted">
          <Badge tone="neutral">Draft</Badge>
          {create.isPending ? "Saving" : dirty ? "Unsaved changes" : "Not started"}
        </div>
      </div>
      {serverError ? <ErrorState title="Save failed" message={serverError} /> : null}
      <Card className="grid gap-4 p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Etsy Order ID" error={serverError.includes("already exists") ? serverError : undefined}>
            <Input
              value={form.etsy_order_id}
              onChange={(event) => setForm((current) => ({ ...current, etsy_order_id: event.target.value }))}
              autoFocus
            />
          </Field>
          <Field label="Shop">
            <Select value={form.shop_id} onChange={(event) => setForm((current) => ({ ...current, shop_id: event.target.value }))}>
              <option value="">Select shop</option>
              {shops.data?.map((shop) => (
                <option key={shop.id} value={shop.id}>{shop.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Ordered At">
            <Input type="datetime-local" value={form.ordered_at} onChange={(event) => setForm((current) => ({ ...current, ordered_at: event.target.value }))} />
          </Field>
          <Field label="Customer Name">
            <Input value={form.customer_name} onChange={(event) => setForm((current) => ({ ...current, customer_name: event.target.value }))} />
          </Field>
        </div>
        <Field label="Customer Note">
          <Textarea value={form.customer_note} onChange={(event) => setForm((current) => ({ ...current, customer_note: event.target.value }))} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button disabled={create.isPending || !form.etsy_order_id.trim() || !form.shop_id} onClick={() => create.mutate()}>
            {create.isPending ? <Spinner label="Saving" /> : "Save Draft"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

export function OrderHeader({
  order,
  hasUnsavedChanges,
  onOpenDrawer,
  children,
}: {
  order: Order;
  hasUnsavedChanges: boolean;
  onOpenDrawer: (tab: "info" | "supplier" | "activity") => void;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="min-w-0">
        <div className="mb-2"><BackToOrders /></div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="truncate text-xl font-bold">{order.etsy_order_id}</h2>
          <OrderStatusBadge status={order.status} />
          {hasUnsavedChanges ? <span className="text-xs font-semibold text-amber-700">Unsaved changes</span> : null}
        </div>
        <p className="mt-1 text-sm text-muted">
          {order.shop.name} / {order.customer_name || "No customer"} / Created by {order.created_by.full_name} / Updated {formatDateTime(order.updated_at)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => onOpenDrawer("info")}>Order Info</Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => onOpenDrawer("supplier")}>Supplier</Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => onOpenDrawer("activity")}>Activity</Button>
        {children}
      </div>
    </div>
  );
}

export function OrderDetailsDrawer({
  order,
  activeTab,
  onClose,
}: {
  order: Order;
  activeTab: "info" | "supplier" | "activity" | null;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"info" | "supplier" | "activity">(activeTab || "info");
  useEffect(() => {
    if (activeTab) setTab(activeTab);
  }, [activeTab]);
  useEffect(() => {
    if (!activeTab) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [activeTab, onClose]);
  if (!activeTab) return null;
  const tabs = [
    { id: "info", label: "Order Information" },
    { id: "supplier", label: "Supplier Summary" },
    { id: "activity", label: "Activity" },
  ] as const;
  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Order details">
      <button type="button" className="absolute inset-0 bg-slate-950/30" aria-label="Close details" onClick={onClose} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-[520px] flex-col border-l border-border bg-white shadow-soft">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="font-bold">Order Details</h2>
            <p className="text-xs text-muted">{order.etsy_order_id}</p>
          </div>
          <button type="button" className="rounded p-2 text-muted hover:bg-slate-100" aria-label="Close details" onClick={onClose}>
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>
        <div className="flex gap-1 border-b border-border px-4 py-2">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              className={clsx(
                "rounded px-3 py-2 text-xs font-semibold",
                tab === item.id ? "bg-blue-900 text-white" : "text-slate-600 hover:bg-slate-100",
              )}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {tab === "info" ? <OrderInfoTab order={order} /> : null}
          {tab === "supplier" ? <SupplierSummaryTab order={order} /> : null}
          {tab === "activity" ? <ActivityTab order={order} /> : null}
        </div>
      </aside>
    </div>
  );
}

function OrderInfoTab({ order }: { order: Order }) {
  return (
    <dl className="grid gap-4 text-sm">
      <Info label="Shop" value={order.shop.name} />
      <Info label="Customer" value={order.customer_name || "-"} />
      <Info label="Ordered At" value={formatDateTime(order.ordered_at)} />
      <Info label="Created By" value={order.created_by.full_name} />
      <Info label="Customer Note" value={order.customer_note || "-"} />
      <Info label="Created At" value={formatDateTime(order.created_at)} />
      <Info label="Updated At" value={formatDateTime(order.updated_at)} />
    </dl>
  );
}

function SupplierSummaryTab({ order }: { order: Order }) {
  const supplier = order.supplier;
  return (
    <div className="grid gap-4">
      <SupplierStatusBadge status={supplier.status} />
      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        <Info label="Supplier Order ID" value={supplier.order_id || "-"} copyValue={supplier.order_id || undefined} />
        <Info label="Supplier Source" value={supplier.source || "-"} />
        <Info label="Tracking Number" value={supplier.tracking_number || "-"} copyValue={supplier.tracking_number || undefined} />
        <Info label="Label Buy" value={supplier.label_buy || "-"} />
        <Info label="Total Items" value={String(supplier.total_items ?? "-")} />
        <Info label="Total Quantity" value={String(supplier.total_quantity ?? "-")} />
        <Info label="Items Fee" value={supplier.items_fee || "-"} />
        <Info label="Extra Services Fee" value={supplier.extra_services_fee || "-"} />
        <Info label="Shipping Fee" value={supplier.shipping_fee || "-"} />
        <Info label="Total Fee" value={supplier.total_fee || "-"} />
        <Info label="Supplier Created At" value={formatDateTime(supplier.created_at)} />
        <Info label="Submitted At" value={formatDateTime(order.submitted_at)} />
      </dl>
    </div>
  );
}

function ActivityTab({ order }: { order: Order }) {
  const activities = useOrderActivities(order.id);
  const items = activities.data?.data || order.activities || [];
  if (activities.isError && !order.activities) {
    return <p className="text-sm text-muted">Activity is not available yet.</p>;
  }
  if (!items.length) {
    return <p className="text-sm text-muted">No activity yet.</p>;
  }
  return (
    <div className="grid gap-3">
      {items.map((activity) => <ActivityItem key={activity.id} activity={activity} />)}
    </div>
  );
}

export function WorkflowActionBar({
  order,
  isOwner,
  onChanged,
  onBeforeAction,
}: {
  order: Order;
  isOwner: boolean;
  onChanged: () => void;
  onBeforeAction?: () => Promise<void>;
}) {
  const toast = useToast();
  const actions = allowedWorkflowActions(order, isOwner);
  const [confirm, setConfirm] = useState<WorkflowAction | null>(null);
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const workflow = useMutation({
    mutationFn: async (action: WorkflowAction) => {
      await onBeforeAction?.();
      switch (action) {
        case "submit_for_review":
          return orderApi.submitForReview(order.id);
        case "mark_ready":
          return orderApi.markReady(order.id);
        case "retry_supplier":
          return orderApi.retrySupplier(order.id);
        case "put_on_hold":
          return orderApi.putOnHold(order.id);
        case "resume":
          return orderApi.resume(order.id);
        case "cancel":
          return orderApi.cancel(order.id);
        default:
          throw new Error("Use the dedicated dialog for this action.");
      }
    },
    onSuccess: async () => {
      await onChanged();
      setConfirm(null);
      toast.push({ type: "success", title: "Order updated" });
    },
    onError: (error) => toast.push({ type: "error", title: "Action failed", message: apiMessage(error, "Unable to update workflow") }),
  });
  const button = (action: WorkflowAction, label: string, primary = false) =>
    actions.has(action) ? (
      <Button key={action} type="button" variant={primary ? "primary" : "secondary"} disabled={workflow.isPending} onClick={() => setConfirm(action)}>
        {label}
      </Button>
    ) : null;
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {button("submit_for_review", "Submit for Review", true)}
        {actions.has("request_revision") ? <Button type="button" variant="secondary" onClick={() => setRevisionOpen(true)}>Request Revision</Button> : null}
        {button("mark_ready", "Mark Ready", true)}
        {actions.has("send_to_supplier") ? (
          <Button type="button" onClick={() => setSendOpen(true)}>
            <HiOutlinePaperAirplane />
            Send to Supplier
          </Button>
        ) : null}
        {button("retry_supplier", "Retry Supplier", true)}
        {button("put_on_hold", "Put on Hold")}
        {button("resume", "Resume")}
        {button("cancel", "Cancel")}
      </div>
      <ConfirmDialog
        open={Boolean(confirm)}
        title="Confirm workflow action"
        message="The backend will validate whether this workflow action is allowed."
        confirmLabel={workflow.isPending ? "Working" : "Confirm"}
        danger={confirm === "cancel"}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && workflow.mutate(confirm)}
      />
      {revisionOpen ? <RequestRevisionDialog order={order} onClose={() => setRevisionOpen(false)} onChanged={onChanged} onBeforeAction={onBeforeAction} /> : null}
      {sendOpen ? <SendToSupplierDialog order={order} onClose={() => setSendOpen(false)} onChanged={onChanged} onBeforeAction={onBeforeAction} /> : null}
    </>
  );
}

function RequestRevisionDialog({ order, onClose, onChanged, onBeforeAction }: { order: Order; onClose: () => void; onChanged: () => void; onBeforeAction?: () => Promise<void> }) {
  const toast = useToast();
  const [note, setNote] = useState("");
  const [itemId, setItemId] = useState("");
  const mutation = useMutation({
    mutationFn: async () => {
      await onBeforeAction?.();
      return orderApi.requestRevision(order.id, { note, order_item_id: itemId || undefined });
    },
    onSuccess: async () => {
      await onChanged();
      toast.push({ type: "success", title: "Revision requested" });
      onClose();
    },
    onError: (error) => toast.push({ type: "error", title: "Revision failed", message: apiMessage(error, "Unable to request revision") }),
  });
  return (
    <Modal title="Request Revision" description="Add a clear note for the employee." onClose={onClose}>
      <div className="grid gap-4">
        <Field label="Related item">
          <Select value={itemId} onChange={(event) => setItemId(event.target.value)}>
            <option value="">Whole order</option>
            {order.lines?.flatMap((line) =>
              line.items.map((item) => (
                <option key={item.id} value={item.id}>
                  Item {item.item_number} / {line.listing_title}
                </option>
              )),
            )}
          </Select>
        </Field>
        <Field label="Revision note">
          <Textarea value={note} onChange={(event) => setNote(event.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="button" disabled={!note.trim() || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? <Spinner label="Saving" /> : "Request revision"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function SendToSupplierDialog({ order, onClose, onChanged, onBeforeAction }: { order: Order; onClose: () => void; onChanged: () => void; onBeforeAction?: () => Promise<void> }) {
  const toast = useToast();
  const label = activeShippingLabel(order);
  const mutation = useMutation({
    mutationFn: async () => {
      await onBeforeAction?.();
      return orderApi.sendToSupplier(order.id);
    },
    onSuccess: async () => {
      await onChanged();
      toast.push({ type: "success", title: "Supplier submission queued" });
      onClose();
    },
    onError: (error) => toast.push({ type: "error", title: "Send failed", message: apiMessage(error, "Unable to send supplier order") }),
  });
  const files = (order.lines || []).flatMap((line) => line.items.flatMap((item) => item.files || []));
  return (
    <Modal title="Send to Supplier" description="This will create the production order in the supplier system." onClose={mutation.isPending ? () => undefined : onClose}>
      <div className="grid gap-4">
        <dl className="grid gap-3 text-sm md:grid-cols-2">
          <Info label="Etsy Order ID" value={order.etsy_order_id} />
          <Info label="Shop" value={order.shop.name} />
          <Info label="Products" value={String(order.products_count)} />
          <Info label="Items" value={String(order.items_count)} />
          <Info label="Total quantity" value={String(order.readiness?.quantity || orderTotalQuantity(order))} />
          <Info label="Shipping label" value={label?.original_name || "Missing"} />
          <Info label="Main designs" value={String(files.filter((file) => file.usage === "main_design" && file.is_selected).length)} />
          <Info label="Sub designs" value={String(files.filter((file) => file.usage === "sub_design" && file.is_selected).length)} />
          <Info label="Mockups" value={String(files.filter((file) => file.usage === "mockup" && file.is_selected).length)} />
          <Info label="Mockup 2" value={String(files.filter((file) => file.usage === "mockup2" && file.is_selected).length)} />
        </dl>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" disabled={mutation.isPending} onClick={onClose}>Cancel</Button>
          <Button type="button" disabled={mutation.isPending || !order.readiness?.ready} onClick={() => mutation.mutate()}>
            {mutation.isPending ? <Spinner label="Submitting" /> : "Create supplier order"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function CompactReadinessBar({ order }: { order: Order }) {
  const progress = readinessProgress(order.readiness);
  const failed = order.readiness?.checks.filter((check) => !check.passed) || [];
  const [expanded, setExpanded] = useState(false);
  function scrollToCheck(check: { order_item_id?: string; section?: string }) {
    const target = check.order_item_id
      ? document.getElementById(`order-item-${check.order_item_id}`)
      : check.section === "shipping_label"
        ? document.getElementById("shipping-label-section")
        : null;
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  const missingSummary = failed
    .slice(0, 2)
    .map((check) => check.message.replace(/\.$/, "").toLowerCase())
    .join(" and ");
  return (
    <section className="border-b border-border pb-4">
      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <p className="font-bold">Order readiness</p>
          <p className="text-sm font-semibold text-muted">{progress.percent}%</p>
          <Badge tone={order.readiness?.ready ? "success" : "warning"}>{order.readiness?.ready ? "Ready" : "Not ready"}</Badge>
        </div>
        <p className="text-xs text-muted">{progress.passed} of {progress.total} checks complete</p>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full bg-blue-700 transition-all" style={{ width: `${progress.percent}%` }} />
      </div>
      {failed.length ? (
        <div className="mt-2">
          <p className="text-sm text-amber-700">
            Missing: {missingSummary}
            {failed.length > 2 ? ` and ${failed.length - 2} more` : ""}
          </p>
          <button type="button" className="mt-1 text-xs font-semibold text-blue-700 hover:text-blue-900" onClick={() => setExpanded((value) => !value)}>
            {expanded ? "Hide checks" : `View ${failed.length} missing requirements`}
          </button>
          {expanded ? (
            <div className="mt-2 grid gap-1.5">
              {failed.map((check, index) => (
                <button
                  key={`${check.code}-${check.order_item_id || index}`}
                  type="button"
                  className="flex items-center gap-2 text-left text-sm font-medium text-slate-700 hover:text-blue-700"
                  onClick={() => scrollToCheck(check)}
                >
                  <HiOutlineExclamationTriangle className="h-4 w-4 text-amber-600" />
                  {check.message}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export const OrderReadinessPanel = CompactReadinessBar;

export function AddListingDialog({ orderId, onClose, onAdded }: { orderId: string; onClose: () => void; onAdded: (line: OrderLine) => void }) {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryID, setCategoryID] = useState("");
  const [selected, setSelected] = useState<Listing | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [mode, setMode] = useState<"same" | "different">("same");
  const listings = useListingSelector({ page: 1, page_size: 20, search: debouncedSearch, category_id: categoryID || undefined });
  const categories = useMutation({ mutationFn: () => categoryApi.list({ page: 1, page_size: 200, is_active: true }) });
  useEffect(() => {
    categories.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedSearch(search), 350);
    return () => window.clearTimeout(handle);
  }, [search]);
  const add = useMutation({
    mutationFn: () => orderApi.addLine(orderId, { listing_id: selected?.id || "", quantity, personalization_mode: mode }),
    onSuccess: (line) => {
      toast.push({ type: "success", title: "Listing added" });
      onAdded(line);
      onClose();
      window.setTimeout(() => document.getElementById(`order-line-${line.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    },
    onError: (error) => toast.push({ type: "error", title: "Could not add listing", message: apiMessage(error, "Add listing failed") }),
  });
  return (
    <Modal title="Add Listing" description="Choose a configured listing, then set quantity and personalization mode." onClose={onClose} width="max-w-5xl">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="grid gap-3">
          <div className="grid gap-2 md:grid-cols-[1fr_220px]">
            <SearchInput placeholder="Search title or internal SKU..." value={search} onChange={(event) => setSearch(event.target.value)} />
            <Select value={categoryID} onChange={(event) => setCategoryID(event.target.value)}>
              <option value="">All categories</option>
              {categories.data?.data.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </Select>
          </div>
          {listings.isLoading ? <SkeletonRows rows={5} /> : null}
          {listings.data?.data.map((listing) => (
            <ListingSelectorRow key={listing.id} listing={listing} selected={selected?.id === listing.id} onSelect={() => setSelected(listing)} />
          ))}
          {!listings.isLoading && !listings.data?.data.length ? <EmptyState title="No listings found" message="Try a different search or category." /> : null}
        </div>
        <div className="grid content-start gap-4 border-t border-border pt-4 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
          <h3 className="font-bold">Line setup</h3>
          <Field label="Quantity">
            <Input type="number" min={1} value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value)))} />
          </Field>
          <Field label="Personalization mode">
            <Select value={mode} onChange={(event) => setMode(event.target.value as "same" | "different")}>
              <option value="same">Same personalization for all</option>
              <option value="different">Different personalization for each</option>
            </Select>
          </Field>
          <SoftPanel className="text-sm text-muted">
            {mode === "same" ? `Creates 1 item x quantity ${quantity}.` : `Creates ${quantity} items x quantity 1.`}
          </SoftPanel>
          {selected && !listingSupplierReady(selected) ? (
            <ErrorState title="Supplier configuration missing" message="This listing can be added only if the backend allows it, but the order cannot be sent until configuration is complete." />
          ) : null}
          <Button disabled={!selected || quantity < 1 || add.isPending} onClick={() => add.mutate()}>
            {add.isPending ? <Spinner label="Adding" /> : "Add Listing"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ListingSelectorRow({ listing, selected, onSelect }: { listing: Listing; selected: boolean; onSelect: () => void }) {
  const counts = supplierVariantCounts(listing.supplier);
  const ready = listingSupplierReady(listing);
  return (
    <button
      type="button"
      className={clsx(
        "grid gap-3 rounded-lg border p-3 text-left transition md:grid-cols-[56px_1fr_auto]",
        selected ? "border-blue-700 bg-blue-50" : "border-border bg-white hover:bg-slate-50",
      )}
      onClick={onSelect}
    >
      <div className="h-14 w-14 overflow-hidden rounded-lg bg-slate-100">
        {listing.primary_image?.url ? <img src={listing.primary_image.url} alt={listing.short_name} className="h-full w-full object-contain" /> : null}
      </div>
      <div className="min-w-0">
        <p className="truncate font-semibold">{listing.short_name}</p>
        <p className="truncate text-xs text-muted">{listing.title}</p>
        <p className="mt-1 text-xs text-muted">SKU {listing.sku || "None"} / Supplier {listing.supplier?.sku || "Missing"}</p>
        <p className="mt-1 text-xs text-muted">{counts.options} options / {counts.colors} colors / {counts.printMethods} print methods / {counts.positions} positions</p>
      </div>
      <Badge tone={ready ? "success" : "warning"}>{ready ? "Configured" : "Missing Configuration"}</Badge>
    </button>
  );
}

export function OrderLineCard({
  order,
  line,
  openItems,
  setOpenItems,
  itemDrafts,
  onDraftChange,
  onChanged,
}: {
  order: Order;
  line: OrderLine;
  openItems: Set<string>;
  setOpenItems: (next: Set<string>) => void;
  itemDrafts: Record<string, OrderItem>;
  onDraftChange: (itemId: string, draft: OrderItem) => void;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const remove = useMutation({
    mutationFn: () => orderApi.deleteLine(order.id, line.id),
    onSuccess: async () => {
      toast.push({ type: "success", title: "Line removed" });
      await onChanged();
    },
    onError: (error) => toast.push({ type: "error", title: "Delete failed", message: apiMessage(error, "Unable to delete line") }),
  });
  const completeItems = line.items.filter(itemProductionComplete).length;
  return (
    <section id={`order-line-${line.id}`} className="border-b border-border pb-5">
      <div className="flex flex-col gap-3 py-1 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-bold">{line.listing_title}</h2>
          <p className="text-sm text-muted">
            SKU {line.listing_sku || "None"} / Supplier {line.supplier_sku} / Qty {line.quantity} / {line.personalization_mode}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={completeItems === line.items.length ? "success" : "warning"}>{completeItems}/{line.items.length} items complete</Badge>
          <ActionIconButton tone="delete" label="Delete line" onClick={() => setConfirmDelete(true)}>
            <HiOutlineTrash className="h-4 w-4" />
          </ActionIconButton>
        </div>
      </div>
      <div className="grid gap-3">
        {line.items.map((item, index) => (
          <OrderItemAccordion
            key={item.id}
            order={order}
            line={line}
            item={item}
            draft={itemDrafts[item.id] || item}
            onDraftChange={(draft) => onDraftChange(item.id, draft)}
            previousItem={index > 0 ? line.items[index - 1] : undefined}
            open={openItems.has(item.id)}
            onToggle={(open) => {
              const next = new Set(openItems);
              if (open) next.add(item.id);
              else next.delete(item.id);
              setOpenItems(next);
            }}
            onChanged={onChanged}
          />
        ))}
      </div>
      <ConfirmDialog
        open={confirmDelete}
        title="Delete product line?"
        message="This removes generated items and related file records for this line. The backend will reject the action if the order is no longer editable."
        danger
        confirmLabel={remove.isPending ? "Deleting" : "Delete line"}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => remove.mutate()}
      />
    </section>
  );
}

function OrderItemAccordion({
  order,
  line,
  item,
  draft,
  onDraftChange,
  previousItem,
  open,
  onToggle,
  onChanged,
}: {
  order: Order;
  line: OrderLine;
  item: OrderItem;
  draft: OrderItem;
  onDraftChange: (draft: OrderItem) => void;
  previousItem?: OrderItem;
  open: boolean;
  onToggle: (open: boolean) => void;
  onChanged: () => void;
}) {
  const mainDesign = itemMainDesign(item);
  const complete = itemProductionComplete(item) && Boolean(mainDesign);
  const hasSubDesign = item.files?.some((file) => file.usage === "sub_design" && file.is_selected);
  return (
    <div id={`order-item-${item.id}`} className="bg-white">
      <button
        type="button"
        className="flex w-full flex-col gap-2 border-t border-border py-3 text-left md:flex-row md:items-center md:justify-between"
        aria-expanded={open}
        aria-controls={`order-item-panel-${item.id}`}
        onClick={() => onToggle(!open)}
      >
        <div>
          <p className="font-semibold">Item {item.item_number} / Qty {item.quantity}</p>
          <p className="text-xs text-muted">{supplierConfigSummary(draft) || "Configuration missing"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={complete ? "success" : "warning"}>{complete ? "Complete" : "Incomplete"}</Badge>
          {!mainDesign ? <Badge tone="warning">Main design missing</Badge> : null}
          <Badge tone="neutral">{itemMockupCount(item)} mockups</Badge>
          <HiOutlineChevronDown className={clsx("h-4 w-4 transition", open && "rotate-180")} />
        </div>
      </button>
      {open ? (
        <div id={`order-item-panel-${item.id}`} className="grid gap-5 pb-5">
          <div className="grid gap-5 xl:grid-cols-2">
            <div className="grid gap-3 xl:border-r xl:border-border xl:pr-5">
              <SectionHeading title="Customer Information" />
              <Field label="Personalization Text">
                <Textarea rows={2} className="min-h-16" placeholder="Enter personalization text" value={draft.personalization_text || ""} onChange={(event) => onDraftChange({ ...draft, personalization_text: event.target.value })} />
              </Field>
              <Field label="Customer Note">
                <Textarea rows={2} className="min-h-16" placeholder="Optional customer note" value={draft.customer_note || ""} onChange={(event) => onDraftChange({ ...draft, customer_note: event.target.value })} />
              </Field>
              <div className="flex flex-wrap gap-3">
                <ProductionFileSlot orderId={order.id} item={item} label="Customer Photos" fileType="customer_photo" usage={null} onChanged={onChanged} />
                <ProductionFileSlot orderId={order.id} item={item} label="Customer References" fileType="customer_reference" usage={null} onChanged={onChanged} />
              </div>
            </div>
            <div className="grid gap-3">
              <SectionHeading title="Production Configuration" />
              <Info label="Supplier SKU" value={item.supplier_sku} />
              <div id={`supplier-config-${item.id}`} className="grid gap-3 sm:grid-cols-2">
                <VariantSelect label="Option" values={line.supplier.options} value={draft.option || ""} onChange={(value) => onDraftChange({ ...draft, option: value })} />
                <VariantSelect label="Color" values={line.supplier.colors} value={draft.color || ""} onChange={(value) => onDraftChange({ ...draft, color: value })} />
                <VariantSelect label="Print Method" values={line.supplier.print_methods} value={draft.print_method || ""} onChange={(value) => onDraftChange({ ...draft, print_method: value })} />
                <VariantSelect label="Main Position" values={line.supplier.positions} value={draft.main_position || ""} onChange={(value) => onDraftChange({ ...draft, main_position: value })} />
                {hasSubDesign ? <VariantSelect label="Sub Position" values={line.supplier.positions} value={draft.sub_position || ""} optional onChange={(value) => onDraftChange({ ...draft, sub_position: value })} /> : null}
              </div>
              <Field label="Production Notice">
                <Input value={draft.production_notice || ""} onChange={(event) => onDraftChange({ ...draft, production_notice: event.target.value })} />
              </Field>
              <div className="flex flex-wrap gap-2">
                {previousItem ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      onDraftChange({
                        ...draft,
                        option: previousItem.option,
                        color: previousItem.color,
                        print_method: previousItem.print_method,
                        main_position: previousItem.main_position,
                        sub_position: previousItem.sub_position,
                      })
                    }
                  >
                    Copy previous config
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
          <div className="grid gap-3">
            <SectionHeading title="Designs and Mockups" />
            <div className="flex flex-wrap gap-3">
              <ProductionFileSlot orderId={order.id} item={item} label="Main Design" fileType="design" usage="main_design" position={draft.main_position} required onChanged={onChanged} />
              <ProductionFileSlot orderId={order.id} item={item} label="Sub Design" fileType="design" usage="sub_design" position={draft.sub_position} onChanged={onChanged} />
              <ProductionFileSlot orderId={order.id} item={item} label="Mockup 1" fileType="mockup" usage="mockup" onChanged={onChanged} />
              <ProductionFileSlot orderId={order.id} item={item} label="Mockup 2" fileType="mockup" usage="mockup2" onChanged={onChanged} />
              <ProductionFileSlot orderId={order.id} item={item} label="Additional Design" fileType="design" usage="additional_design" onChanged={onChanged} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function VariantSelect({ label, values, value, optional, onChange }: { label: string; values: string[]; value: string; optional?: boolean; onChange: (value: string) => void }) {
  if (values.length === 1) {
    return (
      <Field label={label}>
        <div className="py-2 text-sm font-semibold">{values[0]}</div>
      </Field>
    );
  }
  if (values.length <= 6) {
    return (
      <Field label={label}>
        <div className="flex flex-wrap gap-1.5">
          {optional ? (
            <button type="button" className={chipClass(!value)} onClick={() => onChange("")}>None</button>
          ) : null}
          {values.map((item) => (
            <button key={item} type="button" className={chipClass(value === item)} onClick={() => onChange(item)}>
              {item}
            </button>
          ))}
        </div>
      </Field>
    );
  }
  return (
    <Field label={label}>
      <Select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{optional ? "None" : "Select"}</option>
        {values.map((item) => <option key={item} value={item}>{item}</option>)}
      </Select>
    </Field>
  );
}

function chipClass(active: boolean) {
  return clsx(
    "rounded-full border px-2.5 py-1 text-xs font-semibold transition",
    active ? "border-blue-700 bg-blue-700 text-white" : "border-border bg-white text-slate-700 hover:bg-slate-50",
  );
}

function ProductionFileSlot({
  orderId,
  item,
  label,
  fileType,
  usage,
  position,
  required,
  onChanged,
}: {
  orderId: string;
  item: OrderItem;
  label: string;
  fileType: string;
  usage: string | null;
  position?: string | null;
  required?: boolean;
  onChanged: () => void;
}) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ file: OrderItemFile; url?: string } | null>(null);
  const [localPreview, setLocalPreview] = useState<{ url: string; mime: string; name: string } | null>(null);
  const selected = item.files?.find((file) =>
    usage === null
      ? file.file_type === fileType
      : file.usage === usage && (file.is_selected || usage === "additional_design"),
  );
  const add = useMutation({
    mutationFn: (file: File) =>
      orderApi.uploadItemFile(orderId, item.id, {
        file_type: fileType,
        usage,
        position: position || undefined,
        file,
      }),
    onSuccess: async () => {
      toast.push({ type: "success", title: `${label} saved` });
      await onChanged();
    },
    onError: (error) => toast.push({ type: "error", title: `${label} failed`, message: apiMessage(error, "Unable to save file") }),
  });
  const remove = useMutation({
    mutationFn: (fileId: string) => orderApi.deleteItemFile(item.id, fileId),
    onSuccess: async () => {
      toast.push({ type: "success", title: `${label} removed` });
      await onChanged();
    },
    onError: (error) => toast.push({ type: "error", title: "Delete failed", message: apiMessage(error, "Unable to delete file") }),
  });
  function handleFiles(files: FileList | File[]) {
    const file = Array.from(files)[0];
    if (file) {
      if (localPreview) URL.revokeObjectURL(localPreview.url);
      setLocalPreview({ url: URL.createObjectURL(file), mime: file.type, name: file.name });
      add.mutate(file);
    }
  }
  useEffect(() => () => {
    if (localPreview) URL.revokeObjectURL(localPreview.url);
  }, [localPreview]);
  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    handleFiles(event.dataTransfer.files);
  }
  return (
    <div className="w-[96px]" onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
      <p className="mb-1 truncate text-xs font-semibold text-slate-700" title={label}>{label}{required ? " *" : ""}</p>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        aria-label={`${label} file`}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          if (event.target.files) handleFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <button
        type="button"
        className={clsx(
          "group relative flex aspect-square w-full items-center justify-center overflow-hidden rounded border bg-white text-slate-500 transition",
          selected ? "border-border hover:border-blue-700" : "border-dashed border-slate-300 hover:border-blue-700 hover:text-blue-700",
        )}
        aria-label={`${selected ? "Replace" : "Upload"} ${label}`}
        disabled={add.isPending}
        onClick={() => inputRef.current?.click()}
      >
        {add.isPending ? (
          <Spinner label="Uploading" />
        ) : selected?.url && selected.mime_type.startsWith("image/") ? (
          <img src={selected.url} alt={selected.original_name} className="h-full w-full object-contain" />
        ) : localPreview?.mime.startsWith("image/") ? (
          <img src={localPreview.url} alt={localPreview.name} className="h-full w-full object-contain" />
        ) : selected ? (
          <FileGlyph file={selected} />
        ) : (
          <HiOutlineCloudArrowUp className="h-6 w-6" />
        )}
        {selected ? (
          <span className="absolute inset-x-0 bottom-0 hidden bg-slate-950/65 px-1 py-1 text-[10px] font-semibold text-white group-hover:block">
            Replace
          </span>
        ) : null}
      </button>
      <div className="mt-1 min-h-8">
        {selected ? (
          <>
            <p className="truncate text-[11px] text-muted" title={selected.original_name}>{selected.original_name}</p>
            <div className="mt-1 flex items-center gap-1">
              <button type="button" className="rounded p-1 text-muted hover:bg-slate-100" aria-label={`Preview ${label}`} onClick={() => setPreview({ file: selected, url: selected.url || localPreview?.url })}>
                <HiOutlineEye className="h-3.5 w-3.5" />
              </button>
              <a className={clsx("rounded p-1 text-muted hover:bg-slate-100", !selected.url && "pointer-events-none opacity-40")} aria-label={`Download ${label}`} href={selected.url || "#"} target="_blank" rel="noreferrer" title={selected.url ? "Open file" : "File URL is not available"}>
                <HiOutlineArrowDownTray className="h-3.5 w-3.5" />
              </a>
              <button
                type="button"
                className="rounded p-1 text-danger hover:bg-red-50 disabled:opacity-40"
                aria-label={`Delete ${label}`}
                disabled={remove.isPending}
                onClick={() => remove.mutate(selected.id)}
              >
                <HiOutlineTrash className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        ) : (
          <p className={clsx("text-[11px]", required ? "text-amber-700" : "text-muted")}>{required ? "Required" : "Optional"}</p>
        )}
      </div>
      {preview ? <FilePreviewModal file={preview.file} url={preview.url} onClose={() => setPreview(null)} /> : null}
    </div>
  );
}

function FileGlyph({ file }: { file: Pick<OrderItemFile, "mime_type" | "original_name"> }) {
  const isImage = file.mime_type?.startsWith("image/");
  const isPdf = file.mime_type === "application/pdf" || file.original_name.toLowerCase().endsWith(".pdf");
  if (isImage) return <HiOutlinePhoto className="h-6 w-6" />;
  if (isPdf) return <HiOutlineDocument className="h-6 w-6" />;
  return <HiOutlineDocument className="h-6 w-6" />;
}

function FilePreviewModal({ file, url, onClose }: { file: OrderItemFile; url?: string; onClose: () => void }) {
  const isImage = file.mime_type?.startsWith("image/");
  const isPdf = file.mime_type === "application/pdf" || file.original_name.toLowerCase().endsWith(".pdf");
  return (
    <Modal title="File preview" onClose={onClose} width="max-w-xl">
      <div className="grid gap-4">
        <div className="flex max-h-[70vh] min-h-64 items-center justify-center rounded border border-border bg-slate-50 text-slate-500">
          {url && isImage ? (
            <img src={url} alt={file.original_name} className="max-h-[68vh] max-w-full object-contain" />
          ) : url && isPdf ? (
            <iframe src={url} title={file.original_name} className="h-[68vh] w-full" />
          ) : (
            <div className="grid justify-items-center gap-2">
              <FileGlyph file={file} />
              <p className="text-sm text-muted">Preview URL is not available.</p>
            </div>
          )}
        </div>
        <div>
          <p className="font-semibold">{file.original_name}</p>
          <p className="text-sm text-muted">{file.mime_type} / {formatFileSize(file.size)}</p>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
          <a
            className={clsx(
              "inline-flex h-10 items-center gap-2 rounded-[10px] border border-border bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50",
              !url && "pointer-events-none opacity-40",
            )}
            href={url || "#"}
            target="_blank"
            rel="noreferrer"
            title={url ? "Open file in a new tab" : "File URL is not available"}
          >
            <HiOutlineArrowDownTray />
            Download
          </a>
        </div>
      </div>
    </Modal>
  );
}

export function ShippingLabelPanel({ order, onChanged }: { order: Order; onChanged: () => void }) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [localPreview, setLocalPreview] = useState<{ url: string; mime: string; name: string; size: number } | null>(null);
  const active = activeShippingLabel(order);
  const upload = useMutation({
    mutationFn: (file: File) => orderApi.uploadShippingLabel(order.id, file),
    onSuccess: async () => {
      toast.push({ type: "success", title: "Shipping label saved" });
      await onChanged();
    },
    onError: (error) => toast.push({ type: "error", title: "Label failed", message: apiMessage(error, "Unable to save shipping label") }),
  });
  useEffect(() => () => {
    if (localPreview) URL.revokeObjectURL(localPreview.url);
  }, [localPreview]);
  return (
    <section id="shipping-label-section" className="grid gap-3 pb-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-bold">Shipping Label</h2>
        <Button type="button" variant="secondary" disabled={upload.isPending} onClick={() => inputRef.current?.click()}>
          <HiOutlineCloudArrowUp />
          {active ? "Replace" : "Upload"}
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        aria-label="Shipping label file"
        accept="application/pdf,image/*"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            if (localPreview) URL.revokeObjectURL(localPreview.url);
            setLocalPreview({ url: URL.createObjectURL(file), mime: file.type, name: file.name, size: file.size });
            upload.mutate(file);
          }
          event.target.value = "";
        }}
      />
      {active ? (
        <div className="flex flex-col gap-3 rounded border border-border bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-border bg-slate-50 text-slate-500">
              <HiOutlineDocument className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold">{active.original_name}</p>
              <p className="text-xs text-muted">Version {active.version} / Uploaded {formatDateTime(active.uploaded_at)}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => setPreviewOpen(true)}>
              <HiOutlineEye />
              Preview
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => inputRef.current?.click()}>Replace</Button>
          </div>
        </div>
      ) : (
        <p className="flex items-center gap-2 text-sm text-amber-700">
          <HiOutlineExclamationTriangle className="h-4 w-4" />
          Shipping label required before sending to supplier.
        </p>
      )}
      {order.shipping_labels && order.shipping_labels.length > 1 ? <ShippingLabelHistory labels={order.shipping_labels.filter((label) => !label.is_active)} /> : null}
      {active && previewOpen ? (
        <FilePreviewModal
          file={{
            id: active.id,
            file_id: active.file_id,
            file_type: "shipping_label",
            usage: "shipping_label",
            sort_order: active.version,
            is_selected: active.is_active,
            original_name: active.original_name,
            mime_type: active.mime_type || localPreview?.mime || "application/octet-stream",
            size: localPreview?.size || active.size,
            created_at: active.uploaded_at,
          }}
          url={active.url || localPreview?.url}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}
    </section>
  );
}

function ShippingLabelHistory({ labels }: { labels: ShippingLabel[] }) {
  return (
    <details>
      <summary className="cursor-pointer text-sm font-semibold">View previous labels ({labels.length})</summary>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase text-muted">
            <tr>
              <th className="py-2 pr-4">Version</th>
              <th className="py-2 pr-4">Filename</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Uploaded</th>
              <th className="py-2 pr-4">Replaced</th>
            </tr>
          </thead>
          <tbody>
            {labels.map((label) => (
              <tr key={label.id} className="border-t border-border">
                <td className="py-2 pr-4">v{label.version}</td>
                <td className="py-2 pr-4">{label.original_name}</td>
                <td className="py-2 pr-4">{label.status}</td>
                <td className="py-2 pr-4">{formatDateTime(label.uploaded_at)}</td>
                <td className="py-2 pr-4">{formatDateTime(label.replaced_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function ActivityItem({ activity }: { activity: OrderActivity }) {
  return (
    <div className="flex gap-3 border-b border-border pb-3 last:border-b-0 last:pb-0">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700">
        <HiOutlineClock className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{activity.message}</p>
        <p className="text-xs text-muted">
          {activity.actor?.full_name || "System"} / {activity.activity_type.split("_").join(" ")} / {formatDateTime(activity.created_at)}
        </p>
      </div>
    </div>
  );
}

export function BackToOrders() {
  return (
    <Link to="/app/orders">
      <Button type="button" variant="secondary"><HiOutlineArrowLeft /> Back to Orders</Button>
    </Link>
  );
}

export function Info({ label, value, copyValue }: { label: string; value: string; copyValue?: string }) {
  const toast = useToast();
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-muted">{label}</dt>
      <dd className="mt-1 flex items-center gap-2 font-semibold">
        <span className="min-w-0 truncate">{value}</span>
        {copyValue ? (
          <button
            type="button"
            className="rounded p-1 text-muted hover:bg-slate-100"
            aria-label={`Copy ${label}`}
            onClick={() => {
              void navigator.clipboard?.writeText(copyValue);
              toast.push({ type: "success", title: "Copied" });
            }}
          >
            <HiOutlineClipboardDocument className="h-4 w-4" />
          </button>
        ) : null}
      </dd>
    </div>
  );
}

function SectionHeading({ title }: { title: string }) {
  return <h3 className="border-b border-border pb-2 text-sm font-bold text-foreground">{title}</h3>;
}

export function OrderSearchIcon() {
  return <HiOutlineMagnifyingGlass className="h-4 w-4" />;
}
