import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";

interface LocalCardProps {
  nome: string;
  descricao: string;
  onLocationClick: () => void;
}

export const LocalCard = ({ nome, descricao, onLocationClick }: LocalCardProps) => {
  return (
    <Card 
      className="border border-border/50 hover:border-border transition-smooth cursor-pointer animate-slide-up group"
      onClick={onLocationClick}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-normal group-hover:text-primary transition-smooth">
          <MapPin className="w-3 h-3 text-muted-foreground" />
          {nome}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <CardDescription className="text-xs text-muted-foreground leading-relaxed">
          {descricao}
        </CardDescription>
      </CardContent>
    </Card>
  );
};
