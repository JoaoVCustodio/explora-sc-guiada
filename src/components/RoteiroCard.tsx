import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface RoteiroCardProps {
  title: string;
  description: string;
}

export const RoteiroCard = ({ title, description }: RoteiroCardProps) => (
  <Card className="overflow-hidden border-primary/20 bg-card shadow-md">
    <div className="h-1.5 bg-gradient-to-r from-primary via-cyan-500 to-secondary" />
    <CardHeader className="pb-3">
      <p className="eyebrow flex items-center gap-2"><Sparkles className="h-4 w-4" aria-hidden="true" /> Roteiro criado para você</p>
      <h2 className="text-balance text-2xl font-bold leading-tight sm:text-3xl">{title}</h2>
    </CardHeader>
    <CardContent>
      <p className="max-w-3xl text-base leading-relaxed text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);
