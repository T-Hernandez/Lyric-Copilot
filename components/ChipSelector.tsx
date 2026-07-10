"use client";

type SingleProps = {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  multiSelect?: false;
};

type MultiProps = {
  options: string[];
  value: string[];
  onChange: (values: string[]) => void;
  multiSelect: true;
};

type Props = SingleProps | MultiProps;

export function ChipSelector(props: Props) {
  const { options, multiSelect } = props;

  function handleClick(opt: string) {
    if (multiSelect) {
      const current = props.value as string[];
      const next = current.includes(opt)
        ? current.filter((v) => v !== opt)
        : [...current, opt];
      (props.onChange as (v: string[]) => void)(next);
    } else {
      const current = props.value as string;
      (props.onChange as (v: string) => void)(current === opt ? "" : opt);
    }
  }

  function isSelected(opt: string) {
    if (multiSelect) return (props.value as string[]).includes(opt);
    return props.value === opt;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const selected = isSelected(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => handleClick(opt)}
            className={[
              "rounded-full border px-3 py-1 text-sm transition-colors",
              selected
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
