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
      variant={isActive ? "default" : "ghost"}
      size="sm"
      className={cn(
        "transition-smooth text-xs h-7 px-3",
        isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {region}
    </Button>
  );
};
