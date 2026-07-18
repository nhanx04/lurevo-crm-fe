import { ReactNode, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  HiOutlineArrowPath,
  HiOutlineBanknotes,
  HiOutlineChartBar,
  HiOutlineExclamationTriangle,
  HiOutlineShoppingBag,
} from "react-icons/hi2";
import clsx from "clsx";
import { analyticsApi, listingApi, shopApi, statusApi } from "@/api/services";
import { queryKeys } from "@/api/queryKeys";
import { Badge, Button, Card, Field, Input, Select, SoftPanel, Table } from "@/components/ui";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/feedback";
import type {
  AnalyticsMetric,
  AnalyticsOverview,
  AnalyticsParams,
  AnalyticsTimeSeriesPoint,
  ProductPerformanceRow,
  ReadinessBlockerPoint,
  ShopPerformanceRow,
  WorkflowDistributionPoint,
} from "@/types/api";
import {
  formatDate,
  formatDateTime,
  formatDecimalString,
  formatDuration,
  formatInteger,
  formatPercentage,
  sanitizeColor,
} from "@/utils/format";

const PRESETS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "90", label: "Last 90 days" },
  { value: "custom", label: "Custom range" },
] as const;

export function AnalyticsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const preset = searchParams.get("preset") || "30";
  const searchKey = searchParams.toString();
  const range = useMemo(() => dateRangeForPreset(preset, new URLSearchParams(searchKey)), [preset, searchKey]);
  const params: AnalyticsParams = useMemo(() => {
    const currentParams = new URLSearchParams(searchKey);
    return {
      date_from: range.from.toISOString(),
      date_to: range.to.toISOString(),
      timezone,
      compare: (currentParams.get("compare") as "previous_period" | "none") || "previous_period",
      shop_id: currentParams.get("shop_id") || undefined,
      status_id: currentParams.get("status_id") || undefined,
      supplier_status: currentParams.get("supplier_status") || undefined,
      listing_id: currentParams.get("listing_id") || undefined,
      created_by: currentParams.get("created_by") || undefined,
    };
  }, [range.from, range.to, searchKey, timezone]);
  const analytics = useQuery({
    queryKey: queryKeys.analytics.overview(params),
    queryFn: () => analyticsApi.overview(params),
  });
  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === "preset" && value !== "custom") {
      next.delete("date_from");
      next.delete("date_to");
    }
    setSearchParams(next);
  }
  return (
    <div className="grid gap-6">
      <AnalyticsFilters params={searchParams} setParam={setParam} reset={() => setSearchParams({ preset: "30", compare: "previous_period" })} />
      {analytics.isLoading ? <AnalyticsSkeleton /> : null}
      {analytics.isError ? <ErrorState title="Analytics unavailable" message="Unable to load analytics." onRetry={() => void analytics.refetch()} /> : null}
      {analytics.data ? (
        <>
          <PeriodNote data={analytics.data} />
          <AnalyticsKpiGrid data={analytics.data} />
          <AnalyticsSection title="Order Trends" description="Created orders, supplier submissions, errors, and cancellations over the selected period.">
            <OrderTrendChart points={analytics.data.order_trend} />
          </AnalyticsSection>
          <div className="grid gap-6 xl:grid-cols-2">
            <AnalyticsSection title="Workflow and Readiness" description="Current workflow backlog and overlapping blockers.">
              <WorkflowDistributionChart points={analytics.data.workflow_distribution} />
              <ReadinessBlockers points={analytics.data.readiness_blockers} />
            </AnalyticsSection>
            <AnalyticsSection title="Workflow Funnel" description="Conversion through the operational production lifecycle.">
              <Funnel stages={analytics.data.workflow_funnel} />
            </AnalyticsSection>
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <AnalyticsSection title="Workflow Aging" description={analytics.data.workflow_aging[0]?.age_source || "Age uses order updated_at when status-transition data is unavailable."}>
              <WorkflowAging rows={analytics.data.workflow_aging} />
            </AnalyticsSection>
            <AnalyticsSection title="Processing Time" description="Median and P90 values reduce outlier distortion.">
              <ProcessingTimes data={analytics.data} />
            </AnalyticsSection>
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <AnalyticsSection title="Shop Performance" description="Orders, quantity, supplier cost, and operational outcomes by Etsy shop.">
              <ShopPerformance rows={analytics.data.shop_performance} />
            </AnalyticsSection>
            <AnalyticsSection title="Supplier and Cost Analysis" description={analytics.data.supplier_cost.label}>
              <SupplierCost data={analytics.data} />
            </AnalyticsSection>
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <AnalyticsSection title="Design Workload" description="Uploaded custom designs versus reusable Design Library selections.">
              <DesignUsage data={analytics.data} />
            </AnalyticsSection>
            <AnalyticsSection title="Supplier Performance" description="Submission attempts, failures, retries, and cancellations.">
              <SupplierPerformance data={analytics.data} />
            </AnalyticsSection>
          </div>
          <AnalyticsSection title="Product Performance" description="Top listings by quantity with supplier cost and design-source mix.">
            <ProductPerformance rows={analytics.data.product_performance} />
          </AnalyticsSection>
          <AnalyticsSection title="Detailed Operational Tables" description="Orders needing attention and employee activity.">
            <OperationalTables data={analytics.data} />
          </AnalyticsSection>
          <SoftPanel className="text-sm text-slate-700">{analytics.data.revenue_note}</SoftPanel>
        </>
      ) : null}
    </div>
  );
}

