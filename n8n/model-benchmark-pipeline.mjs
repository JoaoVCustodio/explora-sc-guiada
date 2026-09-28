export const BASES = [
  ['Grande Florianópolis', 'base_Florianopolis', 'Florianopolis'],
  ['Serra Catarinense', 'base_SerraCatarinense', 'Serra Catarinense'],
  ['Litoral Norte', 'base_LitoralNorte', 'Litoral Norte'],
  ['Vale Europeu', 'base_ValeEuropeu', 'Vale Europeu'],
  ['Oeste Catarinense', 'base_OesteCatarinense', 'Oeste Catarinense'],
  ['Sul Catarinense', 'base_LitoralSul', 'Litoral Sul'],
  ['Planalto Norte', 'base_NorteCatarinense', 'Norte Catarinense'],
];

export function planRequest(body, executionId, now = Date.now()) {
  const interests = ['praias', 'montanhas', 'gastronomia', 'arte', 'esportes', 'ecoturismo'];
  if (!body || !Number.isInteger(body.dias) || body.dias < 1 || body.dias > 7 ||
      !Array.isArray(body.regioes) || !body.regioes.length || body.regioes.length > 8 ||
      body.regioes.some(r => !BASES.some(b => b[0] === r)) ||
      !Array.isArray(body.interesses) || body.interesses.length > 12 ||
      body.interesses.some(i => !interests.includes(i)) ||
      typeof body.texto !== 'string' || body.texto.length > 300) throw new Error('INVALID_REQUEST');
  const bases = BASES.filter(b => body.regioes.includes(b[0]));
  return {
    preferences: { dias: body.dias, regioes: [...new Set(body.regioes)], interesses: [...new Set(body.interesses)], texto: body.texto.trim() },
    bases,
    ranges: bases.map(b => `'${b[2]}'`),
    requestId: typeof body.requestId === 'string' && /^[0-9a-f-]{36}$/i.test(body.requestId) ? body.requestId : `n8n-${executionId}`,
    startedAt: now,
  };
}

export function parseCell(value, fallback) {
  let parsed = value;
  for (let i = 0; i < 3 && typeof parsed === 'string'; i++) {
    try { parsed = JSON.parse(parsed); } catch { break; }
  }
  return parsed === '' || parsed == null ? fallback : parsed;
}

export function fold(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[_\W]+/g, ' ').trim();
}

export function compactHours(hours) {
  const groups = new Map();
  for (const value of hours) {
    const split = value.indexOf(':');
    if (split < 0) { groups.set(value, []); continue; }
    const day = value.slice(0, split);
    const schedule = value.slice(split + 1).trim();
    if (!groups.has(schedule)) groups.set(schedule, []);
    groups.get(schedule).push(day);
  }
  return [...groups].map(([schedule, days]) => days.length ? `${days.join(',')}: ${schedule}` : schedule);
}

export const SIGNALS = {
  praias: ['beach', 'praia', 'seaside', 'island', 'ilha', 'natural_feature'],
  montanhas: ['mountain', 'montanha', 'morro', 'serra', 'hiking', 'trilha', 'mirante', 'canyon', 'canion', 'adventure'],
  gastronomia: ['restaurant', 'restaurante', 'food', 'cafe', 'bar', 'bakery', 'brewery', 'cervejaria', 'vinicola', 'winery'],
  arte: ['museum', 'museu', 'art', 'galeria', 'historical', 'historico', 'cultural', 'cultura', 'theater', 'teatro', 'church', 'igreja'],
  esportes: ['surf', 'water_sports', 'aquatic', 'esporte', 'sports', 'kayak', 'caiaque', 'sailing', 'vela', 'mergulho', 'diving', 'rafting', 'beach', 'praia'],
  ecoturismo: ['park', 'parque', 'hiking', 'trilha', 'waterfall', 'cachoeira', 'nature', 'natural', 'ecologico', 'reserve', 'reserva', 'forest', 'floresta'],
};

