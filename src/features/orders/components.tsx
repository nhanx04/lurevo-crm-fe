import {
  ChangeEvent,
  DragEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  HiOutlineArrowLeft,
  HiOutlineArrowDownTray,
  HiOutlineArrowPath,
  HiOutlineChevronDown,
  HiOutlineClipboardDocument,
  HiOutlineClock,
  HiOutlineCloudArrowUp,
  HiOutlineDocument,
  HiOutlineEye,
  HiOutlineExclamationTriangle,
  HiOutlineFolderOpen,
  HiOutlineLink,
  HiOutlineMagnifyingGlass,
  HiOutlinePaperAirplane,
  HiOutlinePhoto,
  HiOutlineTrash,
  HiOutlineXMark,
} from "react-icons/hi2";
import clsx from "clsx";
import { queryKeys } from "@/api/queryKeys";
import { categoryApi, imageApi, orderApi } from "@/api/services";
import {
  useListingSelector,
  useOrderActivities,
  useShops,
  useWorkflowStatuses,
} from "./hooks";
import type {
  Listing,
  Order,
  OrderActivity,
  OrderItem,
  OrderItemFile,
  OrderLine,
  ShippingLabel,
} from "@/types/api";
import { ApiError } from "@/types/api";
import {
  ActionIconButton,
  Badge,
  Button,
  Field,
  Input,
  PaginationControls,
  SearchInput,
  Select,
  SoftPanel,
  Table,
  Textarea,
} from "@/components/ui";
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  SkeletonRows,
  Spinner,
  useToast,
} from "@/components/feedback";
import { Modal } from "@/components/layout";
import { DesignLibraryPicker, TransparencyBackground } from "@/features/design-library/components";
import { formatCurrency, formatDateTime, formatFileSize } from "@/utils/format";
import {
  activeShippingLabel,
  allowedWorkflowActions,
  apiMessage,
  itemMainDesign,
  itemMockupCount,
  itemProductionComplete,
  listingSupplierReady,
  orderStatusCodes,
  orderStatusAccent,
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
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: statusColor(status) }}
      />
      {status.name}
    </Badge>
  );
}

export function SupplierStatusBadge({ status }: { status?: string | null }) {
  const normalized = (status || "not_submitted").toLowerCase();
  const tone =
    normalized.includes("error") || normalized.includes("failed")
      ? "danger"
      : normalized.includes("success") ||
          normalized.includes("created") ||
          normalized.includes("submitted")
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
    {
      label: "Awaiting Review",
      statusCode: orderStatusCodes.awaitingReview,
      readiness: "",
    },
    {
      label: "Needs Revision",
      statusCode: orderStatusCodes.needsRevision,
      readiness: "",
    },
    { label: "Missing Design", statusCode: "", readiness: "missing_design" },
    { label: "Missing Label", statusCode: "", readiness: "missing_label" },
    {
      label: "Missing Configuration",
      statusCode: "",
      readiness: "missing_configuration",
    },
    {
      label: "Ready to Send",
      statusCode: orderStatusCodes.readyToSend,
      readiness: "",
    },
    {
      label: "Supplier Error",
      statusCode: orderStatusCodes.supplierError,
      readiness: "",
    },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {views.map((view) => {
        const status = view.statusCode
          ? statusByCode.get(view.statusCode)
          : undefined;
        const active =
          (view.readiness && params.readiness === view.readiness) ||
          (!view.readiness &&
            (params.status_id || "") === (status?.id || "") &&
            (view.statusCode || params.readiness ? !params.readiness : true));
        return (
          <button
            key={`${view.label}-${view.statusCode}-${view.readiness}`}
            type="button"
            className={clsx(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
              active
                ? "border-blue-900 bg-blue-900 text-white"
                : "border-border bg-white text-slate-700 hover:bg-slate-50",
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
      <SearchInput
        placeholder="Search order ID, customer, or SKU..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <Select
        value={params.shop_id || ""}
        onChange={(event) => setParam("shop_id", event.target.value)}
      >
        <option value="">All shops</option>
        {shops.data?.map((shop) => (
          <option key={shop.id} value={shop.id}>
            {shop.name}
          </option>
        ))}
      </Select>
      <Select
        value={params.status_id || ""}
        onChange={(event) => setParam("status_id", event.target.value)}
      >
        <option value="">All workflow statuses</option>
        {statuses.data?.data.map((status) => (
          <option key={status.id} value={status.id}>
            {status.name}
          </option>
        ))}
      </Select>
      <Select
        value={params.supplier_status || ""}
        onChange={(event) => setParam("supplier_status", event.target.value)}
      >
        <option value="">Supplier status</option>
        <option value="pending">Pending</option>
        <option value="processing">Processing</option>
        <option value="success">Created</option>
        <option value="failed">Error</option>
      </Select>
      <Select
        value={params.readiness || ""}
        onChange={(event) => setParam("readiness", event.target.value)}
      >
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
  const queryClient = useQueryClient();
  const toast = useToast();
  const [hoveredOrderId, setHoveredOrderId] = useState<string | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [syncResult, setSyncResult] = useState<SyncSupplierResultState | null>(null);
  const openOrder = (orderId: string) => navigate(`/app/orders/${orderId}`);
  const visibleOrderIds = (orders || []).map((order) => order.id);
  const visibleSelectedCount = visibleOrderIds.filter((id) => selectedOrderIds.has(id)).length;
  const allVisibleSelected = visibleOrderIds.length > 0 && visibleSelectedCount === visibleOrderIds.length;
  const someVisibleSelected = visibleSelectedCount > 0 && !allVisibleSelected;
  const selectAllRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    setSelectedOrderIds((current) => new Set([...current].filter((id) => visibleOrderIds.includes(id))));
  }, [visibleOrderIds.join("|")]);
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someVisibleSelected;
  }, [someVisibleSelected]);
  const syncSelected = useMutation({
    mutationFn: () => orderApi.syncSupplierData([...selectedOrderIds]),
    onSuccess: async (result) => {
      setSyncResult(result);
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      const message = result.failed || result.skipped
        ? `Supplier sync completed: ${result.synced} synced, ${result.skipped} skipped, ${result.failed} failed.`
        : `${result.synced} orders synced successfully.`;
      toast.push({ type: result.failed ? "info" : "success", title: "Supplier sync completed", message });
    },
    onError: (error) =>
      toast.push({
        type: "error",
        title: "Supplier sync failed",
        message: apiMessage(error, "Unable to sync supplier data"),
      }),
  });
  if (loading) return <SkeletonRows rows={8} />;
  if (error)
    return <ErrorState message="Could not load orders." onRetry={onRetry} />;
  if (!orders?.length) {
    return (
      <EmptyState
        title="No orders found."
        message="Create your first order to begin processing Etsy purchases."
      />
    );
  }
  return (
    <>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-slate-700">
          {selectedOrderIds.size ? `${selectedOrderIds.size} orders selected` : "Select orders to sync supplier data"}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={!selectedOrderIds.size || syncSelected.isPending}
            title={!selectedOrderIds.size ? "Select at least one order" : "Sync selected supplier data"}
            onClick={() => syncSelected.mutate()}
          >
            {syncSelected.isPending ? <Spinner label="Syncing" /> : <HiOutlineArrowPath />}
            {syncSelected.isPending ? "Syncing..." : "Sync Supplier Data"}
          </Button>
          {selectedOrderIds.size ? (
            <Button type="button" variant="ghost" onClick={() => setSelectedOrderIds(new Set())}>
              Clear selection
            </Button>
          ) : null}
          {syncResult ? (
            <Button type="button" variant="ghost" onClick={() => setSyncResult(syncResult)}>
              View sync result
            </Button>
          ) : null}
        </div>
      </div>
      <Table>
        <thead className="bg-slate-50 text-[11px] font-semibold uppercase text-muted">
          <tr>
            <th className="w-12 px-4 py-3">
              <input
                ref={selectAllRef}
                type="checkbox"
                aria-label="Select all visible orders"
                checked={allVisibleSelected}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setSelectedOrderIds((current) => {
                    const next = new Set(current);
                    visibleOrderIds.forEach((id) => checked ? next.add(id) : next.delete(id));
                    return next;
                  });
                }}
              />
            </th>
            <th className="px-4 py-3">Order</th>
            <th className="px-4 py-3">Shop / Customer</th>
            <th className="px-4 py-3">Product and Configuration</th>
            <th className="px-4 py-3">Design</th>
            <th className="px-4 py-3">Mockup</th>
            <th className="px-4 py-3">Qty</th>
            <th className="px-4 py-3">Workflow Status</th>
            <th className="px-4 py-3">Supplier Data</th>
            <th className="px-4 py-3">Item Fee</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {orders.map((order) => (
            <OrderTableGroup
              key={order.id}
              order={order}
              hovered={hoveredOrderId === order.id}
              onHover={(active) => setHoveredOrderId(active ? order.id : null)}
              onOpen={() => openOrder(order.id)}
              onChanged={onRetry}
              selected={selectedOrderIds.has(order.id)}
              onSelectedChange={(checked) =>
                setSelectedOrderIds((current) => {
                  const next = new Set(current);
                  if (checked) next.add(order.id);
                  else next.delete(order.id);
                  return next;
                })
              }
            />
          ))}
        </tbody>
      </Table>
      <PaginationControls
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        onPage={onPage}
      />
      {syncResult ? <SupplierSyncResultModal result={syncResult} onClose={() => setSyncResult(null)} /> : null}
    </>
  );
}

type SyncSupplierResultState = Awaited<ReturnType<typeof orderApi.syncSupplierData>>;

const COLLAPSED_ITEM_LIMIT = 5;

type OrderTableItem = {
  key: string;
  line?: OrderLine;
  item?: OrderItem;
};

