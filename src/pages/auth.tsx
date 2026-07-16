import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { HiOutlineEye, HiOutlineEyeSlash } from 'react-icons/hi2';
import { useAuth } from '@/features/auth/AuthProvider';
import { loginSchema, LoginFormValues } from '@/schemas/forms';
import { ApiError } from '@/types/api';
import { Button, Card, Field, Input } from '@/components/ui';
import { Spinner, useToast } from '@/components/feedback';

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
      setApiError(error instanceof ApiError ? error.message : 'Unable to sign in');
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <Card className="w-full max-w-md rounded-2xl border-slate-200 p-7 shadow-sm sm:p-8">
        <div className="text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-blue-900 text-lg font-bold text-white">L</div>
          <div className="mt-3 text-[21px] font-bold text-foreground">Lurevo</div>
          <h1 className="mt-6 text-2xl font-bold text-foreground">Sign in</h1>
          <p className="mt-2 text-sm text-muted">Access your listing management workspace.</p>
        </div>
        <form className="mt-7 space-y-4" onSubmit={onSubmit}>
          <Field label="Email" error={form.formState.errors.email?.message}>
            <Input autoComplete="email" type="email" className="h-11 bg-slate-50 focus:border-blue-500" {...form.register('email')} />
          </Field>
          <Field label="Password" error={form.formState.errors.password?.message}>
            <div className="relative">
              <Input autoComplete="current-password" type={showPassword ? 'text' : 'password'} className="h-11 bg-slate-50 pr-11 focus:border-blue-500" {...form.register('password')} />
              <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted hover:bg-slate-100" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)}>
                {showPassword ? <HiOutlineEyeSlash className="h-5 w-5" /> : <HiOutlineEye className="h-5 w-5" />}
              </button>
            </div>
          </Field>
          {apiError ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{apiError}</div> : null}
          <Button className="h-11 w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? <Spinner label="Signing in" /> : 'Sign in'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
