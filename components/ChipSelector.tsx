"use client";

type Props = {
  options: string[];
  value: string;
  onChange: (value: string) => void;
};

export function ChipSelector({ options, value, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const isSelected = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(isSelected ? "" : opt)}
            className={[
              "rounded-full border px-3 py-1 text-sm transition-colors",
              isSelected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:border-primary/50 hover:bg-muted/50 text-foreground",
            ].join(" ")}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