export const TEXT_SIGNALS = [
  { words: ['praia', 'praias', 'mar'], terms: SIGNALS.praias },
  { words: ['trilha', 'trilhas', 'montanha', 'montanhas', 'aventura'], terms: SIGNALS.montanhas },
  { words: ['comida', 'gastronomia', 'restaurante', 'restaurantes', 'comer'], terms: SIGNALS.gastronomia },
  { words: ['bar', 'bares'], terms: ['bar', 'pub', 'restaurant'] },
  { words: ['arte', 'historia', 'museu', 'museus'], terms: SIGNALS.arte },
  { words: ['esporte', 'esportes', 'surf', 'surfar', 'mergulho'], terms: SIGNALS.esportes },
  { words: ['natureza', 'ecoturismo', 'cachoeira', 'cachoeiras'], terms: SIGNALS.ecoturismo },
  { words: ['crianca', 'criancas', 'familia', 'infantil'], terms: ['goodforchildren true', 'menuforchildren true', 'playground', 'park'] },
  { words: ['cachorro', 'cachorros', 'pet', 'pets'], terms: ['allowsdogs true'] },
  { words: ['musica', 'show'], terms: ['livemusic true', 'concert', 'theater'] },
  { words: ['grupo', 'grupos'], terms: ['goodforgroups true'] },
];

export function normalizeCandidates(response, plan) {
  if (!Array.isArray(response?.valueRanges) || response.valueRanges.length !== plan.bases.length) throw new Error('INVALID_SHEETS_RESPONSE');
  const places = new Map();
  const stats = { rows: 0, invalid: 0, duplicates: 0, conflicts: 0, emptyBases: 0 };
  response.valueRanges.forEach((sheet, index) => {
    const values = sheet.values ?? [];
    if (!values.length) { stats.emptyBases++; return; }
    const headers = values[0].map(String);
    if (!['id', 'displayName', 'location', 'types'].every(key => headers.includes(key))) throw new Error('INVALID_SHEETS_COLUMNS');
    if (values.length === 1) stats.emptyBases++;
    for (const cells of values.slice(1)) {
      if (!cells.some(c => c !== '' && c != null)) continue;
      stats.rows++;
      const row = Object.fromEntries(headers.map((key, i) => [key, cells[i] ?? '']));
      const location = parseCell(row.location, {});
      const name = parseCell(row.displayName, {});
      const types = parseCell(row.types, []);
      const lat = location?.latitude, lon = location?.longitude;
      if (typeof row.id !== 'string' || !row.id.trim() || typeof name?.text !== 'string' || !name.text.trim() || name.text.length > 120 ||
          !Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lon) || Math.abs(lon) > 180 ||
          !Array.isArray(types) || row.businessStatus === 'CLOSED_PERMANENTLY') { stats.invalid++; continue; }
      const attrs = {};
      for (const key of ['goodForChildren','liveMusic','menuForChildren','allowsDogs','goodForGroups','goodForWatchingSports']) {
        const value = parseCell(row[key], null);
        if (typeof value === 'boolean') attrs[key] = value;
      }
      const hours = parseCell(row.regularOpeningHours, {});
      const schedule = Array.isArray(hours?.weekdayDescriptions) ? hours.weekdayDescriptions.filter(x => typeof x === 'string') : [];
      const place = {
        realId: row.id.trim(), name: name.text.trim(), lat, lon,
        types: [...new Set(types.filter(t => typeof t === 'string' && !['establishment', 'point_of_interest'].includes(t)))].sort(),
        regions: [plan.bases[index][0]], address: String(row.formattedAddress || ''),
        rating: Number(row.rating) || undefined, reviews: Number(row.userRatingCount) || undefined,
        status: row.businessStatus || undefined, attrs, hours: schedule,
        price: row.priceLevel || undefined, priceRange: parseCell(row.priceRange, undefined),
      };
      const prior = places.get(place.realId);
      if (!prior) { places.set(place.realId, place); continue; }
      stats.duplicates++;
      if (Math.abs(prior.lat - lat) > 0.001 || Math.abs(prior.lon - lon) > 0.001) stats.conflicts++;
      prior.types = [...new Set([...prior.types, ...place.types])].sort();
      prior.regions = [...new Set([...prior.regions, ...place.regions])];
      for (const [key, value] of Object.entries(attrs)) {
        if (prior.attrs[key] === undefined) prior.attrs[key] = value;
        else if (prior.attrs[key] !== value) { delete prior.attrs[key]; prior.conflictingAttrs = [...new Set([...(prior.conflictingAttrs ?? []), key])]; }
      }
      for (const key of prior.conflictingAttrs ?? []) delete prior.attrs[key];
      if (!prior.hours.length) prior.hours = schedule;
      if (!prior.address) prior.address = place.address;
    }
  });
  return { places: [...places.values()].sort((a,b) => a.realId.localeCompare(b.realId)), stats };
}

