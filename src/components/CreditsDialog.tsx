import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Coins,
  Loader2,
  QrCode,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import type { Credits } from "@/features/credits/useCredits";
import { Button } from "@/components/ui/button";

type DemoStep = "packages" | "checkout" | "processing" | "success";

interface CreditPackage {
  id: "single" | "triple";
  generations: number;
  label: string;
  price: string;
  note: string;
  featured?: boolean;
}

const creditPackages: CreditPackage[] = [
  { id: "single", generations: 1, label: "1 geração", price: "R$ 10", note: "Uma nova descoberta" },
  { id: "triple", generations: 3, label: "3 gerações", price: "R$ 25", note: "Economize R$ 5", featured: true },
];

const fakePixCode = "EXPLORASC-DEMO · PIX FICTÍCIO · SEM COBRANÇA · NÃO PAGAR";

function DemoNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex gap-3 rounded-2xl border border-amber-600/20 bg-amber-500/[0.08] text-amber-950 ${compact ? "p-3.5" : "p-4"}`}>
      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
      <p className="text-xs leading-relaxed sm:text-sm">
        <strong className="font-semibold">Pagamento em modo de demonstração.</strong>{" "}
        Nenhuma cobrança será realizada e nenhum crédito será adicionado.
      </p>
    </div>
  );
}

function PackageCard({ item, onSelect }: { item: CreditPackage; onSelect: (item: CreditPackage) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={`group relative flex min-h-48 flex-col rounded-2xl border p-5 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:min-h-[164px] ${
        item.featured
          ? "border-primary/35 bg-primary/[0.045] hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-lg"
          : "border-border bg-card hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg"
      }`}
      aria-label={`Escolher ${item.label} por ${item.price} em modo de demonstração`}
    >
      <div className="flex w-full items-start justify-between gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.featured ? "bg-primary text-primary-foreground" : "bg-accent text-primary"}`}>
          {item.featured ? <Sparkles className="h-5 w-5" aria-hidden="true" /> : <Coins className="h-5 w-5" aria-hidden="true" />}
        </span>
        {item.featured && <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">Melhor valor</span>}
      </div>
      <p className="mt-4 text-base font-semibold">{item.label}</p>
      <p className="mt-1 font-serif text-3xl tracking-tight text-foreground">{item.price}</p>
      <div className="mt-auto flex w-full items-end justify-between gap-3 pt-3">
        <span className="text-xs text-muted-foreground">{item.note}</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-primary transition-transform group-hover:translate-x-0.5">
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
    </button>
  );
}

function DemoQrCode() {
  return (
    <div className="relative mx-auto grid aspect-square w-full max-w-[210px] place-items-center overflow-hidden rounded-2xl border border-border bg-white p-5 shadow-sm" aria-label="QR Code ilustrativo, sem validade para pagamento">
      <QrCode className="h-full w-full text-[#143c32]" strokeWidth={1.65} aria-hidden="true" />
      <span className="absolute bottom-2 rounded-full bg-[#143c32] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-white">QR ilustrativo</span>
    </div>
  );
}

