import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { HiOutlineEye, HiOutlineEyeSlash } from 'react-icons/hi2';
import { useAuth } from '@/features/auth/AuthProvider';
import { loginSchema, LoginFormValues } from '@/schemas/forms';
import { ApiError } from '@/types/api';
import { Button, Card, Field, Input } from '@/components/ui';
import { Spinner } from '@/components/feedback';
import { useToast } from '@/components/feedback';

export function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const form = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  if (isAuthenticated) return <Navigate to="/app/dashboard" replace />;

  const onSubmit = form.handleSubmit(async (values) => {
    setApiError(null);
    try {
      await login(values);
      toast.push({ type: 'success', title: 'Signed in' });
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/app/dashboard';
      navigate(from.startsWith('/app') ? from : '/app/dashboard', { replace: true });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Unable to sign in';
      setApiError(message);
    }
  });

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1fr_520px]">
      <section className="hidden place-items-center bg-slate-950 p-10 text-white lg:grid">
        <div className="max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-200">Internal workspace</p>
          <h1 className="mt-5 text-5xl font-bold tracking-normal">Lurevo listing operations</h1>
          <p className="mt-5 text-lg leading-8 text-slate-300">
            Manage product listings, statuses, images, categories, collaborators, and account security from one calm production dashboard.
          </p>
        </div>
      </section>
      <section className="flex items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md p-6">
          <div>
            <div className="text-2xl font-bold text-foreground">Lurevo</div>
            <p className="mt-2 text-sm text-muted">Sign in to the listing management dashboard.</p>
          </div>
          <form className="mt-8 space-y-5" onSubmit={onSubmit}>
            <Field label="Email" error={form.formState.errors.email?.message}>
              <Input autoComplete="email" type="email" {...form.register('email')} />
            </Field>
            <Field label="Password" error={form.formState.errors.password?.message}>
              <div className="relative">
                <Input autoComplete="current-password" type={showPassword ? 'text' : 'password'} className="pr-11" {...form.register('password')} />
                <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted hover:bg-slate-100" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)}>
                  {showPassword ? <HiOutlineEyeSlash className="h-5 w-5" /> : <HiOutlineEye className="h-5 w-5" />}
                </button>
              </div>
            </Field>
            {apiError ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{apiError}</div> : null}
            <Button className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <Spinner label="Signing in" /> : 'Sign in'}
            </Button>
          </form>
        </Card>
      </section>
    </div>
  );
}
