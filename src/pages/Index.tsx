import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RegionButton } from "@/components/RegionButton";
import { LoadingAnimation } from "@/components/LoadingAnimation";
import { RoteiroCard } from "@/components/RoteiroCard";
import { LocalCard } from "@/components/LocalCard";
import { MapView } from "@/components/MapView";
import { Hero } from "@/components/Hero";
import { QuickSuggestions } from "@/components/QuickSuggestions";
import { StatsBar } from "@/components/StatsBar";
import { BackgroundOrbs } from "@/components/BackgroundOrbs";
import { toast } from "sonner";
import { Sparkles, RotateCcw } from "lucide-react";

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

  const handleSuggestionClick = (suggestion: string) => {
    setUserInput((prev) => (prev ? `${prev}, ${suggestion}` : suggestion));
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

  const handleNewRoteiro = () => {
    setRoteiro(null);
    setUserInput("");
    setSelectedRegions([]);
  };

  return (
    <div className="min-h-screen animated-bg relative overflow-hidden">
      {/* Animated Background Orbs */}
      <BackgroundOrbs />
      
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-7xl relative z-10">
        {/* Hero Section */}
        {!roteiro && !isLoading && <Hero />}

        {/* Main Input Section */}
        {!roteiro && !isLoading && (
          <div className="space-y-8">
            {/* Input Card with Glassmorphism */}
            <div className="glass-advanced rounded-3xl p-8 shadow-2xl max-w-3xl mx-auto animate-scale-in">
              <div className="space-y-6">
                <div>
                  <label htmlFor="preferences" className="block text-base font-medium mb-4">
                    Conte-nos sobre suas preferências de viagem
                  </label>
                  <Textarea
                    id="preferences"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Ex: Quero conhecer praias tranquilas, fazer trilhas leves, experimentar a gastronomia local..."
                    className="min-h-[160px] text-base resize-none border-0 bg-background/50 focus-visible:ring-2 focus-visible:ring-primary"
                    maxLength={500}
                  />
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-sm text-muted-foreground">
                      {userInput.length}/500 caracteres
                    </p>
                  </div>
                </div>

                {/* Quick Suggestions */}
                <QuickSuggestions onSuggestionClick={handleSuggestionClick} />
              </div>
            </div>

            {/* Region Selection */}
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Selecione as regiões de interesse</h2>
                <p className="text-muted-foreground">
                  Escolha uma ou mais regiões que deseja explorar
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {regions.map((region, index) => (
                  <div
                    key={region.name}
                    className="animate-slide-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <RegionButton
                      region={region.name}
                      emoji={region.emoji}
                      isActive={selectedRegions.includes(region.name)}
                      onClick={() => toggleRegion(region.name)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <div className="flex justify-center pt-6">
              <Button
                size="xl"
                onClick={handleGenerateRoteiro}
                disabled={!userInput.trim() || selectedRegions.length === 0}
                className="gradient-primary text-white shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all"
              >
                <Sparkles className="w-5 h-5 mr-2 animate-spin-slow" />
                Gerar Roteiro Personalizado
              </Button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && <LoadingAnimation />}

        {/* Results Section */}
        {roteiro && !isLoading && (
          <div className="space-y-12 animate-fade-in">
            {/* Header with Action */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-3xl font-semibold mb-2">Seu Roteiro Personalizado</h2>
                <p className="text-muted-foreground">
                  Criado especialmente para você com inteligência artificial
                </p>
              </div>
              <Button
                onClick={handleNewRoteiro}
                variant="outline"
                size="lg"
                className="hover-lift"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Novo Roteiro
              </Button>
            </div>

            {/* Stats Bar */}
            <StatsBar locaisCount={roteiro.locais.length} />

            {/* Main Roteiro Card */}
            <RoteiroCard titulo={roteiro.titulo} descricao={roteiro.descricao} />

            {/* Locais Grid */}
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-semibold mb-2">Locais do Roteiro</h3>
                <p className="text-muted-foreground">
                  Explore cada destino e veja no mapa interativo
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roteiro.locais.map((local, index) => (
                  <div
                    key={index}
                    className="animate-slide-up"
                    style={{ 
                      animationDelay: `${index * 100}ms`,
                      animationFillMode: 'both'
                    }}
                  >
                    <LocalCard
                      index={index + 1}
                      nome={local.nome}
                      descricao={local.descricao}
                      onLocationClick={() => {
                        toast.info(`📍 ${local.nome}`, {
                          description: "Veja a localização no mapa abaixo"
                        });
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Map Section */}
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-semibold mb-2">Mapa Interativo</h3>
                <p className="text-muted-foreground">
                  Visualize todos os locais e a rota sugerida
                </p>
              </div>
              <MapView locais={roteiro.locais} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
