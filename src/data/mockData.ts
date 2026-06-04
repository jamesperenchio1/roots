import type {
  Species, Profile, Listing, Transaction, Transfer, PriceSnapshot,
  Message, Dispute, WatchlistItem, PriceAlert, MarketOverview, DashboardStats,
  ProvenanceChain, SizeCategory
} from '@/types';

export const SPECIES: Species[] = [
  { id: 'sp-1', scientific_name: 'Monstera deliciosa \'Thai Constellation\'', common_name_th: 'มอนสเตอร่าไทยคอนสเตอเลชัน', common_name_en: 'Thai Constellation Monstera', synonyms: ['Monstera Thai Const'], category: 'aroid', created_at: '2023-01-01', description: 'Rare variegated Monstera with creamy white constellation-like patterns', care_level: 'moderate', light_requirement: 'Bright indirect' },
  { id: 'sp-2', scientific_name: 'Philodendron erubescens \'Pink Princess\'', common_name_th: 'ฟิโลเดนดรอนพิ้งค์ปริ้นเซส', common_name_en: 'Pink Princess Philodendron', synonyms: ['PPP'], category: 'aroid', created_at: '2023-01-01', description: 'Stunning pink variegated philodendron', care_level: 'moderate', light_requirement: 'Bright indirect' },
  { id: 'sp-3', scientific_name: 'Hoya carnosa', common_name_th: 'ฮอยย่านภาคพื้นสมุทร', common_name_en: 'Wax Plant', synonyms: ['Hoya Tricolor'], category: 'hoya', created_at: '2023-01-01', description: 'Classic trailing Hoya with fragrant flowers', care_level: 'easy', light_requirement: 'Bright indirect' },
  { id: 'sp-4', scientific_name: 'Anthurium clarinervium', common_name_th: 'หน้าวัวใบหัวใจ', common_name_en: 'Velvet Cardboard Anthurium', synonyms: [], category: 'aroid', created_at: '2023-01-01', description: 'Heart-shaped dark leaves with white veins', care_level: 'advanced', light_requirement: 'Bright indirect' },
  { id: 'sp-5', scientific_name: 'Epipremnum aureum \'Marble Queen\'', common_name_th: 'พอทอสมาร์เบิ้ลควีน', common_name_en: 'Marble Queen Pothos', synonyms: ['Devils Ivy Marble'], category: 'aroid', created_at: '2023-01-01', description: 'Easy-care trailing plant with cream variegation', care_level: 'easy', light_requirement: 'Low to bright' },
  { id: 'sp-6', scientific_name: 'Dracaena trifasciata', common_name_th: 'ลิ้นมังกร', common_name_en: 'Snake Plant', synonyms: ['Sansevieria', "Mother-in-law's Tongue"], category: 'succulent', created_at: '2023-01-01', description: 'Nearly indestructible upright succulent', care_level: 'easy', light_requirement: 'Low to bright' },
  { id: 'sp-7', scientific_name: 'Asplenium nidus', common_name_th: 'เฟิร์นข้าหลวง', common_name_en: "Bird's Nest Fern", synonyms: [], category: 'fern', created_at: '2023-01-01', description: 'Bright green wavy fronds in rosette form', care_level: 'moderate', light_requirement: 'Medium indirect' },
  { id: 'sp-8', scientific_name: 'Zamioculcas zamiifolia', common_name_th: 'กวักมรกต', common_name_en: 'ZZ Plant', synonyms: ['Zanzibar Gem'], category: 'aroid', created_at: '2023-01-01', description: 'Glossy dark green leaves, extremely hardy', care_level: 'easy', light_requirement: 'Low to bright' },
  { id: 'sp-9', scientific_name: 'Hoya kerrii', common_name_th: 'ฮอย่าใจ', common_name_en: 'Sweetheart Hoya', synonyms: ['Valentine Hoya'], category: 'hoya', created_at: '2023-01-01', description: 'Heart-shaped leaves, perfect gift plant', care_level: 'easy', light_requirement: 'Bright indirect' },
  { id: 'sp-10', scientific_name: 'Philodendron gloriosum', common_name_th: 'ฟิโลเดนดรอนกลอริโอซัม', common_name_en: 'Gloriosum Philodendron', synonyms: [], category: 'aroid', created_at: '2023-01-01', description: 'Velvety dark green heart leaves with white veins', care_level: 'advanced', light_requirement: 'Bright indirect' },
  { id: 'sp-11', scientific_name: 'Monstera deliciosa \'Albo Borsigiana\'', common_name_th: 'มอนสเตอร่าอัลโบ', common_name_en: 'Monstera Albo', synonyms: ['Monstera Albo Variegata'], category: 'aroid', created_at: '2023-01-01', description: 'Half-moon white variegated Monstera', care_level: 'advanced', light_requirement: 'Bright indirect' },
  { id: 'sp-12', scientific_name: 'Echeveria elegans', common_name_th: 'อีเชเวอเรีย', common_name_en: 'Mexican Snowball', synonyms: [], category: 'succulent', created_at: '2023-01-01', description: 'Rosette-forming pastel succulent', care_level: 'easy', light_requirement: 'Bright direct' },
  { id: 'sp-13', scientific_name: 'Spathiphyllum wallisii', common_name_th: 'หน้าวัวใบ', common_name_en: 'Peace Lily', synonyms: ['White Sails'], category: 'aroid', created_at: '2023-01-01', description: 'Elegant white flowers, air purifier', care_level: 'easy', light_requirement: 'Low to medium' },
  { id: 'sp-14', scientific_name: 'Anthurium crystallinum', common_name_th: 'หน้าวัวคริสตัล', common_name_en: 'Crystal Anthurium', synonyms: [], category: 'aroid', created_at: '2023-01-01', description: 'Silver crystalline veins on velvet leaves', care_level: 'advanced', light_requirement: 'Bright indirect' },
  { id: 'sp-15', scientific_name: 'Philodendron melanochrysum', common_name_th: 'ฟิโลเดนดรอนเมลาโน', common_name_en: 'Black Gold Philodendron', synonyms: [], category: 'aroid', created_at: '2023-01-01', description: 'Velvety bronze-green with golden venation', care_level: 'advanced', light_requirement: 'Bright indirect' },
  { id: 'sp-16', scientific_name: 'Chlorophytum comosum', common_name_th: 'เศรษฐีเรือนใน', common_name_en: 'Spider Plant', synonyms: ['Airplane Plant'], category: 'other', created_at: '2023-01-01', description: 'Variegated arching leaves with baby plantlets', care_level: 'easy', light_requirement: 'Bright indirect' },
  { id: 'sp-17', scientific_name: 'Hoya pubicalyx', common_name_th: 'ฮอย่าพับบิคาลิกซ์', common_name_en: 'Hoya Pubicalyx', synonyms: ['Splash Hoya'], category: 'hoya', created_at: '2023-01-01', description: 'Silver-splashed leaves, pink star flowers', care_level: 'easy', light_requirement: 'Bright indirect' },
  { id: 'sp-18', scientific_name: 'Alocasia amazonica \'Polly\'', common_name_th: 'อะโลคาเซียโพลลี่', common_name_en: 'African Mask Plant', synonyms: [], category: 'aroid', created_at: '2023-01-01', description: 'Arrowhead leaves with striking white veins', care_level: 'moderate', light_requirement: 'Bright indirect' },
  { id: 'sp-19', scientific_name: 'Ctenanthe burle-marxii', common_name_th: 'คเทนันเท้', common_name_en: 'Fishbone Prayer Plant', synonyms: ['Never Never Plant'], category: 'other', created_at: '2023-01-01', description: 'Silver-green striped leaves with purple undersides', care_level: 'moderate', light_requirement: 'Medium indirect' },
  { id: 'sp-20', scientific_name: 'Philodendron erubescens \'White Princess\'', common_name_th: 'ฟิโลเดนดรอนไวท์ปริ้นเซส', common_name_en: 'White Princess Philodendron', synonyms: ['PWP'], category: 'aroid', created_at: '2023-01-01', description: 'White and pink variegated beauty', care_level: 'advanced', light_requirement: 'Bright indirect' },
  { id: 'sp-21', scientific_name: 'Ficus lyrata', common_name_th: 'ไทรใบสัก', common_name_en: 'Fiddle Leaf Fig', synonyms: [], category: 'other', created_at: '2023-01-01', description: 'Large violin-shaped glossy leaves', care_level: 'moderate', light_requirement: 'Bright indirect' },
];

