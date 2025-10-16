import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface RoteiroCardProps {
  titulo: string;
  descricao: string;
}

export const RoteiroCard = ({ titulo, descricao }: RoteiroCardProps) => {
  return (
    <Card className="border border-border/50 animate-scale-in mb-8">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-normal">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <CardDescription className="text-xs text-muted-foreground leading-relaxed">
          {descricao}
        </CardDescription>
      </CardContent>
    </Card>
  );
};
