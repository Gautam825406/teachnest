"use client";
import React, { useEffect, useState } from "react";
import { Inbox, Moon, Sun, X } from "lucide-react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("cw_theme");
    setDark(saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("cw_theme", next ? "dark" : "light");
  };
  return (
    <button
      onClick={toggle}
      className={`flex h-9 w-9 items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-600 transition-colors duration-200 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800 ${className}`}
      title="Toggle theme"
      aria-label="Toggle theme"
    >
      <span key={dark ? "sun" : "moon"} className="motion-icon-spin flex items-center justify-center">
        {dark ? <Sun size={16} /> : <Moon size={16} />}
      </span>
    </button>
  );
}

export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" | "inverse" | "outlineLight" }) {
  const { variant = "primary", className = "", ...rest } = props;
  const styles =
    variant === "primary"
      ? "bg-brand-700 text-white hover:bg-brand-800"
      : variant === "inverse"
        ? "bg-white text-brand-800 hover:bg-brand-50"
        : variant === "outlineLight"
          ? "border border-white/50 bg-transparent text-white hover:bg-white/10"
          : variant === "danger"
        ? "bg-red-700 text-white hover:bg-red-800"
        : variant === "ghost"
          ? "bg-transparent text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800"
          : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800";
  return (
    <button
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
      {...rest}
    />
  );
}

const fieldBase =
  "h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-900 outline-none transition duration-200 placeholder:text-stone-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldBase} ${props.className || ""}`} />;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(props, ref) {
  return (
    <textarea
      ref={ref}
      {...props}
      className={`h-10 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none transition duration-200 placeholder:text-stone-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 ${props.className || ""}`}
    />
  );
});

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${fieldBase} ${props.className || ""}`} />;
}

export function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1 block text-[13px] font-medium text-stone-700 dark:text-stone-300">
      {children} {required && <span className="text-red-600 dark:text-red-400">*</span>}
    </label>
  );
}

export function Field({ label, required, children, hint }: { label: string; required?: boolean; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <Label required={required}>{label}</Label>
      {children}
      {hint && <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{hint}</p>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[10px] border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900 ${className}`}>
      {children}
    </div>
  );
}

export function Badge({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "green" | "indigo" | "red" | "amber" }) {
  const tones: Record<string, string> = {
    slate: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
    green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    indigo: "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300",
    red: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  };
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}>{children}</span>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">{title}</h1>
        {subtitle && <p className="mt-1 text-[13px] text-stone-500 dark:text-stone-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function BannerHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="relative mb-6 overflow-hidden rounded-[10px] border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-brand-700" />
      <div className="flex flex-wrap items-start justify-between gap-3 p-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">{title}</h1>
          {subtitle && <p className="mt-1 text-[13px] text-stone-500 dark:text-stone-400">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function ErrorBox({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
      {message}
    </div>
  );
}

export function EmptyState({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <Card className="p-10 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400">
        <Inbox className="h-5 w-5" aria-hidden />
      </div>
      <p className="text-base font-semibold tracking-tight text-stone-900 dark:text-stone-100">{title}</p>
      {subtitle && <p className="mt-1 text-[13px] text-stone-500 dark:text-stone-400">{subtitle}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </Card>
  );
}

export function Loading({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="py-6" role="status" aria-label={label}>
      <div className="space-y-3" aria-hidden>
        <div className="motion-skeleton h-4 w-1/3 rounded" />
        <div className="motion-skeleton h-24 w-full rounded-[10px]" />
        <div className="motion-skeleton h-4 w-1/2 rounded" />
      </div>
      <p className="mt-4 text-center text-sm text-stone-500 dark:text-stone-400">{label}</p>
    </div>
  );
}

export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="motion-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="motion-pop-in max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-stone-200 bg-white shadow-lg dark:border-stone-800 dark:bg-stone-900"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4 dark:border-stone-800">
          <h2 className="text-base font-semibold tracking-tight text-stone-900 dark:text-stone-100">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-500 transition-colors duration-200 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 dark:text-stone-400 dark:hover:bg-stone-800"
            aria-label="Close"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}