function OrderTableGroup({
  order,
  hovered,
  onHover,
  onOpen,
  onChanged,
  selected,
  onSelectedChange,
}: {
  order: Order;
  hovered: boolean;
  onHover: (active: boolean) => void;
  onOpen: () => void;
  onChanged: () => void;
  selected: boolean;
  onSelectedChange: (checked: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const allItems = orderTableItems(order);
  const hasMore = allItems.length > COLLAPSED_ITEM_LIMIT;
  const visibleItems =
    expanded || !hasMore ? allItems : allItems.slice(0, COLLAPSED_ITEM_LIMIT);
  const rowSpan = visibleItems.length + (hasMore ? 1 : 0);
  const accent = orderStatusAccent(order.status);
  const groupClass = clsx(
    "cursor-pointer transition focus:bg-blue-50/80 focus:outline-none",
    hovered ? "bg-blue-50/80" : accent.row,
  );
  const openFromRow = (event: ReactMouseEvent | ReactKeyboardEvent) => {
    if (isRowInteractive(event.target)) return;
    if ("key" in event) {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
    }
    onOpen();
  };

  return (
    <>
      {visibleItems.map((entry, index) => (
        <tr
          key={entry.key}
          tabIndex={0}
          className={clsx(
            groupClass,
            index === 0
              ? "border-t-2 border-slate-200"
              : "border-t border-slate-100",
          )}
          onClick={openFromRow}
          onKeyDown={openFromRow}
          onMouseEnter={() => onHover(true)}
          onMouseLeave={() => onHover(false)}
        >
          {index === 0 ? (
            <>
              <td rowSpan={rowSpan} className="w-12 px-4 py-4 align-top">
                <input
                  type="checkbox"
                  aria-label={`Select order ${order.etsy_order_id}`}
                  checked={selected}
                  data-row-interactive="true"
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => onSelectedChange(event.target.checked)}
                />
              </td>
              <OrderMetadataCell
                order={order}
                accent={accent.marker}
                rowSpan={rowSpan}
              />
              <td
                rowSpan={rowSpan}
                className="min-w-[150px] px-4 py-4 align-top"
              >
                <p className="font-semibold">{order.shop.name}</p>
                <p className="mt-1 text-xs text-muted">
                  {order.customer_name || "No customer"}
                </p>
              </td>
            </>
          ) : null}
          <ItemProductCell entry={entry} />
          <td className="px-4 py-3 align-middle">
            <ItemDesignPreview entry={entry} />
          </td>
          <td className="px-4 py-3 align-middle">
            <ItemMockupPreview entry={entry} />
          </td>
          <td className="px-4 py-3 text-sm font-semibold align-middle">
            {entry.item?.quantity || 0}
          </td>
          {index === 0 ? (
            <>
              <td rowSpan={rowSpan} className="px-4 py-4 align-top">
                <OrderStatusBadge status={order.status} />
              </td>
              <td rowSpan={rowSpan} className="min-w-[220px] px-4 py-4 align-top">
                <SupplierDataCell order={order} />
              </td>
              <td rowSpan={rowSpan} className="min-w-[180px] px-4 py-4 align-top">
                <ItemFeeCell order={order} />
              </td>
              <td rowSpan={rowSpan} className="px-4 py-4 text-right align-top">
                <SupplierTableAction order={order} onChanged={onChanged} />
              </td>
            </>
          ) : null}
        </tr>
      ))}
      {hasMore ? (
        <tr
          className={clsx(groupClass, "border-t border-slate-100")}
          onMouseEnter={() => onHover(true)}
          onMouseLeave={() => onHover(false)}
        >
          <td colSpan={4} className="px-4 py-2">
            <button
              type="button"
              className="text-xs font-semibold text-blue-700 hover:text-blue-900"
              aria-expanded={expanded}
              data-row-interactive="true"
              onClick={(event) => {
                event.stopPropagation();
                setExpanded((value) => !value);
              }}
            >
              {expanded
                ? "Collapse items"
                : `Show ${allItems.length - COLLAPSED_ITEM_LIMIT} more items`}
            </button>
          </td>
        </tr>
      ) : null}
    </>
  );
}

function OrderMetadataCell({
  order,
  accent,
  rowSpan,
}: {
  order: Order;
  accent: string;
  rowSpan: number;
}) {
  return (
    <td
      rowSpan={rowSpan}
      className="relative min-w-[150px] px-4 py-4 align-top"
    >
      <span
        className={clsx(
          "absolute inset-y-2 left-0 w-1 rounded-r-full opacity-80",
          accent,
        )}
      />
      <Link
        to={`/app/orders/${order.id}`}
        onClick={(event) => event.stopPropagation()}
        className="font-semibold text-foreground hover:text-blue-700"
      >
        {order.etsy_order_id}
      </Link>
      <p className="mt-1 text-xs text-muted">
        {formatDateTime(order.ordered_at || order.created_at)}
      </p>
      <p className="mt-2 text-xs font-semibold text-slate-600">
        {order.products_count} products / {order.items_count} items / Qty{" "}
        {orderTotalQuantity(order) || order.items_count}
      </p>
    </td>
  );
}

function SupplierDataCell({ order }: { order: Order }) {
  const toast = useToast();
  const tracking = order.supplier.tracking_number?.trim();
  const carrier = order.supplier.carrier?.trim();
  return (
    <div className="grid gap-2 text-xs">
      <div>
        <p className="text-[11px] font-semibold uppercase text-muted">Status</p>
        <SupplierStatusBadge status={order.supplier.status} />
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase text-muted">Tracking</p>
        {tracking ? (
          <button
            type="button"
            data-row-interactive="true"
            className="flex max-w-[180px] items-center gap-1 font-semibold text-blue-700 hover:text-blue-900"
            title={tracking}
            onClick={(event) => {
              event.stopPropagation();
              void navigator.clipboard?.writeText(tracking);
              toast.push({ type: "success", title: "Tracking copied" });
            }}
          >
            <span className="truncate">{tracking}</span>
            <HiOutlineClipboardDocument className="h-3.5 w-3.5 shrink-0" />
          </button>
        ) : (
          <p className="font-semibold text-slate-500">-</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase text-muted">Total fee</p>
          <p className="font-semibold">{formatMoneyOrDash(order.supplier.total_fee)}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase text-muted">Carrier</p>
          <p className="font-semibold">{carrier || "-"}</p>
        </div>
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase text-muted">Synced</p>
        <p className="font-semibold">{order.supplier.last_synced_at ? formatDateTime(order.supplier.last_synced_at) : "Never"}</p>
      </div>
    </div>
  );
}

function ItemFeeCell({ order }: { order: Order }) {
  const items = (order.lines || []).flatMap((line) => line.items.map((item) => ({ line, item })));
  if (!items.length) return <span className="text-sm font-semibold text-slate-500">-</span>;
  const visible = items.slice(0, 3);
  return (
    <div className="grid gap-2 text-xs">
      {visible.map(({ item }, index) => (
        <div key={item.id}>
          {items.length > 1 ? (
            <p className="max-w-[160px] truncate text-[11px] font-semibold text-muted" title={item.supplier_sku}>
              Item {item.item_number} / {item.supplier_sku}
            </p>
          ) : null}
          <p className="font-semibold">
            {formatMoneyOrDash(item.supplier_item_fee)}
            <span className="ml-1 text-muted">x {item.quantity}</span>
          </p>
          {index < visible.length - 1 ? <div className="mt-2 border-t border-slate-100" /> : null}
        </div>
      ))}
      {items.length > visible.length ? (
        <p className="font-semibold text-blue-700">+{items.length - visible.length} more</p>
      ) : null}
    </div>
  );
}

function formatMoneyOrDash(value?: string | null) {
  if (value === null || value === undefined || value === "") return "-";
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return formatCurrency(value);
}

function SupplierSyncResultModal({
  result,
  onClose,
}: {
  result: SyncSupplierResultState;
  onClose: () => void;
}) {
  return (
    <Modal title="Supplier Sync Result" onClose={onClose} width="max-w-2xl">
      <div className="grid gap-4">
        <div className="grid grid-cols-3 gap-3 text-sm">
          <SoftPanel className="p-3"><p className="text-muted">Synced</p><p className="text-lg font-bold">{result.synced}</p></SoftPanel>
          <SoftPanel className="p-3"><p className="text-muted">Skipped</p><p className="text-lg font-bold">{result.skipped}</p></SoftPanel>
          <SoftPanel className="p-3"><p className="text-muted">Failed</p><p className="text-lg font-bold">{result.failed}</p></SoftPanel>
        </div>
        <div className="max-h-[52vh] overflow-y-auto rounded border border-border">
          {result.results.map((item) => (
            <div key={item.order_id} className="border-b border-border p-3 last:border-b-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">#{item.customer_order_id || item.order_id}</p>
                <Badge tone={item.status === "synced" ? "success" : item.status === "skipped" ? "warning" : "danger"}>{item.status}</Badge>
              </div>
              {item.message ? <p className="mt-1 text-sm text-muted">{item.message}</p> : null}
              {item.warnings?.length ? (
                <ul className="mt-2 list-disc pl-5 text-sm text-amber-700">
                  {item.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function ItemProductCell({ entry }: { entry: OrderTableItem }) {
  if (!entry.item || !entry.line) {
    return (
      <td className="min-w-[300px] px-4 py-3 align-middle">
        <p className="font-semibold text-slate-700">No items added</p>
        <p className="mt-1 text-xs text-muted">
          Add a listing in the order workspace.
        </p>
      </td>
    );
  }
  const item = entry.item;
  const line = entry.line;
  const optionColor = [
    item.option || "Option missing",
    item.color || "Color missing",
  ].join(" / ");
  const methodPosition = [
    item.print_method || "Print method missing",
    item.main_position || "Position missing",
  ].join(" / ");
  return (
    <td className="min-w-[320px] px-4 py-3 align-middle">
      <p className="font-semibold text-foreground">{line.listing_title}</p>
      <p className="mt-1 text-xs text-muted">
        {[line.listing_sku, item.supplier_sku].filter(Boolean).join(" / ") ||
          "SKU missing"}
      </p>
      <p className="mt-2 text-xs font-medium text-slate-700">
        Item {item.item_number} / {optionColor}
      </p>
      <p className="mt-1 text-xs text-muted">{methodPosition}</p>
    </td>
  );
}

function ItemDesignPreview({ entry }: { entry: OrderTableItem }) {
  const files = selectedFiles(entry.item, ["main_design", "sub_design"]);
  return (
    <ItemFilePreview
      files={files}
      placeholder="No design"
      ariaLabel={`Preview design for item ${entry.item?.item_number || 0}`}
      indicator={files.length > 1 ? "+ sub" : undefined}
      itemReference={itemReference(entry)}
    />
  );
}

function ItemMockupPreview({ entry }: { entry: OrderTableItem }) {
  const files = selectedFiles(entry.item, ["mockup", "mockup2"]);
  return (
    <ItemFilePreview
      files={files}
      placeholder="No mockup"
      ariaLabel={`Preview mockup for item ${entry.item?.item_number || 0}`}
      indicator={files.length > 1 ? "+1" : undefined}
      itemReference={itemReference(entry)}
    />
  );
}

function ItemFilePreview({
  files,
  placeholder,
  ariaLabel,
  indicator,
  itemReference,
}: {
  files: OrderItemFile[];
  placeholder: string;
  ariaLabel: string;
  indicator?: string;
  itemReference?: string;
}) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  if (!files.length) {
    return (
      <span
        className="flex h-11 w-11 items-center justify-center rounded border border-dashed border-border bg-slate-50 text-slate-400"
        title={placeholder}
      >
        <HiOutlinePhoto className="h-5 w-5" />
      </span>
    );
  }
  const file = files[0];
  return (
    <div className="relative inline-flex" data-row-interactive="true">
      <button
        ref={triggerRef}
        type="button"
        className="flex h-11 w-11 items-center justify-center overflow-hidden rounded border border-border bg-white text-slate-500 transition hover:border-blue-700 hover:text-blue-700"
        aria-label={ariaLabel}
        title={file.original_name}
        onClick={(event) => {
          event.stopPropagation();
          setPreviewIndex(0);
        }}
      >
        {file.url && file.mime_type.startsWith("image/") ? (
          <img src={file.url} alt="" className="h-full w-full object-contain" />
        ) : (
          <FileGlyph file={file} />
        )}
      </button>
      {indicator ? (
        <span className="absolute -right-2 -top-2 rounded-full bg-blue-700 px-1.5 py-0.5 text-[10px] font-bold text-white">
          {indicator}
        </span>
      ) : null}
      {previewIndex !== null ? (
        <FilePreviewModal
          file={files[previewIndex]}
          url={files[previewIndex]?.url}
          itemReference={itemReference}
          hasPrevious={previewIndex > 0}
          hasNext={previewIndex < files.length - 1}
          onPrevious={() =>
            setPreviewIndex((index) =>
              index === null ? index : Math.max(0, index - 1),
            )
          }
          onNext={() =>
            setPreviewIndex((index) =>
              index === null ? index : Math.min(files.length - 1, index + 1),
            )
          }
          onClose={() => {
            setPreviewIndex(null);
            window.setTimeout(() => triggerRef.current?.focus(), 0);
          }}
        />
      ) : null}
    </div>
  );
}

function orderTableItems(order: Order): OrderTableItem[] {
  const items = (order.lines || []).flatMap((line) =>
    line.items.map((item) => ({ key: item.id, line, item })),
  );
  return items.length ? items : [{ key: `${order.id}-empty` }];
}

function selectedFiles(item: OrderItem | undefined, usages: string[]) {
  if (!item) return [];
  return usages
    .map((usage) =>
      item.files?.find((file) => file.usage === usage && file.is_selected),
    )
    .filter((file): file is OrderItemFile => Boolean(file));
}

function itemReference(entry: OrderTableItem) {
  if (!entry.item) return undefined;
  return `Item ${entry.item.item_number}${entry.line?.listing_title ? ` / ${entry.line.listing_title}` : ""}`;
}

function isRowInteractive(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    Boolean(
      target.closest(
        "button,a,input,select,textarea,[data-row-interactive='true']",
      ),
    )
  );
}

function SupplierTableAction({
  order,
  onChanged,
}: {
  order: Order;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [sendOpen, setSendOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [labelOpen, setLabelOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  async function deleteLocalOrder() {
    setDeleting(true);
    try {
      await orderApi.remove(order.id);
      toast.push({ type: "success", title: "Order deleted" });
      await onChanged();
    } catch (error) {
      toast.push({
        type: "error",
        title: "Delete failed",
        message: apiMessage(error, "Unable to delete order"),
      });
    } finally {
      setDeleting(false);
    }
  }
  const ready =
    Boolean(order.readiness?.ready) ||
    (!orderListMissing(order).length &&
      order.status.code === orderStatusCodes.readyToSend);
  const submitted =
    order.status.code === orderStatusCodes.supplierSubmitted ||
    Boolean(order.supplier.order_id);
  const cancelled = order.status.code === orderStatusCodes.cancelled;
  const failed =
    order.status.code === orderStatusCodes.supplierError ||
    order.supplier.status?.toLowerCase().includes("failed");
  const labelFile = activeShippingLabel(order);
  const actionButtonClass = "w-[150px]";
  const viewLabelClass =
    "w-[150px] !border-green-600 !bg-green-600 !text-white hover:!bg-green-700";
  if (submitted) {
    return (
      <div
        className="flex w-[150px] flex-col items-stretch gap-2"
        data-row-interactive="true"
      >
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className={viewLabelClass}
          disabled={!labelFile}
          title={labelFile ? "View shipping label" : "No active shipping label"}
          onClick={(event) => {
            event.stopPropagation();
            if (labelFile) setLabelOpen(true);
          }}
        >
          <HiOutlineEye />
          View Label
        </Button>
        <Button
          type="button"
          size="sm"
          variant="danger"
          className={actionButtonClass}
          onClick={(event) => {
            event.stopPropagation();
            setCancelOpen(true);
          }}
        >
          Cancel Order
        </Button>
        {labelOpen && labelFile ? (
          <ShippingLabelPreviewDialog
            label={labelFile}
            onClose={() => setLabelOpen(false)}
          />
        ) : null}
        {cancelOpen ? (
          <CancelOrderDialog
            order={order}
            onClose={() => setCancelOpen(false)}
            onChanged={onChanged}
          />
        ) : null}
      </div>
    );
  }
  const label = failed ? "Retry Supplier" : "Send to Supplier";
  const disabled = cancelled || (!ready && !failed);
  const tooltip = cancelled
    ? "Cancelled orders cannot be sent."
    : !ready && !failed
      ? `Missing ${orderListMissing(order).join(", ") || "readiness checks"}.`
      : label;
  return (
    <div
      className="flex w-[150px] flex-col items-stretch gap-2"
      data-row-interactive="true"
    >
      <Button
        type="button"
        size="sm"
        className={actionButtonClass}
        disabled={disabled}
        title={tooltip}
        onClick={(event) => {
          event.stopPropagation();
          if (!disabled) setSendOpen(true);
        }}
      >
        <HiOutlinePaperAirplane />
        {label}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className={viewLabelClass}
        disabled={!labelFile}
        title={labelFile ? "View shipping label" : "No active shipping label"}
        onClick={(event) => {
          event.stopPropagation();
          if (labelFile) setLabelOpen(true);
        }}
      >
        <HiOutlineEye />
        View Label
      </Button>
      <Button
        type="button"
        size="sm"
        variant="danger"
        className={actionButtonClass}
        disabled={deleting}
        title="Delete this local order"
        onClick={(event) => {
          event.stopPropagation();
          void deleteLocalOrder();
        }}
      >
        <HiOutlineTrash />
        {deleting ? "Deleting" : "Delete"}
      </Button>
      {sendOpen ? (
        <SendToSupplierDialog
          order={order}
          retry={failed}
          onClose={() => setSendOpen(false)}
          onChanged={onChanged}
        />
      ) : null}
      {labelOpen && labelFile ? (
        <ShippingLabelPreviewDialog
          label={labelFile}
          onClose={() => setLabelOpen(false)}
        />
      ) : null}
    </div>
  );
}

function ShippingLabelPreviewDialog({
  label,
  onClose,
}: {
  label: ShippingLabel;
  onClose: () => void;
}) {
  return (
    <FilePreviewModal
      file={{
        id: label.id,
        file_id: label.file_id,
        storage_key: label.storage_key,
        file_type: "shipping_label",
        usage: "shipping_label",
        sort_order: label.version,
        is_selected: label.is_active,
        original_name: label.original_name,
        mime_type: label.mime_type || "application/octet-stream",
        size: label.size,
        created_at: label.uploaded_at,
      }}
      url={label.url}
      itemReference={`Shipping label / Version ${label.version}`}
      onClose={onClose}
    />
  );
}

function orderListMissing(order: Order) {
  const missing: string[] = [];
  if (!order.has_active_shipping_label) missing.push("label");
  const missingDesigns = Math.max(0, order.items_count - order.designs_count);
  if (missingDesigns)
    missing.push(`${missingDesigns} design${missingDesigns === 1 ? "" : "s"}`);
  const missingConfig = Math.max(
    0,
    order.items_count - order.configured_items_count,
  );
  if (missingConfig) missing.push(`${missingConfig} config`);
  return missing;
}

export function OrderPreviewThumbnails({
  order,
  kind,
}: {
  order: Order;
  kind: "design" | "mockup";
}) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const usages = kind === "design" ? ["main_design"] : ["mockup", "mockup2"];
  const files =
    order.lines?.flatMap((line) =>
      line.items.flatMap((item) =>
        (item.files || [])
          .filter(
            (file) => file.is_selected && usages.includes(file.usage || ""),
          )
          .map((file) => ({
            ...file,
            itemNumber: item.item_number,
            listingTitle: line.listing_title,
          })),
      ),
    ) || [];
  const fallbackCount = kind === "design" ? order.designs_count : 0;
  const visible = files.slice(0, 4);
  const overflow = Math.max(0, files.length - visible.length);
  const stopRowNavigation = (event: ReactMouseEvent | ReactKeyboardEvent) => {
    event.stopPropagation();
  };
  return (
    <>
      <div
        className="flex min-w-[112px] items-center gap-1.5"
        data-row-interactive="true"
        onClick={stopRowNavigation}
        onKeyDown={stopRowNavigation}
      >
        {visible.length ? (
          visible.map((file, index) => (
            <button
              key={file.id}
              ref={previewIndex === index ? triggerRef : undefined}
              type="button"
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded border border-border bg-white text-slate-500 hover:border-blue-700 hover:text-blue-700"
              aria-label={`Preview ${kind} for item ${file.itemNumber}`}
              title={`Item ${file.itemNumber}: ${file.original_name}`}
              onClick={(event) => {
                event.stopPropagation();
                triggerRef.current = event.currentTarget;
                setPreviewIndex(index);
              }}
              onKeyDown={(event) => {
                event.stopPropagation();
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  triggerRef.current = event.currentTarget;
                  setPreviewIndex(index);
                }
              }}
            >
              {file.url && file.mime_type.startsWith("image/") ? (
                <img
                  src={file.url}
                  alt=""
                  className="h-full w-full object-contain"
                />
              ) : (
                <FileGlyph file={file} />
              )}
            </button>
          ))
        ) : fallbackCount ? (
          <span className="flex h-10 w-10 items-center justify-center rounded border border-border bg-slate-50 text-xs font-semibold text-muted">
            {fallbackCount}
          </span>
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded border border-dashed border-border bg-slate-50 text-slate-400">
            <HiOutlinePhoto className="h-5 w-5" />
          </span>
        )}
        {overflow ? (
          <span className="text-xs font-semibold text-muted">+{overflow}</span>
        ) : null}
      </div>
      {previewIndex !== null ? (
        <FilePreviewModal
          file={files[previewIndex]}
          url={files[previewIndex]?.url}
          itemReference={`Item ${files[previewIndex]?.itemNumber}${files[previewIndex]?.listingTitle ? ` / ${files[previewIndex]?.listingTitle}` : ""}`}
          hasPrevious={previewIndex > 0}
          hasNext={previewIndex < files.length - 1}
          onPrevious={() =>
            setPreviewIndex((index) =>
              index === null ? index : Math.max(0, index - 1),
            )
          }
          onNext={() =>
            setPreviewIndex((index) =>
              index === null ? index : Math.min(files.length - 1, index + 1),
            )
          }
          onClose={() => {
            setPreviewIndex(null);
            window.setTimeout(() => triggerRef.current?.focus(), 0);
          }}
        />
      ) : null}
    </>
  );
}

function localDateTimeValue(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function CreateOrderForm({
  modal = false,
  onCancel,
  onCreated,
}: {
  modal?: boolean;
  onCancel?: () => void;
  onCreated?: (order: Order) => void;
} = {}) {
  const navigate = useNavigate();
  const toast = useToast();
  const shops = useShops();
  const [serverError, setServerError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    etsy_order_id: "",
    shop_id: "",
    ordered_at: localDateTimeValue(),
    customer_name: "",
    customer_note: "",
  });
  function validate() {
    const errors: Record<string, string> = {};
    if (!form.etsy_order_id.trim())
      errors.etsy_order_id = "Etsy Order ID is required.";
    if (!form.shop_id) errors.shop_id = "Shop is required.";
    if (form.ordered_at && Number.isNaN(new Date(form.ordered_at).getTime()))
      errors.ordered_at = "Enter a valid date and time.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }
  const create = useMutation({
    mutationFn: () =>
      orderApi.create({
        etsy_order_id: form.etsy_order_id.trim(),
        shop_id: form.shop_id,
        ordered_at: form.ordered_at
          ? new Date(form.ordered_at).toISOString()
          : undefined,
        customer_name: form.customer_name || undefined,
        customer_note: form.customer_note || undefined,
      }),
    onSuccess: (order) => {
      if (onCreated) onCreated(order);
      else {
        toast.push({ type: "success", title: "Order created" });
        navigate(`/app/orders/${order.id}`);
      }
    },
    onError: (error) => {
      const duplicate =
        error instanceof ApiError && error.code === "DUPLICATE_ETSY_ORDER";
      const message = duplicate
        ? "An order with this Etsy Order ID already exists in the selected shop."
        : apiMessage(error, "Unable to create order");
      setServerError(message);
      toast.push({ type: "error", title: "Create failed", message });
    },
  });
  const dirty = Boolean(
    form.etsy_order_id ||
    form.shop_id ||
    form.customer_name ||
    form.customer_note ||
    form.ordered_at,
  );
  const content = (
    <div className={clsx(!modal && "max-w-4xl", "space-y-5")}>
      {!modal ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <BackToOrders />
          <div className="flex items-center gap-2 text-sm text-muted">
            <Badge tone="neutral">Draft</Badge>
            {create.isPending
              ? "Saving"
              : dirty
                ? "Unsaved changes"
                : "Not started"}
          </div>
        </div>
      ) : null}
      {serverError ? (
        <ErrorState title="Save failed" message={serverError} />
      ) : null}
      <div className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Etsy Order ID"
            error={
              fieldErrors.etsy_order_id ||
              (serverError.includes("already exists") ? serverError : undefined)
            }
          >
            <Input
              value={form.etsy_order_id}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  etsy_order_id: event.target.value,
                }))
              }
              autoFocus
            />
          </Field>
          <Field label="Shop" error={fieldErrors.shop_id}>
            <Select
              value={form.shop_id}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  shop_id: event.target.value,
                }))
              }
            >
              <option value="">Select shop</option>
              {shops.data?.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Ordered At" error={fieldErrors.ordered_at}>
            <Input
              type="datetime-local"
              value={form.ordered_at}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  ordered_at: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Customer Name">
            <Input
              value={form.customer_name}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  customer_name: event.target.value,
                }))
              }
            />
          </Field>
        </div>
        <Field label="Customer Note">
          <Textarea
            rows={3}
            className="min-h-[76px]"
            value={form.customer_note}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                customer_note: event.target.value,
              }))
            }
          />
        </Field>
        <div
          className={clsx(
            "flex justify-end gap-2",
            modal &&
              "sticky bottom-0 -mx-5 -mb-5 border-t border-border bg-surface px-5 py-4",
          )}
        >
          {modal ? (
            <Button
              type="button"
              variant="secondary"
              disabled={create.isPending}
              onClick={onCancel}
            >
              Cancel
            </Button>
          ) : null}
          <Button
            disabled={create.isPending}
            onClick={() => validate() && create.mutate()}
          >
            {create.isPending ? <Spinner label="Creating" /> : "Create Order"}
          </Button>
        </div>
      </div>
    </div>
  );
  if (modal) {
    return (
      <Modal
        title="Create Order"
        description="Start the order workspace with the intake fields."
        width="max-w-2xl"
        onClose={onCancel || (() => undefined)}
      >
        {content}
      </Modal>
    );
  }
  return content;
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
        <div className="mb-2">
          <BackToOrders />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="truncate text-xl font-bold">{order.etsy_order_id}</h2>
          <OrderStatusBadge status={order.status} />
          {hasUnsavedChanges ? (
            <span className="text-xs font-semibold text-amber-700">
              Unsaved changes
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-muted">
          {order.shop.name} / {order.customer_name || "No customer"} / Created
          by {order.created_by.full_name} / Updated{" "}
          {formatDateTime(order.updated_at)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onOpenDrawer("info")}
        >
          Order Info
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onOpenDrawer("supplier")}
        >
          Supplier
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onOpenDrawer("activity")}
        >
          Activity
        </Button>
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
  const [tab, setTab] = useState<"info" | "supplier" | "activity">(
    activeTab || "info",
  );
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
    <div
      className="fixed inset-0 z-40"
      role="dialog"
      aria-modal="true"
      aria-label="Order details"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/30"
        aria-label="Close details"
        onClick={onClose}
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-[520px] flex-col border-l border-border bg-white shadow-soft">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="font-bold">Order Details</h2>
            <p className="text-xs text-muted">{order.etsy_order_id}</p>
          </div>
          <button
            type="button"
            className="rounded p-2 text-muted hover:bg-slate-100"
            aria-label="Close details"
            onClick={onClose}
          >
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
                tab === item.id
                  ? "bg-blue-900 text-white"
                  : "text-slate-600 hover:bg-slate-100",
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
  const toast = useToast();
  const queryClient = useQueryClient();
  const submitted = Boolean(
    supplier.submitted ||
    supplier.order_id ||
    supplier.submitted_at ||
    order.submitted_at ||
    order.status.code === orderStatusCodes.supplierSubmitted,
  );
  const statusLabel = supplier.sync_needed
    ? "Submitted - details not synchronized"
    : submitted
      ? supplier.status || "Submitted"
      : "Not submitted";
  const missing = (value?: string | number | boolean | null) =>
    value === undefined || value === null || value === "";
  const display = (value?: string | number | boolean | null) => {
    if (missing(value)) return "-";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return String(value);
  };
  const refresh = useMutation({
    mutationFn: () => orderApi.syncSupplier(order.id),
    onSuccess: async (updated) => {
      queryClient.setQueryData(queryKeys.orders.detail(order.id), updated);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.orders.detail(order.id),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.orders.activities(order.id, { page_size: 20 }),
        }),
        queryClient.invalidateQueries({ queryKey: ["orders"] }),
      ]);
      toast.push({ type: "success", title: "Supplier details refreshed" });
    },
    onError: (error) =>
      toast.push({
        type: "error",
        title: "Refresh failed",
        message: apiMessage(error, "Unable to refresh supplier details"),
      }),
  });
  const shipping = supplier.shipping;
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <SupplierStatusBadge status={statusLabel} />
        {submitted ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={refresh.isPending}
            onClick={() => refresh.mutate()}
          >
            {refresh.isPending ? <Spinner label="Refreshing" /> : "Sync Supplier Data"}
          </Button>
        ) : null}
      </div>
      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        <Info
          label="Supplier Order ID"
          value={display(supplier.order_id)}
          copyValue={supplier.order_id || undefined}
        />
        <Info
          label="Customer Order ID"
          value={display(supplier.customer_order_id || order.etsy_order_id)}
          copyValue={supplier.customer_order_id || order.etsy_order_id}
        />
        <Info label="Supplier Source" value={display(supplier.source)} />
        <Info label="Supplier Status" value={display(supplier.status)} />
        <Info
          label="Tracking Number"
          value={display(supplier.tracking_number)}
          copyValue={supplier.tracking_number || undefined}
        />
        <Info label="Carrier" value={display(supplier.carrier)} />
        <Info label="Label Buy" value={display(supplier.label_buy)} />
        <Info label="Total Items" value={display(supplier.total_items)} />
        <Info label="Total Quantity" value={display(supplier.total_quantity)} />
        <Info label="Items Fee" value={display(supplier.items_fee)} />
        <Info
          label="Extra Services Fee"
          value={display(supplier.extra_services_fee)}
        />
        <Info label="Shipping Fee" value={display(supplier.shipping_fee)} />
        <Info label="Label Fee" value={display(supplier.label_fee)} />
        <Info label="Total Fee" value={display(supplier.total_fee)} />
        <Info
          label="Supplier Created At"
          value={formatDateTime(supplier.created_at)}
        />
        <Info
          label="Submitted At"
          value={formatDateTime(supplier.submitted_at || order.submitted_at)}
        />
        <Info
          label="Last Synced At"
          value={formatDateTime(supplier.last_synced_at)}
        />
      </dl>
      {shipping ? (
        <details className="rounded border border-border p-3">
          <summary className="cursor-pointer text-sm font-semibold">
            Detected Shipping Information
          </summary>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <Info label="Buyer" value={display(shipping.buyer)} />
            <Info label="Phone" value={display(shipping.phone)} />
            <Info label="Street" value={display(shipping.street)} />
            <Info label="Street 2" value={display(shipping.street_2)} />
            <Info label="City" value={display(shipping.city)} />
            <Info label="State" value={display(shipping.state)} />
            <Info label="ZIP Code" value={display(shipping.zipcode)} />
            <Info label="Country" value={display(shipping.country)} />
          </dl>
        </details>
      ) : null}
      <details className="rounded border border-border p-3" open>
        <summary className="cursor-pointer text-sm font-semibold">
          Supplier Item Fees
        </summary>
        <div className="mt-3 grid gap-3">
          {(order.lines || []).flatMap((line) => line.items).map((item) => (
            <div key={item.id} className="grid gap-2 border-b border-border pb-3 text-sm last:border-b-0 last:pb-0 sm:grid-cols-2">
              <Info label={`Item ${item.item_number}`} value={item.supplier_sku} />
              <Info label="Supplier Item ID" value={display(item.supplier_item_id)} copyValue={item.supplier_item_id || undefined} />
              <Info label="Supplier Item Fee" value={formatMoneyOrDash(item.supplier_item_fee)} />
              <Info label="Quantity" value={String(item.quantity)} />
            </div>
          ))}
          {!order.lines?.some((line) => line.items.length) ? (
            <p className="text-sm text-muted">No order items.</p>
          ) : null}
        </div>
      </details>
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
      {items.map((activity) => (
        <ActivityItem key={activity.id} activity={activity} />
      ))}
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
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
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
        default:
          throw new Error("Use the dedicated dialog for this action.");
      }
    },
    onSuccess: async () => {
      await onChanged();
      toast.push({ type: "success", title: "Order updated" });
    },
    onError: (error) =>
      toast.push({
        type: "error",
        title: "Action failed",
        message: apiMessage(error, "Unable to update workflow"),
      }),
  });
  const button = (action: WorkflowAction, label: string, primary = false) =>
    actions.has(action) ? (
      <Button
        key={action}
        type="button"
        variant={primary ? "primary" : "secondary"}
        disabled={workflow.isPending}
        onClick={() =>
          action === "cancel" ? setCancelOpen(true) : workflow.mutate(action)
        }
      >
        {workflow.isPending ? <Spinner label="Working" /> : label}
      </Button>
    ) : null;
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {button("submit_for_review", "Submit for Review", true)}
        {actions.has("request_revision") ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setRevisionOpen(true)}
          >
            Request Revision
          </Button>
        ) : null}
        {button("mark_ready", "Mark Ready", true)}
        {actions.has("send_to_supplier") ? (
          <Button type="button" onClick={() => setSendOpen(true)}>
            <HiOutlinePaperAirplane />
            Send to Supplier
          </Button>
        ) : null}
        {button("retry_supplier", "Retry Supplier", true)}
        {button("resume", "Resume")}
        {button("cancel", "Cancel Order")}
      </div>
      {revisionOpen ? (
        <RequestRevisionDialog
          order={order}
          onClose={() => setRevisionOpen(false)}
          onChanged={onChanged}
          onBeforeAction={onBeforeAction}
        />
      ) : null}
      {sendOpen ? (
        <SendToSupplierDialog
          order={order}
          onClose={() => setSendOpen(false)}
          onChanged={onChanged}
          onBeforeAction={onBeforeAction}
        />
      ) : null}
      {cancelOpen ? (
        <CancelOrderDialog
          order={order}
          onClose={() => setCancelOpen(false)}
          onChanged={onChanged}
          onBeforeAction={onBeforeAction}
        />
      ) : null}
    </>
  );
}

