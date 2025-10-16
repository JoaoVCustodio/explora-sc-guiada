interface QuickSuggestionsProps {
  onSuggestionClick: (suggestion: string) => void;
}

const suggestions = [
  { emoji: "🏖️", text: "Praias e natureza" },
  { emoji: "🏔️", text: "Montanhas e aventura" },
  { emoji: "🍽️", text: "Gastronomia e cultura" },
  { emoji: "🎨", text: "Arte e história" },
  { emoji: "🌊", text: "Esportes aquáticos" },
  { emoji: "🌲", text: "Ecoturismo" },
];

export const QuickSuggestions = ({ onSuggestionClick }: QuickSuggestionsProps) => {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground font-medium">Sugestões rápidas</p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSuggestionClick(suggestion.text)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted hover:bg-muted/80 text-sm font-medium transition-smooth hover-lift hover:shadow-md"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <span>{suggestion.emoji}</span>
            <span>{suggestion.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