export function CreditsDialog({ open, onClose, credits, error, onRetry }: {
  open: boolean;
  onClose: () => void;
  credits: Credits | null;
  error: boolean;
  onRetry: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const processingTimer = useRef<number>();
  const [step, setStep] = useState<DemoStep>("packages");
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [balanceAtStart, setBalanceAtStart] = useState<number | null>(null);

  const clearProcessing = useCallback(() => {
    if (processingTimer.current !== undefined) window.clearTimeout(processingTimer.current);
    processingTimer.current = undefined;
  }, []);

  const resetDemo = useCallback(() => {
    clearProcessing();
    setStep("packages");
    setSelectedPackage(null);
    setBalanceAtStart(null);
  }, [clearProcessing]);

  useEffect(() => {
    const element = dialog.current;
    if (open && !element?.open) {
      resetDemo();
      element?.showModal();
    }
    if (!open && element?.open) element.close();
  }, [open, resetDemo]);

  useEffect(() => () => clearProcessing(), [clearProcessing]);

  const close = () => {
    resetDemo();
    onClose();
  };

  const choosePackage = (item: CreditPackage) => {
    setSelectedPackage(item);
    setBalanceAtStart(credits?.balance ?? null);
    setStep("checkout");
  };

  const simulatePayment = () => {
    clearProcessing();
    setStep("processing");
    processingTimer.current = window.setTimeout(() => {
      processingTimer.current = undefined;
      setStep("success");
    }, 1200);
  };

  return createPortal(
    <dialog
      ref={dialog}
      onClose={close}
      aria-labelledby="credits-title"
      aria-describedby="credits-description"
      className="product-ui credits-dialog w-full max-w-none rounded-t-3xl rounded-b-none border border-border bg-card p-0 text-foreground shadow-2xl sm:max-h-[85vh] sm:w-[calc(100%-2rem)] sm:max-w-[680px] sm:rounded-3xl"
      onClick={event => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
      }}
    >
      <div className="relative p-5 sm:p-6">
        <Button type="button" variant="ghost" size="icon" className="absolute right-3 top-3 z-10 h-11 w-11 rounded-full text-muted-foreground sm:right-4 sm:top-4" onClick={close} aria-label="Fechar créditos">
          <X aria-hidden="true" />
        </Button>

        {step === "packages" && (
          <div>
            <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-primary"><Coins className="h-6 w-6" aria-hidden="true" /></span>
            <p className="eyebrow">Mais destinos para descobrir</p>
            <h2 id="credits-title" className="mt-2 pr-10">Obter créditos</h2>
            <p id="credits-description" className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">Cada roteiro usa 1 crédito, seja uma escapada de um dia ou uma viagem de até 7 dias.</p>

            <div className="my-5 flex items-center justify-between gap-4 rounded-2xl bg-muted/60 px-5 py-3.5">
              <div><p className="text-sm font-medium">Seu saldo atual</p><p className="mt-1 text-xs text-muted-foreground">3 créditos gratuitos iniciais · sem mensalidade</p></div>
              <span className="text-3xl font-bold tabular-nums text-primary" aria-label={credits ? `${credits.balance} créditos disponíveis` : "Saldo indisponível"}>{credits?.balance ?? "—"}</span>
            </div>

            {error && <div className="mb-4 text-sm"><p role="alert">Não foi possível consultar o saldo.</p><Button type="button" variant="link" className="px-0" onClick={onRetry}>Consultar novamente</Button></div>}
            {!credits && !error && <p role="status" className="mb-4 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Consultando saldo…</p>}
            {credits?.pending && <p role="status" className="mb-4 text-sm text-muted-foreground">1 crédito reservado para uma geração em andamento.</p>}

            <div className="mb-3 flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">Escolha um pacote demonstrativo</h3><span className="rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">Modo demo</span></div>
            <div className="grid gap-3 sm:grid-cols-2">
              {creditPackages.map(item => <PackageCard key={item.id} item={item} onSelect={choosePackage} />)}
            </div>
            <div className="mt-4"><DemoNotice compact /></div>
            <Button type="button" variant="outline" className="mt-4 h-11 w-full rounded-xl" onClick={close}>Continuar explorando<ArrowUpRight aria-hidden="true" /></Button>
          </div>
        )}

        {step === "checkout" && selectedPackage && (
          <div>
            <Button type="button" variant="ghost" className="-ml-3 mb-4 h-11 rounded-full px-3 text-muted-foreground" onClick={() => setStep("packages")}>
              <ArrowLeft aria-hidden="true" />Voltar
            </Button>
            <p className="eyebrow">Checkout demonstrativo</p>
            <h2 id="credits-title" className="mt-2 pr-10">Aguardando pagamento</h2>
            <p id="credits-description" className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">Explore visualmente como será a compra de créditos. Este QR Code não representa uma cobrança.</p>

            <div className="mt-5 grid gap-5 rounded-3xl border border-border/80 bg-muted/30 p-4 sm:grid-cols-[220px_1fr] sm:p-4">
              <DemoQrCode />
              <div className="flex min-w-0 flex-col">
                <div className="flex items-start justify-between gap-4 border-b border-border/70 pb-4">
                  <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Pacote escolhido</p><p className="mt-1 text-lg font-semibold">{selectedPackage.label}</p></div>
                  <p className="font-serif text-2xl tracking-tight text-primary">{selectedPackage.price}</p>
                </div>
                <p className="mt-4 text-xs font-semibold">Pix copia e cola fictício</p>
                <div role="textbox" aria-readonly="true" aria-label="Código Pix fictício" className="mt-2 min-h-16 break-words rounded-xl border border-dashed border-border bg-card px-3 py-3 font-mono text-[10px] leading-relaxed text-muted-foreground">
                  {fakePixCode}
                </div>
                <p className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground"><X className="h-3.5 w-3.5" aria-hidden="true" />Código inválido para pagamentos reais</p>
              </div>
            </div>

            <div className="mt-4"><DemoNotice /></div>
            <Button type="button" className="mt-4 h-12 w-full rounded-xl" onClick={simulatePayment}>Simular pagamento<ArrowRight aria-hidden="true" /></Button>
          </div>
        )}

        {step === "processing" && selectedPackage && (
          <div className="flex min-h-[430px] flex-col items-center justify-center px-2 py-10 text-center sm:min-h-[340px] sm:py-6" aria-live="polite" aria-busy="true">
            <span className="relative grid h-20 w-20 place-items-center rounded-full bg-accent text-primary">
              <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
              <span className="absolute inset-[-8px] rounded-full border border-primary/15" aria-hidden="true" />
            </span>
            <p className="eyebrow mt-8">Ambiente de demonstração</p>
            <h2 id="credits-title" className="mt-2">Simulando pagamento</h2>
            <p id="credits-description" className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">Processando visualmente o pacote de {selectedPackage.label.toLowerCase()} por {selectedPackage.price}.</p>
            <p className="mt-6 rounded-full bg-muted px-4 py-2 text-xs font-medium text-muted-foreground">Nenhuma transação está sendo criada</p>
          </div>
        )}

        {step === "success" && selectedPackage && (
          <div className="flex min-h-[430px] flex-col items-center justify-center px-1 py-8 text-center sm:min-h-[360px] sm:py-5" aria-live="polite">
            <span className="grid h-20 w-20 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/15"><CheckCircle2 className="h-9 w-9" aria-hidden="true" /></span>
            <p className="eyebrow mt-7">Demonstração concluída</p>
            <h2 id="credits-title" className="mt-2">Pagamento simulado com sucesso</h2>
            <p id="credits-description" className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">Esta demonstração não altera seu saldo de créditos.</p>

            <div className="mt-6 flex w-full max-w-md items-center justify-between gap-4 rounded-2xl border border-border bg-muted/40 p-4 text-left">
              <div><p className="text-sm font-semibold">Saldo real preservado</p><p className="mt-1 text-xs text-muted-foreground">Nenhum crédito foi adicionado</p></div>
              <div className="flex items-center gap-2 text-lg font-bold tabular-nums text-primary" aria-label={`Saldo antes e depois: ${balanceAtStart ?? "indisponível"}`}>
                <span>{balanceAtStart ?? "—"}</span><ArrowRight className="h-4 w-4 opacity-50" aria-hidden="true" /><span>{balanceAtStart ?? "—"}</span>
              </div>
            </div>

            <ul className="mt-5 space-y-2 text-left text-xs text-muted-foreground">
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" aria-hidden="true" />Nenhuma cobrança realizada</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" aria-hidden="true" />Nenhuma alteração na carteira</li>
            </ul>
            <Button type="button" className="mt-7 h-12 w-full max-w-md rounded-xl" onClick={close}>Concluir demonstração</Button>
            <Button type="button" variant="ghost" className="mt-2 h-11" onClick={() => { setStep("packages"); setSelectedPackage(null); }}>Simular outro pacote</Button>
          </div>
        )}
      </div>
    </dialog>,
    document.body,
  );
}