export const PLANT_IMAGES: Record<string, string> = {
  'sp-1': '/images/plants/monstera-thai.jpg',
  'sp-2': '/images/plants/pink-princess.jpg',
  'sp-3': '/images/plants/hoya-carnosa.jpg',
  'sp-4': '/images/plants/anthurium-clarinervium.jpg',
  'sp-5': '/images/plants/pothos-marble.jpg',
  'sp-6': '/images/plants/snake-plant.jpg',
  'sp-7': '/images/plants/birds-nest-fern.jpg',
  'sp-8': '/images/plants/zz-plant.jpg',
  'sp-9': '/images/plants/hoya-kerrii.jpg',
  'sp-10': '/images/plants/philodendron-gloriosum.jpg',
  'sp-11': '/images/plants/monstera-albo.jpg',
  'sp-12': '/images/plants/succulent-collection.jpg',
  'sp-13': '/images/plants/peace-lily.jpg',
  'sp-14': '/images/plants/anthurium-crystallinum.jpg',
  'sp-15': '/images/plants/philodendron-melanochrysum.jpg',
  'sp-16': '/images/plants/spider-plant.jpg',
  'sp-17': '/images/plants/hoya-pubicalyx.jpg',
  'sp-18': '/images/plants/alocasia-polly.jpg',
  'sp-19': '/images/plants/ctenanthe.jpg',
  'sp-20': '/images/plants/philodendron-white-princess.jpg',
  'sp-21': '/images/plants/fiddle-leaf-fig.jpg',
};