export function selectCandidates(places, preferences) {
  if (!places.length) throw new Error('NO_CANDIDATES');
  const text = fold(preferences.texto);
  const stop = new Set('a o as os de da do das dos e em na no nas nos um uma uns umas para por com sem que eu me meu minha meus minhas quero queria gostaria gosto visitar conhecer fazer ir ter tem ao aos perto acesso dias dia roteiro viagem passeios passeio prefiro preferencia muito mais menos nao'.split(' '));
  const tokens = [...new Set(text.split(' ').filter(t => t.length > 2 && !stop.has(t)))];
  const textSignals = TEXT_SIGNALS.filter(group => group.words.some(w => tokens.includes(w)));
  const matchedTokens = new Set();
  const match = (haystack, term) => (` ${haystack} `).includes(` ${fold(term)} `);
  const ranked = places.map(place => {
    const haystack = fold([place.name, place.address, ...place.types, ...Object.entries(place.attrs).map(([k,v])=>`${k} ${v}`)].join(' '));
    const hits = tokens.filter(t => match(haystack, t));
    hits.forEach(t => matchedTokens.add(t));
    const interests = preferences.interesses.filter(i => SIGNALS[i].some(s => match(haystack, s)));
    const signals = textSignals.filter(g => g.terms.some(s => match(haystack, s)));
    const name = fold(place.name);
    const named = name.length > 4 && text.includes(name);
    const score = (named ? 100 : 0) + hits.length * 4 + signals.length * 5 + interests.length * 4 +
      Math.min(1, Math.log10(1 + (place.reviews ?? 0)) / 4) + (place.rating ?? 0) / 5;
    return { place, interests, signals, named, score, relevant: named || hits.length > 0 || interests.length > 0 || signals.length > 0 };
  }).sort((a,b) => b.score - a.score || a.place.realId.localeCompare(b.place.realId));
  const understood = new Set([...matchedTokens, ...textSignals.flatMap(g => g.words)]);
  const unknown = tokens.filter(t => !understood.has(t));
  const missingInterests = preferences.interesses.filter(i => !ranked.some(r => r.interests.includes(i)));
  const lowConfidence = /\b(nao|sem|evitar|evite)\b/.test(text) || unknown.length > 0 || missingInterests.length > 0 ||
    textSignals.some(g => !ranked.some(r => r.signals.includes(g)));
  const sparse = ranked.filter(r => r.relevant).length < preferences.dias * 6;
  const baseBudget = Math.max(32, preferences.dias * 12 + preferences.regioes.length * 8);
  const budget = Math.min(places.length, Math.ceil(baseBudget * (lowConfidence || sparse ? 1.75 : 1)));
  const chosen = new Map();
  const add = r => { if (r) chosen.set(r.place.realId, r); };
  ranked.filter(r => r.named).forEach(add);
  const queues = [
    ...preferences.regioes.map(region => ranked.filter(r => r.place.regions.includes(region))),
    ...preferences.interesses.map(i => ranked.filter(r => r.interests.includes(i))),
    ...textSignals.map(g => ranked.filter(r => r.signals.includes(g))),
  ];
  for (let round = 0; round < Math.max(3, preferences.dias); round++) for (const queue of queues) {
    if (chosen.size < budget) add(queue[round]);
  }
  const bucketCounts = new Map();
  const buckets = r => [...r.place.types.map(t=>`type:${t}`), ...r.place.regions.map(g=>`region:${g}`), `geo:${Math.floor(r.place.lat*10)},${Math.floor(r.place.lon*10)}`];
  const mark = r => buckets(r).forEach(b => bucketCounts.set(b, (bucketCounts.get(b) ?? 0) + 1));
  chosen.forEach(mark);
  while (chosen.size < budget) {
    let best, bestScore = -Infinity;
    for (const r of ranked) if (!chosen.has(r.place.realId)) {
      const diversity = buckets(r).reduce((sum,b) => sum + 1 / (1 + (bucketCounts.get(b) ?? 0)), 0) / Math.max(1,buckets(r).length);
      const score = r.score + diversity * 7;
      if (score > bestScore) { best = r; bestScore = score; }
    }
    if (!best) break;
    add(best); mark(best);
  }
  return {
    places: [...chosen.values()].sort((a,b)=> b.score-a.score || a.place.realId.localeCompare(b.place.realId)).map(r=>r.place),
    stats: { available: places.length, selected: chosen.size, budget, expanded: lowConfidence || sparse, lowConfidence, sparse, unknownTermCount: unknown.length, missingInterestCount: missingInterests.length },
  };
}

