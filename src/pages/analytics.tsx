import { ReactNode, useMemo, useState } from "react";
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

const CHART_THEME = {
  created: "#5B8DEF",
  submitted: "#2BAE9F",
  errors: "#E86D64",
  cancelled: "#A68A64",
  grid: "#edf2f7",
  axis: "#94a3b8",
  muted: "#cbd5e1",
} as const;

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
            <AnalyticsSection title="Shop Performance" description="Orders, quantity, supplier cost, and operational outcomes by Etsy shop.">
              <ShopPerformance rows={analytics.data.shop_performance} />
            </AnalyticsSection>
            <AnalyticsSection title="Supplier and Cost Analysis" description={analytics.data.supplier_cost.label}>
              <SupplierCost data={analytics.data} />
            </AnalyticsSection>
          </div>
          <AnalyticsSection title="Product Performance" description="Listing performance score combines real volume, readiness, supplier success, and cost-efficiency signals.">
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
  const hasData = points.some((point) => point.orders_created || point.supplier_submitted || point.supplier_errors || point.cancelled_orders);
  if (!points.length || !hasData) {
    return <EmptyState title="No order trend data" message="Order activity will appear here when orders are created during the selected period." />;
  }
  return (
    <LineChart
      points={points}
      series={[
        ["orders_created", "Created", CHART_THEME.created],
        ["supplier_submitted", "Supplier submitted", CHART_THEME.submitted],
        ["supplier_errors", "Errors", CHART_THEME.errors],
        ["cancelled_orders", "Cancelled", CHART_THEME.cancelled],
      ]}
    />
  );
}