function AnalyticsFilters({ params, setParam, reset }: { params: URLSearchParams; setParam: (key: string, value: string) => void; reset: () => void }) {
  const shops = useQuery({ queryKey: queryKeys.shops.list, queryFn: shopApi.list });
  const statuses = useQuery({ queryKey: queryKeys.statuses.list({ page_size: 100 }), queryFn: () => statusApi.list({ page: 1, page_size: 100 }) });
  const listings = useQuery({ queryKey: queryKeys.listingSelector.list({ page_size: 100 }), queryFn: () => listingApi.list({ page: 1, page_size: 100 }) });
  const preset = params.get("preset") || "30";
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Date range" className="min-w-40">
          <Select value={preset} onChange={(event) => setParam("preset", event.target.value)}>
            {PRESETS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </Select>
        </Field>
        {preset === "custom" ? (
          <>
            <Field label="From"><Input type="date" value={params.get("date_from") || ""} onChange={(event) => setParam("date_from", event.target.value)} /></Field>
            <Field label="To"><Input type="date" value={params.get("date_to") || ""} onChange={(event) => setParam("date_to", event.target.value)} /></Field>
          </>
        ) : null}
        <Field label="Shop" className="min-w-44">
          <Select value={params.get("shop_id") || ""} onChange={(event) => setParam("shop_id", event.target.value)}>
            <option value="">All shops</option>
            {shops.data?.map((shop) => <option key={shop.id} value={shop.id}>{shop.name}</option>)}
          </Select>
        </Field>
        <Field label="Workflow" className="min-w-48">
          <Select value={params.get("status_id") || ""} onChange={(event) => setParam("status_id", event.target.value)}>
            <option value="">All statuses</option>
            {statuses.data?.data.map((status) => <option key={status.id} value={status.id}>{status.name}</option>)}
          </Select>
        </Field>
        <Field label="Supplier" className="min-w-40">
          <Select value={params.get("supplier_status") || ""} onChange={(event) => setParam("supplier_status", event.target.value)}>
            <option value="">All supplier</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="error">Error</option>
            <option value="pending">Pending</option>
          </Select>
        </Field>
        <Field label="Listing" className="min-w-56">
          <Select value={params.get("listing_id") || ""} onChange={(event) => setParam("listing_id", event.target.value)}>
            <option value="">All listings</option>
            {listings.data?.data.map((listing) => <option key={listing.id} value={listing.id}>{listing.short_name}</option>)}
          </Select>
        </Field>
        <Field label="Employee ID" className="min-w-48">
          <Input value={params.get("created_by") || ""} placeholder="User UUID" onChange={(event) => setParam("created_by", event.target.value)} />
        </Field>
        <Field label="Compare">
          <Select value={params.get("compare") || "previous_period"} onChange={(event) => setParam("compare", event.target.value)}>
            <option value="previous_period">Previous period</option>
            <option value="none">No comparison</option>
          </Select>
        </Field>
        <Button type="button" variant="secondary" onClick={reset}><HiOutlineArrowPath />Reset</Button>
      </div>
    </div>
  );
}

