import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { HiOutlineFolderPlus, HiOutlinePlus, HiOutlineTag, HiOutlineUserPlus } from 'react-icons/hi2';
import { categoryApi, listingApi, statusApi } from '@/api/services';
import { queryKeys } from '@/api/queryKeys';
import { useAuth } from '@/features/auth/AuthProvider';
import { Badge, Button, Card, PageHeader, Table } from '@/components/ui';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/feedback';
import { formatCurrency, formatDate, sanitizeColor } from '@/utils/format';

export function DashboardPage() {
  const { user, isOwner } = useAuth();
  const listings = useQuery({ queryKey: queryKeys.listings.list({ page: 1, page_size: 5 }), queryFn: () => listingApi.list({ page: 1, page_size: 5 }) });
  const activeListings = useQuery({ queryKey: queryKeys.listings.list({ is_active: true, page_size: 1 }), queryFn: () => listingApi.list({ is_active: true, page: 1, page_size: 1 }) });
  const inactiveListings = useQuery({ queryKey: queryKeys.listings.list({ is_active: false, page_size: 1 }), queryFn: () => listingApi.list({ is_active: false, page: 1, page_size: 1 }) });
  const categories = useQuery({ queryKey: queryKeys.categories.list({ page_size: 1 }), queryFn: () => categoryApi.list({ page: 1, page_size: 1 }) });
  const statuses = useQuery({ queryKey: queryKeys.statuses.list({ page_size: 100 }), queryFn: () => statusApi.list({ page: 1, page_size: 100 }) });

  const cards = [
    ['Total Listings', listings.data?.pagination.total_items ?? 0],
    ['Active Listings', activeListings.data?.pagination.total_items ?? 0],
    ['Inactive Listings', inactiveListings.data?.pagination.total_items ?? 0],
    ['Categories', categories.data?.pagination.total_items ?? 0],
    ['Listing Statuses', statuses.data?.pagination.total_items ?? 0],
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome back, ${user?.full_name || 'there'}`} description="A quick view of listing operations using the backend list endpoints currently available." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(([label, value]) => (
          <Card key={label} className="p-5">
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-3 text-3xl font-bold">{value}</p>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-semibold">Recent listings</h2>
            <Link to="/app/listings" className="text-sm font-semibold text-primary">View all</Link>
          </div>
          {listings.isLoading ? <SkeletonRows /> : listings.isError ? <ErrorState message="Could not load listings." onRetry={() => void listings.refetch()} /> : listings.data?.data.length ? (
            <Table>
              <thead className="bg-slate-50 text-xs uppercase text-muted">
                <tr><th className="px-4 py-3">Listing</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Updated</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {listings.data.data.map((listing) => (
                  <tr key={listing.id}>
                    <td className="px-4 py-3"><Link className="font-semibold text-primary" to={`/app/listings/${listing.id}`}>{listing.short_name}</Link><div className="text-xs text-muted">{listing.title}</div></td>
                    <td className="px-4 py-3"><Badge tone={listing.is_active ? 'success' : 'neutral'}>{listing.status?.name || 'No status'}</Badge></td>
                    <td className="px-4 py-3">{formatCurrency(listing.price, listing.currency)}</td>
                    <td className="px-4 py-3 text-muted">{formatDate(listing.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : <EmptyState title="No listings yet" message="Create your first listing to populate the dashboard." action={<Link to="/app/listings/new"><Button>Create listing</Button></Link>} />}
        </Card>
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="font-semibold">Quick actions</h2>
            <div className="mt-4 grid gap-2">
              <Link to="/app/listings/new"><Button className="w-full justify-start"><HiOutlinePlus />Create Listing</Button></Link>
              <Link to="/app/categories"><Button variant="secondary" className="w-full justify-start"><HiOutlineFolderPlus />Create Category</Button></Link>
              <Link to="/app/listing-statuses"><Button variant="secondary" className="w-full justify-start"><HiOutlineTag />Create Status</Button></Link>
              {isOwner ? <Link to="/app/collaborators"><Button variant="secondary" className="w-full justify-start"><HiOutlineUserPlus />Create Collaborator</Button></Link> : null}
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="font-semibold">Status overview</h2>
            <div className="mt-4 space-y-2">
              {statuses.data?.data.map((status) => (
                <div key={status.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                  <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: sanitizeColor(status.color) || '#64748b' }} />{status.name}</span>
                  {status.is_default ? <Badge tone="primary">Default</Badge> : <Badge>{status.is_active ? 'Active' : 'Inactive'}</Badge>}
                </div>
              ))}
              {!statuses.data?.data.length ? <p className="text-sm text-muted">No statuses configured.</p> : null}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
