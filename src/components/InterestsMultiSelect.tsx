import { Landmark, MountainSnow, Sailboat, Trees, Utensils, Waves } from "lucide-react";
import { MultiSelectField, type MultiSelectOption } from "./MultiSelectField";

const interests: MultiSelectOption[] = [
  { icon: Waves, label: "Praias e natureza", value: "praias" },
  { icon: MountainSnow, label: "Montanhas e aventura", value: "montanhas" },
  { icon: Utensils, label: "Gastronomia", value: "gastronomia" },
  { icon: Landmark, label: "Arte e história", value: "arte" },
  { icon: Sailboat, label: "Esportes aquáticos", value: "esportes" },
  { icon: Trees, label: "Ecoturismo", value: "ecoturismo" },
];

interface InterestsMultiSelectProps {
  selected: string[];
  onSelectionChange: (values: string[]) => void;
}

export const InterestsMultiSelect = ({ selected, onSelectionChange }: InterestsMultiSelectProps) => (
  <MultiSelectField
    legend="O que você gosta de fazer?"
    description="Escolha quantos interesses quiser."
    options={interests}
    selected={selected}
    onSelectionChange={onSelectionChange}
  />
);
