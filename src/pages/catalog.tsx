import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  HiOutlineFolder,
  HiOutlinePencilSquare,
  HiOutlinePlus,
  HiOutlineTag,
  HiOutlineTrash,
} from "react-icons/hi2";
import { categoryApi, statusApi } from "@/api/services";
import { queryKeys } from "@/api/queryKeys";
import { ApiError, Category, ListingStatus } from "@/types/api";
import {
  CategoryFormValues,
  categorySchema,
  StatusFormValues,
  statusSchema,
} from "@/schemas/forms";
import { Modal } from "@/components/layout";
import {
  Badge,
  Button,
  ActionIconButton,
  Field,
  FilterSelect,
  IconBadge,
  Input,
  PageHeader,
  PaginationControls,
  ResourceToolbar,
  SearchInput,
  Select,
  Table,
  Textarea,
} from "@/components/ui";
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  SkeletonRows,
  Spinner,
  useToast,
} from "@/components/feedback";
import { formatDate, sanitizeColor } from "@/utils/format";
import { firstFieldError, jsonObjectFromText } from "@/utils/forms";
import { useUrlParams } from "@/hooks/useUrlParams";

function activeParam(value?: string): boolean | "" {
  if (value === "true") return true;
  if (value === "false") return false;
  return "";
}

