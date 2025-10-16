import { useEffect, useState } from "react";
import { Sparkles, Map, Search } from "lucide-react";

const loadingSteps = [
  { icon: Sparkles, text: "Analisando suas preferências", color: "text-primary" },
  { icon: Search, text: "Encontrando os melhores locais", color: "text-secondary" },
  { icon: Map, text: "Criando seu roteiro personalizado", color: "text-accent" },
];

export const LoadingAnimation = () => {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % loadingSteps.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const currentStep = loadingSteps[stepIndex];
  const Icon = currentStep.icon;

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-20 animate-fade-in">
      {/* Animated Icon */}
      <div className="relative">
        <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center animate-pulse-glow">
          <Icon className="w-10 h-10 text-white animate-pulse" />
        </div>
        {/* Orbiting dots */}
        <div className="absolute inset-0 animate-spin-slow">
          <div className="absolute top-0 left-1/2 w-2 h-2 bg-primary rounded-full -translate-x-1/2" />
        </div>
        <div className="absolute inset-0 animate-spin-slow" style={{ animationDelay: "0.5s" }}>
          <div className="absolute bottom-0 left-1/2 w-2 h-2 bg-secondary rounded-full -translate-x-1/2" />
        </div>
      </div>
      
      {/* Progress Text */}
      <div className="text-center space-y-2">
        <p className="text-lg font-medium animate-pulse">
          {currentStep.text}
        </p>
        <div className="flex justify-center gap-1.5">
          {loadingSteps.map((_, index) => (
            <div
              key={index}
              className={`h-1 rounded-full transition-all duration-300 ${
                index === stepIndex 
                  ? "w-8 bg-primary" 
                  : "w-1.5 bg-muted"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
