import { Building2, Landmark, Mountain, Shell, Sprout, Trees, Waves } from "lucide-react";
import { MultiSelectField, type MultiSelectOption } from "./MultiSelectField";

const regions: MultiSelectOption[] = [
  { icon: Waves, label: "Grande Florianópolis", value: "Grande Florianópolis" },
  { icon: Mountain, label: "Serra Catarinense", value: "Serra Catarinense" },
  { icon: Shell, label: "Litoral Norte", value: "Litoral Norte" },
  { icon: Building2, label: "Vale Europeu", value: "Vale Europeu" },
  { icon: Sprout, label: "Oeste Catarinense", value: "Oeste Catarinense" },
  { icon: Landmark, label: "Sul Catarinense", value: "Sul Catarinense" },
  { icon: Trees, label: "Planalto Norte", value: "Planalto Norte" },
];

interface RegionsMultiSelectProps {
  selected: string[];
  onSelectionChange: (values: string[]) => void;
}

export const RegionsMultiSelect = ({ selected, onSelectionChange }: RegionsMultiSelectProps) => (
  <MultiSelectField
    required
    legend="Que região você quer conhecer?"
    description="Selecione pelo menos uma região para orientar o roteiro."
    options={regions}
    selected={selected}
    onSelectionChange={onSelectionChange}
  />
);