export function prepareCandidates(response, plan, now = Date.now()) {
  const normalized = normalizeCandidates(response, plan);
  const selected = selectCandidates(normalized.places, plan.preferences);
  const catalog = selected.places.map((p,i) => ({ ...p, id: `p${i+1}` }));
  const candidates = catalog.map(p => ({
    id: p.id, n: p.name, t: p.types, r: p.regions, c: [p.lat,p.lon], a: p.address,
    q: p.rating ? [p.rating,p.reviews ?? 0] : undefined, h: p.hours.length ? compactHours(p.hours) : undefined,
    f: Object.keys(p.attrs).length ? p.attrs : undefined, price: p.price, priceRange: p.priceRange, status: p.status !== 'OPERATIONAL' ? p.status : undefined,
  }));
  const context = JSON.stringify({ preferencias_usuario: plan.preferences, bases_consultadas: plan.bases.map(b=>b[1]), selecao_ampliada: selected.stats.expanded, fatos_atracoes: candidates });
  return { catalog, context, preferences: plan.preferences, bases: plan.bases, requestId: plan.requestId, startedAt: plan.startedAt, preparedAt: now,
    metrics: { ...normalized.stats, ...selected.stats, contextChars: context.length, beforeModelMs: now-plan.startedAt } };
}

export function hydrateItinerary(raw, prepared) {
  let itinerary = raw;
  if (typeof raw === 'string') {
    let text = raw.trim();
    if (text.startsWith('```')) text = text.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
    itinerary = JSON.parse(text);
  }
  if (!itinerary || typeof itinerary !== 'object' || Array.isArray(itinerary)) throw new Error('INVALID_MODEL_OUTPUT');
  if (!itinerary || !Array.isArray(itinerary.dias) || itinerary.dias.length !== prepared.preferences.dias) throw new Error('INVALID_MODEL_DAYS');
  const byId = new Map(prepared.catalog.map(p=>[p.id,p]));
  const used = new Set();
  let order = 0;
  return { titulo: itinerary.titulo, descricao_geral: itinerary.descricao_geral,
    dias: itinerary.dias.map((day,index) => {
      if (day.dia !== index+1 || !Array.isArray(day.locais)) throw new Error('INVALID_MODEL_DAY');
      return { dia: day.dia, locais: day.locais.map(local => {
        const place = byId.get(local.id);
        if (!place || used.has(place.realId)) throw new Error('INVALID_OR_DUPLICATE_PLACE');
        used.add(place.realId);
        return { ordem: ++order, periodo: local.periodo, nome: place.name, descricao_curta: local.descricao_curta,
          duracao_estimada: local.duracao_estimada, latitude: place.lat, longitude: place.lon };
      }) };
    }), fonte: prepared.bases.map(b=>b[1]).join(', ') };
}
