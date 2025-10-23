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
        "relative flex flex-col items-center gap-4 p-8 rounded-3xl bg-white dark:bg-gray-900 transition-all duration-300",
        "hover:shadow-xl hover:-translate-y-1",
        isActive 
          ? "border-2 border-primary shadow-lg ring-4 ring-primary/10" 
          : "border border-gray-200 dark:border-gray-700 shadow-sm"
      )}
    >
      {/* Check Badge - Top Right */}
      {isActive && (
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center animate-scale-in">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}
      
      {/* Giant Emoji */}
      <div className={cn(
        "text-6xl transition-transform duration-300",
        isActive ? "scale-110" : "group-hover:scale-105"
      )}>
        {emoji}
      </div>
      
      {/* Region Name */}
      <p className={cn(
        "text-lg font-medium transition-colors",
        isActive ? "text-primary" : "text-gray-900 dark:text-gray-100"
      )}>
        {region}
      </p>
    </button>
  );
};