function PeriodNote({ data }: { data: AnalyticsOverview }) {
  return (
    <div className="text-sm text-muted">
      {formatDateTime(data.period.date_from)} to {formatDateTime(data.period.date_to)} / {data.period.timezone}
      {data.period.comparison_date_from ? ` / Compared with ${formatDate(data.period.comparison_date_from)} to ${formatDate(data.period.comparison_date_to)}` : null}
    </div>
  );
}

function AnalyticsKpiGrid({ data }: { data: AnalyticsOverview }) {
  const cards = [
    ["Total Orders", data.kpis.total_orders, HiOutlineShoppingBag],
    ["Total Items", data.kpis.total_items, HiOutlineChartBar],
    ["Total Quantity", data.kpis.total_quantity, HiOutlineChartBar],
    ["Ready to Send", data.kpis.ready_to_send, HiOutlineChartBar],
    ["Supplier Submitted", data.kpis.supplier_submitted, HiOutlineChartBar],
    ["Supplier Errors", data.kpis.supplier_errors, HiOutlineExclamationTriangle],
    ["Total Supplier Cost", data.kpis.total_supplier_cost, HiOutlineBanknotes],
    ["Avg Cost / Order", data.kpis.average_supplier_cost_per_order, HiOutlineBanknotes],
  ] as const;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(([title, metric, Icon]) => <KpiCard key={title} title={title} metric={metric} icon={<Icon className="h-5 w-5" />} />)}
    </div>
  );
}

function KpiCard({ title, metric, icon }: { title: string; metric: AnalyticsMetric; icon: ReactNode }) {
  const badUp = metric.polarity === "negative" && metric.trend_direction === "up";
  const good = (metric.polarity === "positive" && metric.trend_direction === "up") || (metric.polarity === "negative" && metric.trend_direction === "down");
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-muted">{title}</p>
          <p className="mt-3 text-3xl font-bold">{metric.unavailable ? "Unavailable" : formatDecimalString(metric.value)}</p>
        </div>
        <span className="rounded-lg bg-blue-50 p-2 text-blue-700">{icon}</span>
      </div>
      <p className={clsx("mt-3 text-xs font-semibold", good && "text-green-700", badUp && "text-red-600", !good && !badUp && "text-muted")}>
        {metric.change_percent ? `${formatPercentage(metric.change_percent)} vs previous` : metric.note || "No previous data"}
      </p>
    </Card>
  );
}

function AnalyticsSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="grid gap-3">
      <div>
        <h2 className="text-base font-bold">{title}</h2>
        <p className="text-sm text-muted">{description}</p>
      </div>
      <Card className="p-4">{children}</Card>
    </section>
  );
}

function OrderTrendChart({ points }: { points: AnalyticsTimeSeriesPoint[] }) {
  if (!points.length) return <EmptyState title="No trend data" message="No orders were created in this period." />;
  return <LineChart points={points} series={[["orders_created", "Created", "#1d4ed8"], ["supplier_submitted", "Supplier submitted", "#0f766e"], ["supplier_errors", "Errors", "#dc2626"], ["cancelled_orders", "Cancelled", "#92400e"]]} />;
}

