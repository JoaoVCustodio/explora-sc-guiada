import { Compass, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
          <Compass className="h-7 w-7" aria-hidden="true" />
        </span>
        <p className="eyebrow mt-6">Erro 404</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Esse caminho não está no roteiro.</h1>
        <p className="mt-3 text-muted-foreground">
          A página que você tentou acessar não existe ou mudou de endereço.
        </p>
        <Button asChild className="mt-7 h-12">
          <Link to="/"><Home className="h-4 w-4" aria-hidden="true" /> Voltar ao início</Link>
        </Button>
      </div>
    </main>
  );
}
