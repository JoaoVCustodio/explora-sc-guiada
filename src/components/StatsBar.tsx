import { MapPin, Clock, TrendingUp } from "lucide-react";

interface StatsBarProps {
  locaisCount: number;
}

export const StatsBar = ({ locaisCount }: StatsBarProps) => {
  return (
    <div className="flex flex-wrap items-center justify-center gap-6 py-6 px-6 rounded-xl glass animate-scale-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <MapPin className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-semibold">{locaisCount}</p>
          <p className="text-sm text-muted-foreground">Locais</p>
        </div>
      </div>
      
      <div className="w-px h-12 bg-border" />
      
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
          <Clock className="w-5 h-5 text-secondary" />
        </div>
        <div>
          <p className="text-2xl font-semibold">{locaisCount * 3}h</p>
          <p className="text-sm text-muted-foreground">Duração</p>
        </div>
      </div>
    </div>
  );
};