function LineChart({ points, series }: { points: AnalyticsTimeSeriesPoint[]; series: [keyof AnalyticsTimeSeriesPoint, string, string][] }) {
  const width = 920;
  const height = 260;
  const values = series.flatMap(([key]) => points.map((p) => Number(p[key]) || 0));
  const max = Math.max(1, ...values);
  const stepX = points.length > 1 ? (width - 64) / (points.length - 1) : width - 64;
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[720px]" role="img" aria-label="Order trend chart">
        <line x1="44" y1="20" x2="44" y2="220" stroke="#e2e8f0" />
        <line x1="44" y1="220" x2="900" y2="220" stroke="#e2e8f0" />
        {series.map(([key, label, color]) => {
          const d = points.map((point, index) => `${index === 0 ? "M" : "L"} ${44 + index * stepX} ${220 - ((Number(point[key]) || 0) / max) * 190}`).join(" ");
          return <path key={String(key)} d={d} fill="none" stroke={color} strokeWidth="3" aria-label={label} />;
        })}
        {points.map((point, index) => index % Math.ceil(points.length / 8 || 1) === 0 ? <text key={point.label} x={44 + index * stepX} y="245" fontSize="11" fill="#64748b" textAnchor="middle">{point.label}</text> : null)}
      </svg>
      <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-slate-700">
        {series.map(([, label, color]) => <span key={label} className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />{label}</span>)}
      </div>
    </div>
  );
}

function WorkflowDistributionChart({ points }: { points: WorkflowDistributionPoint[] }) {
  const navigate = useNavigate();
  return <BarList rows={points.map((point) => ({ label: point.name, value: point.count, detail: `${point.percent}%`, color: sanitizeColor(point.color) || "#1d4ed8", onClick: () => navigate(`/app/orders?status_id=${point.status_id}`) }))} />;
}

function ReadinessBlockers({ points }: { points: ReadinessBlockerPoint[] }) {
  const navigate = useNavigate();
  return (
    <div className="mt-5">
      <h3 className="mb-2 text-sm font-bold">Readiness blockers</h3>
      <p className="mb-3 text-xs text-muted">Counts may overlap because one order can have multiple blockers.</p>
      <BarList rows={points.map((point) => ({ label: point.label, value: point.count, detail: point.overlap ? "May overlap" : "Exclusive", color: point.code === "ready" ? "#16a34a" : "#d97706", onClick: () => navigate(`/app/orders?readiness=${point.code}`) }))} />
    </div>
  );
}

function BarList({ rows }: { rows: { label: string; value: number; detail?: string; color?: string; onClick?: () => void }[] }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  if (!rows.length) return <EmptyState title="No data" message="No matching records for this section." />;
  return (
    <div className="grid gap-2">
      {rows.map((row) => (
        <button key={row.label} type="button" className="grid gap-1 text-left focus:outline-none focus:ring-2 focus:ring-blue-500" onClick={row.onClick}>
          <span className="flex justify-between gap-3 text-sm"><span className="truncate font-semibold">{row.label}</span><span className="text-muted">{formatInteger(row.value)} {row.detail}</span></span>
          <span className="h-3 rounded-full bg-slate-100"><span className="block h-3 rounded-full" style={{ width: `${Math.max(3, (row.value / max) * 100)}%`, backgroundColor: row.color || "#1d4ed8" }} /></span>
        </button>
      ))}
    </div>
  );
}

function Funnel({ stages }: { stages: AnalyticsOverview["workflow_funnel"] }) {
  return <div className="grid gap-3">{stages.map((stage) => <SoftPanel key={stage.code} className="grid gap-1"><div className="flex justify-between"><span className="font-semibold">{stage.label}</span><span>{formatInteger(stage.count)}</span></div><p className="text-xs text-muted">{stage.conversion_percent}% from previous / {stage.overall_percent}% overall</p><p className="text-xs text-muted">{stage.definition}</p></SoftPanel>)}</div>;
}

