import { useEffect, useState } from "react";
import type { ResolvedCardImage } from "@/features/media/card-images";
import { cn } from "@/lib/utils";

interface CardMediaProps {
  image: ResolvedCardImage;
  name: string;
  className?: string;
}

export function CardMedia({ image, name, className }: CardMediaProps) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [image.src]);

  const isIllustrative = image.isIllustrative || failed;
  const src = failed ? image.fallbackSrc : image.src;

  return (
    <div className={cn("card-media relative overflow-hidden bg-muted", className)}>
      <img
        src={src}
        alt={isIllustrative ? "" : `Foto de ${name}`}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className="h-full w-full object-cover"
        onError={() => setFailed(true)}
      />
      {isIllustrative && (
        <span className="absolute bottom-3 left-3 rounded-full border border-white/20 bg-foreground/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-card shadow-sm backdrop-blur-sm">
          Imagem ilustrativa
        </span>
      )}
    </div>
  );
}
