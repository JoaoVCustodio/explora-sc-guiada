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
      <div className="flex flex-wrap gap-2.5">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSuggestionClick(suggestion.text)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-primary hover:bg-primary/5 text-sm font-medium transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <span className="text-base">{suggestion.emoji}</span>
            <span>{suggestion.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