function WorkflowAging({ rows }: { rows: AnalyticsOverview["workflow_aging"] }) {
  return (
    <div className="overflow-x-auto">
      <Table className="shadow-none">
        <thead><tr className="text-xs text-muted"><th className="px-3 py-2">Status</th><th className="px-3 py-2">&lt;1d</th><th className="px-3 py-2">1-2d</th><th className="px-3 py-2">3-5d</th><th className="px-3 py-2">6-7d</th><th className="px-3 py-2">&gt;7d</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.status_id} className="border-t"><td className="px-3 py-2 font-semibold">{row.name}</td><td className="px-3 py-2">{row.less_than_one_day}</td><td className="px-3 py-2">{row.one_to_two_days}</td><td className="px-3 py-2">{row.three_to_five_days}</td><td className="px-3 py-2">{row.six_to_seven_days}</td><td className="px-3 py-2">{row.more_than_seven_days}</td></tr>)}</tbody>
      </Table>
    </div>
  );
}

function ProcessingTimes({ data }: { data: AnalyticsOverview }) {
  return <div className="grid gap-3">{data.processing_times.map((item) => <SoftPanel key={item.code}><p className="font-semibold">{item.label}</p><div className="mt-2 grid grid-cols-3 gap-2 text-sm"><span>Avg: {formatDuration(item.average_seconds)}</span><span>Median: {formatDuration(item.median_seconds)}</span><span>P90: {formatDuration(item.p90_seconds)}</span></div><p className="mt-2 text-xs text-muted">{item.source} / Sample {item.sample_size}</p></SoftPanel>)}</div>;
}

function ShopPerformance({ rows }: { rows: ShopPerformanceRow[] }) {
  return <div className="grid gap-4"><BarList rows={rows.map((row) => ({ label: row.shop_name, value: row.orders, detail: `${formatDecimalString(row.supplier_cost)} cost`, color: "#1d4ed8" }))} /><SmallTable rows={rows.map((r) => [r.shop_name, formatInteger(r.orders), formatInteger(r.quantity), formatDecimalString(r.supplier_cost), formatInteger(r.supplier_errors)])} headers={["Shop", "Orders", "Qty", "Supplier Cost", "Errors"]} /></div>;
}

function SupplierCost({ data }: { data: AnalyticsOverview }) {
  const cost = data.supplier_cost;
  return <div className="grid gap-3 sm:grid-cols-2"><MetricLine label="Total Supplier Cost" value={formatDecimalString(cost.total_cost)} /><MetricLine label="Product Cost" value={formatDecimalString(cost.items_fee)} /><MetricLine label="Extra Services" value={formatDecimalString(cost.extra_services_fee)} /><MetricLine label="Shipping + Label" value={formatDecimalString(String(Number(cost.shipping_fee) + Number(cost.label_fee)))} /><MetricLine label="Average / Order" value={formatDecimalString(cost.average_cost_per_order)} /><MetricLine label="Average / Item" value={formatDecimalString(cost.average_cost_per_item)} />{cost.malformed_fee_count ? <Badge tone="warning">{cost.malformed_fee_count} malformed fee values ignored</Badge> : null}</div>;
}

function SupplierPerformance({ data }: { data: AnalyticsOverview }) {
  const supplier = data.supplier_performance;
  return <div className="grid gap-3 sm:grid-cols-2"><MetricLine label="Attempts" value={formatInteger(supplier.submission_attempts)} /><MetricLine label="Success Rate" value={`${supplier.success_rate}%`} /><MetricLine label="Failed" value={formatInteger(supplier.failed_submissions)} /><MetricLine label="Retries" value={formatInteger(supplier.retry_count)} /><MetricLine label="Cancel Requests" value={formatInteger(supplier.cancel_requests)} /><MetricLine label="Cancel Success" value={formatInteger(supplier.successful_cancellations)} /></div>;
}

function DesignUsage({ data }: { data: AnalyticsOverview }) {
  const usage = data.design_usage;
  return <div className="grid gap-3"><BarList rows={[{ label: "Uploaded custom", value: usage.uploaded_custom_orders, color: "#1d4ed8" }, { label: "Design Library", value: usage.library_design_orders, color: "#0f766e" }, { label: "Mixed", value: usage.mixed_design_orders, color: "#7c3aed" }, { label: "Missing main design", value: usage.missing_design_orders, color: "#dc2626" }]} /><div className="grid gap-2 sm:grid-cols-2"><MetricLine label="Items with Main Design" value={formatInteger(usage.items_with_main_design)} /><MetricLine label="Items with Sub Design" value={formatInteger(usage.items_with_sub_design)} /><MetricLine label="Mockup 1" value={formatInteger(usage.items_with_mockup_1)} /><MetricLine label="Mockup 2" value={formatInteger(usage.items_with_mockup_2)} /><MetricLine label="Avg design files / item" value={usage.average_design_files_per_item} /></div></div>;
}

