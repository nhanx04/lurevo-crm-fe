import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout";
import { LoginPage } from "./pages/auth";
import {
  AccountPage,
  ChangePasswordPage,
  CollaboratorsPage,
} from "./pages/account";
import { AnalyticsPage } from "./pages/analytics";
import { CategoriesPage, StatusesPage } from "./pages/catalog";
import { DashboardPage } from "./pages/dashboard";
import { DesignLibraryPage } from "./pages/design-library";
import { ShopsPage } from "./pages/shops";
import {
  ListingCreatePage,
  ListingDetailPage,
  ListingEditPage,
  ListingsPage,
} from "./pages/listings";
import { OrderCreatePage, OrderDetailPage, OrdersPage } from "./pages/orders";
import {
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
            element={<AnalyticsPage />}
          />
          <Route path="listings" element={<ListingsPage />} />
          <Route path="listings/new" element={<ListingCreatePage />} />
          <Route path="listings/:id" element={<ListingDetailPage />} />
          <Route path="listings/:id/edit" element={<ListingEditPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="listing-statuses" element={<StatusesPage />} />
          <Route path="shops" element={<ShopsPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="design-library" element={<DesignLibraryPage />} />
          <Route path="orders/new" element={<OrderCreatePage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
          <Route path="orders/:id/edit" element={<OrderDetailPage />} />
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
