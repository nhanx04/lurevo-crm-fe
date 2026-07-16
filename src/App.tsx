import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout";
import { LoginPage } from "./pages/auth";
import {
  AccountPage,
  ChangePasswordPage,
  CollaboratorsPage,
} from "./pages/account";
import { CategoriesPage, StatusesPage } from "./pages/catalog";
import { DashboardPage } from "./pages/dashboard";
import {
  ListingCreatePage,
  ListingDetailPage,
  ListingEditPage,
  ListingsPage,
} from "./pages/listings";
import {
  ComingSoonPage,
  NotFoundPage,
  OwnerRoute,
  ProtectedRoute,
  UnauthorizedPage,
} from "./pages/system";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<AppShell />}>
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route
            path="analytics"
            element={<ComingSoonPage title="Analytics" description="" />}
          />
          <Route path="listings" element={<ListingsPage />} />
          <Route path="listings/new" element={<ListingCreatePage />} />
          <Route path="listings/:id" element={<ListingDetailPage />} />
          <Route path="listings/:id/edit" element={<ListingEditPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="listing-statuses" element={<StatusesPage />} />
          <Route
            path="orders"
            element={
              <ComingSoonPage
                title="Orders"
                description="Order APIs are not available yet. This route is reserved for the future order workflow."
              />
            }
          />
          <Route element={<OwnerRoute />}>
            <Route path="collaborators" element={<CollaboratorsPage />} />
          </Route>
          <Route path="account" element={<AccountPage />} />
          <Route
            path="account/change-password"
            element={<ChangePasswordPage />}
          />
          <Route path="unauthorized" element={<UnauthorizedPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