export function CategoriesPage() {
  const { params, setParam, setPage } = useUrlParams();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState<Category | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const listParams = useMemo(
    () => ({
      page: Number(params.page || 1),
      page_size: Number(params.page_size || 20),
      search: params.search,
      is_active: activeParam(params.is_active),
      sort_by: params.sort_by || "sort_order",
      sort_order: (params.sort_order || "asc") as "asc" | "desc",
    }),
    [params],
  );
  const categories = useQuery({
    queryKey: queryKeys.categories.list(listParams),
    queryFn: () => categoryApi.list(listParams),
  });
  const allCategories = useQuery({
    queryKey: queryKeys.categories.list({ page_size: 200 }),
    queryFn: () => categoryApi.list({ page: 1, page_size: 200 }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => categoryApi.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.push({ type: "success", title: "Category deleted" });
      setDeleteTarget(null);
    },
    onError: (error) =>
      toast.push({
        type: "error",
        title: "Delete failed",
        message:
          error instanceof ApiError
            ? error.message
            : "Unable to delete category",
      }),
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Categories" />
      <ResourceToolbar
        search={
          <SearchInput
            placeholder="Search name or slug"
            value={params.search || ""}
            onChange={(event) => setParam("search", event.target.value)}
          />
        }
        filters={
          <>
            <FilterSelect
              value={params.is_active || ""}
              onChange={(event) => setParam("is_active", event.target.value)}
            >
              <option value="">All states</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </FilterSelect>
            <FilterSelect
              value={params.sort_by || "sort_order"}
              onChange={(event) => setParam("sort_by", event.target.value)}
            >
              <option value="sort_order">Sort order</option>
              <option value="name">Name</option>
              <option value="created_at">Created</option>
            </FilterSelect>
          </>
        }
        actions={
          <Button className="shrink-0" onClick={() => setCreateOpen(true)}>
            <HiOutlinePlus />
            Create category
          </Button>
        }
      />
      {categories.isLoading ? (
        <SkeletonRows />
      ) : categories.isError ? (
        <ErrorState
          message="Could not load categories."
          onRetry={() => void categories.refetch()}
        />
      ) : categories.data?.data.length ? (
        <div>
          <Table>
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Parent</th>
                <th className="px-4 py-3">Sort order</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {categories.data.data.map((category) => (
                <tr key={category.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <IconBadge className="h-9 w-9 bg-violet-50 text-violet-600">
                        <HiOutlineFolder className="h-5 w-5" />
                      </IconBadge>
                      <div>
                        <p className="font-semibold">{category.name}</p>
                        <p className="max-w-md truncate text-xs text-muted">
                          {category.description || "No description"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted">{category.slug}</td>
                  <td className="px-4 py-3 text-muted">
                    {allCategories.data?.data.find(
                      (item) => item.id === category.parent_id,
                    )?.name || "None"}
                  </td>
                  <td className="px-4 py-3">{category.sort_order}</td>
                  <td className="px-4 py-3">
                    <Badge tone={category.is_active ? "success" : "neutral"}>
                      {category.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {formatDate(category.updated_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <ActionIconButton
                        tone="edit"
                        aria-label={`Edit ${category.name}`}
                        label={`Edit ${category.name}`}
                        onClick={() => setEditing(category)}
                      >
                        <HiOutlinePencilSquare className="h-4 w-4" />
                      </ActionIconButton>
                      <ActionIconButton
                        tone="delete"
                        aria-label={`Delete ${category.name}`}
                        label={`Delete ${category.name}`}
                        onClick={() => setDeleteTarget(category)}
                      >
                        <HiOutlineTrash className="h-4 w-4" />
                      </ActionIconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <PaginationControls
            page={categories.data.pagination.page}
            totalPages={categories.data.pagination.total_pages}
            totalItems={categories.data.pagination.total_items}
            onPage={setPage}
          />
        </div>
      ) : (
        <EmptyState
          title="No categories found"
          message="Create a category or adjust the filters."
          action={
            <Button onClick={() => setCreateOpen(true)}>Create category</Button>
          }
        />
      )}
      {createOpen || editing ? (
        <CategoryModal
          category={editing}
          categories={allCategories.data?.data || []}
          onClose={() => {
            setCreateOpen(false);
            setEditing(null);
          }}
        />
      ) : null}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.name}?`}
        message="This action cannot be undone. The backend may reject deletion if the category has child categories or listings."
        danger
        confirmLabel="Delete"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget.id)}
      />
    </div>
  );
}

function CategoryModal({
  category,
  categories,
  onClose,
}: {
  category: Category | null;
  categories: Category[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [serverErrors, setServerErrors] = useState<ApiError | null>(null);
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name || "",
      slug: category?.slug || "",
      description: category?.description || "",
      parent_id: category?.parent_id || "",
      sort_order: category?.sort_order ?? 0,
      is_active: category?.is_active ?? true,
      metadataText: JSON.stringify(category?.metadata || {}, null, 2),
    },
  });
  const save = useMutation({
    mutationFn: (values: CategoryFormValues) => {
      const body = {
        name: values.name,
        slug: values.slug || undefined,
        description: values.description || undefined,
        parent_id: values.parent_id || undefined,
        sort_order: values.sort_order,
        is_active: values.is_active,
        metadata: jsonObjectFromText(values.metadataText),
      };
      return category
        ? categoryApi.update(category.id, body)
        : categoryApi.create(body);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.push({
        type: "success",
        title: category ? "Category updated" : "Category created",
      });
      onClose();
    },
    onError: (error) =>
      setServerErrors(error instanceof ApiError ? error : new ApiError(0)),
  });
  return (
    <Modal
      title={category ? "Edit category" : "Create category"}
      onClose={onClose}
    >
      <form
        className="grid gap-4"
        onSubmit={form.handleSubmit((values) => save.mutate(values))}
      >
        <Field
          label="Name"
          error={
            form.formState.errors.name?.message ||
            firstFieldError(serverErrors?.details, "name")
          }
        >
          <Input {...form.register("name")} />
        </Field>
        <Field
          label="Slug"
          hint="Leave blank to let the backend generate one."
          error={firstFieldError(serverErrors?.details, "slug")}
        >
          <Input {...form.register("slug")} />
        </Field>
        <Field label="Parent category">
          <Select {...form.register("parent_id")}>
            <option value="">No parent</option>
            {categories
              .filter((item) => item.id !== category?.id)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
          </Select>
        </Field>
        <Field label="Description">
          <Textarea {...form.register("description")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Sort order"
            error={form.formState.errors.sort_order?.message}
          >
            <Input type="number" min={0} {...form.register("sort_order")} />
          </Field>
          <label className="mt-8 flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" {...form.register("is_active")} /> Active
          </label>
        </div>
        <Field
          label="Metadata JSON"
          error={firstFieldError(serverErrors?.details, "metadata")}
        >
          <Textarea className="font-mono" {...form.register("metadataText")} />
        </Field>
        {serverErrors ? (
          <p className="text-sm text-danger">{serverErrors.message}</p>
        ) : null}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={save.isPending}>
            {save.isPending ? <Spinner label="Saving" /> : "Save category"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function StatusesPage() {
  const { params, setParam, setPage } = useUrlParams();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState<ListingStatus | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ListingStatus | null>(null);
  const listParams = useMemo(
    () => ({
      page: Number(params.page || 1),
      page_size: Number(params.page_size || 20),
      search: params.search,
      is_active: activeParam(params.is_active),
      sort_by: params.sort_by || "sort_order",
      sort_order: (params.sort_order || "asc") as "asc" | "desc",
    }),
    [params],
  );
  const statuses = useQuery({
    queryKey: queryKeys.statuses.list(listParams),
    queryFn: () => statusApi.list(listParams),
  });
  const remove = useMutation({
    mutationFn: (id: string) => statusApi.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["listing-statuses"] });
      toast.push({ type: "success", title: "Status deleted" });
      setDeleteTarget(null);
    },
    onError: (error) =>
      toast.push({
        type: "error",
        title: "Delete failed",
        message:
          error instanceof ApiError ? error.message : "Unable to delete status",
      }),
  });
  return (
    <div className="space-y-5">
      <PageHeader title="Listing Statuses" />
      <ResourceToolbar
        search={
          <SearchInput
            placeholder="Search name or code"
            value={params.search || ""}
            onChange={(event) => setParam("search", event.target.value)}
          />
        }
        filters={
          <>
            <FilterSelect
              value={params.is_active || ""}
              onChange={(event) => setParam("is_active", event.target.value)}
            >
              <option value="">All states</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </FilterSelect>
            <FilterSelect
              value={params.sort_by || "sort_order"}
              onChange={(event) => setParam("sort_by", event.target.value)}
            >
              <option value="sort_order">Sort order</option>
              <option value="name">Name</option>
              <option value="created_at">Created</option>
            </FilterSelect>
          </>
        }
        actions={
          <Button className="shrink-0" onClick={() => setCreateOpen(true)}>
            <HiOutlinePlus />
            Create status
          </Button>
        }
      />
      {statuses.isLoading ? (
        <SkeletonRows />
      ) : statuses.isError ? (
        <ErrorState
          message="Could not load statuses."
          onRetry={() => void statuses.refetch()}
        />
      ) : statuses.data?.data.length ? (
        <div>
          <Table>
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Default</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Sort order</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {statuses.data.data.map((status) => (
                <tr key={status.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <IconBadge className="h-9 w-9 bg-amber-50 text-amber-600">
                        <HiOutlineTag className="h-5 w-5" />
                      </IconBadge>
                      <div>
                        <p className="inline-flex items-center gap-2 font-semibold">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{
                              backgroundColor:
                                sanitizeColor(status.color) || "#98a2b3",
                            }}
                          />
                          {status.name}
                        </p>
                        <p className="max-w-md truncate text-xs text-muted">
                          {status.description ||
                            status.color ||
                            "No description"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted">{status.code}</td>
                  <td className="px-4 py-3">
                    {status.is_default ? (
                      <Badge tone="primary">Default</Badge>
                    ) : (
                      "No"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={status.is_active ? "success" : "neutral"}>
                      {status.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{status.sort_order}</td>
                  <td className="px-4 py-3 text-muted">
                    {formatDate(status.updated_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <ActionIconButton
                        tone="edit"
                        aria-label={`Edit ${status.name}`}
                        label={`Edit ${status.name}`}
                        onClick={() => setEditing(status)}
                      >
                        <HiOutlinePencilSquare className="h-4 w-4" />
                      </ActionIconButton>
                      <ActionIconButton
                        tone="delete"
                        aria-label={`Delete ${status.name}`}
                        label={`Delete ${status.name}`}
                        disabled={status.is_default}
                        onClick={() => setDeleteTarget(status)}
                      >
                        <HiOutlineTrash className="h-4 w-4" />
                      </ActionIconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <PaginationControls
            page={statuses.data.pagination.page}
            totalPages={statuses.data.pagination.total_pages}
            totalItems={statuses.data.pagination.total_items}
            onPage={setPage}
          />
        </div>
      ) : (
        <EmptyState
          title="No listing statuses found"
          message="Create a status such as Draft, Active, or Archived."
          action={
            <Button onClick={() => setCreateOpen(true)}>Create status</Button>
          }
        />
      )}
      {createOpen || editing ? (
        <StatusModal
          status={editing}
          onClose={() => {
            setCreateOpen(false);
            setEditing(null);
          }}
        />
      ) : null}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.name}?`}
        message="This action cannot be undone. Deletion may fail if listings use this status."
        danger
        confirmLabel="Delete"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget.id)}
      />
    </div>
  );
}

function StatusModal({
  status,
  onClose,
}: {
  status: ListingStatus | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [serverErrors, setServerErrors] = useState<ApiError | null>(null);
  const form = useForm<StatusFormValues>({
    resolver: zodResolver(statusSchema),
    defaultValues: {
      name: status?.name || "",
      code: status?.code || "",
      description: status?.description || "",
      color: status?.color || "#3b82f6",
      sort_order: status?.sort_order ?? 0,
      is_default: status?.is_default ?? false,
      is_active: status?.is_active ?? true,
      metadataText: JSON.stringify(status?.metadata || {}, null, 2),
    },
  });
  const save = useMutation({
    mutationFn: (values: StatusFormValues) => {
      const body = {
        name: values.name,
        code: values.code || undefined,
        description: values.description || undefined,
        color: values.color || undefined,
        sort_order: values.sort_order,
        is_default: values.is_default,
        is_active: values.is_active,
        metadata: jsonObjectFromText(values.metadataText),
      };
      return status
        ? statusApi.update(status.id, body)
        : statusApi.create(body);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["listing-statuses"] });
      await queryClient.invalidateQueries({ queryKey: ["listings"] });
      toast.push({
        type: "success",
        title: status ? "Status updated" : "Status created",
      });
      onClose();
    },
    onError: (error) =>
      setServerErrors(error instanceof ApiError ? error : new ApiError(0)),
  });
  return (
    <Modal
      title={status ? "Edit listing status" : "Create listing status"}
      onClose={onClose}
    >
      <form
        className="grid gap-4"
        onSubmit={form.handleSubmit((values) => save.mutate(values))}
      >
        <Field
          label="Name"
          error={
            form.formState.errors.name?.message ||
            firstFieldError(serverErrors?.details, "name")
          }
        >
          <Input {...form.register("name")} />
        </Field>
        <Field label="Code" hint="Leave blank to let the backend generate one.">
          <Input {...form.register("code")} />
        </Field>
        <Field label="Description">
          <Textarea {...form.register("description")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Color" error={form.formState.errors.color?.message}>
            <Input
              type="color"
              className="h-11 p-1"
              {...form.register("color")}
            />
          </Field>
          <Field
            label="Sort order"
            error={form.formState.errors.sort_order?.message}
          >
            <Input type="number" min={0} {...form.register("sort_order")} />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" {...form.register("is_default")} /> Default
            status
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" {...form.register("is_active")} /> Active
          </label>
        </div>
        <p className="text-xs text-muted">
          Only one status can be default. Saving this as default clears the
          previous default.
        </p>
        <Field label="Metadata JSON">
          <Textarea className="font-mono" {...form.register("metadataText")} />
        </Field>
        {serverErrors ? (
          <p className="text-sm text-danger">{serverErrors.message}</p>
        ) : null}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={save.isPending}>
            {save.isPending ? <Spinner label="Saving" /> : "Save status"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
