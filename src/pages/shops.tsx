import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  HiOutlinePencilSquare,
  HiOutlinePlus,
  HiOutlineShoppingBag,
  HiOutlineTrash,
} from "react-icons/hi2";
import { shopApi } from "@/api/services";
import { queryKeys } from "@/api/queryKeys";
import { ApiError, Shop } from "@/types/api";
import { Modal } from "@/components/layout";
import {
  ActionIconButton,
  Badge,
  Button,
  Card,
  Field,
  IconBadge,
  Input,
  PageHeader,
  ResourceToolbar,
  SearchInput,
  Select,
  Switch,
  Table,
} from "@/components/ui";
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  SkeletonRows,
  Spinner,
  useToast,
} from "@/components/feedback";
import { formatDateTime } from "@/utils/format";
import { useUrlParams } from "@/hooks/useUrlParams";

function activeParam(value?: string): boolean | "" {
  if (value === "true") return true;
  if (value === "false") return false;
  return "";
}

export function ShopsPage() {
  const { params, setParam } = useUrlParams();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState<Shop | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Shop | null>(null);
  const shops = useQuery({
    queryKey: queryKeys.shops.list,
    queryFn: shopApi.list,
  });
  const filtered = useMemo(() => {
    const search = (params.search || "").toLowerCase();
    const active = activeParam(params.is_active);
    return (shops.data || []).filter((shop) => {
      const matchesSearch =
        !search ||
        shop.name.toLowerCase().includes(search) ||
        shop.platform.toLowerCase().includes(search) ||
        (shop.external_shop_id || "").toLowerCase().includes(search);
      const matchesActive = active === "" || shop.is_active === active;
      return matchesSearch && matchesActive;
    });
  }, [params.is_active, params.search, shops.data]);

  const remove = useMutation({
    mutationFn: (id: string) => shopApi.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.shops.list });
      toast.push({ type: "success", title: "Shop deleted" });
      setDeleteTarget(null);
    },
    onError: (error) =>
      toast.push({
        type: "error",
        title: "Delete failed",
        message:
          error instanceof ApiError
            ? error.message
            : "Unable to delete shop",
      }),
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Etsy Shops" />
      <ResourceToolbar
        search={
          <SearchInput
            placeholder="Search shop name, platform, or Etsy shop ID..."
            value={params.search || ""}
            onChange={(event) => setParam("search", event.target.value)}
          />
        }
        filters={
          <Select
            className="w-full sm:w-40"
            value={params.is_active || ""}
            onChange={(event) => setParam("is_active", event.target.value)}
          >
            <option value="">All states</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </Select>
        }
        actions={
          <Button className="shrink-0" onClick={() => setCreateOpen(true)}>
            <HiOutlinePlus />
            Create shop
          </Button>
        }
      />

      {shops.isLoading ? (
        <SkeletonRows rows={6} />
      ) : shops.isError ? (
        <ErrorState
          message="Could not load Etsy shops."
          onRetry={() => void shops.refetch()}
        />
      ) : filtered.length ? (
        <Table>
          <thead className="bg-slate-50 text-[11px] font-semibold uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Shop</th>
              <th className="px-4 py-3">Platform</th>
              <th className="px-4 py-3">External Shop ID</th>
              <th className="px-4 py-3">State</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((shop) => (
              <tr key={shop.id} className="hover:bg-slate-50/70">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <IconBadge className="h-9 w-9 bg-blue-50 text-blue-700">
                      <HiOutlineShoppingBag className="h-5 w-5" />
                    </IconBadge>
                    <div>
                      <p className="font-semibold">{shop.name}</p>
                      <p className="text-xs text-muted">
                        Used when creating Etsy orders.
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted">{shop.platform}</td>
                <td className="px-4 py-3 text-muted">
                  {shop.external_shop_id || "None"}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={shop.is_active ? "success" : "neutral"}>
                    {shop.is_active ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted">
                  {formatDateTime(shop.updated_at)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-1.5">
                    <ActionIconButton
                      tone="edit"
                      label={`Edit ${shop.name}`}
                      onClick={() => setEditing(shop)}
                    >
                      <HiOutlinePencilSquare className="h-4 w-4" />
                    </ActionIconButton>
                    <ActionIconButton
                      tone="delete"
                      label={`Delete ${shop.name}`}
                      onClick={() => setDeleteTarget(shop)}
                    >
                      <HiOutlineTrash className="h-4 w-4" />
                    </ActionIconButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <EmptyState
          title="No Etsy shops found"
          message={
            shops.data?.length
              ? "No shops match the current filters."
              : "Create your first Etsy shop before creating orders."
          }
          action={<Button onClick={() => setCreateOpen(true)}>Create shop</Button>}
        />
      )}

      {createOpen || editing ? (
        <ShopModal
          shop={editing}
          onClose={() => {
            setCreateOpen(false);
            setEditing(null);
          }}
        />
      ) : null}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.name}?`}
        message="This action cannot be undone. The backend will reject deletion if orders already use this shop."
        danger
        confirmLabel={remove.isPending ? "Deleting" : "Delete"}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget.id)}
      />
    </div>
  );
}

function ShopModal({
  shop,
  onClose,
}: {
  shop: Shop | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState(shop?.name || "");
  const [platform, setPlatform] = useState(shop?.platform || "etsy");
  const [externalShopID, setExternalShopID] = useState(
    shop?.external_shop_id || "",
  );
  const [isActive, setIsActive] = useState(shop?.is_active ?? true);
  const [error, setError] = useState<ApiError | null>(null);
  const save = useMutation({
    mutationFn: () => {
      const body = {
        name,
        platform,
        external_shop_id: externalShopID || null,
        is_active: isActive,
      };
      return shop ? shopApi.update(shop.id, body) : shopApi.create(body);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.shops.list });
      toast.push({
        type: "success",
        title: shop ? "Shop updated" : "Shop created",
      });
      onClose();
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err : new ApiError(0)),
  });

  return (
    <Modal title={shop ? "Edit Etsy shop" : "Create Etsy shop"} onClose={onClose}>
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
      >
        <Field
          label="Shop name"
          error={error?.details.find((item) => item.field === "name")?.message}
        >
          <Input
            value={name}
            placeholder="Lurevo US"
            onChange={(event) => setName(event.target.value)}
            autoFocus
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Platform"
            error={
              error?.details.find((item) => item.field === "platform")?.message
            }
          >
            <Select
              value={platform}
              onChange={(event) => setPlatform(event.target.value)}
            >
              <option value="etsy">Etsy</option>
              <option value="shopify">Shopify</option>
              <option value="manual">Manual</option>
            </Select>
          </Field>
          <Field label="External Shop ID">
            <Input
              value={externalShopID}
              placeholder="Optional Etsy shop ID"
              onChange={(event) => setExternalShopID(event.target.value)}
            />
          </Field>
        </div>
        <Card className="p-3">
          <Switch
            checked={isActive}
            onChange={setIsActive}
            label={isActive ? "Active" : "Inactive"}
          />
          <p className="mt-2 text-xs text-muted">
            Inactive shops remain stored but should not be used for new orders.
          </p>
        </Card>
        {error ? <p className="text-sm text-danger">{error.message}</p> : null}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={save.isPending || !name.trim()}>
            {save.isPending ? <Spinner label="Saving" /> : "Save shop"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
