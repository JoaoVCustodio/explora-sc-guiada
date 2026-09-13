import type { FormEvent } from "react";
import { AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { InterestsMultiSelect } from "@/components/InterestsMultiSelect";
import { RegionsMultiSelect } from "@/components/RegionsMultiSelect";

interface ItineraryFormProps {
  errorMessage: string | null;
  preferences: string;
  selectedInterests: string[];
  selectedRegions: string[];
  onInterestsChange: (values: string[]) => void;
  onPreferencesChange: (value: string) => void;
  onRegionsChange: (values: string[]) => void;
  onSubmit: () => void;
}

export const ItineraryForm = ({
  errorMessage,
  preferences,
  selectedInterests,
  selectedRegions,
  onInterestsChange,
  onPreferencesChange,
  onRegionsChange,
  onSubmit,
}: ItineraryFormProps) => {
  const hasRegionValidationError =
    selectedRegions.length === 0 && errorMessage === "Selecione pelo menos uma região de Santa Catarina.";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-7 text-center">
        <p className="eyebrow">Planejador com inteligência artificial</p>
        <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          Monte um roteiro com a sua cara.
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Escolha seus interesses e uma região de Santa Catarina. Nós organizamos os lugares e mostramos tudo no mapa.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="surface-panel space-y-7 p-5 sm:p-7" noValidate>
        {errorMessage && !hasRegionValidationError && (
          <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-foreground" role="alert">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
            <div><p className="font-semibold">Não foi possível gerar o roteiro.</p><p className="mt-1 text-muted-foreground">{errorMessage}</p></div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-end justify-between gap-3">
            <Label htmlFor="preferences" className="text-sm font-semibold">Conte um pouco sobre a viagem <span className="font-normal text-muted-foreground">(opcional)</span></Label>
            <span className="text-xs tabular-nums text-muted-foreground" aria-live="polite">{preferences.length}/300</span>
          </div>
          <Textarea
            id="preferences"
            value={preferences}
            onChange={(event) => onPreferencesChange(event.target.value)}
            placeholder="Ex.: gosto de praias tranquilas, trilhas leves e restaurantes locais..."
            className="min-h-28 resize-y bg-card text-base leading-relaxed"
            maxLength={300}
          />
        </div>

        <InterestsMultiSelect selected={selectedInterests} onSelectionChange={onInterestsChange} />
        <div id="region-selector" tabIndex={-1}>
          <RegionsMultiSelect selected={selectedRegions} onSelectionChange={onRegionsChange} />
          {hasRegionValidationError && (
            <p className="mt-2 text-sm font-medium text-destructive" role="alert">
              {errorMessage}
            </p>
          )}
        </div>

        <Button type="submit" size="lg" className="h-12 w-full rounded-xl text-base shadow-md">
          <Sparkles className="h-5 w-5" aria-hidden="true" /> Gerar meu roteiro
        </Button>
        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          O roteiro é uma sugestão. Confirme horários, acessibilidade e condições dos locais antes de viajar.
        </p>
      </form>
    </div>
  );
};