export const USERS: Profile[] = [
  { id: 'u-1', display_name: 'PlantKrit', location: 'Bangkok', rating: 4.9, sales_count: 47, promptpay_id: '0812345678', is_admin: false, strike_count: 0, is_banned: false, language_preference: 'th', created_at: '2023-02-01', updated_at: '2024-01-01' },
  { id: 'u-2', display_name: 'GreenHouse_BKK', location: 'Bangkok', rating: 4.8, sales_count: 128, promptpay_id: '0898765432', is_admin: false, strike_count: 0, is_banned: false, language_preference: 'th', created_at: '2023-02-15', updated_at: '2024-01-01' },
  { id: 'u-3', display_name: 'RarePlantTH', location: 'Chiang Mai', rating: 4.7, sales_count: 23, promptpay_id: '0654321098', is_admin: false, strike_count: 0, is_banned: false, language_preference: 'th', created_at: '2023-03-01', updated_at: '2024-01-01' },
  { id: 'u-4', display_name: 'UrbanJungle', location: 'Nonthaburi', rating: 4.6, sales_count: 15, promptpay_id: '0811111111', is_admin: false, strike_count: 0, is_banned: false, language_preference: 'en', created_at: '2023-03-15', updated_at: '2024-01-01' },
  { id: 'u-5', display_name: 'AroidLover', location: 'Chiang Rai', rating: 5.0, sales_count: 62, promptpay_id: '0822222222', is_admin: false, strike_count: 0, is_banned: false, language_preference: 'th', created_at: '2023-04-01', updated_at: '2024-01-01' },
  { id: 'u-6', display_name: 'HoyaCollector', location: 'Phuket', rating: 4.8, sales_count: 34, promptpay_id: '0833333333', is_admin: false, strike_count: 0, is_banned: false, language_preference: 'th', created_at: '2023-04-15', updated_at: '2024-01-01' },
  { id: 'u-7', display_name: 'SucculentHub', location: 'Bangkok', rating: 4.5, sales_count: 89, promptpay_id: '0844444444', is_admin: false, strike_count: 1, is_banned: false, language_preference: 'th', created_at: '2023-05-01', updated_at: '2024-01-01' },
  { id: 'u-8', display_name: 'FernWhisperer', location: 'Chiang Mai', rating: 4.9, sales_count: 18, promptpay_id: '0855555555', is_admin: false, strike_count: 0, is_banned: false, language_preference: 'en', created_at: '2023-05-15', updated_at: '2024-01-01' },
  { id: 'u-9', display_name: 'PlantMama_BKK', location: 'Bangkok', rating: 4.7, sales_count: 56, promptpay_id: '0866666666', is_admin: false, strike_count: 0, is_banned: false, language_preference: 'th', created_at: '2023-06-01', updated_at: '2024-01-01' },
  { id: 'u-10', display_name: 'TropicalLeaf', location: 'Pattaya', rating: 4.4, sales_count: 12, promptpay_id: '0877777777', is_admin: false, strike_count: 0, is_banned: false, language_preference: 'th', created_at: '2023-06-15', updated_at: '2024-01-01' },
  { id: 'u-11', display_name: 'VariegatedVault', location: 'Bangkok', rating: 4.9, sales_count: 91, promptpay_id: '0888888888', is_admin: false, strike_count: 0, is_banned: false, language_preference: 'th', created_at: '2023-07-01', updated_at: '2024-01-01' },
  { id: 'u-12', display_name: 'RootAdmin', location: 'Bangkok', rating: 0, sales_count: 0, promptpay_id: null, is_admin: true, strike_count: 0, is_banned: false, language_preference: 'th', created_at: '2023-01-01', updated_at: '2024-01-01' },
];

