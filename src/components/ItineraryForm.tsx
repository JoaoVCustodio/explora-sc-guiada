import type { FormEvent, ReactNode } from "react";
import { AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { InterestsMultiSelect } from "@/components/InterestsMultiSelect";
import { RegionsMultiSelect } from "@/components/RegionsMultiSelect";
import { TripDatePicker } from "@/components/TripDatePicker";

interface ItineraryFormProps {
  creditPanel?: ReactNode;
  disabled?: boolean;
  pending?: boolean;
  days: number;
  startDate?: string;
  onStartDateChange?: (value: string) => void;
  onDaysChange: (value: number) => void;
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
  creditPanel, disabled, pending,
  days,
  startDate = "",
  onStartDateChange,
  onDaysChange,
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
    <div className="planner-layout mx-auto w-full max-w-3xl">
      <div className="planner-intro mb-7 text-center">
        <p className="eyebrow">Planejador com inteligência artificial</p>
        <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          Monte um roteiro com a sua cara.
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Escolha seus interesses e uma região de Santa Catarina. Nós organizamos os lugares e mostramos tudo no mapa.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="planner-form surface-panel space-y-7 p-5 sm:p-7" noValidate>
        {pending && <p role="status" className="text-sm">Você tem uma geração para consultar. Vamos recuperar a solicitação original sem cobrar novamente.</p>}
        {errorMessage && !hasRegionValidationError && (
          <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-foreground" role="alert">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
            <div><p className="font-semibold">Não foi possível gerar o roteiro.</p><p className="mt-1 text-muted-foreground">{errorMessage}</p></div>
          </div>
        )}

        <fieldset disabled={pending} className="space-y-7 disabled:opacity-60">
        <legend className="sr-only">Preferências da viagem</legend>
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

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold">Quantos dias você quer explorar?</legend>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {[1, 2, 3, 4, 5, 6, 7].map(day => <button key={day} type="button" aria-pressed={days === day} aria-label={`${day} ${day === 1 ? 'dia' : 'dias'}`} onClick={() => onDaysChange(day)} className={`flex min-h-12 flex-col items-center justify-center rounded-xl border py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${days === day ? 'border-primary bg-primary text-primary-foreground shadow-sm' : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-accent'}`}><span className="text-base font-semibold tabular-nums">{day}</span><span className="hidden text-[10px] sm:block">{day === 1 ? 'dia' : 'dias'}</span></button>)}
          </div>
        </fieldset>
        <div className="space-y-2">
          <Label htmlFor="trip-start" className="text-sm font-semibold">Quando começa sua viagem? <span className="font-normal text-muted-foreground">(opcional)</span></Label>
          <TripDatePicker value={startDate} onChange={onStartDateChange} describedBy="trip-start-help" />
          <p id="trip-start-help" className="text-xs leading-relaxed text-muted-foreground">Ajuda a considerar os horários cadastrados para cada dia da semana. Você também pode decidir depois.</p>
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

        </fieldset>
        {creditPanel}
        <Button type="submit" size="lg" disabled={disabled} className="h-12 w-full rounded-xl text-base shadow-md">
          <Sparkles className="h-5 w-5" aria-hidden="true" /> {pending ? "Consultar geração" : "Gerar meu roteiro · 1 crédito"}
        </Button>
        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          O roteiro é uma sugestão. Confirme horários, acessibilidade e condições dos locais antes de viajar.
        </p>
      </form>
    </div>
  );
};
