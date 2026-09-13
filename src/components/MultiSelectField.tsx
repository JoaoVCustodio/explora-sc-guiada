import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  value: string;
  label: string;
  icon: LucideIcon;
}

interface MultiSelectFieldProps {
  description: string;
  legend: string;
  options: MultiSelectOption[];
  selected: string[];
  onSelectionChange: (values: string[]) => void;
  required?: boolean;
}

export const MultiSelectField = ({
  description,
  legend,
  options,
  selected,
  onSelectionChange,
  required = false,
}: MultiSelectFieldProps) => {
  const toggleOption = (value: string) => {
    onSelectionChange(
      selected.includes(value)
        ? selected.filter((selectedValue) => selectedValue !== value)
        : [...selected, value],
    );
  };

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold text-foreground">
        {legend} {required ? <span className="text-destructive">*</span> : <span className="font-normal text-muted-foreground">(opcional)</span>}
      </legend>
      <p className="-mt-2 text-sm text-muted-foreground">{description}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {options.map((option) => {
          const selectedOption = selected.includes(option.value);
          const Icon = option.icon;

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selectedOption}
              onClick={() => toggleOption(option.value)}
              className={cn(
                "relative flex min-h-14 items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                selectedOption
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-accent/70",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 leading-snug">{option.label}</span>
              {selectedOption && (
                <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3 w-3" aria-hidden="true" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
};
