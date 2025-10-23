import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

const loadingMessages = [
  "Analisando suas preferências...",
  "Explorando destinos em Santa Catarina...",
  "Criando roteiro personalizado...",
  "Finalizando seu roteiro perfeito...",
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
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 animate-fade-in">
      {/* Orbiting Circles */}
      <div className="relative w-24 h-24">
        <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
        <div className="absolute inset-2 rounded-full bg-primary/40 animate-pulse" />
        <div className="absolute inset-4 rounded-full bg-primary flex items-center justify-center animate-bounce">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
      </div>

      {/* Animated Message */}
      <p className="text-lg font-medium text-muted-foreground animate-fade-in-out">
        {loadingMessages[messageIndex]}
      </p>

      {/* Progress Bar */}
      <div className="w-64 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-primary to-secondary animate-progress" />
      </div>
    </div>
  );
};