function RequestRevisionDialog({
  order,
  onClose,
  onChanged,
  onBeforeAction,
}: {
  order: Order;
  onClose: () => void;
  onChanged: () => void;
  onBeforeAction?: () => Promise<void>;
}) {
  const toast = useToast();
  const [note, setNote] = useState("");
  const [itemId, setItemId] = useState("");
  const mutation = useMutation({
    mutationFn: async () => {
      await onBeforeAction?.();
      return orderApi.requestRevision(order.id, {
        note,
        order_item_id: itemId || undefined,
      });
    },
    onSuccess: async () => {
      await onChanged();
      toast.push({ type: "success", title: "Revision requested" });
      onClose();
    },
    onError: (error) =>
      toast.push({
        type: "error",
        title: "Revision failed",
        message: apiMessage(error, "Unable to request revision"),
      }),
  });
  return (
    <Modal
      title="Request Revision"
      description="Add a clear note for the employee."
      onClose={onClose}
    >
      <div className="grid gap-4">
        <Field label="Related item">
          <Select
            value={itemId}
            onChange={(event) => setItemId(event.target.value)}
          >
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
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!note.trim() || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? (
              <Spinner label="Saving" />
            ) : (
              "Request revision"
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function SendToSupplierDialog({
  order,
  onClose,
  onChanged,
  onBeforeAction,
  retry = false,
}: {
  order: Order;
  onClose: () => void;
  onChanged: () => void;
  onBeforeAction?: () => Promise<void>;
  retry?: boolean;
}) {
  const toast = useToast();
  const label = activeShippingLabel(order);
  const mutation = useMutation({
    mutationFn: async () => {
      await onBeforeAction?.();
      return retry
        ? orderApi.retrySupplier(order.id)
        : orderApi.sendToSupplier(order.id);
    },
    onSuccess: async () => {
      await onChanged();
      toast.push({ type: "success", title: "Supplier submission queued" });
      onClose();
    },
    onError: (error) =>
      toast.push({
        type: "error",
        title: "Send failed",
        message: apiMessage(error, "Unable to send supplier order"),
      }),
  });
  const files = (order.lines || []).flatMap((line) =>
    line.items.flatMap((item) => item.files || []),
  );
  return (
    <Modal
      title={retry ? "Retry Supplier" : "Send to Supplier"}
      description="This will create the production order in the supplier system."
      onClose={mutation.isPending ? () => undefined : onClose}
      width="max-w-2xl"
    >
      <div className="grid gap-4">
        <dl className="grid gap-3 text-sm md:grid-cols-2">
          <Info label="Etsy Order ID" value={order.etsy_order_id} />
          <Info label="Shop" value={order.shop.name} />
          <Info label="Products" value={String(order.products_count)} />
          <Info label="Items" value={String(order.items_count)} />
          <Info
            label="Total quantity"
            value={String(
              order.readiness?.quantity || orderTotalQuantity(order),
            )}
          />
          <Info
            label="Shipping label"
            value={label?.original_name || "Missing"}
          />
          <Info
            label="Main designs"
            value={String(
              files.filter(
                (file) => file.usage === "main_design" && file.is_selected,
              ).length,
            )}
          />
          <Info
            label="Sub designs"
            value={String(
              files.filter(
                (file) => file.usage === "sub_design" && file.is_selected,
              ).length,
            )}
          />
          <Info
            label="Mockups"
            value={String(
              files.filter(
                (file) => file.usage === "mockup" && file.is_selected,
              ).length,
            )}
          />
          <Info
            label="Mockup 2"
            value={String(
              files.filter(
                (file) => file.usage === "mockup2" && file.is_selected,
              ).length,
            )}
          />
        </dl>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={mutation.isPending}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={mutation.isPending || !order.readiness?.ready}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? (
              <Spinner label="Submitting" />
            ) : (
              "Create Supplier Order"
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function CancelOrderDialog({
  order,
  onClose,
  onChanged,
  onBeforeAction,
}: {
  order: Order;
  onClose: () => void;
  onChanged: () => void;
  onBeforeAction?: () => Promise<void>;
}) {
  const toast = useToast();
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<Order["supplier_cancellation"] | null>(
    null,
  );
  const supplierSubmitted = Boolean(
    order.supplier.order_id ||
    order.submitted_at ||
    order.status.code === orderStatusCodes.supplierSubmitted,
  );
  const mutation = useMutation({
    mutationFn: async () => {
      await onBeforeAction?.();
      return orderApi.cancel(order.id, { reason: reason || undefined });
    },
    onSuccess: async (updated) => {
      setResult(updated.supplier_cancellation || null);
      await onChanged();
      toast.push({ type: "success", title: "Order cancelled successfully" });
      if (!updated.supplier_cancellation?.refunded) onClose();
    },
    onError: (error) =>
      toast.push({
        type: "error",
        title: "Cancellation failed",
        message: apiMessage(error, "The order could not be cancelled"),
      }),
  });
  return (
    <Modal
      title="Cancel Order"
      description={
        supplierSubmitted
          ? "This order has already been sent to the supplier. A cancellation request will be sent to the supplier and may be rejected."
          : "This order has not been sent to the supplier. It will be marked as cancelled in this system."
      }
      onClose={mutation.isPending ? () => undefined : onClose}
      width="max-w-2xl"
    >
      <div className="grid gap-4">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <Info label="Etsy Order ID" value={order.etsy_order_id} />
          <Info
            label="Supplier Order ID"
            value={order.supplier.order_id || "-"}
          />
          <Info
            label="Current Supplier Status"
            value={order.supplier.status || "Not submitted"}
          />
          <Info label="Shop" value={order.shop.name} />
        </dl>
        <Field label="Cancellation reason">
          <Textarea
            rows={2}
            className="min-h-[68px]"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </Field>
        {supplierSubmitted ? (
          <ErrorState
            title="Supplier cancellation"
            message="The local order will not be marked cancelled unless the supplier accepts the cancellation."
          />
        ) : null}
        {result?.refunded ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
            <p className="font-semibold">Order cancelled successfully</p>
            <p className="mt-2">
              Refunded: Items fee {result.refunded.items_fee || "-"} / Shipping
              fee {result.refunded.shipping_fee || "-"} / Total{" "}
              {result.refunded.total || "-"}
            </p>
            <p className="mt-1">
              Current supplier balance: {result.current_balance || "-"}
            </p>
            <p className="mt-1">
              Cancelled at:{" "}
              {result.canceled_at ? formatDateTime(result.canceled_at) : "-"}
            </p>
          </div>
        ) : null}
        <div className="sticky bottom-0 -mx-5 -mb-5 flex justify-end gap-2 border-t border-border bg-surface px-5 py-4">
          <Button
            type="button"
            variant="secondary"
            disabled={mutation.isPending}
            onClick={onClose}
          >
            Keep Order
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? (
              <Spinner label="Cancelling" />
            ) : (
              "Cancel Order"
            )}
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
          <p className="text-sm font-semibold text-muted">
            {progress.percent}%
          </p>
          <Badge tone={order.readiness?.ready ? "success" : "warning"}>
            {order.readiness?.ready ? "Ready" : "Not ready"}
          </Badge>
        </div>
        <p className="text-xs text-muted">
          {progress.passed} of {progress.total} checks complete
        </p>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full bg-blue-700 transition-all"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
      {failed.length ? (
        <div className="mt-2">
          <p className="text-sm text-amber-700">
            Missing: {missingSummary}
            {failed.length > 2 ? ` and ${failed.length - 2} more` : ""}
          </p>
          <button
            type="button"
            className="mt-1 text-xs font-semibold text-blue-700 hover:text-blue-900"
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded
              ? "Hide checks"
              : `View ${failed.length} missing requirements`}
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

export function AddListingDialog({
  orderId,
  onClose,
  onAdded,
}: {
  orderId: string;
  onClose: () => void;
  onAdded: (line: OrderLine) => void;
}) {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryID, setCategoryID] = useState("");
  const [selected, setSelected] = useState<Listing | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [mode, setMode] = useState<"same" | "different">("same");
  const listings = useListingSelector({
    page: 1,
    page_size: 20,
    search: debouncedSearch,
    category_id: categoryID || undefined,
  });
  const categories = useMutation({
    mutationFn: () =>
      categoryApi.list({ page: 1, page_size: 200, is_active: true }),
  });
  useEffect(() => {
    categories.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedSearch(search), 350);
    return () => window.clearTimeout(handle);
  }, [search]);
  const add = useMutation({
    mutationFn: () =>
      orderApi.addLine(orderId, {
        listing_id: selected?.id || "",
        quantity,
        personalization_mode: mode,
      }),
    onSuccess: (line) => {
      toast.push({ type: "success", title: "Listing added" });
      onAdded(line);
      onClose();
      window.setTimeout(
        () =>
          document
            .getElementById(`order-line-${line.id}`)
            ?.scrollIntoView({ behavior: "smooth", block: "start" }),
        100,
      );
    },
    onError: (error) =>
      toast.push({
        type: "error",
        title: "Could not add listing",
        message: apiMessage(error, "Add listing failed"),
      }),
  });
  return (
    <Modal
      title="Add Listing"
      description="Choose a configured listing, then set quantity and personalization mode."
      onClose={onClose}
      width="max-w-5xl"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="grid gap-3">
          <div className="grid gap-2 md:grid-cols-[1fr_220px]">
            <SearchInput
              placeholder="Search title or internal SKU..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Select
              value={categoryID}
              onChange={(event) => setCategoryID(event.target.value)}
            >
              <option value="">All categories</option>
              {categories.data?.data.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>
          {listings.isLoading ? <SkeletonRows rows={5} /> : null}
          {listings.data?.data.map((listing) => (
            <ListingSelectorRow
              key={listing.id}
              listing={listing}
              selected={selected?.id === listing.id}
              onSelect={() => setSelected(listing)}
            />
          ))}
          {!listings.isLoading && !listings.data?.data.length ? (
            <EmptyState
              title="No listings found"
              message="Try a different search or category."
            />
          ) : null}
        </div>
        <div className="grid content-start gap-4 border-t border-border pt-4 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
          <h3 className="font-bold">Line setup</h3>
          <Field label="Quantity">
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(event) =>
                setQuantity(Math.max(1, Number(event.target.value)))
              }
            />
          </Field>
          <Field label="Personalization mode">
            <Select
              value={mode}
              onChange={(event) =>
                setMode(event.target.value as "same" | "different")
              }
            >
              <option value="same">Same personalization for all</option>
              <option value="different">
                Different personalization for each
              </option>
            </Select>
          </Field>
          <SoftPanel className="text-sm text-muted">
            {mode === "same"
              ? `Creates 1 item x quantity ${quantity}.`
              : `Creates ${quantity} items x quantity 1.`}
          </SoftPanel>
          {selected && !listingSupplierReady(selected) ? (
            <ErrorState
              title="Supplier configuration missing"
              message="This listing can be added only if the backend allows it, but the order cannot be sent until configuration is complete."
            />
          ) : null}
          <Button
            disabled={!selected || quantity < 1 || add.isPending}
            onClick={() => add.mutate()}
          >
            {add.isPending ? <Spinner label="Adding" /> : "Add Listing"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ListingSelectorRow({
  listing,
  selected,
  onSelect,
}: {
  listing: Listing;
  selected: boolean;
  onSelect: () => void;
}) {
  const counts = supplierVariantCounts(listing.supplier);
  const ready = listingSupplierReady(listing);
  return (
    <button
      type="button"
      className={clsx(
        "grid gap-3 rounded-lg border p-3 text-left transition md:grid-cols-[56px_1fr_auto]",
        selected
          ? "border-blue-700 bg-blue-50"
          : "border-border bg-white hover:bg-slate-50",
      )}
      onClick={onSelect}
    >
      <div className="h-14 w-14 overflow-hidden rounded-lg bg-slate-100">
        {listing.primary_image?.url ? (
          <img
            src={listing.primary_image.url}
            alt={listing.short_name}
            className="h-full w-full object-contain"
          />
        ) : null}
      </div>
      <div className="min-w-0">
        <p className="truncate font-semibold">{listing.short_name}</p>
        <p className="truncate text-xs text-muted">{listing.title}</p>
        <p className="mt-1 text-xs text-muted">
          SKU {listing.sku || "None"} / Supplier{" "}
          {listing.supplier?.sku || "Missing"}
        </p>
        <p className="mt-1 text-xs text-muted">
          {counts.options} options / {counts.colors} colors /{" "}
          {counts.printMethods} print methods / {counts.positions} positions
        </p>
      </div>
      <Badge tone={ready ? "success" : "warning"}>
        {ready ? "Configured" : "Missing Configuration"}
      </Badge>
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
    onError: (error) =>
      toast.push({
        type: "error",
        title: "Delete failed",
        message: apiMessage(error, "Unable to delete line"),
      }),
  });
  const completeItems = line.items.filter(itemProductionComplete).length;
  return (
    <section
      id={`order-line-${line.id}`}
      className="border-b border-border pb-5"
    >
      <div className="flex flex-col gap-3 py-1 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-bold">{line.listing_title}</h2>
          <p className="text-sm text-muted">
            SKU {line.listing_sku || "None"} / Supplier {line.supplier_sku} /
            Qty {line.quantity} / {line.personalization_mode}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            tone={completeItems === line.items.length ? "success" : "warning"}
          >
            {completeItems}/{line.items.length} items complete
          </Badge>
          <ActionIconButton
            tone="delete"
            label="Delete line"
            onClick={() => setConfirmDelete(true)}
          >
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
  const hasSubDesign = item.files?.some(
    (file) => file.usage === "sub_design" && file.is_selected,
  );
  return (
    <div id={`order-item-${item.id}`} className="bg-white p-4">
      <button
        type="button"
        className="flex w-full flex-col gap-2 border-t border-border py-3 text-left md:flex-row md:items-center md:justify-between"
        aria-expanded={open}
        aria-controls={`order-item-panel-${item.id}`}
        onClick={() => onToggle(!open)}
      >
        <div>
          <p className="font-semibold">
            Item {item.item_number} / Qty {item.quantity}
          </p>
          <p className="text-xs text-muted">
            {supplierConfigSummary(draft) || "Configuration missing"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={complete ? "success" : "warning"}>
            {complete ? "Complete" : "Incomplete"}
          </Badge>
          {!mainDesign ? (
            <Badge tone="warning">Main design missing</Badge>
          ) : null}
          <Badge tone="neutral">{itemMockupCount(item)} mockups</Badge>
          <HiOutlineChevronDown
            className={clsx("h-4 w-4 transition", open && "rotate-180")}
          />
        </div>
      </button>
      {open ? (
        <div id={`order-item-panel-${item.id}`} className="grid gap-4 pb-4">
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="grid gap-2.5 xl:border-r xl:border-border xl:pr-4">
              <SectionHeading title="Customer Information" />
              <Field label="Personalization Text">
                <Textarea
                  rows={1}
                  className="min-h-10 max-h-24 resize-y py-2"
                  placeholder="Enter personalization text"
                  value={draft.personalization_text || ""}
                  onChange={(event) =>
                    onDraftChange({
                      ...draft,
                      personalization_text: event.target.value,
                    })
                  }
                />
              </Field>
              <Field label="Customer Note">
                <Textarea
                  rows={1}
                  className="min-h-10 max-h-24 resize-y py-2"
                  placeholder="Optional customer note"
                  value={draft.customer_note || ""}
                  onChange={(event) =>
                    onDraftChange({
                      ...draft,
                      customer_note: event.target.value,
                    })
                  }
                />
              </Field>
              <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
                <ProductionFileSlot
                  orderId={order.id}
                  listingId={line.listing_id}
                  item={item}
                  label="Customer Photos"
                  fileType="customer_photo"
                  usage={null}
                  onChanged={onChanged}
                />
                <ProductionFileSlot
                  orderId={order.id}
                  listingId={line.listing_id}
                  item={item}
                  label="Customer References"
                  fileType="customer_reference"
                  usage={null}
                  onChanged={onChanged}
                />
              </div>
            </div>
            <div className="grid gap-2.5">
              <SectionHeading title="Production Configuration" />
              <div
                id={`supplier-config-${item.id}`}
                className="grid gap-2.5 md:grid-cols-3"
              >
                <Info label="Supplier SKU" value={item.supplier_sku} />
                <VariantSelect
                  label="Option"
                  values={line.supplier.options}
                  value={draft.option || ""}
                  onChange={(value) =>
                    onDraftChange({ ...draft, option: value })
                  }
                />
                <VariantSelect
                  label="Color"
                  values={line.supplier.colors}
                  value={draft.color || ""}
                  onChange={(value) =>
                    onDraftChange({ ...draft, color: value })
                  }
                />
                <VariantSelect
                  label="Print Method"
                  values={line.supplier.print_methods}
                  value={draft.print_method || ""}
                  onChange={(value) =>
                    onDraftChange({ ...draft, print_method: value })
                  }
                />
                <VariantSelect
                  label="Main Position"
                  values={line.supplier.positions}
                  value={draft.main_position || ""}
                  onChange={(value) =>
                    onDraftChange({ ...draft, main_position: value })
                  }
                />
                {hasSubDesign ? (
                  <VariantSelect
                    label="Sub Position"
                    values={line.supplier.positions}
                    value={draft.sub_position || ""}
                    optional
                    onChange={(value) =>
                      onDraftChange({ ...draft, sub_position: value })
                    }
                  />
                ) : null}
              </div>
              <Field label="Production Notice">
                <Input
                  value={draft.production_notice || ""}
                  onChange={(event) =>
                    onDraftChange({
                      ...draft,
                      production_notice: event.target.value,
                    })
                  }
                />
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
              <ProductionFileSlot
                orderId={order.id}
                listingId={line.listing_id}
                item={item}
                label="Main Design"
                fileType="design"
                usage="main_design"
                position={draft.main_position}
                required
                onChanged={onChanged}
              />
              <ProductionFileSlot
                orderId={order.id}
                listingId={line.listing_id}
                item={item}
                label="Sub Design"
                fileType="design"
                usage="sub_design"
                position={draft.sub_position}
                onChanged={onChanged}
              />
              <ProductionFileSlot
                orderId={order.id}
                listingId={line.listing_id}
                item={item}
                label="Mockup 1"
                fileType="mockup"
                usage="mockup"
                onChanged={onChanged}
              />
              <ProductionFileSlot
                orderId={order.id}
                listingId={line.listing_id}
                item={item}
                label="Mockup 2"
                fileType="mockup"
                usage="mockup2"
                onChanged={onChanged}
              />
              <ProductionFileSlot
                orderId={order.id}
                listingId={line.listing_id}
                item={item}
                label="Additional Design"
                fileType="design"
                usage="additional_design"
                onChanged={onChanged}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function VariantSelect({
  label,
  values,
  value,
  optional,
  onChange,
}: {
  label: string;
  values: string[];
  value: string;
  optional?: boolean;
  onChange: (value: string) => void;
}) {
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
            <button
              type="button"
              className={chipClass(!value)}
              onClick={() => onChange("")}
            >
              None
            </button>
          ) : null}
          {values.map((item) => (
            <button
              key={item}
              type="button"
              className={chipClass(value === item)}
              onClick={() => onChange(item)}
            >
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
        {values.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </Select>
    </Field>
  );
}

function chipClass(active: boolean) {
  return clsx(
    "rounded-full border px-2.5 py-1 text-xs font-semibold transition",
    active
      ? "border-blue-700 bg-blue-700 text-white"
      : "border-border bg-white text-slate-700 hover:bg-slate-50",
  );
}

function ProductionFileSlot({
  orderId,
  listingId,
  item,
  label,
  fileType,
  usage,
  position,
  required,
  onChanged,
}: {
  orderId: string;
  listingId: string;
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
  const [preview, setPreview] = useState<{
    file: OrderItemFile;
    url?: string;
  } | null>(null);
  const [localPreview, setLocalPreview] = useState<{
    url: string;
    mime: string;
    name: string;
  } | null>(null);
  const [urlOpen, setUrlOpen] = useState(false);
  const [listingOpen, setListingOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const canChooseListingImage = fileType === "mockup" && Boolean(listingId);
  const canChooseLibraryDesign = fileType === "design" && usage !== null;
  const selected = item.files?.find((file) =>
    usage === null
      ? file.file_type === fileType
      : file.usage === usage &&
        (file.is_selected || usage === "additional_design"),
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
    onError: (error) =>
      toast.push({
        type: "error",
        title: `${label} failed`,
        message: apiMessage(error, "Unable to save file"),
      }),
  });
  const addFromUrl = useMutation({
    mutationFn: (url: string) =>
      orderApi.addItemFileFromUrl(orderId, item.id, {
        file_type: fileType,
        usage,
        position: position || undefined,
        url,
      }),
    onSuccess: async () => {
      toast.push({ type: "success", title: `${label} saved` });
      setUrlOpen(false);
      setListingOpen(false);
      await onChanged();
    },
    onError: (error) =>
      toast.push({
        type: "error",
        title: `${label} failed`,
        message: apiMessage(error, "Unable to save file from URL"),
      }),
  });
  const addFromLibrary = useMutation({
    mutationFn: (assetId: string) =>
      orderApi.addLibraryDesign(orderId, item.id, {
        file_type: "design",
        usage: usage as "main_design" | "sub_design" | "additional_design",
        position: position || undefined,
        design_asset_id: assetId,
      }),
    onSuccess: async () => {
      toast.push({ type: "success", title: `${label} selected` });
      setLibraryOpen(false);
      await onChanged();
    },
    onError: (error) =>
      toast.push({
        type: "error",
        title: `${label} failed`,
        message: apiMessage(error, "Unable to select library design"),
      }),
  });
  const remove = useMutation({
    mutationFn: (fileId: string) => orderApi.deleteItemFile(item.id, fileId),
    onSuccess: async () => {
      toast.push({ type: "success", title: `${label} removed` });
      await onChanged();
    },
    onError: (error) =>
      toast.push({
        type: "error",
        title: "Delete failed",
        message: apiMessage(error, "Unable to delete file"),
      }),
  });
  function handleFiles(files: FileList | File[]) {
    const file = Array.from(files)[0];
    if (file) {
      if (localPreview) URL.revokeObjectURL(localPreview.url);
      setLocalPreview({
        url: URL.createObjectURL(file),
        mime: file.type,
        name: file.name,
      });
      add.mutate(file);
    }
  }
  useEffect(
    () => () => {
      if (localPreview) URL.revokeObjectURL(localPreview.url);
    },
    [localPreview],
  );
  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    handleFiles(event.dataTransfer.files);
  }
  return (
    <div
      className="w-[96px]"
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
    >
      <p
        className="mb-1 truncate text-xs font-semibold text-slate-700"
        title={label}
      >
        {label}
        {required ? " *" : ""}
      </p>
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
          selected
            ? "border-border hover:border-blue-700"
            : "border-dashed border-slate-300 hover:border-blue-700 hover:text-blue-700",
        )}
        aria-label={`${selected ? "Replace" : "Upload"} ${label}`}
        disabled={add.isPending || addFromUrl.isPending}
        onClick={() => {
          if (canChooseLibraryDesign && !selected) {
            setLibraryOpen(true);
            return;
          }
          inputRef.current?.click();
        }}
      >
        {add.isPending || addFromUrl.isPending || addFromLibrary.isPending ? (
          <Spinner label="Saving" />
        ) : selected?.url && selected.mime_type.startsWith("image/") ? (
          <TransparencyBackground background="checkerboard" className="h-full w-full border-0">
            <img
              src={selected.url}
              alt={selected.original_name}
              className="h-full w-full object-contain"
            />
          </TransparencyBackground>
        ) : localPreview?.mime.startsWith("image/") ? (
          <img
            src={localPreview.url}
            alt={localPreview.name}
            className="h-full w-full object-contain"
          />
        ) : selected ? (
          <FileGlyph file={selected} />
        ) : (
          <span className="grid justify-items-center gap-1">
            <HiOutlineCloudArrowUp className="h-6 w-6" />
            {canChooseLibraryDesign ? <span className="text-[10px] font-semibold">Upload</span> : null}
          </span>
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
            <p
              className="truncate text-[11px] text-muted"
              title={selected.original_name}
            >
              {selected.asset_name_snapshot || selected.original_name}
            </p>
            {selected.source_type === "design_library" ? <p className="text-[10px] font-semibold text-blue-700">Design Library</p> : null}
            <div className="mt-1 flex items-center gap-1">
              <button
                type="button"
                className="rounded p-1 text-muted hover:bg-slate-100"
                aria-label={`Preview ${label}`}
                onClick={() =>
                  setPreview({
                    file: selected,
                    url: selected.url || localPreview?.url,
                  })
                }
              >
                <HiOutlineEye className="h-3.5 w-3.5" />
              </button>
              <a
                className={clsx(
                  "rounded p-1 text-muted hover:bg-slate-100",
                  !selected.url && "pointer-events-none opacity-40",
                )}
                aria-label={`Download ${label}`}
                href={selected.url || "#"}
                target="_blank"
                rel="noreferrer"
                title={selected.url ? "Open file" : "File URL is not available"}
              >
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
          <p
            className={clsx(
              "text-[11px]",
              required ? "text-amber-700" : "text-muted",
            )}
          >
            {required ? "Required" : "Optional"}
          </p>
        )}
        <div className="mt-1 flex items-center gap-1">
          <button
            type="button"
            className="rounded p-1 text-muted hover:bg-slate-100 disabled:opacity-40"
            aria-label={`Add ${label} from URL`}
            title="Add from URL"
            disabled={add.isPending || addFromUrl.isPending || addFromLibrary.isPending}
            onClick={() => setUrlOpen(true)}
          >
            <HiOutlineLink className="h-3.5 w-3.5" />
          </button>
          {canChooseLibraryDesign ? (
            <>
              <button
                type="button"
                className="rounded p-1 text-muted hover:bg-slate-100 disabled:opacity-40"
                aria-label={`${selected ? "Replace" : "Choose"} ${label} from Design Library`}
                title="Choose from Design Library"
                disabled={add.isPending || addFromUrl.isPending || addFromLibrary.isPending}
                onClick={() => setLibraryOpen(true)}
              >
                <HiOutlineFolderOpen className="h-3.5 w-3.5" />
              </button>
              {!selected ? (
                <button
                  type="button"
                  className="rounded p-1 text-muted hover:bg-slate-100 disabled:opacity-40"
                  aria-label={`Upload ${label}`}
                  title="Upload"
                  disabled={add.isPending || addFromUrl.isPending || addFromLibrary.isPending}
                  onClick={() => inputRef.current?.click()}
                >
                  <HiOutlineCloudArrowUp className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </>
          ) : null}
          {canChooseListingImage ? (
            <button
              type="button"
              className="rounded p-1 text-muted hover:bg-slate-100 disabled:opacity-40"
              aria-label={`Choose ${label} from listing images`}
              title="Choose from listing"
              disabled={add.isPending || addFromUrl.isPending}
              onClick={() => setListingOpen(true)}
            >
              <HiOutlinePhoto className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>
      {preview ? (
        <FilePreviewModal
          file={preview.file}
          url={preview.url}
          onClose={() => setPreview(null)}
        />
      ) : null}
      {urlOpen ? (
        <ImageUrlDialog
          title={`Add ${label} from URL`}
          loading={addFromUrl.isPending}
          onClose={() => setUrlOpen(false)}
          onSubmit={(url) => addFromUrl.mutate(url)}
        />
      ) : null}
      {listingOpen ? (
        <ListingImagePickerDialog
          listingId={listingId}
          loading={addFromUrl.isPending}
          onClose={() => setListingOpen(false)}
          onSelect={(url) => addFromUrl.mutate(url)}
        />
      ) : null}
      {libraryOpen ? (
        <DesignLibraryPicker
          orderLabel={`${label} / Item ${item.item_number}`}
          onClose={() => setLibraryOpen(false)}
          onSelect={(asset) => addFromLibrary.mutate(asset.id)}
        />
      ) : null}
    </div>
  );
}

function ImageUrlDialog({
  title,
  loading,
  onClose,
  onSubmit,
}: {
  title: string;
  loading: boolean;
  onClose: () => void;
  onSubmit: (url: string) => void;
}) {
  const [url, setUrl] = useState("");
  const trimmed = url.trim();
  return (
    <Modal title={title} onClose={loading ? () => undefined : onClose} width="max-w-lg">
      <div className="grid gap-4">
        <Field label="Image URL">
          <Input
            type="url"
            value={url}
            placeholder="https://example.com/image.jpg"
            onChange={(event) => setUrl(event.target.value)}
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" disabled={loading} onClick={onClose}>Cancel</Button>
          <Button type="button" disabled={!trimmed || loading} onClick={() => onSubmit(trimmed)}>
            {loading ? <Spinner label="Saving" /> : "Fetch Image"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ListingImagePickerDialog({
  listingId,
  loading,
  onClose,
  onSelect,
}: {
  listingId: string;
  loading: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}) {
  const images = useQuery({
    queryKey: ["listing-images", listingId],
    queryFn: () => imageApi.list(listingId),
    enabled: Boolean(listingId),
  });
  const items = images.data || [];
  return (
    <Modal title="Choose mockup from listing" onClose={loading ? () => undefined : onClose} width="max-w-3xl">
      <div className="grid gap-4">
        {images.isLoading ? <Spinner label="Loading images" /> : null}
        {images.isError ? <ErrorState title="Images unavailable" message="Unable to load listing images." /> : null}
        {!images.isLoading && !items.length ? <EmptyState title="No listing images" message="Upload images on the product listing first." /> : null}
        <div className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
          {items.map((image) => (
            <button
              key={image.id}
              type="button"
              className="group overflow-hidden rounded border border-border bg-white text-left transition hover:border-blue-700 disabled:opacity-60"
              disabled={loading}
              onClick={() => onSelect(image.url)}
            >
              <div className="aspect-square bg-slate-50">
                <img src={image.url} alt={image.original_filename} className="h-full w-full object-contain" />
              </div>
              <div className="border-t border-border p-2">
                <p className="truncate text-xs font-semibold">{image.original_filename}</p>
                <p className="text-[11px] text-muted">{image.width || "-"} x {image.height || "-"}</p>
              </div>
            </button>
          ))}
        </div>
        <div className="flex justify-end">
          <Button type="button" variant="secondary" disabled={loading} onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}

function FileGlyph({
  file,
}: {
  file: Pick<OrderItemFile, "mime_type" | "original_name">;
}) {
  const isImage = file.mime_type?.startsWith("image/");
  const isPdf =
    file.mime_type === "application/pdf" ||
    file.original_name.toLowerCase().endsWith(".pdf");
  if (isImage) return <HiOutlinePhoto className="h-6 w-6" />;
  if (isPdf) return <HiOutlineDocument className="h-6 w-6" />;
  return <HiOutlineDocument className="h-6 w-6" />;
}

function FilePreviewModal({
  file,
  url,
  itemReference,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  onClose,
}: {
  file: OrderItemFile;
  url?: string;
  itemReference?: string;
  hasPrevious?: boolean;
  hasNext?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  onClose: () => void;
}) {
  const isImage = file.mime_type?.startsWith("image/");
  const isPdf =
    file.mime_type === "application/pdf" ||
    file.original_name.toLowerCase().endsWith(".pdf");
  return (
    <Modal title="File preview" onClose={onClose} width="max-w-3xl">
      <div className="grid gap-4">
        <div className="flex max-h-[70vh] min-h-64 items-center justify-center rounded border border-border bg-slate-50 text-slate-500">
          {url && isImage ? (
            <img
              src={url}
              alt={file.original_name}
              className="max-h-[68vh] max-w-full object-contain"
            />
          ) : url && isPdf ? (
            <iframe
              src={url}
              title={file.original_name}
              className="h-[68vh] w-full"
            />
          ) : (
            <div className="grid justify-items-center gap-2">
              <FileGlyph file={file} />
              <p className="text-sm text-muted">
                Preview URL is not available.
              </p>
            </div>
          )}
        </div>
        <div>
          <p className="font-semibold">{file.original_name}</p>
          {itemReference ? (
            <p className="text-sm text-muted">{itemReference}</p>
          ) : null}
          <p className="text-sm text-muted">
            {file.mime_type} / {formatFileSize(file.size)}
          </p>
        </div>
        <div className="sticky bottom-0 -mx-5 -mb-5 flex flex-wrap justify-between gap-2 border-t border-border bg-surface px-5 py-4">
          <div className="flex gap-2">
            {onPrevious || onNext ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!hasPrevious}
                  onClick={onPrevious}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!hasNext}
                  onClick={onNext}
                >
                  Next
                </Button>
              </>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Close
            </Button>
            <a
              className={clsx(
                "inline-flex h-10 items-center gap-2 rounded-[10px] border border-border bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50",
                !url && "pointer-events-none opacity-40",
              )}
              href={url || "#"}
              target="_blank"
              rel="noreferrer"
              title={
                url ? "Open file in a new tab" : "File URL is not available"
              }
            >
              <HiOutlineArrowDownTray />
              Download
            </a>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function ShippingLabelPanel({
  order,
  onChanged,
}: {
  order: Order;
  onChanged: () => void;
}) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [localPreview, setLocalPreview] = useState<{
    url: string;
    mime: string;
    name: string;
    size: number;
  } | null>(null);
  const active = activeShippingLabel(order);
  const upload = useMutation({
    mutationFn: (file: File) => orderApi.uploadShippingLabel(order.id, file),
    onSuccess: async () => {
      toast.push({ type: "success", title: "Shipping label saved" });
      await onChanged();
    },
    onError: (error) =>
      toast.push({
        type: "error",
        title: "Label failed",
        message: apiMessage(error, "Unable to save shipping label"),
      }),
  });
  useEffect(
    () => () => {
      if (localPreview) URL.revokeObjectURL(localPreview.url);
    },
    [localPreview],
  );
  return (
    <section id="shipping-label-section" className="grid gap-3 pb-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-bold">Shipping Label</h2>
        <Button
          type="button"
          variant="secondary"
          disabled={upload.isPending}
          onClick={() => inputRef.current?.click()}
        >
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
            setLocalPreview({
              url: URL.createObjectURL(file),
              mime: file.type,
              name: file.name,
              size: file.size,
            });
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
              <p className="text-xs text-muted">
                Version {active.version} / Uploaded{" "}
                {formatDateTime(active.uploaded_at)}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setPreviewOpen(true)}
            >
              <HiOutlineEye />
              Preview
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => inputRef.current?.click()}
            >
              Replace
            </Button>
          </div>
        </div>
      ) : (
        <p className="flex items-center gap-2 text-sm text-amber-700">
          <HiOutlineExclamationTriangle className="h-4 w-4" />
          Shipping label required before sending to supplier.
        </p>
      )}
      {order.shipping_labels && order.shipping_labels.length > 1 ? (
        <ShippingLabelHistory
          labels={order.shipping_labels.filter((label) => !label.is_active)}
        />
      ) : null}
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
            mime_type:
              active.mime_type ||
              localPreview?.mime ||
              "application/octet-stream",
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
      <summary className="cursor-pointer text-sm font-semibold">
        View previous labels ({labels.length})
      </summary>
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
                <td className="py-2 pr-4">
                  {formatDateTime(label.uploaded_at)}
                </td>
                <td className="py-2 pr-4">
                  {formatDateTime(label.replaced_at)}
                </td>
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
          {activity.actor?.full_name || "System"} /{" "}
          {activity.activity_type.split("_").join(" ")} /{" "}
          {formatDateTime(activity.created_at)}
        </p>
      </div>
    </div>
  );
}

export function BackToOrders() {
  return (
    <Link to="/app/orders">
      <Button type="button" variant="secondary">
        <HiOutlineArrowLeft /> Back to Orders
      </Button>
    </Link>
  );
}

export function Info({
  label,
  value,
  copyValue,
}: {
  label: string;
  value: string;
  copyValue?: string;
}) {
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
  return (
    <h3 className="border-b border-border pb-2 text-sm font-bold text-foreground">
      {title}
    </h3>
  );
}

export function OrderSearchIcon() {
  return <HiOutlineMagnifyingGlass className="h-4 w-4" />;
}