function createListings(): Listing[] {
  const listings: Listing[] = [
    { id: 'l-1', plant_id: 'p-1', seller_id: 'u-1', price_thb: 8500, size_category: 'M', size_cm_range: '30-45cm', pot_size_cm: 15, description: 'Beautiful Thai Constellation with 4 leaves. Well-established in aroid mix. Shipped bare root.', delivery_options: ["ship"], shipping_cost_thb: 50, pickup_province: 'Bangkok', status: 'active', created_at: '2024-05-15', last_photo_update_at: '2024-05-15', view_count: 234, watch_count: 12 },
    { id: 'l-2', plant_id: 'p-2', seller_id: 'u-2', price_thb: 3500, size_category: 'S', size_cm_range: '15-20cm', pot_size_cm: 10, description: 'Pink Princess with 3 beautiful pink leaves. High variegation. Acclimated to indoor conditions.', delivery_options: ["ship", "pickup"], shipping_cost_thb: 30, pickup_province: 'Bangkok', status: 'active', created_at: '2024-05-20', last_photo_update_at: '2024-05-20', view_count: 189, watch_count: 8 },
    { id: 'l-3', plant_id: 'p-3', seller_id: 'u-3', price_thb: 450, size_category: 'M', size_cm_range: '25-30cm', pot_size_cm: 12, description: 'Trailing Hoya carnosa with potential flowers. Easy care, perfect for beginners.', delivery_options: ["ship"], shipping_cost_thb: 50, pickup_province: 'Chiang Mai', status: 'active', created_at: '2024-05-25', last_photo_update_at: '2024-05-25', view_count: 67, watch_count: 3 },
    { id: 'l-4', plant_id: 'p-4', seller_id: 'u-4', price_thb: 1200, size_category: 'S', size_cm_range: '12-18cm', pot_size_cm: 9, description: 'Velvety Anthurium clarinervium in sphagnum moss. Established root system.', delivery_options: ["ship"], shipping_cost_thb: 50, pickup_province: 'Nonthaburi', status: 'active', created_at: '2024-05-28', last_photo_update_at: '2024-05-28', view_count: 145, watch_count: 6 },
    { id: 'l-5', plant_id: 'p-5', seller_id: 'u-5', price_thb: 280, size_category: 'L', size_cm_range: '40-60cm', pot_size_cm: 15, description: 'Lush Marble Queen Pothos with long trailing vines. Very full pot.', delivery_options: ["ship", "pickup"], shipping_cost_thb: 30, pickup_province: 'Chiang Rai', status: 'active', created_at: '2024-06-01', last_photo_update_at: '2024-06-01', view_count: 89, watch_count: 4 },
    { id: 'l-6', plant_id: 'p-6', seller_id: 'u-6', price_thb: 350, size_category: 'M', size_cm_range: '35-50cm', pot_size_cm: 18, description: 'Healthy Snake Plant with 6 upright leaves. Low maintenance champion.', delivery_options: ["ship"], shipping_cost_thb: 50, pickup_province: 'Phuket', status: 'active', created_at: '2024-06-03', last_photo_update_at: '2024-06-03', view_count: 56, watch_count: 2 },
    { id: 'l-7', plant_id: 'p-7', seller_id: 'u-7', price_thb: 650, size_category: 'M', size_cm_range: '25-35cm', pot_size_cm: 14, description: 'Vibrant Bird\'s Nest Fern with bright green wavy fronds.', delivery_options: ["ship", "pickup"], shipping_cost_thb: 30, pickup_province: 'Bangkok', status: 'active', created_at: '2024-06-05', last_photo_update_at: '2024-06-05', view_count: 78, watch_count: 3 },
    { id: 'l-8', plant_id: 'p-8', seller_id: 'u-8', price_thb: 550, size_category: 'M', size_cm_range: '30-40cm', pot_size_cm: 16, description: 'Glossy ZZ Plant with multiple stems. Perfect for low light areas.', delivery_options: ["ship"], shipping_cost_thb: 50, pickup_province: 'Chiang Mai', status: 'active', created_at: '2024-06-07', last_photo_update_at: '2024-06-07', view_count: 92, watch_count: 5 },
    { id: 'l-9', plant_id: 'p-9', seller_id: 'u-9', price_thb: 380, size_category: 'S', size_cm_range: '10-15cm', pot_size_cm: 8, description: 'Sweetheart Hoya with variegated leaves. Cute gift plant.', delivery_options: ["ship", "pickup"], shipping_cost_thb: 30, pickup_province: 'Bangkok', status: 'active', created_at: '2024-06-08', last_photo_update_at: '2024-06-08', view_count: 112, watch_count: 7 },
    { id: 'l-10', plant_id: 'p-10', seller_id: 'u-10', price_thb: 2800, size_category: 'M', size_cm_range: '25-35cm', pot_size_cm: 14, description: 'Velvety Philodendron gloriosum crawling on moss pole. 4 mature leaves.', delivery_options: ["ship"], shipping_cost_thb: 50, pickup_province: 'Pattaya', status: 'active', created_at: '2024-06-09', last_photo_update_at: '2024-06-09', view_count: 167, watch_count: 9 },
    { id: 'l-11', plant_id: 'p-11', seller_id: 'u-11', price_thb: 18500, size_category: 'M', size_cm_range: '35-50cm', pot_size_cm: 18, description: 'Stunning half-moon Monstera Albo with 5 leaves. High white variegation.', delivery_options: ["ship", "pickup"], shipping_cost_thb: 30, pickup_province: 'Bangkok', status: 'active', created_at: '2024-06-10', last_photo_update_at: '2024-06-10', view_count: 567, watch_count: 34 },
    { id: 'l-12', plant_id: 'p-12', seller_id: 'u-1', price_thb: 150, size_category: 'S', size_cm_range: '8-12cm', pot_size_cm: 7, description: 'Colorful echeveria collection in one pot. Rosette shapes.', delivery_options: ["ship"], shipping_cost_thb: 50, pickup_province: 'Bangkok', status: 'active', created_at: '2024-06-11', last_photo_update_at: '2024-06-11', view_count: 45, watch_count: 1 },
    { id: 'l-13', plant_id: 'p-13', seller_id: 'u-2', price_thb: 320, size_category: 'M', size_cm_range: '30-40cm', pot_size_cm: 14, description: 'Flowering Peace Lily with white spathes. Air purifying.', delivery_options: ["ship", "pickup"], shipping_cost_thb: 30, pickup_province: 'Bangkok', status: 'active', created_at: '2024-06-12', last_photo_update_at: '2024-06-12', view_count: 73, watch_count: 2 },
    { id: 'l-14', plant_id: 'p-14', seller_id: 'u-3', price_thb: 2200, size_category: 'M', size_cm_range: '25-35cm', pot_size_cm: 13, description: 'Crystal Anthurium with large silver-veined leaves. Collector\'s item.', delivery_options: ["ship"], shipping_cost_thb: 50, pickup_province: 'Chiang Mai', status: 'active', created_at: '2024-06-13', last_photo_update_at: '2024-06-13', view_count: 198, watch_count: 11 },
    { id: 'l-15', plant_id: 'p-15', seller_id: 'u-5', price_thb: 4200, size_category: 'L', size_cm_range: '40-55cm', pot_size_cm: 20, description: 'Mature Philodendron melanochrysum on tall moss pole. Velvet leaves.', delivery_options: ["ship"], shipping_cost_thb: 50, pickup_province: 'Chiang Rai', status: 'active', created_at: '2024-06-14', last_photo_update_at: '2024-06-14', view_count: 245, watch_count: 15 },
    { id: 'l-16', plant_id: 'p-16', seller_id: 'u-6', price_thb: 180, size_category: 'M', size_cm_range: '25-35cm', pot_size_cm: 12, description: 'Full Spider Plant with baby plantlets ready to propagate.', delivery_options: ["ship", "pickup"], shipping_cost_thb: 30, pickup_province: 'Phuket', status: 'active', created_at: '2024-06-15', last_photo_update_at: '2024-06-15', view_count: 38, watch_count: 1 },
    { id: 'l-17', plant_id: 'p-17', seller_id: 'u-7', price_thb: 680, size_category: 'M', size_cm_range: '20-30cm', pot_size_cm: 12, description: 'Hoya pubicalyx \'Splash\' with silver flecked leaves. Near blooming.', delivery_options: ["ship"], shipping_cost_thb: 50, pickup_province: 'Bangkok', status: 'active', created_at: '2024-06-16', last_photo_update_at: '2024-06-16', view_count: 134, watch_count: 8 },
    { id: 'l-18', plant_id: 'p-18', seller_id: 'u-8', price_thb: 750, size_category: 'S', size_cm_range: '15-20cm', pot_size_cm: 10, description: 'Compact Alocasia Polly with striking arrowhead leaves.', delivery_options: ["ship"], shipping_cost_thb: 50, pickup_province: 'Chiang Mai', status: 'active', created_at: '2024-06-17', last_photo_update_at: '2024-06-17', view_count: 87, watch_count: 4 },
    { id: 'l-19', plant_id: 'p-19', seller_id: 'u-9', price_thb: 450, size_category: 'M', size_cm_range: '20-25cm', pot_size_cm: 12, description: 'Fishbone Prayer Plant with beautiful striped pattern.', delivery_options: ["ship", "pickup"], shipping_cost_thb: 30, pickup_province: 'Bangkok', status: 'active', created_at: '2024-06-18', last_photo_update_at: '2024-06-18', view_count: 65, watch_count: 3 },
    { id: 'l-20', plant_id: 'p-20', seller_id: 'u-11', price_thb: 5200, size_category: 'S', size_cm_range: '12-18cm', pot_size_cm: 9, description: 'White Princess with high white variegation. Rare find.', delivery_options: ["ship"], shipping_cost_thb: 50, pickup_province: 'Bangkok', status: 'active', created_at: '2024-06-19', last_photo_update_at: '2024-06-19', view_count: 312, watch_count: 19 },
    { id: 'l-21', plant_id: 'p-21', seller_id: 'u-10', price_thb: 2200, size_category: 'XL', size_cm_range: '80-100cm', pot_size_cm: 30, description: 'Tall Fiddle Leaf Fig with full canopy. Statement piece.', delivery_options: ["pickup"], pickup_province: 'Pattaya', status: 'active', created_at: '2024-06-20', last_photo_update_at: '2024-06-20', view_count: 156, watch_count: 6 },
  ];
  return listings;
}

