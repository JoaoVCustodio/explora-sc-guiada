import { useEffect, useState } from "react";
import { Compass, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const loadingMessages = [
  "Estamos preparando seu roteiro...",
  "A geração continua em andamento...",
  "Ainda estamos aguardando seu roteiro...",
];

interface LoadingAnimationProps {
  compact?: boolean;
  message?: string;
  onCancel?: () => void;
}

export const LoadingAnimation = ({ compact = false, message, onCancel }: LoadingAnimationProps) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (message) return;
    const intervalId = setInterval(() => setElapsed((seconds) => seconds + 1), 1_000);
    return () => clearInterval(intervalId);
  }, [message]);

  const messageIndex = elapsed < 10 ? 0 : elapsed < 35 ? 1 : 2;

  return (
    <div className={cn("flex flex-col items-center justify-center px-4 text-center", compact ? "min-h-64" : "min-h-[70dvh]")}>
      <span className="loading-emblem relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
        <span className="loading-halo absolute inset-0 animate-ping rounded-2xl bg-primary/20" aria-hidden="true" />
        <Compass className="relative h-8 w-8 animate-spin-slow" aria-hidden="true" />
      </span>
      <p className="loading-copy mt-6 text-lg font-bold text-foreground" role="status" aria-live="polite">{message || loadingMessages[messageIndex]}</p>
      {!message && (
        <>
          <p role="timer" aria-label="Tempo de espera" aria-live="off" className="mt-2 text-sm tabular-nums text-muted-foreground">Tempo de espera: {elapsed} s</p>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">A geração pode levar cerca de um minuto. Se sair desta página ou parar de aguardar, volte a Planejar e use “Consultar geração” para recuperar este pedido sem gastar outro crédito.</p>
        </>
      )}
      {onCancel && (
        <Button type="button" variant="outline" className="mt-6 min-h-11" onClick={onCancel}>
          <X className="h-4 w-4" aria-hidden="true" /> Parar de aguardar
        </Button>
      )}
    </div>
  );
};
