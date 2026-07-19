import { useEffect, useMemo, useState } from "react";
import { useBeforeUnload, useNavigate, useParams } from "react-router-dom";
import { HiOutlinePlus } from "react-icons/hi2";
import { useMutation } from "@tanstack/react-query";
import { orderApi } from "@/api/services";
import { useAuth } from "@/features/auth/AuthProvider";
import { useUrlParams } from "@/hooks/useUrlParams";
import { Button } from "@/components/ui";
import { ErrorState, SkeletonRows, Spinner, useToast } from "@/components/feedback";
import {
  AddListingDialog,
  CompactReadinessBar,
  CreateOrderForm,
  OrderDetailsDrawer,
  OrderFilters,
  OrderLineCard,
  OrderHeader,
  OrdersQuickViews,
  OrdersTable,
  ShippingLabelPanel,
  WorkflowActionBar,
} from "@/features/orders/components";
import { useOrder, useOrders, useRefreshOrder, useWorkflowStatuses } from "@/features/orders/hooks";
import type { OrderItem, OrderParams } from "@/types/api";

export function OrdersPage() {
  const { params, setParam, setPage } = useUrlParams();
  const [search, setSearch] = useState(params.search || "");
  const statuses = useWorkflowStatuses();
  const navigate = useNavigate();
  const toast = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const listParams = useMemo<OrderParams>(
    () => ({
      page: Number(params.page || 1),
      page_size: Number(params.page_size || 20),
      search: params.search,
      shop_id: params.shop_id,
      status_id: params.status_id,
      created_by: params.created_by,
      supplier_status: params.supplier_status,
      readiness: params.readiness,
      sort: params.sort || "updated_at",
    }),
    [params],
  );
  const orders = useOrders(listParams);
  const reset = () => {
    ["search", "shop_id", "status_id", "created_by", "supplier_status", "readiness", "page"].forEach((key) => setParam(key, ""));
    setSearch("");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm text-muted">
            {orders.data?.pagination.total_items ? `${orders.data.pagination.total_items} total orders` : "Operational order intake"}
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setCreateOpen(true)}>
            <HiOutlinePlus />
            Create Order
          </Button>
      </div>
      <OrdersQuickViews params={params} statuses={statuses.data?.data || []} setParam={setParam} />
      <OrderFilters params={params} search={search} setSearch={setSearch} setParam={setParam} reset={reset} />
      <OrdersTable
        orders={orders.data?.data}
        loading={orders.isLoading}
        error={orders.isError}
        onRetry={() => void orders.refetch()}
        page={orders.data?.pagination.page || 1}
        totalPages={orders.data?.pagination.total_pages || 1}
        totalItems={orders.data?.pagination.total_items || 0}
        onPage={setPage}
      />
      {createOpen ? (
        <CreateOrderForm
          modal
          onCancel={() => setCreateOpen(false)}
          onCreated={(created) => {
            setCreateOpen(false);
            toast.push({ type: "success", title: "Order created" });
            navigate(`/app/orders/${created.id}`);
          }}
        />
      ) : null}
    </div>
  );
}

export function OrderCreatePage() {
  return <CreateOrderForm />;
}

