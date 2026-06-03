// Full species database — from common herbs to ultra-rare specimens
// Each entry has: id, scientific_name, common_name_th, common_name_en, synonyms[], category, care_level, light

export interface SpeciesEntry {
  id: string;
  scientific_name: string;
  common_name_th: string;
  common_name_en: string;
  synonyms: string[];
  category: 'aroid' | 'hoya' | 'cactus' | 'succulent' | 'fern' | 'orchid' | 'herb' | 'flowering' | 'foliage' | 'tree' | 'climber' | 'other';
  care_level: 'easy' | 'moderate' | 'advanced';
  light_requirement: string;
  water_requirement: string;
  description: string;
  price_range_low: number;
  price_range_high: number;
  popularity_score: number; // 1-100
}

// Normalize a species name for matching (lowercase, remove special chars)
export function normalizeSpeciesName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9\s]/g, ' ') // remove special chars
    .replace(/\s+/g, ' ')
    .trim();
}

// Search species with fuzzy matching
export function searchSpecies(query: string, limit: number = 10): SpeciesEntry[] {
  if (!query || query.length < 2) return [];
  const norm = normalizeSpeciesName(query);
  const terms = norm.split(' ').filter(t => t.length >= 2);

  return ALL_SPECIES.map(s => {
    const sciNorm = normalizeSpeciesName(s.scientific_name);
    const enNorm = normalizeSpeciesName(s.common_name_en);
    const thNorm = normalizeSpeciesName(s.common_name_th);
    const allSynonyms = s.synonyms.map(normalizeSpeciesName).join(' ');

    let score = 0;
    for (const term of terms) {
      // Exact match on scientific name = highest score
      if (sciNorm === norm) score += 100;
      else if (sciNorm.startsWith(norm)) score += 80;
      else if (sciNorm.includes(norm)) score += 60;
      else if (sciNorm.includes(term)) score += 40;

      // Common name matches
      if (enNorm === norm) score += 70;
      else if (enNorm.startsWith(norm)) score += 50;
      else if (enNorm.includes(norm)) score += 35;
      else if (enNorm.includes(term)) score += 25;

      if (thNorm.includes(term)) score += 30;

      // Synonym matches
      if (allSynonyms.includes(term)) score += 20;
    }

    // Boost popular species slightly
    score += s.popularity_score * 0.1;

    return { species: s, score };
  })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(r => r.species);
}

// Get a species by exact normalized name (for dedup during listing creation)
export function findExactSpecies(name: string): SpeciesEntry | undefined {
  const norm = normalizeSpeciesName(name);
  return ALL_SPECIES.find(s => {
    const sci = normalizeSpeciesName(s.scientific_name);
    const en = normalizeSpeciesName(s.common_name_en);
    const th = normalizeSpeciesName(s.common_name_th);
    return sci === norm || en === norm || th === norm || s.synonyms.some(syn => normalizeSpeciesName(syn) === norm);
  });
}

// Get or create species — returns existing match or a new "other" entry
export function resolveSpecies(input: string): SpeciesEntry {
  const existing = findExactSpecies(input);
  if (existing) return existing;

  // Try fuzzy search
  const results = searchSpecies(input, 1);
  if (results.length > 0 && input.length >= 3) return results[0];

  // Return as a custom/unlisted species
  return {
    id: `custom-${Date.now()}`,
    scientific_name: input.trim(),
    common_name_th: '',
    common_name_en: input.trim(),
    synonyms: [],
    category: 'other',
    care_level: 'moderate',
    light_requirement: 'Bright indirect',
    water_requirement: 'Moderate',
    description: '',
    price_range_low: 0,
    price_range_high: 0,
    popularity_score: 0,
  };
}

// Top species by category for browse/browse by category
export function getSpeciesByCategory(category: string): SpeciesEntry[] {
  return ALL_SPECIES.filter(s => s.category === category).sort((a, b) => b.popularity_score - a.popularity_score);
}

export function getPopularSpecies(limit: number = 20): SpeciesEntry[] {
  return [...ALL_SPECIES].sort((a, b) => b.popularity_score - a.popularity_score).slice(0, limit);
}

export const CATEGORIES = [
  { value: 'herb', label: 'Herbs', icon: 'Leaf', desc: 'Basil, mint, lemongrass, culantro' },
  { value: 'foliage', label: 'Foliage', icon: 'TreePine', desc: 'Snake plant, pothos, ferns, ZZ' },
  { value: 'aroid', label: 'Aroids', icon: 'Heart', desc: 'Monstera, philodendron, anthurium, alocasia' },
  { value: 'succulent', label: 'Succulents', icon: 'Diamond', desc: 'Echeveria, haworthia, sedum' },
  { value: 'cactus', label: 'Cacti', icon: 'CircleDot', desc: 'All cactus varieties' },
  { value: 'hoya', label: 'Hoyas', icon: 'Sparkles', desc: 'All Hoya varieties' },
  { value: 'orchid', label: 'Orchids', icon: 'Flower2', desc: 'Dendrobium, phalaenopsis, vanda' },
  { value: 'flowering', label: 'Flowering', icon: 'Flower', desc: 'Peace lily, hibiscus, jasmine, rose' },
  { value: 'fern', label: 'Ferns', icon: 'Wind', desc: 'Bird nest fern, maidenhair, staghorn' },
  { value: 'climber', label: 'Climbers', icon: 'ArrowUpRight', desc: 'Ivy, monstera, climbing philodendron' },
  { value: 'tree', label: 'Trees', icon: 'TreeDeciduous', desc: 'Fiddle leaf fig, olive, money tree' },
  { value: 'other', label: 'Other', icon: 'HelpCircle', desc: 'Everything else' },
] as const;