export const LISTINGS = createListings();

export const TRANSACTIONS: Transaction[] = [
  { id: 't-1', listing_id: 'l-sold-1', buyer_id: 'u-2', seller_id: 'u-1', plant_id: 'p-sold-1', sale_price_thb: 12000, platform_fee_thb: 960, seller_payout_thb: 11040, status: 'completed', delivery_method: 'ship', completed_at: '2024-04-15', created_at: '2024-04-10' },
  { id: 't-2', listing_id: 'l-sold-2', buyer_id: 'u-3', seller_id: 'u-2', plant_id: 'p-sold-2', sale_price_thb: 4800, platform_fee_thb: 384, seller_payout_thb: 4416, status: 'completed', delivery_method: 'ship', completed_at: '2024-04-20', created_at: '2024-04-16' },
  { id: 't-3', listing_id: 'l-sold-3', buyer_id: 'u-4', seller_id: 'u-3', plant_id: 'p-sold-3', sale_price_thb: 3800, platform_fee_thb: 304, seller_payout_thb: 3496, status: 'completed', delivery_method: 'ship', completed_at: '2024-04-25', created_at: '2024-04-21' },
  { id: 't-4', listing_id: 'l-sold-4', buyer_id: 'u-5', seller_id: 'u-4', plant_id: 'p-sold-4', sale_price_thb: 22000, platform_fee_thb: 1760, seller_payout_thb: 20240, status: 'completed', delivery_method: 'pickup', completed_at: '2024-05-01', created_at: '2024-04-28' },
  { id: 't-5', listing_id: 'l-sold-5', buyer_id: 'u-6', seller_id: 'u-5', plant_id: 'p-sold-5', sale_price_thb: 6500, platform_fee_thb: 520, seller_payout_thb: 5980, status: 'completed', delivery_method: 'ship', completed_at: '2024-05-05', created_at: '2024-05-01' },
  { id: 't-6', listing_id: 'l-sold-6', buyer_id: 'u-7', seller_id: 'u-6', plant_id: 'p-sold-6', sale_price_thb: 9500, platform_fee_thb: 760, seller_payout_thb: 8740, status: 'completed', delivery_method: 'ship', completed_at: '2024-05-10', created_at: '2024-05-06' },
  { id: 't-7', listing_id: 'l-sold-7', buyer_id: 'u-8', seller_id: 'u-7', plant_id: 'p-sold-7', sale_price_thb: 3200, platform_fee_thb: 256, seller_payout_thb: 2944, status: 'completed', delivery_method: 'ship', completed_at: '2024-05-15', created_at: '2024-05-11' },
  { id: 't-8', listing_id: 'l-sold-8', buyer_id: 'u-9', seller_id: 'u-8', plant_id: 'p-sold-8', sale_price_thb: 15800, platform_fee_thb: 1264, seller_payout_thb: 14536, status: 'completed', delivery_method: 'pickup', completed_at: '2024-05-20', created_at: '2024-05-16' },
  { id: 't-9', listing_id: 'l-sold-9', buyer_id: 'u-10', seller_id: 'u-9', plant_id: 'p-sold-9', sale_price_thb: 4200, platform_fee_thb: 336, seller_payout_thb: 3864, status: 'shipped', delivery_method: 'ship', shipped_at: '2024-06-18', created_at: '2024-06-15' },
  { id: 't-10', listing_id: 'l-sold-10', buyer_id: 'u-11', seller_id: 'u-10', plant_id: 'p-sold-10', sale_price_thb: 2800, platform_fee_thb: 224, seller_payout_thb: 2576, status: 'paid_in_escrow', delivery_method: 'ship', created_at: '2024-06-19' },
  { id: 't-11', listing_id: 'l-sold-11', buyer_id: 'u-1', seller_id: 'u-11', plant_id: 'p-sold-11', sale_price_thb: 7200, platform_fee_thb: 576, seller_payout_thb: 6624, status: 'disputed', delivery_method: 'ship', shipped_at: '2024-06-10', created_at: '2024-06-05' },
  { id: 't-12', listing_id: 'l-sold-12', buyer_id: 'u-3', seller_id: 'u-1', plant_id: 'p-sold-12', sale_price_thb: 1800, platform_fee_thb: 144, seller_payout_thb: 1656, status: 'delivered', delivery_method: 'ship', shipped_at: '2024-06-15', delivered_at: '2024-06-17', escrow_release_at: '2024-06-19', created_at: '2024-06-12' },
];

