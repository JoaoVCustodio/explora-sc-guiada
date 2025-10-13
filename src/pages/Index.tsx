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
      // Replace with your n8n webhook URL
      const webhookUrl = "YOUR_N8N_WEBHOOK_URL";
      
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
        <header className="text-center mb-12 animate-fade-in">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Explora SC ✨
          </h1>
          <p className="text-xl text-muted-foreground">
            Descubra roteiros personalizados e explore Santa Catarina como nunca antes
          </p>
        </header>

        {/* Main Input Section */}
        {!roteiro && (
          <div className="space-y-8 animate-scale-in">
            <div className="bg-card shadow-elegant rounded-2xl p-8 border border-primary/10">
              <Textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Descreva como gostaria de viajar por Santa Catarina..."
                className="min-h-[150px] text-lg border-2 border-input focus:border-primary transition-smooth resize-none"
              />
            </div>

            {/* Region Selection */}
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-center">
                Selecione as regiões de interesse 🗺️
              </h2>
              <div className="flex flex-wrap gap-3 justify-center">
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
            <div className="flex justify-center">
              <Button
                onClick={handleGenerateRoteiro}
                size="lg"
                className="gradient-primary text-lg px-12 py-6 shadow-elegant hover:scale-105 transition-smooth"
                disabled={isLoading}
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Gerar Roteiro Personalizado
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
              <h2 className="text-3xl font-bold mb-6 text-center">
                Lugares para Visitar 📍
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roteiro.locais.map((local, index) => (
                  <LocalCard
                    key={index}
                    nome={local.nome}
                    descricao={local.descricao}
                    onLocationClick={() => {
                      toast.info(`📍 ${local.nome}`);
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Map */}
            <div>
              <h2 className="text-3xl font-bold mb-6 text-center">
                Mapa do Roteiro 🗺️
              </h2>
              <MapView locais={roteiro.locais} />
            </div>

            {/* New Search Button */}
            <div className="flex justify-center pt-8">
              <Button
                onClick={() => {
                  setRoteiro(null);
                  setUserInput("");
                  setSelectedRegions([]);
                }}
                variant="outline"
                size="lg"
                className="border-2 border-primary hover:bg-primary hover:text-primary-foreground transition-smooth"
              >
                Criar Novo Roteiro
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
