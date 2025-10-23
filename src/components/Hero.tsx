import { Sparkles } from "lucide-react";

export const Hero = () => {
  return (
    <div className="text-center space-y-4 py-8 animate-fade-in">
      {/* Title */}
      <h1 className="text-5xl md:text-6xl font-bold gradient-text tracking-tight">
        Explora SC
      </h1>
      
      {/* Subtitle */}
      <p className="text-base text-muted-foreground max-w-xl mx-auto">
        Descubra roteiros personalizados em Santa Catarina com inteligência artificial
      </p>
      
      {/* Inline badges */}
      <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground pt-2">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-primary" />
          Personalizado por IA
        </span>
        <span>•</span>
        <span className="flex items-center gap-1.5">
          🗺️ Mapa Interativo
        </span>
        <span>•</span>
        <span className="flex items-center gap-1.5">
          🎯 Sob Medida
        </span>
      </div>
    </div>
  );
};
