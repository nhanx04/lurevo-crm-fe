import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { authApi, userApi } from '@/api/services';
import { authStorage } from '@/api/authStorage';
import { useAuth } from '@/features/auth/AuthProvider';
import { ApiError } from '@/types/api';
import { changePasswordSchema, ChangePasswordFormValues, collaboratorSchema, CollaboratorFormValues } from '@/schemas/forms';
import { Badge, Button, Card, Field, Input, PageHeader } from '@/components/ui';
import { ConfirmDialog, ErrorState, Spinner, useToast } from '@/components/feedback';
import { formatDateTime } from '@/utils/format';

export function CollaboratorsPage() {
  const toast = useToast();
  const [createdEmail, setCreatedEmail] = useState<string | null>(null);
  const form = useForm<CollaboratorFormValues>({ resolver: zodResolver(collaboratorSchema), defaultValues: { email: '', full_name: '', password: '', confirm_password: '' } });
  const create = useMutation({
    mutationFn: (values: CollaboratorFormValues) => userApi.createCollaborator({ email: values.email, full_name: values.full_name, password: values.password }),
    onSuccess: (user) => { setCreatedEmail(user.email); form.reset(); toast.push({ type: 'success', title: 'Collaborator created', message: `${user.full_name} can now sign in.` }); },
    onError: (error) => toast.push({ type: 'error', title: 'Collaborator creation failed', message: error instanceof ApiError ? error.message : 'Unable to create collaborator' }),
  });
  return (
    <div className="space-y-5">
      <PageHeader title="Collaborators" description="Owner-only collaborator creation. The backend currently exposes creation, but not collaborator listing, editing, or deletion." />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card className="p-5">
          <form className="grid gap-4" onSubmit={form.handleSubmit((values) => create.mutate(values))}>
            <Field label="Email" error={form.formState.errors.email?.message}><Input type="email" {...form.register('email')} /></Field>
            <Field label="Full name" error={form.formState.errors.full_name?.message}><Input {...form.register('full_name')} /></Field>
            <Field label="Password" hint="Backend requires 8 to 128 bytes." error={form.formState.errors.password?.message}><Input type="password" {...form.register('password')} /></Field>
            <Field label="Confirm password" error={form.formState.errors.confirm_password?.message}><Input type="password" {...form.register('confirm_password')} /></Field>
            <Button disabled={create.isPending}>{create.isPending ? <Spinner label="Creating" /> : 'Create collaborator'}</Button>
          </form>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold">Current capability</h2>
          <p className="mt-3 text-sm text-muted">Collaborators can sign in, view their account, change their password, and manage authenticated internal resources allowed by backend middleware. Owner-only collaborator creation remains restricted.</p>
          {createdEmail ? <div className="mt-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">Created this session: {createdEmail}</div> : null}
        </Card>
      </div>
    </div>
  );
}

export function AccountPage() {
  const { user, logoutAll } = useAuth();
  const [confirm, setConfirm] = useState(false);
  if (!user) return null;
  return (
    <div className="space-y-5">
      <PageHeader title="Account Settings" description="Review your profile and session controls." action={<Link to="/app/account/change-password"><Button>Change password</Button></Link>} />
      <Card className="p-5">
        <dl className="grid gap-4 sm:grid-cols-2">
          <Info label="Full name" value={user.full_name} />
          <Info label="Email" value={user.email} />
          <div><dt className="text-xs font-semibold uppercase text-muted">Role</dt><dd className="mt-1"><Badge tone={user.role === 'owner' ? 'primary' : 'neutral'}>{user.role}</Badge></dd></div>
          {'is_active' in user ? <Info label="Account state" value={user.is_active ? 'Active' : 'Inactive'} /> : null}
          {'last_login_at' in user ? <Info label="Last login" value={formatDateTime(user.last_login_at)} /> : null}
          {'created_at' in user ? <Info label="Created" value={formatDateTime(user.created_at)} /> : null}
        </dl>
      </Card>
      <Card className="border-red-200 p-5">
        <h2 className="font-semibold text-danger">Danger zone</h2>
        <p className="mt-2 text-sm text-muted">Log out from all devices. Your current browser session will also end.</p>
        <Button variant="danger" className="mt-4" onClick={() => setConfirm(true)}>Log out from all devices</Button>
      </Card>
      <ConfirmDialog open={confirm} title="Log out from all devices?" message="All active refresh tokens for this account will be revoked." danger confirmLabel="Log out all" onClose={() => setConfirm(false)} onConfirm={() => void logoutAll()} />
    </div>
  );
}

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { logout } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<ChangePasswordFormValues>({ resolver: zodResolver(changePasswordSchema), defaultValues: { current_password: '', new_password: '', new_password_confirmation: '' } });
  const change = useMutation({
    mutationFn: (values: ChangePasswordFormValues) => authApi.changePassword(values),
    onSuccess: async () => {
      authStorage.clear();
      toast.push({ type: 'success', title: 'Password changed', message: 'Please sign in again.' });
      await logout();
      navigate('/login', { replace: true });
    },
    onError: (error) => setServerError(error instanceof ApiError ? error.message : 'Unable to change password'),
  });
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="Change Password" description="Changing your password revokes active refresh tokens. You will need to sign in again." />
      <Card className="p-5">
        <form className="grid gap-4" onSubmit={form.handleSubmit((values) => change.mutate(values))}>
          <Field label="Current password" error={form.formState.errors.current_password?.message}><Input type="password" {...form.register('current_password')} /></Field>
          <Field label="New password" error={form.formState.errors.new_password?.message}><Input type="password" {...form.register('new_password')} /></Field>
          <Field label="Confirm new password" error={form.formState.errors.new_password_confirmation?.message}><Input type="password" {...form.register('new_password_confirmation')} /></Field>
          {serverError ? <ErrorState title="Password change failed" message={serverError} /> : null}
          <div className="flex justify-end gap-3"><Link to="/app/account"><Button type="button" variant="secondary">Cancel</Button></Link><Button disabled={change.isPending}>{change.isPending ? <Spinner label="Saving" /> : 'Change password'}</Button></div>
        </form>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return <div><dt className="text-xs font-semibold uppercase text-muted">{label}</dt><dd className="mt-1 font-medium">{value || 'Not set'}</dd></div>;
}