export function OrderDetailPage() {
  const { id = "" } = useParams();
  const { isOwner } = useAuth();
  const toast = useToast();
  const order = useOrder(id);
  const refresh = useRefreshOrder(id);
  const [addListingOpen, setAddListingOpen] = useState(false);
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const [drawer, setDrawer] = useState<"info" | "supplier" | "activity" | null>(null);
  const [itemDrafts, setItemDrafts] = useState<Record<string, OrderItem>>({});

  useEffect(() => {
    if (!order.data?.lines) return;
    setOpenItems((current) => {
      const next = new Set(current);
      for (const line of order.data.lines || []) {
        for (const item of line.items) {
          if (!item.option || !item.color || !item.print_method || !item.main_position) next.add(item.id);
        }
      }
      return next;
    });
  }, [order.data?.lines]);

  const dirtyItems = useMemo(() => {
    if (!order.data?.lines) return [];
    return order.data.lines
      .flatMap((line) => line.items)
      .filter((item) => {
        const draft = itemDrafts[item.id];
        if (!draft) return false;
        return (
          draft.personalization_text !== item.personalization_text ||
          draft.customer_note !== item.customer_note ||
          draft.option !== item.option ||
          draft.color !== item.color ||
          draft.print_method !== item.print_method ||
          draft.main_position !== item.main_position ||
          draft.sub_position !== item.sub_position ||
          draft.production_notice !== item.production_notice
        );
      });
  }, [itemDrafts, order.data?.lines]);
  const hasUnsavedChanges = dirtyItems.length > 0;
  useBeforeUnload(
    useMemo(
      () => (event: BeforeUnloadEvent) => {
        if (!hasUnsavedChanges) return;
        event.preventDefault();
      },
      [hasUnsavedChanges],
    ),
  );

  const saveOrder = useMutation({
    mutationFn: async () => {
      if (!order.data) return;
      const items = order.data.lines?.flatMap((line) => line.items) || [];
      const changed = items
        .map((item) => itemDrafts[item.id])
        .filter((draft): draft is OrderItem => Boolean(draft))
        .filter((draft) => dirtyItems.some((item) => item.id === draft.id));
      await Promise.all(
        changed.map((draft) =>
          orderApi.updateItem(order.data!.id, draft.id, {
            personalization_text: draft.personalization_text,
            customer_note: draft.customer_note,
            option: draft.option,
            color: draft.color,
            print_method: draft.print_method,
            main_position: draft.main_position,
            sub_position: draft.sub_position,
            production_notice: draft.production_notice,
          }),
        ),
      );
    },
    onSuccess: async () => {
      await refresh();
      setItemDrafts({});
      toast.push({ type: "success", title: "Order saved" });
    },
    onError: (error) =>
      toast.push({
        type: "error",
        title: "Save failed",
        message: error instanceof Error ? error.message : "Some changes could not be saved",
      }),
  });

  if (order.isLoading) return <SkeletonRows rows={10} />;
  if (order.isError || !order.data) return <ErrorState title="Order not found" message="The order could not be loaded." />;

  const data = order.data;
  const allItemIds = data.lines?.flatMap((line) => line.items.map((item) => item.id)) || [];

  return (
    <div className="space-y-5">
      <div className="sticky top-16 z-10 -mx-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-7 lg:px-7">
        <OrderHeader order={data} hasUnsavedChanges={hasUnsavedChanges} onOpenDrawer={setDrawer}>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" disabled={!hasUnsavedChanges || saveOrder.isPending} onClick={() => saveOrder.mutate()}>
              {saveOrder.isPending ? <Spinner label="Saving" /> : "Save Order"}
            </Button>
            <WorkflowActionBar
              order={data}
              isOwner={isOwner}
              onChanged={() => void refresh()}
              onBeforeAction={async () => {
                if (hasUnsavedChanges) await saveOrder.mutateAsync();
              }}
            />
          </div>
        </OrderHeader>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,8fr)_minmax(240px,2fr)] xl:items-start">
        <main className="space-y-4">
          <section className="rounded-xl border border-border bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-bold">Products</h2>
                <p className="text-sm text-muted">{data.products_count} products / {data.items_count} items</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="secondary" onClick={() => setOpenItems(new Set(allItemIds))}>Expand All</Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => setOpenItems(new Set())}>Collapse All</Button>
                <Button type="button" size="sm" onClick={() => setAddListingOpen(true)}>
                  <HiOutlinePlus />
                  Add Listing
                </Button>
              </div>
            </div>
          </section>

          {data.lines?.map((line) => (
            <OrderLineCard
              key={line.id}
              order={data}
              line={line}
              openItems={openItems}
              setOpenItems={setOpenItems}
              itemDrafts={itemDrafts}
              onDraftChange={(itemId, draft) => setItemDrafts((current) => ({ ...current, [itemId]: draft }))}
              onChanged={() => void refresh()}
            />
          ))}
          {!data.lines?.length ? (
            <div className="rounded-xl border border-border bg-white p-6">
              <p className="text-sm text-muted">Add a Listing to generate production items.</p>
            </div>
          ) : null}
        </main>

        <aside className="space-y-4 xl:sticky xl:top-32">
          <section className="rounded-xl border border-border bg-white p-4 shadow-sm">
            <CompactReadinessBar order={data} className="stacked" />
          </section>
          <section className="rounded-xl border border-border bg-white p-4 shadow-sm">
            <ShippingLabelPanel order={data} onChanged={() => void refresh()} compact />
          </section>
        </aside>
      </div>

      <OrderDetailsDrawer order={data} activeTab={drawer} onClose={() => setDrawer(null)} />

      {addListingOpen ? (
        <AddListingDialog
          orderId={data.id}
          onClose={() => setAddListingOpen(false)}
          onAdded={() => void refresh()}
        />
      ) : null}
    </div>
  );
}
