import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LoadingAnimation } from "@/components/LoadingAnimation";
import { RoteiroCard } from "@/components/RoteiroCard";
import { LocalCard } from "@/components/LocalCard";
import { MapView } from "@/components/MapView";
import { StatsBar } from "@/components/StatsBar";
import { InteractiveTourismBackground } from "@/components/InteractiveTourismBackground";
import { InterestsMultiSelect } from "@/components/InterestsMultiSelect";
import { RegionsMultiSelect } from "@/components/RegionsMultiSelect";
import { toast } from "sonner";
import { Sparkles, RotateCcw } from "lucide-react";

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
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [roteiro, setRoteiro] = useState<Roteiro | null>(null);

  const handleGenerateRoteiro = async () => {
    if (selectedRegions.length === 0) {
      toast.error("Por favor, selecione ao menos uma região!");
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
          interesses: selectedInterests,
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
    setSelectedInterests([]);
    setSelectedRegions([]);
  };

  return (
    <>
      {/* Background animado com z-index correto */}
      <div className="fixed inset-0 z-0">
        <InteractiveTourismBackground />
      </div>

      {/* Tela Inicial com Header Fixo */}
      {!roteiro && !isLoading && (
        <div className="h-screen flex flex-col overflow-hidden">
          {/* Header Fixo */}
          <header className="h-15 border-b bg-background/80 backdrop-blur-sm relative z-20 flex-shrink-0">
            <div className="container flex items-center h-full px-6">
              <div>
                <h1 className="text-xl font-bold gradient-text">Explora SC</h1>
                <p className="text-[10px] text-muted-foreground">
                  Roteiros personalizados por IA em Santa Catarina
                </p>
              </div>
            </div>
          </header>

          {/* Main Content Centralizado */}
          <main className="flex-1 flex items-center justify-center p-6 overflow-auto relative z-10">
            <div className="w-full max-w-[600px] animate-fade-in">
              <div className="glass-advanced rounded-2xl p-8 shadow-2xl space-y-5">
                
                {/* Campo de Texto */}
                <div className="space-y-2">
                  <Label htmlFor="preferences" className="text-sm font-medium">
                    ✍️ Descreva suas preferências (opcional)
                  </Label>
                  <Textarea
                    id="preferences"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Ex: Gosto de praias tranquilas, trilhas leves e boa gastronomia..."
                    className="min-h-[80px] text-sm resize-none border border-border/40 bg-white/80 dark:bg-gray-900/80 focus-visible:ring-2 focus-visible:ring-primary shadow-sm"
                    maxLength={300}
                  />
                  <p className="text-[10px] text-muted-foreground text-right">
                    {userInput.length}/300
                  </p>
                </div>
                
                {/* Interesses Multi-Select */}
                <InterestsMultiSelect
                  selected={selectedInterests}
                  onSelectionChange={setSelectedInterests}
                />
                
                {/* Regiões Multi-Select */}
                <RegionsMultiSelect 
                  selected={selectedRegions}
                  onSelectionChange={setSelectedRegions}
                />
                
                {/* Botão de Gerar Roteiro */}
                <Button
                  size="lg"
                  onClick={handleGenerateRoteiro}
                  disabled={selectedRegions.length === 0}
                  className="w-full gradient-primary text-white shadow-lg hover:shadow-xl transition-all"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Gerar Roteiro
                </Button>
                
              </div>
            </div>
          </main>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="min-h-screen flex items-center justify-center relative z-10">
          <LoadingAnimation />
        </div>
      )}

      {/* Results Section - INTOCADA */}
      {roteiro && !isLoading && (
        <div className="container mx-auto px-4 py-8 max-w-7xl relative z-10">
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
        </div>
      )}
    </>
  );
};

export default Index;