export const TRANSFERS: Transfer[] = [
  { id: 'tr-1', plant_id: 'p-sold-1', to_user_id: 'u-1', sale_price_thb: null, transferred_at: '2023-06-01' },
  { id: 'tr-2', plant_id: 'p-sold-1', from_user_id: 'u-1', to_user_id: 'u-2', transaction_id: 't-1', sale_price_thb: 12000, transferred_at: '2024-04-15' },
  { id: 'tr-3', plant_id: 'p-sold-2', to_user_id: 'u-2', sale_price_thb: null, transferred_at: '2023-08-01' },
  { id: 'tr-4', plant_id: 'p-sold-2', from_user_id: 'u-2', to_user_id: 'u-3', transaction_id: 't-2', sale_price_thb: 4800, transferred_at: '2024-04-20' },
  { id: 'tr-5', plant_id: 'p-sold-3', to_user_id: 'u-3', sale_price_thb: null, transferred_at: '2023-09-01' },
  { id: 'tr-6', plant_id: 'p-sold-3', from_user_id: 'u-3', to_user_id: 'u-4', transaction_id: 't-3', sale_price_thb: 3800, transferred_at: '2024-04-25' },
  { id: 'tr-7', plant_id: 'p-sold-4', to_user_id: 'u-4', sale_price_thb: null, transferred_at: '2023-03-01' },
  { id: 'tr-8', plant_id: 'p-sold-4', from_user_id: 'u-4', to_user_id: 'u-5', transaction_id: 't-4', sale_price_thb: 22000, transferred_at: '2024-05-01' },
  { id: 'tr-9', plant_id: 'p-sold-4', from_user_id: 'u-5', to_user_id: 'u-1', sale_price_thb: 25000, transferred_at: '2024-06-01' },
  { id: 'tr-10', plant_id: 'p-sold-5', to_user_id: 'u-5', sale_price_thb: null, transferred_at: '2023-10-01' },
  { id: 'tr-11', plant_id: 'p-sold-5', from_user_id: 'u-5', to_user_id: 'u-6', transaction_id: 't-5', sale_price_thb: 6500, transferred_at: '2024-05-05' },
  { id: 'tr-12', plant_id: 'p-sold-6', to_user_id: 'u-6', sale_price_thb: null, transferred_at: '2023-07-01' },
  { id: 'tr-13', plant_id: 'p-sold-6', from_user_id: 'u-6', to_user_id: 'u-7', transaction_id: 't-6', sale_price_thb: 9500, transferred_at: '2024-05-10' },
  { id: 'tr-14', plant_id: 'p-sold-7', to_user_id: 'u-7', sale_price_thb: null, transferred_at: '2023-11-01' },
  { id: 'tr-15', plant_id: 'p-sold-7', from_user_id: 'u-7', to_user_id: 'u-8', transaction_id: 't-7', sale_price_thb: 3200, transferred_at: '2024-05-15' },
  { id: 'tr-16', plant_id: 'p-sold-8', to_user_id: 'u-8', sale_price_thb: null, transferred_at: '2023-04-01' },
  { id: 'tr-17', plant_id: 'p-sold-8', from_user_id: 'u-8', to_user_id: 'u-9', transaction_id: 't-8', sale_price_thb: 15800, transferred_at: '2024-05-20' },
];

export const DISPUTES: Dispute[] = [
  { id: 'd-1', transaction_id: 't-11', opened_by: 'buyer', reason: 'mismatch', description: 'Plant received has much lower variegation than shown in photos. Leaves are mostly green.', evidence_urls: ['/images/dispute/ev1.jpg'], status: 'open', created_at: '2024-06-14' },
  { id: 'd-2', transaction_id: 't-1', opened_by: 'buyer', reason: 'transit_damage', description: 'Two leaves were broken during shipping due to poor packaging.', evidence_urls: [], status: 'resolved_seller', resolution_amount_thb: 0, created_at: '2024-04-12', resolved_at: '2024-04-16' },
  { id: 'd-3', transaction_id: 't-4', opened_by: 'buyer', reason: 'pests', description: 'Found mealybugs on the plant after receiving.', evidence_urls: [], status: 'resolved_buyer', resolution_amount_thb: 22000, created_at: '2024-05-02', resolved_at: '2024-05-05' },
];

export const MESSAGES: Message[] = [
  { id: 'm-1', thread_id: 'thread-1', sender_id: 'u-2', recipient_id: 'u-1', listing_id: 'l-1', content: 'Hi! Is this plant still available?', flagged_contact_info: false, created_at: '2024-06-18T10:00:00' },
  { id: 'm-2', thread_id: 'thread-1', sender_id: 'u-1', recipient_id: 'u-2', listing_id: 'l-1', content: 'Yes it is! I can ship tomorrow.', flagged_contact_info: false, created_at: '2024-06-18T10:15:00' },
  { id: 'm-3', thread_id: 'thread-1', sender_id: 'u-2', recipient_id: 'u-1', listing_id: 'l-1', content: 'Can you do 8000? And my LINE is plantlover99', flagged_contact_info: true, created_at: '2024-06-18T10:30:00' },
  { id: 'm-4', thread_id: 'thread-2', sender_id: 'u-5', recipient_id: 'u-11', listing_id: 'l-20', content: 'Beautiful White Princess! Is the variegation stable?', flagged_contact_info: false, created_at: '2024-06-19T09:00:00' },
  { id: 'm-5', thread_id: 'thread-2', sender_id: 'u-11', recipient_id: 'u-5', listing_id: 'l-20', content: 'Thank you! Yes, it\'s quite stable. This cultivar tends to hold its variegation well.', flagged_contact_info: false, created_at: '2024-06-19T09:20:00' },
];

export const WATCHLIST: WatchlistItem[] = [
  { id: 'w-1', user_id: 'u-1', watch_type: 'species', target_id: 'sp-1', created_at: '2024-06-01' },
  { id: 'w-2', user_id: 'u-1', watch_type: 'species', target_id: 'sp-11', created_at: '2024-06-05' },
  { id: 'w-3', user_id: 'u-1', watch_type: 'listing', target_id: 'l-14', created_at: '2024-06-10' },
  { id: 'w-4', user_id: 'u-2', watch_type: 'species', target_id: 'sp-20', created_at: '2024-06-15' },
];

export const PRICE_ALERTS: PriceAlert[] = [
  { id: 'pa-1', user_id: 'u-1', species_id: 'sp-11', size_category: 'M', threshold_thb: 15000, direction: 'below', created_at: '2024-06-01' },
  { id: 'pa-2', user_id: 'u-2', species_id: 'sp-1', size_category: 'M', threshold_thb: 7000, direction: 'below', created_at: '2024-06-10' },
  { id: 'pa-3', user_id: 'u-1', species_id: 'sp-14', threshold_thb: 1800, direction: 'below', created_at: '2024-06-15' },
];

