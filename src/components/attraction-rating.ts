const recordedRating = /\s*Avaliação registrada:\s*([1-5](?:[,.]\d)?)\s*\/\s*5\s*\(([\d.]+)\s+avaliaç(?:ão|ões)\)\.?\s*$/iu;

export function separateAttractionRating(description: string) {
  const match = recordedRating.exec(description);
  if (!match) return { description, rating: null };

  const average = Number(match[1].replace(",", "."));
  const count = Number(match[2].replace(/\./g, ""));
  if (average > 5 || !Number.isSafeInteger(count) || count < 1) return { description, rating: null };

  return {
    description: description.slice(0, match.index).trim(),
    rating: { average, count },
  };
}
