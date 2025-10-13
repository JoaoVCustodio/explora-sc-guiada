import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface RoteiroCardProps {
  titulo: string;
  descricao: string;
}

export const RoteiroCard = ({ titulo, descricao }: RoteiroCardProps) => {
  return (
    <Card className="shadow-card border-2 border-primary/20 animate-scale-in">
      <CardHeader className="gradient-primary text-primary-foreground rounded-t-lg">
        <CardTitle className="text-2xl">🎯 {titulo}</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <CardDescription className="text-base text-foreground">
          {descricao}
        </CardDescription>
      </CardContent>
    </Card>
  );
};
