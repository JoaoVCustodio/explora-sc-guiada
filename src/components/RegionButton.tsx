import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface RegionButtonProps {
  region: string;
  emoji: string;
  isActive: boolean;
  onClick: () => void;
}

export const RegionButton = ({ region, emoji, isActive, onClick }: RegionButtonProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative group flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-smooth hover-lift",
        isActive 
          ? "border-primary bg-primary/5 shadow-lg" 
          : "border-border bg-card hover:border-border/60 hover:shadow-md"
      )}
    >
      {/* Check Badge */}
      {isActive && (
        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full gradient-primary flex items-center justify-center shadow-md animate-scale-in">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}
      
      {/* Emoji */}
      <div className={cn(
        "text-4xl transition-transform",
        isActive ? "scale-110" : "group-hover:scale-110"
      )}>
        {emoji}
      </div>
      
      {/* Region Name */}
      <div className="text-center">
        <p className={cn(
          "font-semibold transition-smooth",
          isActive ? "text-primary" : "text-foreground"
        )}>
          {region}
        </p>
      </div>
    </button>
  );
};