// Realistic price curve definitions for major species
// Each defines: basePrice, trend (slope per day), volatility, seasonality
const PRICE_CURVES: Record<string, { base: number; trend: number; volatility: number; label: string }> = {
  'sp-1': { base: 12000, trend: -45, volatility: 600, label: 'Monstera Thai Constellation — declining from 2021 peak' },
  'sp-2': { base: 2800, trend: 35, volatility: 300, label: 'Pink Princess — trending up' },
  'sp-3': { base: 450, trend: 1, volatility: 60, label: 'Hoya carnosa — stable' },
  'sp-4': { base: 1200, trend: 18, volatility: 120, label: 'Anthurium clarinervium — slowly rising' },
  'sp-5': { base: 250, trend: 0, volatility: 25, label: 'Pothos Marble Queen — stable low' },
  'sp-6': { base: 320, trend: -1, volatility: 30, label: 'Snake Plant — very stable' },
  'sp-7': { base: 550, trend: 8, volatility: 45, label: 'Birds Nest Fern — gentle rise' },
  'sp-8': { base: 400, trend: -2, volatility: 30, label: 'ZZ Plant — stable' },
  'sp-9': { base: 380, trend: 2, volatility: 40, label: 'Hoya kerrii — stable' },
  'sp-10': { base: 2800, trend: 55, volatility: 280, label: 'Philodendron gloriosum — trending up' },
  'sp-11': { base: 18000, trend: -80, volatility: 1000, label: 'Monstera Albo — high volatility, declining' },
  'sp-12': { base: 150, trend: 0, volatility: 15, label: 'Echeveria — stable low' },
  'sp-13': { base: 280, trend: 0, volatility: 20, label: 'Peace Lily — stable' },
  'sp-14': { base: 2200, trend: 65, volatility: 250, label: 'Crystal Anthurium — rising fast' },
  'sp-15': { base: 4200, trend: 85, volatility: 380, label: 'Melanochrysum — strong uptrend' },
  'sp-16': { base: 180, trend: 0, volatility: 15, label: 'Spider Plant — stable' },
  'sp-17': { base: 650, trend: 12, volatility: 60, label: 'Hoya pubicalyx — gentle rise' },
  'sp-18': { base: 700, trend: 10, volatility: 50, label: 'Alocasia Polly — gentle rise' },
  'sp-19': { base: 450, trend: -8, volatility: 35, label: 'Ctenanthe — slight decline' },
  'sp-20': { base: 5000, trend: 120, volatility: 450, label: 'White Princess — strong uptrend' },
  'sp-21': { base: 1800, trend: -15, volatility: 120, label: 'Fiddle Leaf Fig — slowly declining' },
};

// Reference date: generate data ending today, going back 180 days
const REFERENCE_DATE = new Date();

function generateRealisticSnapshots(): PriceSnapshot[] {
  const snapshots: PriceSnapshot[] = [];
  const sizes: (SizeCategory | undefined)[] = [undefined, 'S', 'M', 'L'];
  const sizeMultipliers: Record<string, number> = { S: 0.5, M: 1, L: 1.8, XL: 2.8 };

  Object.entries(PRICE_CURVES).forEach(([speciesId, curve]) => {
    sizes.forEach(size => {
      const mult = size ? sizeMultipliers[size] || 1 : 1;
      const base = curve.base * mult;
      const trend = curve.trend * mult;
      const vol = curve.volatility * mult;

      // Generate 180 days of data ending at REFERENCE_DATE
      for (let d = 0; d < 180; d++) {
        const date = new Date(REFERENCE_DATE);
        date.setDate(date.getDate() - (179 - d)); // d=0 is 179 days ago, d=179 is today
        const dateStr = date.toISOString().split('T')[0];

        // Price = base + trend * day + seasonality + noise
        const trendComponent = trend * d;
        const seasonality = Math.sin(d / 30 * Math.PI) * vol * 0.5;
        const noise = (Math.random() - 0.5) * 2 * vol;
        const medianPrice = Math.max(Math.round(base + trendComponent + seasonality + noise), 50);

        // Mean close to median with some skew
        const meanPrice = Math.round(medianPrice * (1 + (Math.random() - 0.45) * 0.08));
        const minPrice = Math.round(medianPrice * (0.6 + Math.random() * 0.15));
        const maxPrice = Math.round(medianPrice * (1.3 + Math.random() * 0.4));

        // Volume: more sales when prices are stable/declining (bargain hunting)
        const baseVolume = Math.max(1, Math.round(5 - Math.abs(trend) / 20 + Math.random() * 4));

        snapshots.push({
          id: `ps-${speciesId}-${size || 'all'}-${d}`,
          species_id: speciesId,
          size_category: size,
          snapshot_date: dateStr,
          median_price_thb: medianPrice,
          mean_price_thb: meanPrice,
          min_price_thb: minPrice,
          max_price_thb: maxPrice,
          sale_count: baseVolume,
          created_at: date.toISOString()
        });
      }
    });
  });

  return snapshots;
}

// Replace the old random snapshots with realistic ones
// We keep the old PRICE_SNAPSHOTS export name for compatibility
export const PRICE_SNAPSHOTS: PriceSnapshot[] = generateRealisticSnapshots();

export function getPriceSnapshotsForSpecies(speciesId: string, sizeCategory?: string, days: number = 90): PriceSnapshot[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return PRICE_SNAPSHOTS.filter(ps =>
    ps.species_id === speciesId &&
    (sizeCategory === undefined ? ps.size_category === undefined : ps.size_category === sizeCategory) &&
    new Date(ps.snapshot_date) >= cutoff
  ).sort((a, b) => new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime());
}

