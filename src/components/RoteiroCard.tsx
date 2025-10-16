import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

interface RoteiroCardProps {
  titulo: string;
  descricao: string;
}

export const RoteiroCard = ({ titulo, descricao }: RoteiroCardProps) => {
  return (
    <Card className="relative overflow-hidden border-0 shadow-lg hover-lift animate-scale-in mb-8">
      {/* Gradient Background */}
      <div className="absolute inset-0 gradient-card opacity-50" />
      
      {/* Content */}
      <div className="relative">
        <CardHeader className="pb-4 space-y-3">
          <div className="inline-flex items-center gap-2 text-primary">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider">Seu Roteiro</span>
          </div>
          <CardTitle className="text-2xl font-semibold leading-tight">
            {titulo}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <CardDescription className="text-base text-muted-foreground leading-relaxed">
            {descricao}
          </CardDescription>
        </CardContent>
      </div>
    </Card>
  );
};
