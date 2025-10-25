import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ChevronDown } from "lucide-react";

interface Region {
  name: string;
  emoji: string;
}

const regions: Region[] = [
  { name: "Grande Florianópolis", emoji: "🏖️" },
  { name: "Serra Catarinense", emoji: "🏔️" },
  { name: "Litoral Norte", emoji: "🌊" },
  { name: "Vale Europeu", emoji: "🏘️" },
  { name: "Oeste Catarinense", emoji: "🌾" },
  { name: "Sul Catarinense", emoji: "🦞" },
  { name: "Planalto Norte", emoji: "🌲" },
];

interface RegionsMultiSelectProps {
  selected: string[];
  onSelectionChange: (values: string[]) => void;
}

export const RegionsMultiSelect = ({ 
  selected, 
  onSelectionChange 
}: RegionsMultiSelectProps) => {
  const [open, setOpen] = useState(false);
  
  const toggleRegion = (regionName: string) => {
    onSelectionChange(
      selected.includes(regionName)
        ? selected.filter(r => r !== regionName)
        : [...selected, regionName]
    );
  };
  
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium flex items-center gap-2">
        <span className="text-base">📍</span>
        Regiões para visitar
      </Label>
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="w-full flex items-center justify-between px-4 py-3 rounded-lg border bg-background hover:bg-accent transition-colors text-sm">
            <span className={selected.length === 0 ? "text-muted-foreground" : ""}>
              {selected.length === 0 
                ? "Escolha uma ou mais regiões..." 
                : `${selected.length} região${selected.length > 1 ? 'ões' : ''} selecionada${selected.length > 1 ? 's' : ''}`
              }
            </span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </button>
        </PopoverTrigger>
        
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-background border-border z-50" align="start">
          <Command>
            <CommandGroup>
              {regions.map((region) => (
                <CommandItem
                  key={region.name}
                  onSelect={() => toggleRegion(region.name)}
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer"
                >
                  <Checkbox 
                    checked={selected.includes(region.name)}
                    className="h-4 w-4"
                  />
                  <span className="text-base">{region.emoji}</span>
                  <span className="text-sm">{region.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};
