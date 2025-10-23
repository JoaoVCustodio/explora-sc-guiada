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
    <div className="flex flex-wrap gap-1.5">
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => onSuggestionClick(suggestion.text)}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-[10px] font-medium transition-colors"
        >
          <span>{suggestion.emoji}</span>
          <span>{suggestion.text}</span>
        </button>
      ))}
    </div>
  );
};
