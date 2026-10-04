import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { cx } from "./cx";

interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  children: (id: string) => ReactNode;
}

/** Label + control + hint/error, wired together for accessibility. */
export function Field({ label, hint, error, className, children }: FieldProps) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {children(id)}
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx("input", className)} {...props} />;
}

export interface Option<T extends string | number> {
  value: T;
  label: string;
}

interface SelectProps<T extends string | number> extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "value"> {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
}

export function Select<T extends string | number>({ value, options, onChange, className, ...props }: SelectProps<T>) {
  return (
    <select
      className={cx("input cursor-pointer", className)}
      value={String(value)}
      onChange={(e) => {
        const option = options.find((o) => String(o.value) === e.target.value);
        if (option) onChange(option.value);
      }}
      {...props}
    >
      {options.map((o) => (
        <option key={String(o.value)} value={String(o.value)}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

interface SegmentedProps<T extends string | number> {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  id?: string;
}

/** A row of mutually exclusive buttons, for small choices (player count, ...). */
export function Segmented<T extends string | number>({ value, options, onChange, id }: SegmentedProps<T>) {
  return (
    <div id={id} role="radiogroup" className="flex flex-wrap gap-1 rounded-control border border-border bg-canvas p-1 shadow-inset">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cx(
            "min-w-[2.5rem] flex-1 rounded-control px-3 py-1.5 text-sm font-medium transition-colors",
            o.value === value ? "bg-accent text-accent-foreground shadow-control" : "text-text-secondary hover:bg-surface-hover"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