// 120+ species covering the full spectrum
export const ALL_SPECIES: SpeciesEntry[] = [
  // === HERBS (the cheap everyday stuff) ===
  { id: 'sp-herb-1', scientific_name: 'Ocimum basilicum', common_name_th: 'โหระพา', common_name_en: 'Sweet Basil', synonyms: ['basil', 'thai basil', 'bai horapa'], category: 'herb', care_level: 'easy', light_requirement: 'Full sun', water_requirement: 'Keep moist', description: 'The quintessential Thai cooking herb. Fast-growing, aromatic leaves essential for stir-fries and curries.', price_range_low: 10, price_range_high: 50, popularity_score: 95 },
  { id: 'sp-herb-2', scientific_name: 'Ocimum basilicum var. thyrsiflorum', common_name_th: 'กะเพรา', common_name_en: 'Holy Basil', synonyms: ['kaphrao', 'kra prao', 'bai kraphrao'], category: 'herb', care_level: 'easy', light_requirement: 'Full sun', water_requirement: 'Keep moist', description: 'The non-substitutable star of pad kraphrao. Peppery, clove-like flavour.', price_range_low: 10, price_range_high: 50, popularity_score: 92 },
  { id: 'sp-herb-3', scientific_name: 'Mentha spicata', common_name_th: 'สะระแหน่', common_name_en: 'Spearmint', synonyms: ['mint', 'common mint'], category: 'herb', care_level: 'easy', light_requirement: 'Partial shade', water_requirement: 'Keep moist', description: 'Refreshing mint for drinks, salads, and Thai larb.', price_range_low: 10, price_range_high: 40, popularity_score: 88 },
  { id: 'sp-herb-4', scientific_name: 'Cymbopogon citratus', common_name_th: 'ตะไคร้', common_name_en: 'Lemongrass', synonyms: ['lemongrass', 'bai takrai'], category: 'herb', care_level: 'easy', light_requirement: 'Full sun', water_requirement: 'Moderate', description: 'Citrusy stalks essential for tom yum and Thai curries.', price_range_low: 15, price_range_high: 60, popularity_score: 85 },
  { id: 'sp-herb-5', scientific_name: 'Eryngium foetidum', common_name_th: 'ผักชีฝรั่ง', common_name_en: 'Culantro', synonyms: ['sawtooth coriander', 'ngò gai', 'pak chee farang'], category: 'herb', care_level: 'easy', light_requirement: 'Partial shade', water_requirement: 'Keep moist', description: 'Pungent cilantro substitute that thrives in Thai heat.', price_range_low: 10, price_range_high: 40, popularity_score: 78 },
  { id: 'sp-herb-6', scientific_name: 'Coriandrum sativum', common_name_th: 'ผักชี', common_name_en: 'Cilantro', synonyms: ['coriander', 'chinese parsley', 'pak chee'], category: 'herb', care_level: 'easy', light_requirement: 'Partial shade', water_requirement: 'Keep moist', description: 'Delicate leaves for garnishing. Bolts quickly in heat.', price_range_low: 10, price_range_high: 40, popularity_score: 82 },
  { id: 'sp-herb-7', scientific_name: 'Allium tuberosum', common_name_th: 'กุยช่าย', common_name_en: 'Garlic Chives', synonyms: ['chinese chives', 'kuichai'], category: 'herb', care_level: 'easy', light_requirement: 'Full sun to partial', water_requirement: 'Moderate', description: 'Flat chives with mild garlic flavour. Used in stir-fries and dumplings.', price_range_low: 10, price_range_high: 35, popularity_score: 72 },
  { id: 'sp-herb-8', scientific_name: 'Pandanus amaryllifolius', common_name_th: 'เตย', common_name_en: 'Pandan', synonyms: ['bai toey', 'pandan leaf', 'screwpine'], category: 'herb', care_level: 'easy', light_requirement: 'Bright indirect', water_requirement: 'Keep moist', description: 'Fragrant leaves used in Thai desserts and aromatic rice.', price_range_low: 20, price_range_high: 80, popularity_score: 80 },
  { id: 'sp-herb-9', scientific_name: 'Murraya koenigii', common_name_th: 'ใบกะหรี่', common_name_en: 'Curry Leaf', synonyms: ['curry leaves', 'karapincha'], category: 'herb', care_level: 'moderate', light_requirement: 'Full sun', water_requirement: 'Moderate', description: 'Aromatic leaves used in southern Thai curries.', price_range_low: 30, price_range_high: 120, popularity_score: 55 },
  { id: 'sp-herb-10', scientific_name: 'Mentha aquatica', common_name_th: 'ใบยี่หุ่น', common_name_en: 'Thai Mint', synonyms: ['bai yira', 'vietnamese mint'], category: 'herb', care_level: 'easy', light_requirement: 'Partial shade', water_requirement: 'Wet soil', description: 'Peppery herb used in miang kham and fresh spring rolls.', price_range_low: 10, price_range_high: 40, popularity_score: 65 },
  { id: 'sp-herb-11', scientific_name: 'Persicaria odorata', common_name_th: 'ผักไผ่', common_name_en: 'Vietnamese Coriander', synonyms: ['laksa leaf', 'ram ram', 'phak phai'], category: 'herb', care_level: 'easy', light_requirement: 'Partial shade', water_requirement: 'Keep moist', description: 'Spicy, coriander-like leaves that thrive in humidity.', price_range_low: 15, price_range_high: 50, popularity_score: 60 },

  // === FOLIAGE (the popular affordable houseplants) ===
  { id: 'sp-fol-1', scientific_name: 'Dracaena trifasciata', common_name_th: 'ลิ้นมังกร', common_name_en: 'Snake Plant', synonyms: ['sansevieria', "mother-in-law's tongue", 'tongue plant'], category: 'foliage', care_level: 'easy', light_requirement: 'Low to bright', water_requirement: 'Low', description: 'Nearly indestructible. Tolerates neglect, low light, and irregular watering.', price_range_low: 50, price_range_high: 500, popularity_score: 93 },
  { id: 'sp-fol-2', scientific_name: 'Epipremnum aureum', common_name_th: 'พลูด่าง', common_name_en: 'Golden Pothos', synonyms: ['devils ivy', 'pothos', 'money plant'], category: 'foliage', care_level: 'easy', light_requirement: 'Low to bright', water_requirement: 'Moderate', description: 'The ultimate beginner plant. Trails beautifully, incredibly forgiving.', price_range_low: 30, price_range_high: 300, popularity_score: 91 },
  { id: 'sp-fol-3', scientific_name: 'Zamioculcas zamiifolia', common_name_th: 'กวักมรกต', common_name_en: 'ZZ Plant', synonyms: ['zanzibar gem', 'emerald palm'], category: 'foliage', care_level: 'easy', light_requirement: 'Low to bright', water_requirement: 'Low', description: 'Glossy, dark green leaves. Thrives on neglect.', price_range_low: 80, price_range_high: 600, popularity_score: 87 },
  { id: 'sp-fol-4', scientific_name: 'Spathiphyllum wallisii', common_name_th: 'หน้าวัวใบ', common_name_en: 'Peace Lily', synonyms: ['white sails', 'peace lily plant'], category: 'foliage', care_level: 'easy', light_requirement: 'Low to medium', water_requirement: 'Keep moist', description: 'Elegant white flowers, air purifier. Droops when thirsty — tells you when to water.', price_range_low: 60, price_range_high: 500, popularity_score: 89 },
  { id: 'sp-fol-5', scientific_name: 'Chlorophytum comosum', common_name_th: 'เศรษฐีเรือนใน', common_name_en: 'Spider Plant', synonyms: ['airplane plant', 'spider ivy', 'ribbon plant'], category: 'foliage', care_level: 'easy', light_requirement: 'Bright indirect', water_requirement: 'Moderate', description: 'Produces baby plantlets on long arching stems. Great for propagation.', price_range_low: 30, price_range_high: 200, popularity_score: 83 },
  { id: 'sp-fol-6', scientific_name: 'Asplenium nidus', common_name_th: 'เฟิร์นข้าหลวง', common_name_en: "Bird's Nest Fern", synonyms: ['nest fern'], category: 'foliage', care_level: 'moderate', light_requirement: 'Medium indirect', water_requirement: 'High humidity', description: 'Bright green wavy fronds emerging from a central rosette.', price_range_low: 80, price_range_high: 500, popularity_score: 78 },
  { id: 'sp-fol-7', scientific_name: 'Ficus lyrata', common_name_th: 'ไทรใบสัก', common_name_en: 'Fiddle Leaf Fig', synonyms: ['fiddle leaf', 'ficus'], category: 'foliage', care_level: 'moderate', light_requirement: 'Bright indirect', water_requirement: 'Moderate', description: 'Large violin-shaped glossy leaves. Dramatic statement piece but finicky.', price_range_low: 200, price_range_high: 3000, popularity_score: 85 },
  { id: 'sp-fol-8', scientific_name: 'Ctenanthe burle-marxii', common_name_th: 'คเทนันเท้', common_name_en: 'Fishbone Prayer Plant', synonyms: ['never never plant'], category: 'foliage', care_level: 'moderate', light_requirement: 'Medium indirect', water_requirement: 'Keep moist', description: 'Silver-green striped leaves with purple undersides.', price_range_low: 150, price_range_high: 600, popularity_score: 65 },
  { id: 'sp-fol-9', scientific_name: 'Aglaonema commutatum', common_name_th: 'แก้วกาญจน์', common_name_en: 'Chinese Evergreen', synonyms: ['aglaonema', 'silver bay'], category: 'foliage', care_level: 'easy', light_requirement: 'Low to bright', water_requirement: 'Moderate', description: 'Variegated leaves in silver, green, and pink. Excellent low-light plant.', price_range_low: 80, price_range_high: 800, popularity_score: 75 },
  { id: 'sp-fol-10', scientific_name: 'Calathea orbifolia', common_name_th: 'คล้าด่างขาว', common_name_en: 'Round-Leaf Calathea', synonyms: ['prayer plant', 'calathea'], category: 'foliage', care_level: 'moderate', light_requirement: 'Medium indirect', water_requirement: 'High humidity', description: 'Stunning large round leaves with silver stripes. Moves leaves at night.', price_range_low: 200, price_range_high: 1500, popularity_score: 72 },
  { id: 'sp-fol-11', scientific_name: 'Dieffenbachia seguine', common_name_th: 'ต้นเศรษฐี', common_name_en: 'Dumb Cane', synonyms: ['dieffenbachia'], category: 'foliage', care_level: 'easy', light_requirement: 'Medium indirect', water_requirement: 'Moderate', description: 'Large variegated leaves. Fast growing and easy to care for.', price_range_low: 80, price_range_high: 600, popularity_score: 60 },
  { id: 'sp-fol-12', scientific_name: 'Pilea peperomioides', common_name_th: 'ไผ่เงิน', common_name_en: 'Chinese Money Plant', synonyms: ['pancake plant', 'ufos', 'pilea'], category: 'foliage', care_level: 'easy', light_requirement: 'Bright indirect', water_requirement: 'Moderate', description: 'Round pancake-shaped leaves on long petioles. Easy to propagate.', price_range_low: 100, price_range_high: 800, popularity_score: 70 },

  // === AROIDS (the mid to high tier) ===
  { id: 'sp-aroid-1', scientific_name: 'Monstera deliciosa', common_name_th: 'มอนสเตอร่า', common_name_en: 'Monstera', synonyms: ['swiss cheese plant', 'split-leaf philodendron'], category: 'aroid', care_level: 'easy', light_requirement: 'Bright indirect', water_requirement: 'Moderate', description: 'Iconic split leaves. The most recognizable houseplant in the world.', price_range_low: 150, price_range_high: 2000, popularity_score: 94 },
  { id: 'sp-aroid-2', scientific_name: "Monstera deliciosa 'Thai Constellation'", common_name_th: 'มอนสเตอร่าไทยคอนสเตอเลชัน', common_name_en: 'Thai Constellation Monstera', synonyms: ['monstera thai const', 'thai constellation'], category: 'aroid', care_level: 'moderate', light_requirement: 'Bright indirect', water_requirement: 'Moderate', description: 'Rare variegated Monstera with creamy white constellation-like patterns. Tissue-cultured in Thailand.', price_range_low: 3000, price_range_high: 25000, popularity_score: 90 },
  { id: 'sp-aroid-3', scientific_name: "Monstera deliciosa 'Albo Borsigiana'", common_name_th: 'มอนสเตอร่าอัลโบ', common_name_en: 'Monstera Albo', synonyms: ['monstera albo variegata', 'albo monstera'], category: 'aroid', care_level: 'advanced', light_requirement: 'Bright indirect', water_requirement: 'Moderate', description: 'Half-moon white variegated Monstera. Unstable variegation, highly sought after.', price_range_low: 8000, price_range_high: 50000, popularity_score: 88 },
  { id: 'sp-aroid-4', scientific_name: 'Philodendron erubescens', common_name_th: 'ฟิโลเดนดรอน', common_name_en: 'Pink Princess Philodendron', synonyms: ['pink princess', 'ppp', 'philodendron pink'], category: 'aroid', care_level: 'moderate', light_requirement: 'Bright indirect', water_requirement: 'Moderate', description: 'Stunning pink variegated philodendron. Each leaf is a surprise.', price_range_low: 1500, price_range_high: 15000, popularity_score: 86 },
  { id: 'sp-aroid-5', scientific_name: 'Anthurium clarinervium', common_name_th: 'หน้าวัวใบหัวใจ', common_name_en: 'Velvet Cardboard Anthurium', synonyms: ['anthurium clarinervium'], category: 'aroid', care_level: 'advanced', light_requirement: 'Bright indirect', water_requirement: 'High humidity', description: 'Heart-shaped dark leaves with white crystal veins. Velvet texture.', price_range_low: 800, price_range_high: 4000, popularity_score: 80 },
  { id: 'sp-aroid-6', scientific_name: 'Anthurium crystallinum', common_name_th: 'หน้าวัวคริสตัล', common_name_en: 'Crystal Anthurium', synonyms: ['crystal anthurium', 'silver vein anthurium'], category: 'aroid', care_level: 'advanced', light_requirement: 'Bright indirect', water_requirement: 'High humidity', description: 'Large velvet leaves with silver crystalline veins.', price_range_low: 1500, price_range_high: 6000, popularity_score: 82 },
  { id: 'sp-aroid-7', scientific_name: 'Philodendron gloriosum', common_name_th: 'ฟิโลเดนดรอนกลอริโอซัม', common_name_en: 'Gloriosum Philodendron', synonyms: ['gloriosum', 'creeping philodendron'], category: 'aroid', care_level: 'advanced', light_requirement: 'Bright indirect', water_requirement: 'High humidity', description: 'Velvety dark green heart leaves with white veins. Crawls, not climbs.', price_range_low: 2000, price_range_high: 8000, popularity_score: 78 },
  { id: 'sp-aroid-8', scientific_name: 'Philodendron melanochrysum', common_name_th: 'ฟิโลเดนดรอนเมลาโน', common_name_en: 'Black Gold Philodendron', synonyms: ['melanochrysum', 'melano'], category: 'aroid', care_level: 'advanced', light_requirement: 'Bright indirect', water_requirement: 'High humidity', description: 'Velvety bronze-green leaves with golden venation. Climbs on moss poles.', price_range_low: 3000, price_range_high: 12000, popularity_score: 76 },
  { id: 'sp-aroid-9', scientific_name: "Philodendron erubescens 'White Princess'", common_name_th: 'ฟิโลเดนดรอนไวท์ปริ้นเซส', common_name_en: 'White Princess Philodendron', synonyms: ['white princess', 'pwp', 'philodendron white'], category: 'aroid', care_level: 'advanced', light_requirement: 'Bright indirect', water_requirement: 'Moderate', description: 'White and pink variegated beauty. More stable than Pink Princess.', price_range_low: 3000, price_range_high: 18000, popularity_score: 79 },
  { id: 'sp-aroid-10', scientific_name: 'Alocasia amazonica', common_name_th: 'อะโลคาเซียโพลลี่', common_name_en: 'African Mask Plant', synonyms: ['alocasia polly', 'amazonica'], category: 'aroid', care_level: 'moderate', light_requirement: 'Bright indirect', water_requirement: 'Keep moist', description: 'Arrowhead leaves with striking white veins. Dramatic but goes dormant.', price_range_low: 200, price_range_high: 800, popularity_score: 73 },
  { id: 'sp-aroid-11', scientific_name: 'Epipremnum pinnatum', common_name_th: 'พลูลาย', common_name_en: 'Dragon Tail Pothos', synonyms: ['dragon tail', 'ceylon creeper'], category: 'aroid', care_level: 'easy', light_requirement: 'Bright indirect', water_requirement: 'Moderate', description: 'Split-leaf pothos that starts heart-shaped and matures to dragon-like splits.', price_range_low: 100, price_range_high: 800, popularity_score: 68 },

  // === HOYAS (the collectible niche) ===
  { id: 'sp-hoya-1', scientific_name: 'Hoya carnosa', common_name_th: 'ฮอย่า', common_name_en: 'Wax Plant', synonyms: ['hoya tricolor', 'wax flower', 'porcelain flower'], category: 'hoya', care_level: 'easy', light_requirement: 'Bright indirect', water_requirement: 'Low', description: 'Classic trailing Hoya with fragrant star-shaped flowers.', price_range_low: 100, price_range_high: 600, popularity_score: 82 },
  { id: 'sp-hoya-2', scientific_name: 'Hoya kerrii', common_name_th: 'ฮอย่าใจ', common_name_en: 'Sweetheart Hoya', synonyms: ['valentine hoya', 'heart hoya', 'lucky heart'], category: 'hoya', care_level: 'easy', light_requirement: 'Bright indirect', water_requirement: 'Low', description: 'Heart-shaped leaves, perfect gift plant. Single leaves are common; vines are harder to find.', price_range_low: 80, price_range_high: 500, popularity_score: 78 },
  { id: 'sp-hoya-3', scientific_name: 'Hoya pubicalyx', common_name_th: 'ฮอย่าพับบิคาลิกซ์', common_name_en: 'Hoya Pubicalyx', synonyms: ['pubicalyx', 'splash hoya', 'pink silver'], category: 'hoya', care_level: 'easy', light_requirement: 'Bright indirect', water_requirement: 'Low', description: 'Silver-splashed leaves, clusters of pink star flowers.', price_range_low: 150, price_range_high: 800, popularity_score: 70 },
  { id: 'sp-hoya-4', scientific_name: 'Hoya obovata', common_name_th: 'ฮอย่าโอโวบาต้า', common_name_en: 'Hoya Obovata', synonyms: ['obovata', 'round leaf hoya'], category: 'hoya', care_level: 'easy', light_requirement: 'Bright indirect', water_requirement: 'Low', description: 'Round, speckled leaves on long vines. Fast growing for a Hoya.', price_range_low: 200, price_range_high: 1000, popularity_score: 65 },
  { id: 'sp-hoya-5', scientific_name: 'Hoya linearis', common_name_th: 'ฮอย่าลิเนียริส', common_name_en: 'Hoya Linearis', synonyms: ['linearis', 'string hoya'], category: 'hoya', care_level: 'advanced', light_requirement: 'Bright indirect', water_requirement: 'High humidity', description: 'Soft trailing stems with needle-like leaves. Needs humidity.', price_range_low: 300, price_range_high: 1500, popularity_score: 62 },

  // === SUCCULENTS & CACTI ===
  { id: 'sp-succ-1', scientific_name: 'Echeveria elegans', common_name_th: 'เอเชเวอเรีย', common_name_en: 'Mexican Snowball', synonyms: ['echeveria', 'hen and chicks'], category: 'succulent', care_level: 'easy', light_requirement: 'Bright direct', water_requirement: 'Low', description: 'Rosette-forming pastel succulent. Propagates easily from leaves.', price_range_low: 30, price_range_high: 300, popularity_score: 80 },
  { id: 'sp-succ-2', scientific_name: 'Haworthiopsis attenuata', common_name_th: 'หางตะเข้', common_name_en: 'Zebra Plant', synonyms: ['haworthia', 'zebra haworthia'], category: 'succulent', care_level: 'easy', light_requirement: 'Low to bright', water_requirement: 'Low', description: 'Striped, pointed leaves in tight rosettes. Thrives on windowsills.', price_range_low: 40, price_range_high: 250, popularity_score: 72 },
  { id: 'sp-succ-3', scientific_name: 'Graptopetalum paraguayense', common_name_th: 'กุหลาบหิน', common_name_en: 'Ghost Plant', synonyms: ['graptopetalum', 'mother of pearl'], category: 'succulent', care_level: 'easy', light_requirement: 'Bright direct', water_requirement: 'Low', description: 'Pale lavender-pink rosettes. Turns more colourful in sun.', price_range_low: 30, price_range_high: 200, popularity_score: 65 },
  { id: 'sp-succ-4', scientific_name: 'Sedum morganianum', common_name_th: 'หางลา', common_name_en: 'Burros Tail', synonyms: ['donkey tail', 'lamb tail'], category: 'succulent', care_level: 'easy', light_requirement: 'Bright direct', water_requirement: 'Low', description: 'Trailing stems covered in plump blue-green leaves. Very fragile.', price_range_low: 50, price_range_high: 400, popularity_score: 68 },
  { id: 'sp-cac-1', scientific_name: 'Gymnocalycium mihanovichii', common_name_th: 'แคคตัสสี', common_name_en: 'Moon Cactus', synonyms: ['ruby ball cactus', 'chin cactus'], category: 'cactus', care_level: 'easy', light_requirement: 'Bright direct', water_requirement: 'Low', description: 'Grafted cactus with vibrant pink, orange, or yellow tops.', price_range_low: 40, price_range_high: 200, popularity_score: 70 },
  { id: 'sp-cac-2', scientific_name: 'Opuntia microdasys', common_name_th: 'ต้นกระบองเพชรกระต่าย', common_name_en: 'Bunny Ear Cactus', synonyms: ['bunny cactus', 'angel wings'], category: 'cactus', care_level: 'easy', light_requirement: 'Bright direct', water_requirement: 'Low', description: 'Flat pad-like segments covered in fuzzy glochids. Handle with care.', price_range_low: 60, price_range_high: 350, popularity_score: 62 },
  { id: 'sp-cac-3', scientific_name: 'Cereus peruvianus', common_name_th: 'ต้นกระบองเพชรเสา', common_name_en: 'Peruvian Apple Cactus', synonyms: ['column cactus', 'night-blooming cactus'], category: 'cactus', care_level: 'easy', light_requirement: 'Full sun', water_requirement: 'Low', description: 'Tall columnar cactus. Produces edible fruit.', price_range_low: 80, price_range_high: 1000, popularity_score: 55 },

  // === ORCHIDS ===
  { id: 'sp-orch-1', scientific_name: 'Phalaenopsis amabilis', common_name_th: 'กล้วยไม้ฟาแลน็อปซิส', common_name_en: 'Moth Orchid', synonyms: ['phalaenopsis', 'moth orchid', 'phal'], category: 'orchid', care_level: 'moderate', light_requirement: 'Medium indirect', water_requirement: 'Moderate', description: 'The classic orchid. Long-lasting flowers, blooms for months.', price_range_low: 100, price_range_high: 1500, popularity_score: 84 },
  { id: 'sp-orch-2', scientific_name: 'Dendrobium nobile', common_name_th: 'กล้วยไม้สายน้ำผึ้ง', common_name_en: 'Noble Dendrobium', synonyms: ['dendrobium', 'nobile orchid'], category: 'orchid', care_level: 'moderate', light_requirement: 'Bright indirect', water_requirement: 'Moderate', description: 'Cane-like stems with clusters of flowers along the length.', price_range_low: 80, price_range_high: 800, popularity_score: 72 },
  { id: 'sp-orch-3', scientific_name: 'Vanda coerulea', common_name_th: 'กล้วยไม้ฟ้า', common_name_en: 'Blue Vanda', synonyms: ['vanda', 'blue orchid'], category: 'orchid', care_level: 'advanced', light_requirement: 'Bright', water_requirement: 'High humidity', description: 'Stunning blue-purple flowers. Needs baskets, not pots.', price_range_low: 300, price_range_high: 3000, popularity_score: 60 },
  { id: 'sp-orch-4', scientific_name: 'Oncidium flexuosum', common_name_th: 'กล้วยไม้เต้นรำ', common_name_en: 'Dancing Lady Orchid', synonyms: ['oncidium', 'dancing lady'], category: 'orchid', care_level: 'moderate', light_requirement: 'Bright indirect', water_requirement: 'Moderate', description: 'Cascading sprays of small yellow flowers that look like dancing figures.', price_range_low: 150, price_range_high: 1000, popularity_score: 58 },

  // === FLOWERING ===
  { id: 'sp-flw-1', scientific_name: 'Hibiscus rosa-sinensis', common_name_th: 'ชบา', common_name_en: 'Chinese Hibiscus', synonyms: ['hibiscus', 'tropical hibiscus', 'shoe flower'], category: 'flowering', care_level: 'easy', light_requirement: 'Full sun', water_requirement: 'Keep moist', description: 'Large colourful blooms in red, pink, yellow, orange. Thailand\'s unofficial flower.', price_range_low: 50, price_range_high: 500, popularity_score: 80 },
  { id: 'sp-flw-2', scientific_name: 'Jasminum sambac', common_name_th: 'มะลิ', common_name_en: 'Arabian Jasmine', synonyms: ['jasmine', 'sampaguita', 'mali'], category: 'flowering', care_level: 'easy', light_requirement: 'Full sun', water_requirement: 'Keep moist', description: 'Intensely fragrant white flowers. Thailand\'s mothers day flower.', price_range_low: 40, price_range_high: 400, popularity_score: 88 },
  { id: 'sp-flw-3', scientific_name: 'Ixora chinensis', common_name_th: 'เข็ม', common_name_en: 'Ixora', synonyms: ['jungle geranium', 'flame of the woods', 'khem'], category: 'flowering', care_level: 'easy', light_requirement: 'Full sun', water_requirement: 'Keep moist', description: 'Clusters of tiny star-shaped flowers in red, orange, pink, yellow.', price_range_low: 30, price_range_high: 300, popularity_score: 70 },
  { id: 'sp-flw-4', scientific_name: 'Adenium obesum', common_name_th: 'ชวนชม', common_name_en: 'Desert Rose', synonyms: ['adenium', 'mock azalea', 'impala lily'], category: 'flowering', care_level: 'easy', light_requirement: 'Full sun', water_requirement: 'Low', description: 'Swollen caudex base with trumpet-shaped flowers. Very Thai.', price_range_low: 60, price_range_high: 2000, popularity_score: 82 },
  { id: 'sp-flw-5', scientific_name: 'Plumeria rubra', common_name_th: 'ลีลาวดี', common_name_en: 'Frangipani', synonyms: ['plumeria', 'frangipani', 'tempura tree', 'leelawadee'], category: 'flowering', care_level: 'easy', light_requirement: 'Full sun', water_requirement: 'Low', description: 'Iconic tropical flower with intoxicating fragrance. White, pink, yellow, red varieties.', price_range_low: 80, price_range_high: 1500, popularity_score: 90 },
  { id: 'sp-flw-6', scientific_name: 'Rosa chinensis', common_name_th: 'กุหลาบจีน', common_name_en: 'China Rose', synonyms: ['rose', 'chinese rose', 'monthly rose'], category: 'flowering', care_level: 'moderate', light_requirement: 'Full sun', water_requirement: 'Moderate', description: 'Repeat-blooming roses that do well in Thai heat.', price_range_low: 50, price_range_high: 800, popularity_score: 76 },
  { id: 'sp-flw-7', scientific_name: 'Bougainvillea glabra', common_name_th: 'เฟื่องฟ้า', common_name_en: 'Bougainvillea', synonyms: ['bougainvillea', 'paper flower', 'fueang faa'], category: 'flowering', care_level: 'easy', light_requirement: 'Full sun', water_requirement: 'Low', description: 'Explosive colour in magenta, purple, orange, white, pink.', price_range_low: 40, price_range_high: 1000, popularity_score: 74 },

  // === TREES ===
  { id: 'sp-tree-1', scientific_name: 'Pachira aquatica', common_name_th: 'พญาช้างสาร', common_name_en: 'Money Tree', synonyms: ['money tree', 'malabar chestnut', 'guiana chestnut'], category: 'tree', care_level: 'easy', light_requirement: 'Bright indirect', water_requirement: 'Moderate', description: 'Braided trunk with glossy hand-shaped leaves. Popular feng shui plant.', price_range_low: 150, price_range_high: 1200, popularity_score: 79 },
  { id: 'sp-tree-2', scientific_name: 'Olea europaea', common_name_th: 'มะกอก', common_name_en: 'Olive Tree', synonyms: ['olive', 'mediterranean olive'], category: 'tree', care_level: 'moderate', light_requirement: 'Full sun', water_requirement: 'Low', description: 'Silvery-green leaves, Mediterranean vibe. Growing popularity in Thai gardens.', price_range_low: 300, price_range_high: 3000, popularity_score: 68 },
  { id: 'sp-tree-3', scientific_name: 'Ficus benjamina', common_name_th: 'ไทรย้อยใบไผ่', common_name_en: 'Weeping Fig', synonyms: ['ficus benjamina', 'weeping fig', 'benjamin fig'], category: 'tree', care_level: 'moderate', light_requirement: 'Bright indirect', water_requirement: 'Moderate', description: 'Elegant weeping branches with small glossy leaves.', price_range_low: 150, price_range_high: 2000, popularity_score: 66 },

  // === CLIMBERS ===
  { id: 'sp-climb-1', scientific_name: 'Hedera helix', common_name_th: 'ไอวี่', common_name_en: 'English Ivy', synonyms: ['ivy', 'common ivy', 'english ivy'], category: 'climber', care_level: 'easy', light_requirement: 'Low to bright', water_requirement: 'Moderate', description: 'Classic trailing/climbing ivy. Great for hanging baskets.', price_range_low: 50, price_range_high: 400, popularity_score: 70 },
  { id: 'sp-climb-2', scientific_name: 'Dischidia nummularia', common_name_th: 'เดฟใบกลม', common_name_en: 'String of Nickels', synonyms: ['string of nickels', 'button orchid'], category: 'climber', care_level: 'moderate', light_requirement: 'Bright indirect', water_requirement: 'Moderate', description: 'Tiny round leaves that look like coins on trailing stems.', price_range_low: 120, price_range_high: 600, popularity_score: 55 },

  // === FERNS ===
  { id: 'sp-fern-1', scientific_name: 'Platycerium bifurcatum', common_name_th: 'เฟิร์นเขากวาง', common_name_en: 'Staghorn Fern', synonyms: ['staghorn', 'elkhorn fern', 'antler fern'], category: 'fern', care_level: 'moderate', light_requirement: 'Bright indirect', water_requirement: 'High humidity', description: 'Antler-like fronds that mount on boards. Dramatic wall display.', price_range_low: 150, price_range_high: 1500, popularity_score: 67 },
  { id: 'sp-fern-2', scientific_name: 'Adiantum raddianum', common_name_th: 'เฟิร์นขนนก', common_name_en: 'Maidenhair Fern', synonyms: ['maidenhair', 'adiantum'], category: 'fern', care_level: 'advanced', light_requirement: 'Bright indirect', water_requirement: 'High humidity', description: 'Delicate black stems with fan-shaped leaflets. Needs constant moisture.', price_range_low: 100, price_range_high: 600, popularity_score: 63 },
  { id: 'sp-fern-3', scientific_name: 'Nephrolepis exaltata', common_name_th: 'เฟิร์นบอสตัน', common_name_en: 'Boston Fern', synonyms: ['boston fern', 'sword fern'], category: 'fern', care_level: 'moderate', light_requirement: 'Bright indirect', water_requirement: 'High humidity', description: 'Lush arching fronds. Classic porch plant.', price_range_low: 60, price_range_high: 400, popularity_score: 60 },

  // === OTHER / UNIQUE ===
  { id: 'sp-other-1', scientific_name: 'Tillandsia ionantha', common_name_th: 'ทิลแลนเซีย', common_name_en: 'Air Plant', synonyms: ['air plant', 'tillandsia', 'blushing bride'], category: 'other', care_level: 'easy', light_requirement: 'Bright indirect', water_requirement: 'Mist', description: 'No soil needed! Absorbs moisture from air. Blushes red before flowering.', price_range_low: 40, price_range_high: 300, popularity_score: 74 },
  { id: 'sp-other-2', scientific_name: 'Maranta leuconeura', common_name_th: 'คล้าใบก้ามปู', common_name_en: 'Prayer Plant', synonyms: ['prayer plant', 'prayer plant red', 'ten commandments'], category: 'other', care_level: 'moderate', light_requirement: 'Medium indirect', water_requirement: 'Keep moist', description: 'Leaves fold up at night like hands in prayer. Colourful veins.', price_range_low: 100, price_range_high: 500, popularity_score: 69 },
  { id: 'sp-other-3', scientific_name: 'Fittonia albivenis', common_name_th: 'พืชใบสี', common_name_en: 'Nerve Plant', synonyms: ['fittonia', 'nerve plant', 'mosaic plant'], category: 'other', care_level: 'moderate', light_requirement: 'Low to medium', water_requirement: 'Keep moist', description: 'Tiny leaves with vivid red, pink, or white vein patterns. Dramatic when it droops.', price_range_low: 50, price_range_high: 300, popularity_score: 64 },
  { id: 'sp-other-4', scientific_name: 'Tradescantia zebrina', common_name_th: 'หางแมว', common_name_en: 'Wandering Jew', synonyms: ['inch plant', 'wandering dude', 'purple heart'], category: 'other', care_level: 'easy', light_requirement: 'Bright indirect', water_requirement: 'Moderate', description: 'Striped purple-silver-green leaves on trailing stems. Very fast growing.', price_range_low: 30, price_range_high: 200, popularity_score: 66 },
  { id: 'sp-other-5', scientific_name: 'Peperomia obtusifolia', common_name_th: 'เปปเปอร์โรเมีย', common_name_en: 'Baby Rubber Plant', synonyms: ['peperomia', 'baby rubber plant'], category: 'other', care_level: 'easy', light_requirement: 'Medium indirect', water_requirement: 'Low', description: 'Thick glossy leaves, compact growth. Comes in green and variegated.', price_range_low: 60, price_range_high: 400, popularity_score: 61 },
  { id: 'sp-other-6', scientific_name: 'Aloe vera', common_name_th: 'ว่านหางจระเข้', common_name_en: 'Aloe Vera', synonyms: ['aloe', 'burn plant', 'medicinal aloe'], category: 'other', care_level: 'easy', light_requirement: 'Bright direct', water_requirement: 'Low', description: 'Medicinal succulent gel for burns and skincare. Easy to grow.', price_range_low: 30, price_range_high: 250, popularity_score: 86 },
];