export function getSpeciesPriceStats(speciesId: string, days: number = 30) {
  const data = getPriceSnapshotsForSpecies(speciesId, undefined, days);
  if (data.length === 0) return null;
  const prices = data.map(d => d.median_price_thb);
  const sorted = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const mean = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const totalSales = data.reduce((s, d) => s + d.sale_count, 0);
  return { median, mean, min, max, totalSales };
}

export function getMarketOverview(): MarketOverview {
  // Compute real stats from snapshot data
  const speciesIds = Object.keys(PRICE_CURVES).slice(0, 12);
  
  const allStats = speciesIds.map(sid => {
    const last30 = getSpeciesPriceStats(sid, 30);
    const prev60to30 = getPriceSnapshotsForSpecies(sid, undefined, 60).slice(0, 30);
    const prevMedian = prev60to30.length > 0 
      ? Math.round(prev60to30.reduce((s, p) => s + p.median_price_thb, 0) / prev60to30.length)
      : (last30?.median || 1000);
    const sales30d = last30?.totalSales || 0;
    const sparkline = getPriceSnapshotsForSpecies(sid, undefined, 30).map(d => d.median_price_thb);
    return {
      species: SPECIES.find(s => s.id === sid)!,
      current_median: last30?.median || 1000,
      previous_median: prevMedian,
      percent_change: prevMedian > 0 ? ((last30?.median || 0) - prevMedian) / prevMedian * 100 : 0,
      sales_count: sales30d,
      sparkline_data: sparkline.length > 0 ? sparkline : Array.from({ length: 30 }, () => 1000),
    };
  });

  const trending_up = allStats
    .filter(s => s.percent_change > 5)
    .sort((a, b) => b.percent_change - a.percent_change)
    .slice(0, 5);

  const trending_down = allStats
    .filter(s => s.percent_change < -3)
    .sort((a, b) => a.percent_change - b.percent_change)
    .slice(0, 4);

  const most_traded = allStats
    .sort((a, b) => b.sales_count - a.sales_count)
    .slice(0, 4);

  const hot_right_now = allStats
    .filter(s => s.percent_change > 2)
    .sort((a, b) => b.sales_count - a.sales_count)
    .slice(0, 5);

  const cold = allStats
    .filter(s => s.percent_change < -2)
    .sort((a, b) => a.percent_change - b.percent_change)
    .slice(0, 4);

  return {
    trending_up,
    trending_down,
    most_traded,
    high_value_sales: TRANSACTIONS.filter(t => t.sale_price_thb >= 5000),
    hot_right_now,
    cold,
  };
}

export function getDashboardStats(): DashboardStats {
  return {
    gmv_today: 45000,
    gmv_week: 285000,
    gmv_month: 1240000,
    active_listings: LISTINGS.length,
    dispute_rate: 2.3,
    user_count: USERS.length,
    pending_disputes: 1,
    pending_payouts: 3
  };
}

export function getProvenanceChain(plantId: string): ProvenanceChain | null {
  const plantTransfers = TRANSFERS.filter(tr => tr.plant_id === plantId);
  if (plantTransfers.length === 0) return null;
  const plant = { id: plantId, species_id: 'sp-1', current_owner_id: 'u-1', status: 'active' as const, created_at: '2023-06-01', qr_signature: 'abc123' };
  return {
    plant,
    transfers: plantTransfers,
    total_owners: new Set(plantTransfers.map(t => t.to_user_id)).size,
    total_sales_value: plantTransfers.reduce((sum, t) => sum + (t.sale_price_thb || 0), 0),
    origin_date: plantTransfers[0]?.transferred_at || '2023-06-01'
  };
}

export function getListingsWithDetails(): Listing[] {
  return LISTINGS.map(l => ({
    ...l,
    species: l.species || SPECIES.find(s => s.id === l.plant_id?.replace('p-', 'sp-') || ''),
    seller: l.seller || USERS.find(u => u.id === l.seller_id),
    photos: l.photos && l.photos.length ? l.photos : [{ id: `lp-${l.id}`, listing_id: l.id, storage_path: PLANT_IMAGES[l.plant_id?.replace('p-', 'sp-') || ''] || '/images/plants/monstera-thai.jpg', order_index: 0, created_at: l.created_at }]
  }));
}

export function getTransactionsWithDetails(): Transaction[] {
  return TRANSACTIONS.map(t => ({
    ...t,
    buyer: t.buyer || USERS.find(u => u.id === t.buyer_id),
    seller: t.seller || USERS.find(u => u.id === t.seller_id),
    listing: t.listing,
  }));
}

export function getListingById(id: string): Listing | undefined {
  return getListingsWithDetails().find(l => l.id === id);
}

export function getSpeciesById(id: string): Species | undefined {
  return SPECIES.find(s => s.id === id);
}

export function getUserById(id: string): Profile | undefined {
  return USERS.find(u => u.id === id);
}

export function getTransactionById(id: string): Transaction | undefined {
  return getTransactionsWithDetails().find(t => t.id === id);
}

export function getListingByPlantId(plantId: string): Listing | undefined {
  return getListingsWithDetails().find(l => l.plant_id === plantId);
}

export function getActiveListings(filters?: { speciesId?: string; category?: string; minPrice?: number; maxPrice?: number; size?: string; province?: string }): Listing[] {
  let listings = getListingsWithDetails().filter(l => l.status === 'active');
  if (filters?.speciesId) listings = listings.filter(l => l.plant_id?.replace('p-', 'sp-') === filters.speciesId);
  if (filters?.category) listings = listings.filter(l => l.species?.category === filters.category);
  if (filters?.minPrice) listings = listings.filter(l => l.price_thb >= filters.minPrice!);
  if (filters?.maxPrice) listings = listings.filter(l => l.price_thb <= filters.maxPrice!);
  if (filters?.size) listings = listings.filter(l => l.size_category === filters.size);
  if (filters?.province) listings = listings.filter(l => l.pickup_province === filters.province);
  return listings;
}
