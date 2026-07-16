import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  HiOutlineCheckCircle,
  HiOutlineFolder,
  HiOutlineFolderPlus,
  HiOutlinePlus,
  HiOutlineRectangleStack,
  HiOutlineTag,
  HiOutlineUserPlus,
  HiOutlineXCircle,
} from "react-icons/hi2";
import { categoryApi, listingApi, statusApi } from "@/api/services";
import { queryKeys } from "@/api/queryKeys";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  Badge,
  Button,
  Card,
  IconBadge,
  PageHeader,
  SoftPanel,
  Table,
} from "@/components/ui";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/feedback";
import { formatCurrency, formatDate, sanitizeColor } from "@/utils/format";

export function DashboardPage() {
  const { user, isOwner } = useAuth();
  const listings = useQuery({
    queryKey: queryKeys.listings.list({ page: 1, page_size: 6 }),
    queryFn: () => listingApi.list({ page: 1, page_size: 6 }),
  });
  const activeListings = useQuery({
    queryKey: queryKeys.listings.list({ is_active: true, page_size: 1 }),
    queryFn: () => listingApi.list({ is_active: true, page: 1, page_size: 1 }),
  });
  const inactiveListings = useQuery({
    queryKey: queryKeys.listings.list({ is_active: false, page_size: 1 }),
    queryFn: () => listingApi.list({ is_active: false, page: 1, page_size: 1 }),
  });
  const categories = useQuery({
    queryKey: queryKeys.categories.list({ page_size: 1 }),
    queryFn: () => categoryApi.list({ page: 1, page_size: 1 }),
  });
  const statuses = useQuery({
    queryKey: queryKeys.statuses.list({ page_size: 100 }),
    queryFn: () => statusApi.list({ page: 1, page_size: 100 }),
  });

  const metrics = [
    {
      label: "Total Listings",
      value: listings.data?.pagination.total_items ?? 0,
      icon: HiOutlineRectangleStack,
      tone: "bg-blue-50 text-blue-600",
      note: "All listing records",
    },
    {
      label: "Active Listings",
      value: activeListings.data?.pagination.total_items ?? 0,
      icon: HiOutlineCheckCircle,
      tone: "bg-green-50 text-green-600",
      note: "Visible in operations",
    },
    {
      label: "Inactive Listings",
      value: inactiveListings.data?.pagination.total_items ?? 0,
      icon: HiOutlineXCircle,
      tone: "bg-slate-100 text-slate-600",
      note: "Paused or hidden",
    },
    {
      label: "Categories",
      value: categories.data?.pagination.total_items ?? 0,
      icon: HiOutlineFolder,
      tone: "bg-violet-50 text-violet-600",
      note: "Catalog structure",
    },
    {
      label: "Statuses",
      value: statuses.data?.pagination.total_items ?? 0,
      icon: HiOutlineTag,
      tone: "bg-amber-50 text-amber-600",
      note: "Workflow labels",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user?.full_name || "there"}`}
        description=""
        eyebrow="Overview"
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card
              key={metric.label}
              className="p-4 hover:-translate-y-0.5 hover:shadow-soft"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-muted">
                    {metric.label}
                  </p>
                  <p className="mt-3 text-3xl font-bold leading-none text-foreground">
                    {metric.value}
                  </p>
                </div>
                <IconBadge className={metric.tone}>
                  <Icon className="h-5 w-5" />
                </IconBadge>
              </div>
              <p className="mt-3 text-xs text-muted">{metric.note}</p>
            </Card>
          );
        })}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h2 className="text-base font-bold">Recent listings</h2>
              <p className="text-sm text-muted">
                Latest records from the listing repository.
              </p>
            </div>
            <Link to="/app/listings">
              <Button variant="secondary" size="sm">
                View all
              </Button>
            </Link>
          </div>
          <div className="p-4">
            {listings.isLoading ? (
              <SkeletonRows />
            ) : listings.isError ? (
              <ErrorState
                message="Could not load listings."
                onRetry={() => void listings.refetch()}
              />
            ) : listings.data?.data.length ? (
              <Table className="border-0 shadow-none">
                <thead className="bg-slate-50 text-[11px] font-semibold uppercase text-muted">
                  <tr>
                    <th className="px-4 py-3">Listing</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {listings.data.data.map((listing) => (
                    <tr key={listing.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <Link
                          className="font-semibold text-foreground hover:text-primary"
                          to={`/app/listings/${listing.id}`}
                        >
                          {listing.short_name}
                        </Link>
                        <div className="max-w-md truncate text-xs text-muted">
                          {listing.title}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2 text-sm">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{
                              backgroundColor:
                                sanitizeColor(listing.status?.color) ||
                                "#98a2b3",
                            }}
                          />
                          {listing.status?.name || "No status"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {formatCurrency(listing.price, listing.currency)}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {formatDate(listing.updated_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <EmptyState
                title="No listings yet"
                message="Create your first listing to populate the dashboard."
                action={
                  <Link to="/app/listings/new">
                    <Button>Create listing</Button>
                  </Link>
                }
              />
            )}
          </div>
        </Card>
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="text-base font-bold">Quick actions</h2>
            <div className="mt-4 grid gap-2">
              <Link
                to="/app/listings/new"
                className="group flex items-center gap-3 rounded-xl bg-blue-700 px-3 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                <IconBadge className="h-8 w-8 bg-white/15">
                  <HiOutlinePlus className="h-4 w-4" />
                </IconBadge>
                Create listing
              </Link>
              <QuickAction
                to="/app/categories"
                icon={<HiOutlineFolderPlus />}
                label="Create category"
              />
              <QuickAction
                to="/app/listing-statuses"
                icon={<HiOutlineTag />}
                label="Create status"
              />
              {isOwner ? (
                <QuickAction
                  to="/app/collaborators"
                  icon={<HiOutlineUserPlus />}
                  label="Invite collaborator"
                />
              ) : null}
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="text-base font-bold">Status breakdown</h2>
            <div className="mt-4 space-y-2">
              {statuses.data?.data.map((status) => (
                <SoftPanel
                  key={status.id}
                  className="flex items-center justify-between gap-3 px-3 py-2"
                >
                  <span className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor:
                          sanitizeColor(status.color) || "#64748b",
                      }}
                    />
                    <span className="truncate">{status.name}</span>
                  </span>
                  <div className="flex shrink-0 gap-1">
                    {status.is_default ? (
                      <Badge tone="primary">Default</Badge>
                    ) : null}
                    <Badge tone={status.is_active ? "success" : "neutral"}>
                      {status.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </SoftPanel>
              ))}
              {!statuses.data?.data.length ? (
                <p className="text-sm text-muted">No statuses configured.</p>
              ) : null}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  to,
  icon,
  label,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
    >
      <IconBadge className="h-8 w-8 bg-blue-50 text-blue-700">
        {icon}
      </IconBadge>
      {label}
    </Link>
  );
}