function ProductPerformance({ rows }: { rows: ProductPerformanceRow[] }) {
  return <SmallTable rows={rows.map((r) => [r.listing_title, r.internal_sku || "-", r.supplier_sku, formatInteger(r.orders), formatInteger(r.quantity), formatDecimalString(r.supplier_cost), `${r.custom_design_percent}%`, `${r.library_design_percent}%`])} headers={["Listing", "Internal SKU", "Supplier SKU", "Orders", "Qty", "Supplier Cost", "Custom", "Library"]} />;
}

function OperationalTables({ data }: { data: AnalyticsOverview }) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <div>
        <h3 className="mb-2 text-sm font-bold">Attention orders</h3>
        <SmallTable rows={data.attention_orders.map((o) => [<Link className="font-semibold text-blue-700" to={`/app/orders/${o.order_id}`}>{o.etsy_order_id}</Link>, o.shop_name, o.status_name, `${o.age_hours}h`, [o.missing_main_design && "Missing design", o.missing_shipping_label && "Missing label", o.supplier_error && "Supplier error"].filter(Boolean).join(", ") || "Aging"])} headers={["Order", "Shop", "Status", "Age", "Reason"]} />
      </div>
      <div>
        <h3 className="mb-2 text-sm font-bold">Employee activity</h3>
        <SmallTable rows={data.employee_activity.map((e) => [e.full_name, formatInteger(e.orders_created), formatInteger(e.files_uploaded), formatInteger(e.ready_to_send), formatInteger(e.supplier_submitted)])} headers={["Employee", "Orders", "Files", "Ready", "Submitted"]} />
      </div>
    </div>
  );
}

function SmallTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  if (!rows.length) return <EmptyState title="No rows" message="No matching records." />;
  return <div className="overflow-x-auto"><Table className="shadow-none"><thead><tr>{headers.map((h) => <th key={h} scope="col" className="px-3 py-2 text-xs font-semibold uppercase text-muted">{h}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index} className="border-t border-border">{row.map((cell, i) => <td key={i} className="max-w-[320px] truncate px-3 py-2 text-sm">{cell}</td>)}</tr>)}</tbody></Table></div>;
}

function MetricLine({ label, value }: { label: string; value: ReactNode }) {
  return <SoftPanel className="px-3 py-2"><p className="text-xs font-semibold text-muted">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></SoftPanel>;
}

function AnalyticsSkeleton() {
  return <div className="grid gap-4"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Card key={i} className="h-28 animate-pulse bg-slate-100"><span className="sr-only">Loading KPI</span></Card>)}</div><SkeletonRows rows={8} /></div>;
}

function dateRangeForPreset(preset: string, params: URLSearchParams) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (preset === "today") return { from: startOfToday, to: now };
  if (preset === "yesterday") {
    const from = new Date(startOfToday); from.setDate(from.getDate() - 1);
    return { from, to: startOfToday };
  }
  if (preset === "month") return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
  if (preset === "last_month") return { from: new Date(now.getFullYear(), now.getMonth() - 1, 1), to: new Date(now.getFullYear(), now.getMonth(), 1) };
  if (preset === "custom") {
    return { from: params.get("date_from") ? new Date(`${params.get("date_from")}T00:00:00`) : new Date(startOfToday.getTime() - 29 * 86400000), to: params.get("date_to") ? new Date(`${params.get("date_to")}T23:59:59`) : now };
  }
  const days = Number(preset) || 30;
  return { from: new Date(startOfToday.getTime() - (days - 1) * 86400000), to: now };
}
