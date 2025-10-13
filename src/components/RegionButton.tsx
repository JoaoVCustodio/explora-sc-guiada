import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RegionButtonProps {
  region: string;
  emoji: string;
  isActive: boolean;
  onClick: () => void;
}

export const RegionButton = ({ region, emoji, isActive, onClick }: RegionButtonProps) => {
  return (
    <Button
      onClick={onClick}
      variant={isActive ? "default" : "outline"}
      className={cn(
        "transition-smooth hover:scale-105",
        isActive && "gradient-primary shadow-elegant"
      )}
    >
      <span className="mr-2">{emoji}</span>
      {region}
    </Button>
  );
};
