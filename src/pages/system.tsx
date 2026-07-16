import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import { Card } from '@/components/ui';
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
      <Link to="/app/dashboard" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white">
        Back to dashboard
      </Link>
    </Card>
  );
}

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="max-w-xl p-8 text-center">
        <h1 className="text-3xl font-bold">Page not found</h1>
        <p className="mt-2 text-sm text-muted">The route you opened does not exist in this workspace.</p>
        <Link to="/app/dashboard" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white">
          Go to dashboard
        </Link>
      </Card>
    </div>
  );
}
