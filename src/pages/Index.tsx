import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RegionButton } from "@/components/RegionButton";
import { LoadingAnimation } from "@/components/LoadingAnimation";
import { RoteiroCard } from "@/components/RoteiroCard";
import { LocalCard } from "@/components/LocalCard";
import { MapView } from "@/components/MapView";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

const regions = [
  { name: "Grande Florianópolis", emoji: "🏖️" },
  { name: "Serra Catarinense", emoji: "🏔️" },
  { name: "Litoral Norte", emoji: "🌊" },
  { name: "Vale Europeu", emoji: "🏘️" },
  { name: "Oeste Catarinense", emoji: "🌾" },
  { name: "Sul Catarinense", emoji: "🦞" },
  { name: "Planalto Norte", emoji: "🌲" },
];

interface Local {
  nome: string;
  descricao: string;
  latitude: number;
  longitude: number;
}

interface Roteiro {
  titulo: string;
  descricao: string;
  locais: Local[];
}

const Index = () => {
  const [userInput, setUserInput] = useState("");
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [roteiro, setRoteiro] = useState<Roteiro | null>(null);

  const toggleRegion = (regionName: string) => {
    setSelectedRegions((prev) =>
      prev.includes(regionName)
        ? prev.filter((r) => r !== regionName)
        : [...prev, regionName]
    );
  };

  const handleGenerateRoteiro = async () => {
    if (!userInput.trim() && selectedRegions.length === 0) {
      toast.error("Por favor, descreva suas preferências ou selecione ao menos uma região!");
      return;
    }

    setIsLoading(true);
    setRoteiro(null);

    try {
      const webhookUrl = "https://bot-pousada-n8n-n8n.rv3uyd.easypanel.host/webhook-test/analizer";
      
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          texto: userInput,
          regioes: selectedRegions,
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao gerar roteiro");
      }

      const data = await response.json();
      setRoteiro(data);
      toast.success("Roteiro gerado com sucesso! 🎉");
    } catch (error) {
      console.error("Error:", error);
      
      // Mock response for demonstration
      const mockRoteiro: Roteiro = {
        titulo: "Roteiro de 3 dias em Florianópolis",
        descricao: "Uma jornada inesquecível pelas praias paradisíacas, trilhas deslumbrantes e a rica gastronomia local da Ilha da Magia.",
        locais: [
          {
            nome: "Praia da Joaquina",
            descricao: "Famosa pelas ondas perfeitas para surf e o espetacular pôr do sol. Um paraíso para esportistas e amantes da natureza.",
            latitude: -27.6422,
            longitude: -48.4366,
          },
          {
            nome: "Lagoa da Conceição",
            descricao: "Centro gastronômico e cultural vibrante, cercado por belezas naturais. Ideal para praticar esportes aquáticos e desfrutar da vida noturna.",
            latitude: -27.5822,
            longitude: -48.4525,
          },
          {
            nome: "Projeto TAMAR",
            descricao: "Centro de preservação das tartarugas marinhas. Uma experiência educativa e inspiradora sobre conservação ambiental.",
            latitude: -27.5969,
            longitude: -48.5495,
          },
        ],
      };
      
      setRoteiro(mockRoteiro);
      toast.info("Usando roteiro de demonstração. Configure o webhook n8n para usar dados reais.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Header */}
        <header className="text-center mb-16 animate-fade-in">
          <h1 className="text-2xl md:text-3xl font-light mb-2 text-foreground tracking-tight">
            Explora SC
          </h1>
          <p className="text-xs text-muted-foreground">
            Roteiros personalizados em Santa Catarina
          </p>
        </header>

        {/* Main Input Section */}
        {!roteiro && (
          <div className="space-y-6 animate-scale-in max-w-3xl mx-auto">
            <div className="bg-card rounded-lg p-6 border border-border/50">
              <Textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Descreva como gostaria de viajar por Santa Catarina..."
                className="min-h-[120px] text-sm border-0 focus:border-0 focus-visible:ring-1 transition-smooth resize-none bg-transparent"
              />
            </div>

            {/* Region Selection */}
            <div className="space-y-3">
              <h2 className="text-xs font-normal text-muted-foreground text-center uppercase tracking-wide">
                Regiões
              </h2>
              <div className="flex flex-wrap gap-2 justify-center">
                {regions.map((region) => (
                  <RegionButton
                    key={region.name}
                    region={region.name}
                    emoji={region.emoji}
                    isActive={selectedRegions.includes(region.name)}
                    onClick={() => toggleRegion(region.name)}
                  />
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <div className="flex justify-center pt-2">
              <Button
                onClick={handleGenerateRoteiro}
                size="sm"
                className="text-xs px-6 py-2 bg-primary hover:bg-primary/90 transition-smooth"
                disabled={isLoading}
              >
                Gerar Roteiro
              </Button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && <LoadingAnimation />}

        {/* Results Section */}
        {roteiro && !isLoading && (
          <div className="space-y-8">
            {/* Main Roteiro Card */}
            <RoteiroCard titulo={roteiro.titulo} descricao={roteiro.descricao} />

            {/* Locais Cards */}
            <div>
              <h2 className="text-sm font-normal mb-4 text-muted-foreground uppercase tracking-wide">
                Locais
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {roteiro.locais.map((local, index) => (
                  <LocalCard
                    key={index}
                    nome={local.nome}
                    descricao={local.descricao}
                    onLocationClick={() => {
                      toast.info(`${local.nome}`);
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Map */}
            <div>
              <h2 className="text-sm font-normal mb-4 text-muted-foreground uppercase tracking-wide">
                Mapa
              </h2>
              <MapView locais={roteiro.locais} />
            </div>

            {/* New Search Button */}
            <div className="flex justify-center pt-6">
              <Button
                onClick={() => {
                  setRoteiro(null);
                  setUserInput("");
                  setSelectedRegions([]);
                }}
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground transition-smooth"
              >
                Novo Roteiro
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
