import { useEffect, useState } from "react";

const loadingMessages = [
  "Gerando roteiro...",
  "Analisando preferências...",
  "Encontrando locais...",
];

export const LoadingAnimation = () => {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 animate-fade-in">
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      <p className="text-xs text-muted-foreground text-center animate-pulse">
        {loadingMessages[messageIndex]}
      </p>
    </div>
  );
};
