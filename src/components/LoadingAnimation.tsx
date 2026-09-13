import { useEffect, useState } from "react";
import { Compass, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const loadingMessages = [
  "Analisando suas preferências...",
  "Explorando destinos em Santa Catarina...",
  "Organizando os locais do roteiro...",
];

interface LoadingAnimationProps {
  compact?: boolean;
  message?: string;
  onCancel?: () => void;
}

export const LoadingAnimation = ({ compact = false, message, onCancel }: LoadingAnimationProps) => {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (message) return;
    const intervalId = setInterval(
      () => setMessageIndex((currentIndex) => (currentIndex + 1) % loadingMessages.length),
      3_500,
    );
    return () => clearInterval(intervalId);
  }, [message]);

  return (
    <div className={cn("flex flex-col items-center justify-center px-4 text-center", compact ? "min-h-dvh" : "min-h-[70dvh]")}>
      <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
        <span className="absolute inset-0 animate-ping rounded-2xl bg-primary/20" aria-hidden="true" />
        <Compass className="relative h-8 w-8 animate-spin-slow" aria-hidden="true" />
      </span>
      <p className="mt-6 text-lg font-bold text-foreground" role="status" aria-live="polite">{message || loadingMessages[messageIndex]}</p>
      {!message && <p className="mt-2 max-w-sm text-sm text-muted-foreground">Isso costuma levar alguns segundos. Você pode cancelar sem perder suas escolhas.</p>}
      {onCancel && (
        <Button type="button" variant="outline" className="mt-6 min-h-11" onClick={onCancel}>
          <X className="h-4 w-4" aria-hidden="true" /> Cancelar
        </Button>
      )}
    </div>
  );
};
