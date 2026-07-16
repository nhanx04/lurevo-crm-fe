import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  HiOutlineArrowLeft,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlinePaperAirplane,
  HiOutlinePlus,
} from "react-icons/hi2";
import { orderApi, listingApi, shopApi, statusApi } from "@/api/services";
import { queryKeys } from "@/api/queryKeys";
import { ApiError, ListingSupplier, Order, OrderItem } from "@/types/api";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  PaginationControls,
  SearchInput,
  Select,
  Table,
  Textarea,
} from "@/components/ui";
import {
  EmptyState,
  ErrorState,
  SkeletonRows,
  Spinner,
  useToast,
} from "@/components/feedback";
import { formatDateTime, formatFileSize } from "@/utils/format";
import { useUrlParams } from "@/hooks/useUrlParams";

export function OrdersPage() {
  const { params, setParam, setPage } = useUrlParams();
  const [search, setSearch] = useState(params.search || "");
  const navigate = useNavigate();
  const listParams = useMemo(
    () => ({
      page: Number(params.page || 1),
      page_size: Number(params.page_size || 20),
      search: params.search,
      status_id: params.status_id,
      shop_id: params.shop_id,
      readiness: params.readiness,
      supplier_status: params.supplier_status,
      sort: params.sort || "created_at",
    }),
    [params],
  );
  const orders = useQuery({
    queryKey: queryKeys.orders.list(listParams),
    queryFn: () => orderApi.list(listParams),
  });
  const shops = useQuery({ queryKey: queryKeys.shops.list, queryFn: shopApi.list });
  const statuses = useQuery({
    queryKey: queryKeys.statuses.list({ page_size: 200 }),
    queryFn: () => statusApi.list({ page: 1, page_size: 200 }),
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Orders"
        action={
          <Button onClick={() => navigate("/app/orders/new")}>
            <HiOutlinePlus />
            Create Order
          </Button>
        }
      />
      <div className="flex flex-col gap-3 lg:flex-row">
        <SearchInput
          placeholder="Search Etsy order, customer, internal SKU, supplier SKU..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onBlur={() => setParam("search", search)}
        />
        <Select
          className="lg:w-52"
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
          className="lg:w-52"
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
          className="lg:w-52"
          value={params.readiness || ""}
          onChange={(event) => setParam("readiness", event.target.value)}
        >
          <option value="">All readiness</option>
          <option value="missing_label">Missing label</option>
          <option value="missing_design">Missing design</option>
          <option value="missing_configuration">Missing configuration</option>
          <option value="ready">Ready to send</option>
        </Select>
      </div>
      {orders.isLoading ? (
        <SkeletonRows rows={8} />
      ) : orders.isError ? (
        <ErrorState message="Could not load orders." />
      ) : orders.data?.data.length ? (
        <>
          <Table>
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Etsy Order ID</th>
                <th className="px-4 py-3">Shop</th>
                <th className="px-4 py-3">Products</th>
                <th className="px-4 py-3">Design Status</th>
                <th className="px-4 py-3">Shipping Label</th>
                <th className="px-4 py-3">Supplier Config</th>
                <th className="px-4 py-3">Workflow Status</th>
                <th className="px-4 py-3">Supplier Status</th>
                <th className="px-4 py-3">Created By</th>
                <th className="px-4 py-3">Created At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.data.data.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-semibold">
                    <Link to={`/app/orders/${order.id}`} className="hover:text-blue-700">
                      {order.etsy_order_id}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{order.shop.name}</td>
                  <td className="px-4 py-3">
                    {order.products_count} products · {order.items_count} items
                  </td>
                  <td className="px-4 py-3">{order.designs_count}/{order.items_count} designs</td>
                  <td className="px-4 py-3">{order.has_active_shipping_label ? "Label uploaded" : "Missing label"}</td>
                  <td className="px-4 py-3">{order.configured_items_count}/{order.items_count} configured</td>
                  <td className="px-4 py-3"><Badge tone="neutral">{order.status.name}</Badge></td>
                  <td className="px-4 py-3">{order.supplier.status || "Not submitted"}</td>
                  <td className="px-4 py-3">{order.created_by.full_name}</td>
                  <td className="px-4 py-3 text-muted">{formatDateTime(order.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          <PaginationControls
            page={orders.data.pagination.page}
            totalPages={orders.data.pagination.total_pages}
            totalItems={orders.data.pagination.total_items}
            onPage={setPage}
          />
        </>
      ) : (
        <EmptyState title="No orders found" message="Create an order to start production intake." />
      )}
    </div>
  );
}

export function OrderCreatePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const shops = useQuery({ queryKey: queryKeys.shops.list, queryFn: shopApi.list });
  const [form, setForm] = useState({ etsy_order_id: "", shop_id: "", ordered_at: "", customer_name: "", customer_note: "" });
  const create = useMutation({
    mutationFn: () =>
      orderApi.create({
        etsy_order_id: form.etsy_order_id,
        shop_id: form.shop_id,
        ordered_at: form.ordered_at ? new Date(form.ordered_at).toISOString() : undefined,
        customer_name: form.customer_name || undefined,
        customer_note: form.customer_note || undefined,
      }),
    onSuccess: (order) => navigate(`/app/orders/${order.id}`),
    onError: (error) =>
      toast.push({ type: "error", title: "Create failed", message: error instanceof ApiError ? error.message : "Unable to create order" }),
  });
  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title="Create Order" action={<BackToOrders />} />
      <Card className="grid gap-4 p-5">
        <Field label="Etsy Order ID">
          <Input value={form.etsy_order_id} onChange={(event) => setForm({ ...form, etsy_order_id: event.target.value })} />
        </Field>
        <Field label="Shop">
          <Select value={form.shop_id} onChange={(event) => setForm({ ...form, shop_id: event.target.value })}>
            <option value="">Select shop</option>
            {shops.data?.map((shop) => (
              <option key={shop.id} value={shop.id}>{shop.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Ordered at">
          <Input type="datetime-local" value={form.ordered_at} onChange={(event) => setForm({ ...form, ordered_at: event.target.value })} />
        </Field>
        <Field label="Customer name">
          <Input value={form.customer_name} onChange={(event) => setForm({ ...form, customer_name: event.target.value })} />
        </Field>
        <Field label="Customer note">
          <Textarea value={form.customer_note} onChange={(event) => setForm({ ...form, customer_note: event.target.value })} />
        </Field>
        <div className="flex justify-end">
          <Button disabled={create.isPending || !form.etsy_order_id || !form.shop_id} onClick={() => create.mutate()}>
            {create.isPending ? <Spinner label="Creating" /> : "Create order"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

export function OrderDetailPage() {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const toast = useToast();
  const order = useQuery({ queryKey: queryKeys.orders.detail(id), queryFn: () => orderApi.detail(id), enabled: Boolean(id) });
  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(id) });
  const send = useMutation({
    mutationFn: () => orderApi.sendToSupplier(id),
    onSuccess: async () => {
      await refresh();
      toast.push({ type: "success", title: "Supplier submission queued" });
    },
    onError: (error) =>
      toast.push({ type: "error", title: "Send failed", message: error instanceof ApiError ? error.message : "Unable to send order" }),
  });
  if (order.isLoading) return <SkeletonRows rows={8} />;
  if (order.isError || !order.data) return <ErrorState title="Order not found" message="The order could not be loaded." />;
  const data = order.data;
  const readiness = data.readiness;
  return (
    <div className="space-y-5">
      <PageHeader title={data.etsy_order_id} action={<BackToOrders />} />
      <ReadinessPanel order={data} onSend={() => send.mutate()} sending={send.isPending} />
      <Card className="grid gap-4 p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <Info label="Shop" value={data.shop.name} />
          <Info label="Workflow Status" value={data.status.name} />
          <Info label="Created By" value={data.created_by.full_name} />
          <Info label="Customer" value={data.customer_name || "None"} />
          <Info label="Supplier Status" value={data.supplier.status || "Not submitted"} />
          <Info label="Tracking" value={data.supplier.tracking_number || "None"} />
        </div>
        {data.customer_note ? <p className="text-sm text-muted">{data.customer_note}</p> : null}
      </Card>
      <ShippingLabelSection order={data} onChanged={refresh} />
      <AddLineSection orderId={id} onAdded={refresh} />
      {data.lines?.map((line) => (
        <Card key={line.id} className="grid gap-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold">{line.listing_title}</h2>
              <p className="text-sm text-muted">{line.supplier_sku} · Qty {line.quantity} · {line.personalization_mode}</p>
            </div>
            <Badge tone={line.supplier.ready ? "success" : "warning"}>{line.supplier.ready ? "Supplier config ready" : "Missing config"}</Badge>
          </div>
          <div className="grid gap-3">
            {line.items.map((item) => (
              <OrderItemEditor key={item.id} orderId={id} item={item} options={line.supplier} onSaved={refresh} />
            ))}
          </div>
        </Card>
      ))}
      {readiness && !readiness.ready ? (
        <Card className="p-5">
          <h2 className="font-bold">Readiness issues</h2>
          <div className="mt-3 grid gap-2">
            {readiness.checks.filter((check) => !check.passed).map((check, index) => (
              <p key={`${check.code}-${check.order_item_id || index}`} className="flex items-center gap-2 text-sm text-amber-700">
                <HiOutlineExclamationTriangle className="h-4 w-4" />
                {check.message}
              </p>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function AddLineSection({ orderId, onAdded }: { orderId: string; onAdded: () => void }) {
  const toast = useToast();
  const [listingId, setListingId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [mode, setMode] = useState<"same" | "different">("same");
  const listings = useQuery({
    queryKey: queryKeys.listings.list({ page_size: 100 }),
    queryFn: () => listingApi.list({ page: 1, page_size: 100 }),
  });
  const add = useMutation({
    mutationFn: () => orderApi.addLine(orderId, { listing_id: listingId, quantity, personalization_mode: mode }),
    onSuccess: async () => {
      setListingId("");
      onAdded();
    },
    onError: (error) => toast.push({ type: "error", title: "Could not add listing", message: error instanceof ApiError ? error.message : "Add listing failed" }),
  });
  return (
    <Card className="grid gap-4 p-5">
      <h2 className="font-bold">Products</h2>
      <div className="grid gap-3 lg:grid-cols-[1fr_120px_180px_auto]">
        <Select value={listingId} onChange={(event) => setListingId(event.target.value)}>
          <option value="">Add Listing</option>
          {listings.data?.data.map((listing) => (
            <option key={listing.id} value={listing.id}>
              {listing.short_name} · {listing.sku || "No SKU"} · Supplier {listing.supplier?.sku || "missing"}
            </option>
          ))}
        </Select>
        <Input type="number" min={1} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} />
        <Select value={mode} onChange={(event) => setMode(event.target.value as "same" | "different")}>
          <option value="same">Same personalization</option>
          <option value="different">Different personalization</option>
        </Select>
        <Button disabled={!listingId || add.isPending} onClick={() => add.mutate()}>
          <HiOutlinePlus />
          Add
        </Button>
      </div>
    </Card>
  );
}

function OrderItemEditor({ orderId, item, options, onSaved }: { orderId: string; item: OrderItem; options: ListingSupplier; onSaved: () => void }) {
  const toast = useToast();
  const [draft, setDraft] = useState(item);
  const save = useMutation({
    mutationFn: () => orderApi.updateItem(orderId, item.id, draft),
    onSuccess: async () => onSaved(),
    onError: (error) => toast.push({ type: "error", title: "Item save failed", message: error instanceof ApiError ? error.message : "Unable to save item" }),
  });
  return (
    <details className="rounded-xl border border-border bg-slate-50/60 p-3" open={!item.option || !item.color || !item.print_method || !item.main_position}>
      <summary className="cursor-pointer font-semibold">Item {item.item_number} · Qty {item.quantity} · {summaryText(item)}</summary>
      <div className="mt-4 grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Personalization text">
            <Textarea value={draft.personalization_text || ""} onChange={(event) => setDraft({ ...draft, personalization_text: event.target.value })} />
          </Field>
          <Field label="Customer note">
            <Textarea value={draft.customer_note || ""} onChange={(event) => setDraft({ ...draft, customer_note: event.target.value })} />
          </Field>
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          <OptionSelect label="Option" value={draft.option || ""} values={options.options} onChange={(value) => setDraft({ ...draft, option: value })} />
          <OptionSelect label="Color" value={draft.color || ""} values={options.colors} onChange={(value) => setDraft({ ...draft, color: value })} />
          <OptionSelect label="Print Method" value={draft.print_method || ""} values={options.print_methods} onChange={(value) => setDraft({ ...draft, print_method: value })} />
          <OptionSelect label="Main Position" value={draft.main_position || ""} values={options.positions} onChange={(value) => setDraft({ ...draft, main_position: value })} />
          <OptionSelect label="Sub Position" value={draft.sub_position || ""} values={options.positions} optional onChange={(value) => setDraft({ ...draft, sub_position: value })} />
        </div>
        <Field label="Production notice">
          <Input value={draft.production_notice || ""} onChange={(event) => setDraft({ ...draft, production_notice: event.target.value })} />
        </Field>
        <FileSlots orderId={orderId} item={item} onSaved={onSaved} />
        <div className="flex justify-end">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? <Spinner label="Saving" /> : "Save item"}</Button>
        </div>
      </div>
    </details>
  );
}

function OptionSelect({ label, values, value, optional, onChange }: { label: string; values: string[]; value: string; optional?: boolean; onChange: (value: string) => void }) {
  if (values.length === 1) {
    return <Info label={label} value={values[0]} />;
  }
  return (
    <Field label={label}>
      <Select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{optional ? "None" : "Select"}</option>
        {values.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </Select>
    </Field>
  );
}

function FileSlots({ orderId, item, onSaved }: { orderId: string; item: OrderItem; onSaved: () => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-5">
      {[
        ["Main Design", "design", "main_design"],
        ["Sub Design", "design", "sub_design"],
        ["Mockup 1", "mockup", "mockup"],
        ["Mockup 2", "mockup", "mockup2"],
        ["Additional Design", "design", "additional_design"],
      ].map(([label, fileType, usage]) => (
        <MetadataFileSlot key={usage} label={label} orderId={orderId} item={item} fileType={fileType} usage={usage} onSaved={onSaved} />
      ))}
    </div>
  );
}

function MetadataFileSlot({ label, orderId, item, fileType, usage, onSaved }: { label: string; orderId: string; item: OrderItem; fileType: string; usage: string; onSaved: () => void }) {
  const toast = useToast();
  const existing = item.files?.find((file) => file.usage === usage && file.is_selected);
  const [name, setName] = useState(existing?.original_name || "");
  const add = useMutation({
    mutationFn: () =>
      orderApi.addItemFile(orderId, item.id, {
        file_type: fileType,
        usage,
        file: { storage_key: `manual/${crypto.randomUUID()}/${name}`, original_name: name, mime_type: "application/octet-stream", size: 0 },
      }),
    onSuccess: async () => onSaved(),
    onError: (error) => toast.push({ type: "error", title: "File metadata failed", message: error instanceof ApiError ? error.message : "Unable to save file metadata" }),
  });
  return (
    <div className="rounded-lg border border-border bg-white p-3">
      <p className="text-xs font-semibold text-slate-700">{label}</p>
      {existing ? <p className="mt-1 truncate text-xs text-muted">{existing.original_name} · {formatFileSize(existing.size)}</p> : null}
      <Input className="mt-2 h-8 text-xs" placeholder="Filename" value={name} onChange={(event) => setName(event.target.value)} />
      <Button className="mt-2 w-full" size="sm" variant="secondary" disabled={!name || add.isPending} onClick={() => add.mutate()}>
        {existing ? "Replace" : "Save"}
      </Button>
    </div>
  );
}

function ShippingLabelSection({ order, onChanged }: { order: Order; onChanged: () => void }) {
  const toast = useToast();
  const active = order.shipping_labels?.find((label) => label.is_active);
  const [name, setName] = useState("");
  const upload = useMutation({
    mutationFn: () => orderApi.addShippingLabel(order.id, { file: { storage_key: `labels/${order.id}/${crypto.randomUUID()}/${name}`, original_name: name, mime_type: "application/pdf", size: 0 } }),
    onSuccess: async () => {
      setName("");
      onChanged();
    },
    onError: (error) => toast.push({ type: "error", title: "Label failed", message: error instanceof ApiError ? error.message : "Unable to save label" }),
  });
  return (
    <Card className="grid gap-4 p-5">
      <h2 className="font-bold">Shipping Label</h2>
      {active ? <p className="text-sm text-muted">Active v{active.version}: {active.original_name}</p> : <p className="text-sm text-muted">No active shipping label.</p>}
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <Input placeholder="Shipping label filename.pdf" value={name} onChange={(event) => setName(event.target.value)} />
        <Button disabled={!name || upload.isPending} onClick={() => upload.mutate()}>{active ? "Replace label" : "Save label"}</Button>
      </div>
      {order.shipping_labels && order.shipping_labels.length > 1 ? (
        <details>
          <summary className="cursor-pointer text-sm font-semibold">Previous labels</summary>
          <div className="mt-2 grid gap-1 text-sm text-muted">
            {order.shipping_labels.filter((label) => !label.is_active).map((label) => (
              <p key={label.id}>v{label.version} · {label.original_name} · {label.status}</p>
            ))}
          </div>
        </details>
      ) : null}
    </Card>
  );
}

function ReadinessPanel({ order, onSend, sending }: { order: Order; onSend: () => void; sending: boolean }) {
  const ready = order.readiness?.ready ?? false;
  return (
    <Card className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="flex items-center gap-2 font-bold">
          {ready ? <HiOutlineCheckCircle className="h-5 w-5 text-green-600" /> : <HiOutlineExclamationTriangle className="h-5 w-5 text-amber-600" />}
          {ready ? "Ready to send" : "Not ready to send"}
        </p>
        <p className="mt-1 text-sm text-muted">{order.readiness?.items || 0} items · {order.readiness?.quantity || 0} total quantity</p>
      </div>
      <Button disabled={!ready || sending} onClick={onSend}>
        {sending ? <Spinner label="Submitting" /> : <><HiOutlinePaperAirplane /> Send to Supplier</>}
      </Button>
    </Card>
  );
}

function BackToOrders() {
  return (
    <Link to="/app/orders">
      <Button variant="secondary"><HiOutlineArrowLeft /> Back</Button>
    </Link>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-muted">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}

function summaryText(item: OrderItem) {
  return [item.supplier_sku, item.option, item.color, item.print_method, item.main_position].filter(Boolean).join(" · ") || "Configuration missing";
}
