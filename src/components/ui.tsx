import {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  forwardRef,
} from "react";
import {
  HiOutlineChevronDown,
  HiOutlineMagnifyingGlass,
} from "react-icons/hi2";
import clsx from "clsx";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "soft"
  | "ghost"
  | "danger"
  | "link"
  | "icon"
  | "toolbar";
type ButtonSize = "sm" | "md" | "lg";

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60",
        size === "sm" && "h-8 rounded-lg px-3 text-xs",
        size === "md" && "h-9 rounded-[10px] px-3.5 text-sm",
        size === "lg" && "h-11 rounded-xl px-5 text-sm",
        variant === "primary" &&
          "bg-blue-700 text-white shadow-sm hover:bg-blue-800",
        variant === "secondary" &&
          "border border-border bg-surface text-foreground hover:bg-slate-50",
        variant === "soft" && "bg-blue-50 text-blue-700 hover:bg-blue-100",
        variant === "ghost" && "text-slate-700 hover:bg-slate-100",
        variant === "danger" && "bg-danger text-white hover:bg-red-600",
        variant === "link" &&
          "h-auto rounded-md px-1 py-0 text-primary hover:underline",
        variant === "icon" &&
          "h-9 w-9 rounded-full border border-border bg-surface p-0 text-slate-600 hover:bg-slate-50",
        variant === "toolbar" &&
          "border border-border bg-surface px-3 text-slate-700 hover:border-slate-300 hover:bg-slate-50",
        className,
      )}
      {...props}
    />
  );
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-border bg-surface shadow-sm transition duration-200",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SoftPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("rounded-xl bg-slate-50/80 p-4", className)}>
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "danger" | "warning" | "primary" | "info";
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-5",
        tone === "neutral" && "border-slate-200 bg-slate-50 text-slate-700",
        tone === "success" && "border-green-200 bg-green-50 text-green-700",
        tone === "danger" && "border-red-200 bg-red-50 text-red-700",
        tone === "warning" && "border-amber-200 bg-amber-50 text-amber-800",
        tone === "primary" && "border-blue-200 bg-blue-50 text-blue-700",
        tone === "info" && "border-blue-200 bg-blue-50 text-blue-700",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Field({
  label,
  error,
  children,
  hint,
  className,
}: {
  label: string;
  error?: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={clsx("block", className)}>
      <span className="text-[12px] font-semibold text-slate-700">{label}</span>
      <span className="mt-1.5 block">{children}</span>
      {hint ? (
        <span className="mt-1 block text-xs text-muted">{hint}</span>
      ) : null}
      {error ? (
        <span className="mt-1 block text-xs font-semibold text-danger">
          {error}
        </span>
      ) : null}
    </label>
  );
}

const inputClass =
  "h-10 w-full rounded-[10px] border border-border bg-white px-3 text-sm text-foreground shadow-sm transition placeholder:text-slate-400 hover:border-slate-300 focus:border-primary disabled:bg-slate-100 read-only:bg-slate-50";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={clsx(inputClass, className)} {...props} />;
});

export const SearchInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function SearchInput({ className, ...props }, ref) {
  return (
    <div className={clsx("relative", className)}>
      <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        ref={ref}
        className="h-10 w-full rounded-xl border border-transparent bg-slate-100 pl-9 pr-3 text-sm text-foreground transition placeholder:text-slate-500 hover:bg-slate-50 focus:border-primary focus:bg-white"
        {...props}
      />
    </div>
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={clsx(inputClass, "min-h-24 resize-y py-2", className)}
      {...props}
    />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={clsx(inputClass, "appearance-auto", className)}
      {...props}
    />
  );
});

export const FilterSelect = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function FilterSelect({ className, children, ...props }, ref) {
  return (
    <div className={clsx("relative", className)}>
      <select
        ref={ref}
        className="h-10 min-w-[132px] appearance-none rounded-full border border-border bg-white py-0 pl-3 pr-8 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:border-primary"
        {...props}
      >
        {children}
      </select>
      <HiOutlineChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
    </div>
  );
});

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
    >
      <span
        className={clsx(
          "relative h-5 w-9 rounded-full transition",
          checked ? "bg-success" : "bg-slate-300",
        )}
      >
        <span
          className={clsx(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition",
            checked ? "left-[18px]" : "left-0.5",
          )}
        />
      </span>
      {label}
    </button>
  );
}

export function PageHeader({
  title,
  description,
  action,
  eyebrow,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  eyebrow?: string;
}) {
  void title;
  void description;
  if (!eyebrow && !action) return null;

  return (
    <div
      className={clsx(
        (eyebrow || action) &&
          "flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between",
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 text-xs font-semibold text-muted">{eyebrow}</p>
        ) : null}
      </div>
      {action ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {action}
        </div>
      ) : null}
    </div>
  );
}

export function Table({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "overflow-x-auto rounded-xl border border-border bg-surface shadow-sm",
        className,
      )}
    >
      <table className="min-w-full divide-y divide-border text-left text-sm">
        {children}
      </table>
    </div>
  );
}

export function PaginationControls({
  page,
  totalPages,
  totalItems,
  onPage,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  onPage: (page: number) => void;
}) {
  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-border pt-3 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
      <span>
        Page {page} of {Math.max(totalPages, 1)} · {totalItems} total
      </span>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export function IconBadge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex h-9 w-9 items-center justify-center rounded-xl",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ResourceToolbar({
  search,
  filters,
  actions,
}: {
  search: ReactNode;
  filters?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="min-w-0 flex-1">{search}</div>
      <div className="flex flex-wrap items-center gap-2">
        {filters}
        {actions}
      </div>
    </div>
  );
}

export function ActionIconButton({
  tone,
  label,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone: "edit" | "delete" | "preview" | "primary";
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={clsx(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-40",
        tone === "edit" &&
          "bg-blue-50 text-blue-700 hover:bg-blue-100 focus-visible:ring-blue-500",
        tone === "delete" &&
          "bg-red-50 text-red-600 hover:bg-red-100 focus-visible:ring-red-500",
        tone === "preview" && "bg-slate-50 text-slate-700 hover:bg-slate-100",
        tone === "primary" && "bg-blue-50 text-blue-700 hover:bg-blue-100",
        className,
      )}
      {...props}
    />
  );
}
