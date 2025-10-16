import { Sparkles } from "lucide-react";

export const Hero = () => {
  return (
    <div className="text-center space-y-6 py-12 animate-fade-in">
      {/* Icon */}
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl gradient-primary shadow-elegant animate-float">
        <Sparkles className="w-10 h-10 text-white" />
      </div>
      
      {/* Title */}
      <div className="space-y-3">
        <h1 className="gradient-text">
          Explora SC
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Descubra roteiros personalizados em Santa Catarina com inteligência artificial
        </p>
      </div>
      
      {/* Badges */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm font-medium">
          <Sparkles className="w-4 h-4 text-primary" />
          Personalizado por IA
        </span>
        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-sm font-medium">
          🗺️ Mapa Interativo
        </span>
        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-sm font-medium">
          🎯 Sob Medida
        </span>
      </div>
    </div>
  );
};
