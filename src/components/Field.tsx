import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

type FieldProps = {
  label: string;
  children: ReactNode;
};

export function Field({ label, children }: FieldProps) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-barkSoft">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="h-12 rounded-md border border-shop bg-linen px-3 text-lg text-bark outline-none ring-redwood/20 focus:border-redwood focus:ring-4"
    />
  );
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="h-12 rounded-md border border-shop bg-linen px-3 text-lg text-bark outline-none ring-redwood/20 focus:border-redwood focus:ring-4"
    />
  );
}
