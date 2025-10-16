import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Navigation } from "lucide-react";

interface LocalCardProps {
  nome: string;
  descricao: string;
  onLocationClick: () => void;
  index?: number;
}

export const LocalCard = ({ nome, descricao, onLocationClick, index }: LocalCardProps) => {
  return (
    <Card 
      className="group relative overflow-hidden border-0 shadow-md hover:shadow-xl cursor-pointer transition-smooth hover-lift animate-slide-up bg-card"
      onClick={onLocationClick}
      style={{ animationDelay: `${(index || 0) * 100}ms` }}
    >
      {/* Number Badge */}
      {index !== undefined && (
        <div className="absolute top-4 right-4 w-8 h-8 rounded-full gradient-primary flex items-center justify-center shadow-md z-10">
          <span className="text-white font-semibold text-sm">{index + 1}</span>
        </div>
      )}
      
      {/* Gradient Accent */}
      <div className="absolute inset-x-0 top-0 h-1 gradient-primary" />
      
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3 text-lg font-semibold group-hover:text-primary transition-smooth">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-smooth">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <span className="flex-1">{nome}</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-3">
        <CardDescription className="text-sm text-muted-foreground leading-relaxed">
          {descricao}
        </CardDescription>
        
        {/* Action Hint */}
        <div className="flex items-center gap-2 text-xs text-primary opacity-0 group-hover:opacity-100 transition-smooth">
          <Navigation className="w-3 h-3" />
          <span className="font-medium">Ver no mapa</span>
        </div>
      </CardContent>
    </Card>
  );
};
