import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { HiOutlineClock } from 'react-icons/hi2';
import { useAuth } from '@/features/auth/AuthProvider';
import { Button, Card, IconBadge, PageHeader } from '@/components/ui';
import { Spinner } from '@/components/feedback';

export function ProtectedRoute() {
  const auth = useAuth();
  const location = useLocation();
  if (auth.isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Preparing dashboard" />
      </div>
    );
  }
  if (!auth.isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

export function OwnerRoute() {
  const auth = useAuth();
  if (!auth.isOwner) return <Navigate to="/app/unauthorized" replace />;
  return <Outlet />;
}

export function UnauthorizedPage() {
  return (
    <Card className="mx-auto max-w-2xl p-8 text-center">
      <h1 className="text-2xl font-bold">Access denied</h1>
      <p className="mt-2 text-sm text-muted">This area is available to owner accounts only.</p>
      <Link to="/app/dashboard" className="mt-6 inline-flex rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
        Back to dashboard
      </Link>
    </Card>
  );
}

export function ComingSoonPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-5">
      <PageHeader title={title} description={description} eyebrow="Coming soon" />
      <Card className="flex items-start gap-4 p-5">
        <IconBadge className="bg-blue-50 text-blue-700">
          <HiOutlineClock className="h-5 w-5" />
        </IconBadge>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">Backend endpoint pending</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">The navigation and route are in place, but the frontend will stay data-honest until a real API contract exists.</p>
          <Link to="/app/dashboard" className="mt-4 inline-flex"><Button variant="secondary" size="sm">Back to dashboard</Button></Link>
        </div>
      </Card>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="max-w-xl p-8 text-center">
        <h1 className="text-3xl font-bold">Page not found</h1>
        <p className="mt-2 text-sm text-muted">The route you opened does not exist in this workspace.</p>
        <Link to="/app/dashboard" className="mt-6 inline-flex rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
          Go to dashboard
        </Link>
      </Card>
    </div>
  );
}
