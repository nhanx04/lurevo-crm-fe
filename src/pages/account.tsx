import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import {
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineLockClosed,
  HiOutlinePlus,
  HiOutlineUserCircle,
} from "react-icons/hi2";
import { authApi, userApi } from "@/api/services";
import { authStorage } from "@/api/authStorage";
import { useAuth } from "@/features/auth/AuthProvider";
import { ApiError } from "@/types/api";
import {
  changePasswordSchema,
  ChangePasswordFormValues,
  collaboratorSchema,
  CollaboratorFormValues,
} from "@/schemas/forms";
import {
  Badge,
  Button,
  Card,
  Field,
  FilterSelect,
  IconBadge,
  Input,
  PageHeader,
  ResourceToolbar,
  SearchInput,
  Table,
} from "@/components/ui";
import { Modal } from "@/components/layout";
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Spinner,
  useToast,
} from "@/components/feedback";
import { initials } from "@/utils/format";

export function CollaboratorsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [createdEmail, setCreatedEmail] = useState<string | null>(null);
  return (
    <div className="space-y-5">
      <PageHeader title="Collaborators" />
      <ResourceToolbar
        search={<SearchInput placeholder="Search collaborators..." disabled />}
        filters={
          <>
            <FilterSelect disabled>
              <option>All roles</option>
            </FilterSelect>
            <FilterSelect disabled>
              <option>All states</option>
            </FilterSelect>
          </>
        }
        actions={
          <Button className="shrink-0" onClick={() => setCreateOpen(true)}>
            <HiOutlinePlus />
            Create collaborator
          </Button>
        }
      />
      {/* Backend has no collaborator listing endpoint yet; filters are present but disabled until data exists. */}
      <Table>
        <thead className="bg-slate-50 text-[11px] font-semibold uppercase text-muted">
          <tr>
            <th className="px-4 py-3">User</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={5} className="px-4 py-8">
              <EmptyState
                title="Collaborator list unavailable"
                message="The backend exposes POST /users/collaborators for creation, but no GET endpoint for listing collaborators yet."
              />
            </td>
          </tr>
        </tbody>
      </Table>
      {createdEmail ? (
        <Card className="border-green-200 bg-green-50 p-4 text-sm text-green-800">
          Created this session: {createdEmail}
        </Card>
      ) : null}
      {createOpen ? (
        <CreateCollaboratorModal
          onClose={() => setCreateOpen(false)}
          onCreated={(email) => setCreatedEmail(email)}
        />
      ) : null}
    </div>
  );
}

function CreateCollaboratorModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (email: string) => void;
}) {
  const toast = useToast();
  const form = useForm<CollaboratorFormValues>({
    resolver: zodResolver(collaboratorSchema),
    defaultValues: {
      email: "",
      full_name: "",
      password: "",
      confirm_password: "",
    },
  });
  const [showPassword, setShowPassword] = useState(false);
  const create = useMutation({
    mutationFn: (values: CollaboratorFormValues) =>
      userApi.createCollaborator({
        email: values.email,
        full_name: values.full_name,
        password: values.password,
      }),
    onSuccess: (user) => {
      onCreated(user.email);
      form.reset();
      toast.push({
        type: "success",
        title: "Collaborator created",
        message: `${user.full_name} can now sign in.`,
      });
      onClose();
    },
    onError: (error) =>
      toast.push({
        type: "error",
        title: "Collaborator creation failed",
        message:
          error instanceof ApiError
            ? error.message
            : "Unable to create collaborator",
      }),
  });
  return (
    <Modal
      title="Create collaborator"
      description="Add a collaborator with their own sign-in credentials."
      onClose={create.isPending ? () => undefined : onClose}
    >
      <form
        className="grid gap-4"
        onSubmit={form.handleSubmit((values) => create.mutate(values))}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Full name"
            error={form.formState.errors.full_name?.message}
          >
            <Input autoFocus {...form.register("full_name")} />
          </Field>
          <Field label="Email" error={form.formState.errors.email?.message}>
            <Input type="email" {...form.register("email")} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Password"
            hint="Backend requires 8 to 128 bytes."
            error={form.formState.errors.password?.message}
          >
            <PasswordInput
              visible={showPassword}
              onToggle={() => setShowPassword((value) => !value)}
              {...form.register("password")}
            />
          </Field>
          <Field
            label="Confirm password"
            error={form.formState.errors.confirm_password?.message}
          >
            <PasswordInput
              visible={showPassword}
              onToggle={() => setShowPassword((value) => !value)}
              {...form.register("confirm_password")}
            />
          </Field>
        </div>
        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <Button
            type="button"
            variant="secondary"
            disabled={create.isPending}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button disabled={create.isPending}>
            {create.isPending ? (
              <Spinner label="Creating" />
            ) : (
              "Create collaborator"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function AccountPage() {
  const { user, logoutAll } = useAuth();
  const [confirm, setConfirm] = useState(false);
  if (!user) return null;
  return (
    <div className="space-y-5">
      <PageHeader
        title="Account Settings"
        description="Profile, password, and session controls for your current account."
      />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-900 text-base font-bold text-white">
              {initials(user.full_name || user.email)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold">{user.full_name}</h2>
                <Badge tone={user.role === "owner" ? "primary" : "neutral"}>
                  {user.role}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted">{user.email}</p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field
              label="Full name"
              hint="Profile updates need a backend update endpoint before this can be edited."
            >
              <Input readOnly value={user.full_name} />
            </Field>
            <Field label="Email">
              <Input readOnly value={user.email} />
            </Field>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-start gap-3">
            <IconBadge className="bg-blue-50 text-blue-700">
              <HiOutlineUserCircle className="h-5 w-5" />
            </IconBadge>
            <div>
              <h2 className="text-base font-bold">Profile endpoint pending</h2>
              <p className="mt-1 text-sm text-muted">
                No supported update-profile endpoint exists in the backend API
                surface, so this section is intentionally read-only.
              </p>
            </div>
          </div>
        </Card>
      </div>
      <ChangePasswordPanel />
      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <IconBadge className="bg-red-50 text-danger">
            <HiOutlineLockClosed className="h-5 w-5" />
          </IconBadge>
          <div>
            <h2 className="text-base font-bold">Log out from all devices</h2>
            <p className="mt-1 text-sm text-muted">
              End every active session associated with this account.
            </p>
          </div>
        </div>
        <Button variant="danger" onClick={() => setConfirm(true)}>
          Log out all
        </Button>
      </Card>
      <ConfirmDialog
        open={confirm}
        title="Log out from all devices?"
        message="All active refresh tokens for this account will be revoked."
        danger
        confirmLabel="Log out all"
        onClose={() => setConfirm(false)}
        onConfirm={() => void logoutAll()}
      />
    </div>
  );
}

function ChangePasswordPanel() {
  const navigate = useNavigate();
  const toast = useToast();
  const { logout } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      current_password: "",
      new_password: "",
      new_password_confirmation: "",
    },
  });
  const change = useMutation({
    mutationFn: (values: ChangePasswordFormValues) =>
      authApi.changePassword(values),
    onSuccess: async () => {
      authStorage.clear();
      toast.push({
        type: "success",
        title: "Password changed",
        message: "Please sign in again.",
      });
      await logout();
      navigate("/login", { replace: true });
    },
    onError: (error) =>
      setServerError(
        error instanceof ApiError ? error.message : "Unable to change password",
      ),
  });
  return (
    <Card className="p-5">
      <div className="mb-4">
        <h2 className="text-base font-bold">Security</h2>
        <p className="mt-1 text-sm text-muted">
          Changing your password signs you out after the backend revokes active
          refresh tokens.
        </p>
      </div>
      <form
        className="grid gap-4 lg:grid-cols-3"
        onSubmit={form.handleSubmit((values) => change.mutate(values))}
      >
        <Field
          label="Current password"
          error={form.formState.errors.current_password?.message}
        >
          <PasswordInput
            visible={showPassword}
            onToggle={() => setShowPassword((value) => !value)}
            {...form.register("current_password")}
          />
        </Field>
        <Field
          label="New password"
          error={form.formState.errors.new_password?.message}
        >
          <PasswordInput
            visible={showPassword}
            onToggle={() => setShowPassword((value) => !value)}
            {...form.register("new_password")}
          />
        </Field>
        <Field
          label="Confirm new password"
          error={form.formState.errors.new_password_confirmation?.message}
        >
          <PasswordInput
            visible={showPassword}
            onToggle={() => setShowPassword((value) => !value)}
            {...form.register("new_password_confirmation")}
          />
        </Field>
        {serverError ? (
          <div className="lg:col-span-3">
            <ErrorState title="Password change failed" message={serverError} />
          </div>
        ) : null}
        <div className="lg:col-span-3 flex justify-end">
          <Button disabled={change.isPending}>
            {change.isPending ? <Spinner label="Saving" /> : "Change password"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function ChangePasswordPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Change Password"
        description="This standalone route remains available for direct links."
        action={
          <Link to="/app/account">
            <Button variant="secondary">Back to account</Button>
          </Link>
        }
      />
      <ChangePasswordPanel />
    </div>
  );
}

function PasswordInput({
  visible,
  onToggle,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        className="pr-10"
        {...props}
      />
      <button
        type="button"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted hover:bg-slate-100"
        onClick={onToggle}
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? (
          <HiOutlineEyeSlash className="h-4 w-4" />
        ) : (
          <HiOutlineEye className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
