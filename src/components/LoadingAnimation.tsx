import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const loadingMessages = [
  "Gerando o melhor roteiro para você explorar Santa Catarina... 🗺️",
  "Analisando suas preferências e descobrindo lugares incríveis... ✨",
  "Conectando você com as belezas naturais de SC... 🌊",
  "Preparando uma experiência única e memorável... 🏔️",
  "Finalizando os detalhes do seu roteiro perfeito... 🎒"
];

export const LoadingAnimation = () => {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-12 animate-fade-in">
      <Loader2 className="w-12 h-12 text-primary animate-spin" />
      <p className="text-lg text-muted-foreground text-center max-w-md animate-pulse">
        {loadingMessages[messageIndex]}
      </p>
    </div>
  );
};
