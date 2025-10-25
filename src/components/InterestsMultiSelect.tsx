import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { X, ChevronDown } from "lucide-react";

interface Interest {
  emoji: string;
  text: string;
  value: string;
}

const interests: Interest[] = [
  { emoji: "🏖️", text: "Praias e natureza", value: "praias" },
  { emoji: "🏔️", text: "Montanhas e aventura", value: "montanhas" },
  { emoji: "🍽️", text: "Gastronomia", value: "gastronomia" },
  { emoji: "🎨", text: "Arte e história", value: "arte" },
  { emoji: "🌊", text: "Esportes aquáticos", value: "esportes" },
  { emoji: "🌲", text: "Ecoturismo", value: "ecoturismo" },
];

interface InterestsMultiSelectProps {
  selected: string[];
  onSelectionChange: (values: string[]) => void;
}

export const InterestsMultiSelect = ({ 
  selected, 
  onSelectionChange 
}: InterestsMultiSelectProps) => {
  const [open, setOpen] = useState(false);
  
  const toggleInterest = (value: string) => {
    onSelectionChange(
      selected.includes(value)
        ? selected.filter(v => v !== value)
        : [...selected, value]
    );
  };
  
  const removeInterest = (value: string) => {
    onSelectionChange(selected.filter(v => v !== value));
  };
  
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium flex items-center gap-2">
        <span className="text-base">🎯</span>
        Seus interesses (opcional)
      </Label>
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="w-full flex items-center justify-between px-4 py-3 rounded-lg border bg-background hover:bg-accent transition-colors text-sm">
            <span className={selected.length === 0 ? "text-muted-foreground" : ""}>
              {selected.length === 0 
                ? "Selecione seus interesses..." 
                : `${selected.length} interesse${selected.length > 1 ? 's' : ''} selecionado${selected.length > 1 ? 's' : ''}`
              }
            </span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </button>
        </PopoverTrigger>
        
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-background border-border z-50" align="start">
          <Command>
            <CommandGroup>
              {interests.map((interest) => (
                <CommandItem
                  key={interest.value}
                  onSelect={() => toggleInterest(interest.value)}
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer"
                >
                  <Checkbox 
                    checked={selected.includes(interest.value)}
                    className="h-4 w-4"
                  />
                  <span className="text-base">{interest.emoji}</span>
                  <span className="text-sm">{interest.text}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
      
      {/* Selected Chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((value) => {
            const interest = interests.find(i => i.value === value);
            return (
              <div 
                key={value}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-xs font-medium"
              >
                <span>{interest?.emoji}</span>
                <span>{interest?.text}</span>
                <button
                  onClick={() => removeInterest(value)}
                  className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
