import { cx } from "./cx";

interface TabsProps<T extends string> {
  value: T;
  tabs: { value: T; label: string }[];
  onChange: (value: T) => void;
}

export function Tabs<T extends string>({ value, tabs, onChange }: TabsProps<T>) {
  return (
    <div role="tablist" className="flex gap-1 border-b border-border">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          role="tab"
          type="button"
          aria-selected={tab.value === value}
          onClick={() => onChange(tab.value)}
          className={cx(
            "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors",
            tab.value === value ? "border-accent text-text-primary" : "border-transparent text-text-muted hover:text-text-secondary"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