function LineChart({ points, series }: { points: AnalyticsTimeSeriesPoint[]; series: [keyof AnalyticsTimeSeriesPoint, string, string][] }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const width = 920;
  const height = 340;
  const plot = { left: 52, right: 28, top: 32, bottom: 56 };
  const innerWidth = width - plot.left - plot.right;
  const innerHeight = height - plot.top - plot.bottom;
  const visibleSeries = series.filter(([key]) => !hidden.has(String(key)));
  const values = visibleSeries.flatMap(([key]) => points.map((p) => Number(p[key]) || 0));
  const max = Math.max(1, ...values);
  const yMax = Math.max(1, Math.ceil(max / 4) * 4);
  const stepX = points.length > 1 ? innerWidth / (points.length - 1) : innerWidth;
  const xFor = (index: number) => plot.left + index * stepX;
  const yFor = (value: number) => plot.top + innerHeight - (value / yMax) * innerHeight;
  const hoverPoint = hoverIndex === null ? null : points[hoverIndex];
  const xLabelInterval = Math.max(1, Math.ceil(points.length / 7));
  function toggle(key: string) {
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }
  return (
    <div className="grid gap-4">
      <div className="grid gap-2 sm:grid-cols-4">
        {series.map(([key, label, color]) => {
          const total = points.reduce((sum, point) => sum + (Number(point[key]) || 0), 0);
          return (
            <button key={String(key)} type="button" className={clsx("rounded-lg border border-border px-3 py-2 text-left transition hover:bg-slate-50", hidden.has(String(key)) && "opacity-45")} onClick={() => toggle(String(key))}>
              <span className="flex items-center gap-2 text-xs font-semibold text-muted"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />{label}</span>
              <span className="mt-1 block text-lg font-bold">{formatInteger(total)}</span>
            </button>
          );
        })}
      </div>
      <div className="relative overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[720px]" role="img" aria-label="Order trend chart">
          <defs>
            {series.map(([key, , color]) => (
              <linearGradient key={String(key)} id={`trend-fill-${String(key)}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.10" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = plot.top + innerHeight * ratio;
            const value = Math.round(yMax * (1 - ratio));
            return (
              <g key={ratio}>
                <line x1={plot.left} x2={width - plot.right} y1={y} y2={y} stroke={CHART_THEME.grid} />
                <text x={plot.left - 12} y={y + 4} fontSize="11" fill={CHART_THEME.axis} textAnchor="end">{value}</text>
              </g>
            );
          })}
          {visibleSeries.map(([key, label, color]) => {
            const path = smoothPath(points.map((point, index) => ({ x: xFor(index), y: yFor(Number(point[key]) || 0) })));
            const areaPath = `${path} L ${xFor(points.length - 1)} ${plot.top + innerHeight} L ${xFor(0)} ${plot.top + innerHeight} Z`;
            return (
              <g key={String(key)}>
                <path d={areaPath} fill={`url(#trend-fill-${String(key)})`} />
                <path d={path} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" aria-label={label} />
              </g>
            );
          })}
          {points.map((point, index) => index % xLabelInterval === 0 || index === points.length - 1 ? <text key={`${point.label}-${index}`} x={xFor(index)} y={height - 20} fontSize="11" fill={CHART_THEME.axis} textAnchor="middle">{point.label}</text> : null)}
          {hoverIndex !== null ? (
            <line x1={xFor(hoverIndex)} x2={xFor(hoverIndex)} y1={plot.top} y2={plot.top + innerHeight} stroke="#94a3b8" strokeOpacity="0.25" />
          ) : null}
          {visibleSeries.map(([key, , color]) =>
            hoverIndex !== null ? <circle key={String(key)} cx={xFor(hoverIndex)} cy={yFor(Number(points[hoverIndex][key]) || 0)} r="4" fill="white" stroke={color} strokeWidth="2" /> : null,
          )}
          {points.map((_, index) => (
            <rect key={index} x={xFor(index) - stepX / 2} y={plot.top} width={Math.max(12, stepX)} height={innerHeight} fill="transparent" onMouseEnter={() => setHoverIndex(index)} onFocus={() => setHoverIndex(index)} tabIndex={0} />
          ))}
        </svg>
        {hoverPoint && hoverIndex !== null ? (
          <div className="pointer-events-none absolute top-8 w-64 rounded-lg border border-border bg-white p-3 text-sm shadow-soft" style={{ left: `min(calc(${(xFor(hoverIndex) / width) * 100}% + 8px), calc(100% - 17rem))` }}>
            <p className="mb-2 font-bold">{hoverPoint.label}</p>
            {series.map(([key, label, color]) => (
              <div key={String(key)} className="flex items-center justify-between gap-4">
                <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />{label}</span>
                <span className="font-semibold">{formatInteger(Number(hoverPoint[key]) || 0)}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-3 text-xs font-semibold text-slate-700">
        {series.map(([key, label, color]) => <button type="button" key={label} className={clsx("inline-flex items-center gap-1", hidden.has(String(key)) && "text-muted line-through")} onClick={() => toggle(String(key))}><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: hidden.has(String(key)) ? CHART_THEME.muted : color }} />{label}</button>)}
      </div>
    </div>
  );
}

function smoothPath(points: { x: number; y: number }[]) {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const controlOffset = (point.x - previous.x) * 0.38;
    return `${path} C ${previous.x + controlOffset} ${previous.y}, ${point.x - controlOffset} ${point.y}, ${point.x} ${point.y}`;
  }, "");
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

function ShopPerformance({ rows }: { rows: ShopPerformanceRow[] }) {
  return <div className="grid gap-4"><BarList rows={rows.map((row) => ({ label: row.shop_name, value: row.orders, detail: `${formatDecimalString(row.supplier_cost)} cost`, color: "#1d4ed8" }))} /><SmallTable rows={rows.map((r) => [r.shop_name, formatInteger(r.orders), formatInteger(r.quantity), formatDecimalString(r.supplier_cost), formatInteger(r.supplier_errors)])} headers={["Shop", "Orders", "Qty", "Supplier Cost", "Errors"]} /></div>;
}

function SupplierCost({ data }: { data: AnalyticsOverview }) {
  const cost = data.supplier_cost;
  return <div className="grid gap-3 sm:grid-cols-2"><MetricLine label="Total Supplier Cost" value={formatDecimalString(cost.total_cost)} /><MetricLine label="Product Cost" value={formatDecimalString(cost.items_fee)} /><MetricLine label="Extra Services" value={formatDecimalString(cost.extra_services_fee)} /><MetricLine label="Shipping + Label" value={formatDecimalString(String(Number(cost.shipping_fee) + Number(cost.label_fee)))} /><MetricLine label="Average / Order" value={formatDecimalString(cost.average_cost_per_order)} /><MetricLine label="Average / Item" value={formatDecimalString(cost.average_cost_per_item)} />{cost.malformed_fee_count ? <Badge tone="warning">{cost.malformed_fee_count} malformed fee values ignored</Badge> : null}</div>;
}

function ProductPerformance({ rows }: { rows: ProductPerformanceRow[] }) {
  const [sort, setSort] = useState("score_desc");
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLowerCase();
  const filtered = rows.filter((row) =>
    !normalizedSearch ||
    row.listing_title.toLowerCase().includes(normalizedSearch) ||
    (row.internal_sku || "").toLowerCase().includes(normalizedSearch) ||
    row.supplier_sku.toLowerCase().includes(normalizedSearch),
  );
  const sorted = [...filtered].sort((a, b) => {
    const scoreA = a.performance_score ?? -1;
    const scoreB = b.performance_score ?? -1;
    switch (sort) {
      case "score_asc":
        return scoreA - scoreB;
      case "orders_desc":
        return b.orders - a.orders;
      case "quantity_desc":
        return b.quantity - a.quantity;
      case "supplier_cost_desc":
        return Number(b.supplier_cost) - Number(a.supplier_cost);
      default:
        return scoreB - scoreA;
    }
  });
  const chartRows = sorted.slice(0, 10);
  if (!rows.length) return <EmptyState title="No product performance data" message="Listing performance will appear when orders match the selected period." />;
  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid gap-1">
          <p className="text-sm font-semibold">Performance score formula</p>
          <p className="max-w-3xl text-sm text-muted">
            Score = volume 40%, readiness 25%, supplier success 20%, and cost efficiency 15%. Missing metrics are excluded and remaining weights are normalized. Revenue is not included because Etsy sales totals are not available.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input className="w-64" placeholder="Search listing or SKU" value={search} onChange={(event) => setSearch(event.target.value)} />
          <Select className="w-52" value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="score_desc">Highest performance</option>
            <option value="score_asc">Lowest performance</option>
            <option value="orders_desc">Most orders</option>
            <option value="quantity_desc">Highest quantity</option>
            <option value="supplier_cost_desc">Highest supplier cost</option>
          </Select>
        </div>
      </div>
      <ProductPerformanceBars rows={chartRows} />
      <ProductPerformanceTable rows={sorted} />
    </div>
  );
}

function ProductPerformanceBars({ rows }: { rows: ProductPerformanceRow[] }) {
  if (!rows.length) return <EmptyState title="No matching listings" message="Try a different listing search or sort." />;
  return (
    <div className="grid gap-3">
      {rows.map((row) => {
        const score = row.performance_score ?? 0;
        const tone = performanceTone(score);
        return (
          <Link key={row.listing_id} to={`/app/listings/${row.listing_id}`} className="group grid gap-2 rounded-lg border border-border p-3 transition hover:border-blue-200 hover:bg-slate-50" title={performanceTooltip(row)}>
            <div className="grid gap-2 md:grid-cols-[minmax(180px,280px)_1fr_auto] md:items-center">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold group-hover:text-blue-700">{row.listing_title}</p>
                <p className="text-xs text-muted">{formatInteger(row.orders)} orders / {formatInteger(row.quantity)} qty</p>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div className={clsx("h-full rounded-full transition-all duration-500", tone.bar)} style={{ width: `${Math.max(2, score)}%` }} />
              </div>
              <div className="flex items-center gap-2 md:justify-end">
                <span className="min-w-12 text-right text-sm font-bold">{score ? `${score.toFixed(1)}%` : "No data"}</span>
                <Badge tone={tone.badge}>{row.performance_status || "No data"}</Badge>
                <Badge tone={row.data_confidence === "high" ? "success" : row.data_confidence === "medium" ? "warning" : "neutral"}>{row.data_confidence} confidence</Badge>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function ProductPerformanceTable({ rows }: { rows: ProductPerformanceRow[] }) {
  return (
    <SmallTable
      rows={rows.map((r) => [
        <Link className="font-semibold text-blue-700" title={r.listing_title} to={`/app/listings/${r.listing_id}`}>{r.listing_title}</Link>,
        r.internal_sku || "-",
        r.supplier_sku,
        formatInteger(r.orders),
        formatInteger(r.quantity),
        formatDecimalString(r.average_cost_per_item),
        metricPercent(r.ready_rate),
        metricPercent(r.supplier_success_rate),
        <span className="flex min-w-32 items-center gap-2"><span className="h-2 flex-1 rounded-full bg-slate-100"><span className={clsx("block h-2 rounded-full", performanceTone(r.performance_score || 0).bar)} style={{ width: `${r.performance_score || 0}%` }} /></span>{r.performance_score != null ? `${r.performance_score.toFixed(1)}%` : "No data"}</span>,
        r.performance_status || "No data",
      ])}
      headers={["Listing", "Internal SKU", "Supplier SKU", "Orders", "Qty", "Avg Supplier Cost", "Ready Rate", "Supplier Success", "Performance", "Status"]}
    />
  );
}

function metricPercent(value?: string | null) {
  return value ? `${formatPercentage(value)}` : "No data";
}

function performanceTone(score: number): { badge: "success" | "info" | "warning" | "danger" | "neutral"; bar: string } {
  if (score >= 80) return { badge: "success", bar: "bg-green-600" };
  if (score >= 60) return { badge: "info", bar: "bg-teal-600" };
  if (score >= 40) return { badge: "warning", bar: "bg-amber-500" };
  if (score > 0) return { badge: "danger", bar: "bg-red-400" };
  return { badge: "neutral", bar: "bg-slate-300" };
}

function performanceTooltip(row: ProductPerformanceRow) {
  const component = (label: string, score?: number | null) => `${label}: ${score == null ? "No data" : `${score.toFixed(1)} / 100`}`;
  return [
    row.listing_title,
    `Performance: ${row.performance_score == null ? "No data" : `${row.performance_score.toFixed(1)}%`} - ${row.performance_status || "No data"}`,
    component("Sales volume", row.score_components.volume.score),
    component("Readiness", row.score_components.readiness.score),
    component("Supplier success", row.score_components.supplier_success.score),
    component("Cost efficiency", row.score_components.cost_efficiency.score),
    `Orders: ${row.orders}`,
    `Quantity: ${row.quantity}`,
    `Supplier cost: ${formatDecimalString(row.supplier_cost)}`,
    `Data confidence: ${row.data_confidence}`,
  ].join("\n");
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
