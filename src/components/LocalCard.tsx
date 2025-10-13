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
      className="shadow-card hover:shadow-elegant transition-smooth hover:scale-105 cursor-pointer animate-slide-up"
      onClick={onLocationClick}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <MapPin className="w-5 h-5 text-primary" />
          {nome}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-foreground/80">
          {descricao}
        </CardDescription>
      </CardContent>
    </Card>
  );
};
