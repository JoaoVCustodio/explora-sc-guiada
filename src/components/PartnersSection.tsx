import { useEffect, useState } from "react";
import { Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPartners } from "@/features/partners/api";
import { partnerRegions, safePartnerUrl, type Partner } from "@/features/partners/selection";

function PartnerCard({ partner }: { partner: Partner }) {
  const image = safePartnerUrl(partner.image_url, "image");
  const [failedImage, setFailedImage] = useState<string>();
  const whatsapp = safePartnerUrl(partner.whatsapp_url, "whatsapp");
  const instagram = safePartnerUrl(partner.instagram_url, "instagram");
  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex aspect-video items-center justify-center bg-muted">
        {image && image !== failedImage ? <img src={image} alt={partner.name} loading="lazy" decoding="async" referrerPolicy="no-referrer" className="h-full w-full object-cover" onError={() => setFailedImage(image)} /> : <Store className="h-10 w-10 text-muted-foreground" aria-hidden="true" />}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex flex-wrap gap-2 text-xs font-medium">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">Parceiro local</span>
          {partner.is_demo && <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">Conteúdo demonstrativo</span>}
        </div>
        <h3 className="break-words text-lg font-bold">{partner.name}</h3>
        <p className="mt-2 break-words text-sm text-muted-foreground">{partner.description}</p>
        <p className="mt-3 text-sm text-muted-foreground">{partner.city}{partner.neighborhood ? ` · ${partner.neighborhood}` : ""}</p>
        <div className="mt-auto flex flex-wrap gap-2 pt-5">
          {whatsapp && <Button asChild variant="outline" className="min-h-11"><a href={whatsapp} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp de ${partner.name} (nova aba)`}>WhatsApp</a></Button>}
          {instagram && <Button asChild variant="outline" className="min-h-11"><a href={instagram} target="_blank" rel="noopener noreferrer" aria-label={`Instagram de ${partner.name} (nova aba)`}>Instagram</a></Button>}
        </div>
      </div>
    </article>
  );
}

export function PartnersSection({ regions }: { regions: readonly string[] }) {
  const regionKey = JSON.stringify(partnerRegions(regions));
  const [result, setResult] = useState<{ key: string; partners: Partner[] }>();
  useEffect(() => {
    const controller = new AbortController();
    void getPartners(JSON.parse(regionKey) as string[], controller.signal).then((partners) => {
      if (!controller.signal.aborted) setResult({ key: regionKey, partners });
    }).catch(() => {
      // Optional content must never prevent reading an itinerary.
      if (!controller.signal.aborted) setResult({ key: regionKey, partners: [] });
    });
    return () => controller.abort();
  }, [regionKey]);
  if (result?.key !== regionKey || !result.partners.length) return null;
  return (
    <section className="mt-10" aria-labelledby="partners-title">
      <h2 id="partners-title" className="text-2xl font-bold">Parceiros da região</h2>
      <p className="mt-2 text-sm text-muted-foreground">Estabelecimentos parceiros que podem complementar sua viagem.</p>
      <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {result.partners.map((partner) => <PartnerCard key={partner.id} partner={partner} />)}
      </div>
    </section>
  );
}
