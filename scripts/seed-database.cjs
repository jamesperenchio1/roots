#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Seed the live Supabase project with realistic, relational fake data.
 *
 * Run from the repo root:
 *   node scripts/seed-database.cjs
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY and VITE_SUPABASE_URL in .env.local
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SEED_DOMAIN = '@roots.seed';
const SEED_PASSWORD = 'RootsSeed2026!';

const UUID = () => crypto.randomUUID();
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickN = (arr, n) => {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
};
const randDate = (maxDaysAgo, minDaysAgo = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - randInt(minDaysAgo, maxDaysAgo));
  d.setHours(randInt(8, 22), randInt(0, 59), randInt(0, 59), 0);
  return d.toISOString();
};

const provinces = [
  { name: 'Bangkok', lat: 13.7563, lng: 100.5018 },
  { name: 'Chiang Mai', lat: 18.7883, lng: 98.9853 },
  { name: 'Phuket', lat: 7.8804, lng: 98.3923 },
  { name: 'Khon Kaen', lat: 16.4419, lng: 102.8356 },
  { name: 'Nakhon Pathom', lat: 13.8196, lng: 100.0443 },
  { name: 'Chon Buri', lat: 13.3611, lng: 100.9847 },
  { name: 'Nonthaburi', lat: 13.8621, lng: 100.5144 },
  { name: 'Pathum Thani', lat: 14.0208, lng: 100.5250 },
];

const userTemplates = [
  { display_name: 'Nattapong Garden', location: 'Bangkok', is_admin: true },
  { display_name: 'Ploy Plant House', location: 'Chiang Mai' },
  { display_name: 'Mai Aroid Corner', location: 'Bangkok' },
  { display_name: 'Tarn Succulent Lab', location: 'Phuket' },
  { display_name: 'Keng Rare Plants', location: 'Chiang Mai' },
  { display_name: 'Fern & Friends', location: 'Khon Kaen' },
  { display_name: 'Baan Ton Mai', location: 'Nakhon Pathom' },
  { display_name: 'Urban Jungle BKK', location: 'Bangkok' },
  { display_name: 'Noi Orchid Farm', location: 'Chon Buri' },
  { display_name: 'Arty Plant Collector', location: 'Nonthaburi' },
  { display_name: 'Jasmine Beginner', location: 'Pathum Thani' },
  { display_name: 'Basil Buyer', location: 'Bangkok' },
];

const speciesCatalog = [
  { id: 'sp-aroid-1', scientific: 'Monstera deliciosa', common_en: 'Monstera', common_th: 'มอนสเตอร่า', category: 'aroid', image: '/images/plants/monstera-thai.jpg', low: 150, high: 2000 },
  { id: 'sp-aroid-2', scientific: "Monstera deliciosa 'Thai Constellation'", common_en: 'Thai Constellation Monstera', common_th: 'มอนสเตอร่าไทยคอนสเตอเลชัน', category: 'aroid', image: '/images/plants/monstera-thai.jpg', low: 3000, high: 25000 },
  { id: 'sp-aroid-3', scientific: "Monstera deliciosa 'Albo Borsigiana'", common_en: 'Monstera Albo', common_th: 'มอนสเตอร่าอัลโบ', category: 'aroid', image: '/images/plants/monstera-albo.jpg', low: 8000, high: 50000 },
  { id: 'sp-aroid-4', scientific: 'Philodendron erubescens', common_en: 'Pink Princess Philodendron', common_th: 'ฟิโลเดนดรอนพิ้งค์ปริ้นเซส', category: 'aroid', image: '/images/plants/pink-princess.jpg', low: 1500, high: 15000 },
  { id: 'sp-aroid-5', scientific: 'Anthurium clarinervium', common_en: 'Velvet Cardboard Anthurium', common_th: 'หน้าวัวใบหัวใจ', category: 'aroid', image: '/images/plants/anthurium-clarinervium.jpg', low: 800, high: 4000 },
  { id: 'sp-aroid-6', scientific: 'Anthurium crystallinum', common_en: 'Crystal Anthurium', common_th: 'หน้าวัวคริสตัล', category: 'aroid', image: '/images/plants/anthurium-crystallinum.jpg', low: 1500, high: 6000 },
  { id: 'sp-aroid-7', scientific: 'Philodendron gloriosum', common_en: 'Gloriosum Philodendron', common_th: 'ฟิโลเดนดรอนกลอริโอซัม', category: 'aroid', image: '/images/plants/philodendron-gloriosum.jpg', low: 2000, high: 8000 },
  { id: 'sp-aroid-8', scientific: 'Alocasia amazonica', common_en: 'African Mask Plant', common_th: 'อะโลคาเซียโพลลี่', category: 'aroid', image: '/images/plants/alocasia-polly.jpg', low: 200, high: 800 },
  { id: 'sp-hoya-1', scientific: 'Hoya carnosa', common_en: 'Wax Plant', common_th: 'ฮอย่า', category: 'hoya', image: '/images/plants/hoya-carnosa.jpg', low: 100, high: 600 },
  { id: 'sp-hoya-2', scientific: 'Hoya kerrii', common_en: 'Sweetheart Hoya', common_th: 'ฮอย่าใจ', category: 'hoya', image: '/images/plants/hoya-kerrii.jpg', low: 80, high: 500 },
  { id: 'sp-hoya-3', scientific: 'Hoya pubicalyx', common_en: 'Hoya Pubicalyx', common_th: 'ฮอย่าพับบิคาลิกซ์', category: 'hoya', image: '/images/plants/hoya-pubicalyx.jpg', low: 150, high: 800 },
  { id: 'sp-succ-1', scientific: 'Echeveria elegans', common_en: 'Mexican Snowball', common_th: 'อีเชเวอเรีย', category: 'succulent', image: '/images/plants/succulent-collection.jpg', low: 30, high: 300 },
  { id: 'sp-succ-2', scientific: 'Haworthiopsis attenuata', common_en: 'Zebra Plant', common_th: 'หางตะเข้', category: 'succulent', image: '/images/plants/succulent-collection.jpg', low: 40, high: 250 },
  { id: 'sp-fol-1', scientific: 'Dracaena trifasciata', common_en: 'Snake Plant', common_th: 'ลิ้นมังกร', category: 'foliage', image: '/images/plants/snake-plant.jpg', low: 50, high: 500 },
  { id: 'sp-fol-2', scientific: 'Epipremnum aureum', common_en: 'Golden Pothos', common_th: 'พลูด่าง', category: 'foliage', image: '/images/plants/pothos-marble.jpg', low: 30, high: 300 },
  { id: 'sp-fol-3', scientific: 'Zamioculcas zamiifolia', common_en: 'ZZ Plant', common_th: 'กวักมรกต', category: 'foliage', image: '/images/plants/zz-plant.jpg', low: 80, high: 600 },
  { id: 'sp-fol-4', scientific: 'Spathiphyllum wallisii', common_en: 'Peace Lily', common_th: 'หน้าวัวใบ', category: 'foliage', image: '/images/plants/peace-lily.jpg', low: 60, high: 500 },
  { id: 'sp-fern-1', scientific: 'Asplenium nidus', common_en: "Bird's Nest Fern", common_th: 'เฟิร์นข้าหลวง', category: 'fern', image: '/images/plants/birds-nest-fern.jpg', low: 80, high: 500 },
  { id: 'sp-orch-1', scientific: 'Phalaenopsis amabilis', common_en: 'Moth Orchid', common_th: 'กล้วยไม้ฟาแลน็อปซิส', category: 'orchid', image: '/images/plants/spider-plant.jpg', low: 100, high: 1500 },
  { id: 'sp-herb-1', scientific: 'Ocimum basilicum', common_en: 'Sweet Basil', common_th: 'โหระพา', category: 'herb', image: '/images/plants/spider-plant.jpg', low: 10, high: 50 },
  { id: 'sp-cac-2', scientific: 'Opuntia microdasys', common_en: 'Bunny Ear Cactus', common_th: 'ต้นกระบองเพชรกระต่าย', category: 'cactus', image: '/images/plants/succulent-collection.jpg', low: 60, high: 350 },
];

const sizeMultipliers = {
  S: [0.4, 0.9],
  M: [0.7, 1.8],
  L: [1.5, 4],
  XL: [3, 9],
};

const sizeRanges = {
  S: '5-15 cm',
  M: '15-30 cm',
  L: '30-60 cm',
  XL: '60-120 cm',
};

const deliveryOptionsPool = [
  ['ship', 'pickup'],
  ['ship'],
  ['pickup'],
  ['ship', 'pickup'],
];

const tagPool = ['rare', 'variegated', 'beginner-friendly', 'fast-growing', 'imported', 'local', 'rooted', 'unrooted cutting', 'flowering', 'collectible'];

const reviewComments = [
  'Healthy plant, well packaged. Will buy again!',
  'Exactly as described. Roots look great.',
  'Fast shipping and friendly seller.',
  'A little smaller than expected but very healthy.',
  'Gorgeous specimen, exceeded expectations.',
  'Good communication and secure packaging.',
  'Plant arrived stressed but is recovering well.',
  'Beautiful variegation, true to photos.',
];

const listingCommentTexts = [
  'Is this still available?',
  'Beautiful specimen! What potting mix do you use?',
  'Would you consider a trade?',
  'Can you share a photo of the roots?',
  'Is the variegation stable on this one?',
  'Interested. Sending you a message now.',
  'Great price for this size.',
];

const speciesCommentTexts = [
  'This species does best in bright indirect light and high humidity.',
  'I find it sensitive to overwatering — let the top 3cm dry out.',
  'Mine grew super fast once I gave it a moss pole.',
  'Watch out for spider mites with this one.',
  'The Thai constellation version is much easier than the Albo IMO.',
  'Has anyone had success growing this outdoors in Bangkok?',
];

const offerMessages = [
  'Would you accept this offer?',
  'Hi, is the price negotiable?',
  'I can pick up this weekend if you accept.',
  'Can you include the pot for this price?',
];

const conversationStarters = [
  'Hi, is this still available?',
  'Hello! Can you send more photos?',
  'I\'m interested in this plant. Any discounts?',
  'Hi, do you deliver to Bangkok?',
  'Is this plant pest-free?',
];

const conversationReplies = [
  'Yes, still available!',
  'Sure, I can send more photos tonight.',
  'I can do a small discount for a quick deal.',
  'Yes, I ship nationwide via Kerry.',
  'It has been checked and is healthy.',
  'Let me know if you want to proceed.',
];

async function getSeedUserIds() {
  const { data: userList, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listErr) {
    console.warn('Could not list users:', listErr.message);
    return [];
  }
  return (userList?.users || [])
    .filter((u) => u.email && u.email.endsWith(SEED_DOMAIN))
    .map((u) => u.id);
}

async function clearPreviousSeed() {
  console.log('Cleaning up previous seed data...');

  const { error } = await supabase.rpc('cleanup_seed_data');
  if (error) {
    console.warn('Cleanup RPC failed:', error.message);
    // Continue; createUsers will reuse any remaining seed auth users.
  } else {
    console.log('Previous seed data cleaned.');
  }
}

async function createUsers() {
  console.log('Creating seed users...');
  const users = [];

  const existingSeedIds = new Set(await getSeedUserIds());
  const existingProfiles = existingSeedIds.size
    ? (await supabase.from('profiles').select('id,email:auth.users!inner(email)').in('id', Array.from(existingSeedIds))).data || []
    : [];
  // Note: the above select won't work via the anon client; keep a simple mapping by re-listing users.
  const existingByEmail = new Map(
    (await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })).data?.users
      ?.filter((u) => u.email && u.email.endsWith(SEED_DOMAIN))
      .map((u) => [u.email, u]) || []
  );

  for (const [i, tmpl] of userTemplates.entries()) {
    const email = `seed.user${i + 1}${SEED_DOMAIN}`;
    let user = existingByEmail.get(email);

    if (!user) {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password: SEED_PASSWORD,
        email_confirm: true,
        user_metadata: { display_name: tmpl.display_name },
      });

      if (error) {
        console.error(`Failed to create user ${email}:`, error.message);
        continue;
      }
      user = data.user;
    } else {
      console.log(`Reusing existing seed user ${email}`);
    }

    if (!user) continue;
    const province = provinces.find((p) => p.name === tmpl.location) || pick(provinces);
    const rating = randInt(35, 50) / 10;
    const salesCount = randInt(0, 45);

    const profile = {
      id: user.id,
      display_name: tmpl.display_name,
      location: tmpl.location,
      avatar_url: `https://api.dicebear.com/7.x/notionists/svg?seed=${user.id}`,
      rating,
      sales_count: salesCount,
      promptpay_id: `0${randInt(8, 9)}${randInt(10000000, 99999999)}`,
      language_preference: Math.random() > 0.3 ? 'th' : 'en',
      is_admin: !!tmpl.is_admin,
      is_banned: false,
      strike_count: 0,
      updated_at: new Date().toISOString(),
    };

    const { error: profileErr } = await supabase.from('profiles').upsert(profile);
    if (profileErr) console.error(`Failed to upsert profile ${email}:`, profileErr.message);

    users.push({
      id: user.id,
      email,
      ...tmpl,
      province,
      rating,
      sales_count: salesCount,
    });
  }

  console.log(`Created ${users.length} users.`);
  return users;
}

function buildListing(species, seller, size, price) {
  const delivery = pick(deliveryOptionsPool);
  const potSize = randInt(8, 30);
  const createdAt = randDate(180, 0);
  const province = seller.province;
  const tags = pickN(tagPool, randInt(2, 5));

  return {
    id: UUID(),
    seller_id: seller.id,
    species_id: species.id,
    species_scientific: species.scientific,
    species_common_en: species.common_en,
    species_common_th: species.common_th,
    category: species.category,
    price_thb: Math.round(price),
    size_category: size,
    size_cm_range: sizeRanges[size],
    pot_size_cm: potSize,
    description: `Healthy ${species.common_en} (${species.scientific}). Size ${sizeRanges[size]}, potted in ${potSize}cm pot. ${pick(['Established roots.', 'Acclimated to indoor conditions.', 'Grown in shade house.', 'Well-fed and pest-free.'])} ${delivery.includes('ship') ? 'Can ship nationwide.' : 'Pickup only.'}`,
    delivery_options: delivery,
    shipping_cost_thb: delivery.includes('ship') ? randInt(80, 200) : null,
    pickup_province: province.name,
    pickup_location: `${province.name}, Thailand`,
    pickup_lat: province.lat + (Math.random() - 0.5) * 0.04,
    pickup_lng: province.lng + (Math.random() - 0.5) * 0.04,
    status: 'active',
    image_url: species.image,
    photos: [species.image, species.image],
    view_count: randInt(20, 800),
    watch_count: randInt(0, 30),
    tags,
    created_at: createdAt,
    last_photo_update_at: createdAt,
  };
}

function priceFor(species, size) {
  const [minMul, maxMul] = sizeMultipliers[size];
  const base = randInt(species.low, species.high);
  return base * randInt(Math.round(minMul * 10), Math.round(maxMul * 10)) / 10;
}

async function createPlantsAndListings(users) {
  console.log('Creating plants and listings...');
  const plants = [];
  const listings = [];
  const activeListings = [];

  for (const seller of users.filter((u) => u.sales_count > 0 || Math.random() > 0.2)) {
    const numPlants = randInt(1, 3);
    for (let p = 0; p < numPlants; p++) {
      const species = pick(speciesCatalog);
      const size = pick(['S', 'M', 'L', 'XL']);
      const plantId = UUID();
      const plant = {
        id: plantId,
        species_id: species.id,
        current_owner_id: seller.id,
        status: 'active',
        qr_signature: crypto.randomBytes(16).toString('hex'),
        created_at: randDate(365, 30),
      };
      plants.push(plant);

      const listing = buildListing(species, seller, size, priceFor(species, size));
      listing.plant_id = plantId;

      const r = Math.random();
      if (r < 0.1) {
        listing.status = 'pending_review';
      } else if (r < 0.15) {
        listing.status = 'draft';
      } else if (r < 0.2) {
        listing.status = 'withdrawn';
      } else {
        listing.status = 'active';
        activeListings.push(listing);
      }
      listings.push(listing);
    }
  }

  // Add a few listings without plants for variety.
  for (let i = 0; i < 4; i++) {
    const seller = pick(users);
    const species = pick(speciesCatalog);
    const size = pick(['S', 'M', 'L', 'XL']);
    const listing = buildListing(species, seller, size, priceFor(species, size));
    listings.push(listing);
    if (listing.status === 'active') activeListings.push(listing);
  }

  const { error } = await supabase.from('plants').insert(plants);
  if (error) console.error('Failed to insert plants:', error.message);

  const { error: listingErr } = await supabase.from('listings').insert(listings);
  if (listingErr) console.error('Failed to insert listings:', listingErr.message);

  console.log(`Created ${plants.length} plants and ${listings.length} listings.`);
  return { plants, listings, activeListings };
}

async function createTransactionsAndTransfers(users, listings) {
  console.log('Creating transactions and reviews...');
  const transactions = [];
  const sellerReviews = [];
  const reviews = [];

  // Turn ~30% of active listings into completed sales.
  const soldListings = listings.filter((l) => l.status === 'active').sort(() => 0.5 - Math.random()).slice(0, Math.floor(listings.length * 0.3));

  for (const listing of soldListings) {
    const seller = users.find((u) => u.id === listing.seller_id);
    const buyer = pick(users.filter((u) => u.id !== seller.id));
    const salePrice = listing.price_thb;
    const platformFee = Math.round(salePrice * 0.05);
    const payout = salePrice - platformFee;
    const createdAt = randDate(120, 5);
    const courier = pick(['Kerry Express', 'Flash Express', 'Thai Post', 'J&T Express']);
    const tracking = `TH${randInt(1000000000, 9999999999)}`;

    const tx = {
      id: UUID(),
      listing_id: listing.id,
      buyer_id: buyer.id,
      seller_id: seller.id,
      species_label: listing.species_scientific,
      image_url: listing.image_url,
      sale_price_thb: salePrice,
      platform_fee_thb: platformFee,
      seller_payout_thb: payout,
      status: 'completed',
      delivery_method: listing.delivery_options.includes('ship') ? 'ship' : 'pickup',
      shipping_address: {
        name: buyer.display_name,
        address_line1: `${randInt(1, 999)}/${randInt(1, 99)} Moo ${randInt(1, 12)}`,
        district: pick(['Lat Phrao', 'Chatuchak', 'Mueang', 'Sathorn', 'Thalang', 'Mueang Chiang Mai']),
        province: buyer.location,
        postal_code: String(randInt(10000, 99999)),
        phone: `0${randInt(8, 9)}${randInt(10000000, 99999999)}`,
      },
      tracking_number: tracking,
      courier,
      payment_confirmed: true,
      payment_confirmed_at: new Date(new Date(createdAt).getTime() + 24 * 60 * 60 * 1000).toISOString(),
      shipped_at: new Date(new Date(createdAt).getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      delivered_at: new Date(new Date(createdAt).getTime() + 4 * 24 * 60 * 60 * 1000).toISOString(),
      completed_at: new Date(new Date(createdAt).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: createdAt,
    };
    transactions.push(tx);

    listing.status = 'sold';

    const rating = randInt(3, 5);
    const comment = pick(reviewComments);
    sellerReviews.push({
      id: UUID(),
      transaction_id: tx.id,
      reviewer_id: buyer.id,
      seller_id: seller.id,
      rating,
      comment,
      would_buy_again: Math.random() > 0.2,
      packaging_rating: randInt(3, 5),
      plant_condition_rating: randInt(3, 5),
      communication_rating: randInt(3, 5),
      shipping_speed_rating: randInt(2, 5),
      listing_accuracy_rating: randInt(3, 5),
      image_urls: [],
      verified_purchase: true,
      status: 'visible',
      created_at: tx.completed_at,
      updated_at: tx.completed_at,
    });

    reviews.push({
      id: UUID(),
      transaction_id: tx.id,
      listing_id: listing.id,
      reviewer_id: buyer.id,
      seller_id: seller.id,
      rating,
      comment,
      tags: pickN(tagPool, 2),
      created_at: tx.completed_at,
    });
  }

  // Persist updated listing statuses.
  for (const listing of soldListings) {
    const { error } = await supabase.from('listings').update({ status: 'sold' }).eq('id', listing.id);
    if (error) console.warn(`Failed to mark listing ${listing.id} sold:`, error.message);
  }

  const { error: txErr } = await supabase.from('transactions').insert(transactions);
  if (txErr) console.error('Failed to insert transactions:', txErr.message);

  const { error: srErr } = await supabase.from('seller_reviews').insert(sellerReviews);
  if (srErr) console.error('Failed to insert seller_reviews:', srErr.message);

  const { error: rErr } = await supabase.from('reviews').insert(reviews);
  if (rErr) console.error('Failed to insert reviews:', rErr.message);

  console.log(`Created ${transactions.length} transactions and ${sellerReviews.length} reviews (transfers recorded automatically).`);
  return { transactions };
}

async function createOffers(users, activeListings) {
  console.log('Creating offers...');
  const offers = [];
  const targetListings = activeListings.sort(() => 0.5 - Math.random()).slice(0, Math.floor(activeListings.length * 0.4));

  for (const listing of targetListings) {
    const buyer = pick(users.filter((u) => u.id !== listing.seller_id));
    const offerPrice = Math.round(listing.price_thb * randInt(70, 95) / 100);
    const createdAt = randDate(60, 0);
    const status = pick(['pending', 'accepted', 'rejected', 'countered', 'withdrawn']);
    offers.push({
      id: UUID(),
      listing_id: listing.id,
      buyer_id: buyer.id,
      seller_id: listing.seller_id,
      offer_price_thb: offerPrice,
      message: pick(offerMessages),
      status,
      counter_price_thb: status === 'countered' ? Math.round(listing.price_thb * randInt(96, 99) / 100) : null,
      responded_at: status !== 'pending' ? new Date(new Date(createdAt).getTime() + randInt(1, 48) * 60 * 60 * 1000).toISOString() : null,
      created_at: createdAt,
    });
  }

  const { error } = await supabase.from('offers').insert(offers);
  if (error) console.error('Failed to insert offers:', error.message);
  console.log(`Created ${offers.length} offers.`);
  return offers;
}

async function createComments(users, listings) {
  console.log('Creating comments...');
  const comments = [];

  // Species-level comments.
  for (let i = 0; i < 25; i++) {
    const species = pick(speciesCatalog);
    const author = pick(users);
    comments.push({
      id: UUID(),
      species_id: species.id,
      author_id: author.id,
      content: pick(speciesCommentTexts),
      content_type: 'text',
      likes_count: randInt(0, 12),
      replies_count: 0,
      status: 'visible',
      reported_count: 0,
      created_at: randDate(180, 0),
      updated_at: randDate(30, 0),
    });
  }

  // Listing-level comments and replies.
  for (const listing of listings.filter((l) => l.status === 'active').slice(0, 20)) {
    const author = pick(users);
    const parent = {
      id: UUID(),
      species_id: listing.species_id,
      listing_id: listing.id,
      author_id: author.id,
      content: pick(listingCommentTexts),
      content_type: 'text',
      likes_count: randInt(0, 8),
      replies_count: Math.random() > 0.6 ? 1 : 0,
      status: 'visible',
      reported_count: 0,
      created_at: randDate(90, 0),
      updated_at: randDate(30, 0),
    };
    comments.push(parent);

    if (parent.replies_count > 0) {
      comments.push({
        id: UUID(),
        species_id: listing.species_id,
        listing_id: listing.id,
        parent_comment_id: parent.id,
        author_id: listing.seller_id,
        content: pick(['Yes it is!', 'Sure, sending details.', 'Thanks for your interest.', 'I will DM you.']),
        content_type: 'text',
        likes_count: randInt(0, 4),
        replies_count: 0,
        status: 'visible',
        reported_count: 0,
        created_at: new Date(new Date(parent.created_at).getTime() + randInt(30, 600) * 60 * 1000).toISOString(),
        updated_at: new Date(new Date(parent.created_at).getTime() + randInt(30, 600) * 60 * 1000).toISOString(),
      });
    }
  }

  const { error } = await supabase.from('comments').insert(comments);
  if (error) console.error('Failed to insert comments:', error.message);
  console.log(`Created ${comments.length} comments.`);
  return comments;
}

async function createConversations(users, listings) {
  console.log('Creating conversations and messages...');
  const conversations = [];
  const participants = [];
  const messages = [];
  const lastMessageUpdates = {};

  const targetListings = listings.filter((l) => l.status === 'active').slice(0, 12);

  for (const listing of targetListings) {
    const buyer = pick(users.filter((u) => u.id !== listing.seller_id));
    const sellerId = listing.seller_id;
    const convId = UUID();
    const createdAt = randDate(60, 0);

    conversations.push({
      id: convId,
      type: 'direct',
      title: null,
      listing_id: listing.id,
      created_by: buyer.id,
      created_at: createdAt,
      updated_at: createdAt,
      metadata: {},
    });

    participants.push(
      { id: UUID(), conversation_id: convId, user_id: buyer.id, role: 'member', joined_at: createdAt },
      { id: UUID(), conversation_id: convId, user_id: sellerId, role: 'owner', joined_at: createdAt }
    );

    const msgCount = randInt(3, 7);
    let lastAt = new Date(createdAt);
    let senderId = buyer.id;
    let recipientId = sellerId;
    let lastMsg = null;

    for (let m = 0; m < msgCount; m++) {
      lastAt = new Date(lastAt.getTime() + randInt(5, 240) * 60 * 1000);
      const content = m === 0 ? pick(conversationStarters) : pick(conversationReplies);
      const msgId = UUID();
      lastMsg = {
        id: msgId,
        thread_id: convId,
        conversation_id: convId,
        sender_id: senderId,
        recipient_id: recipientId,
        listing_id: listing.id,
        content,
        content_type: 'text',
        is_system_event: false,
        metadata: {},
        created_at: lastAt.toISOString(),
      };
      messages.push(lastMsg);
      // Swap sender/recipient for a realistic back-and-forth.
      [senderId, recipientId] = [recipientId, senderId];
    }

    // Store last message details for post-insert update.
    if (lastMsg) {
      lastMessageUpdates[convId] = { last_message_id: lastMsg.id, last_message_at: lastMsg.created_at };
    }
  }

  const { error: cErr } = await supabase.from('conversations').insert(conversations);
  if (cErr) console.error('Failed to insert conversations:', cErr.message);

  const { error: pErr } = await supabase.from('conversation_participants').insert(participants);
  if (pErr) console.error('Failed to insert participants:', pErr.message);

  const { error: mErr } = await supabase.from('messages').insert(messages);
  if (mErr) console.error('Failed to insert messages:', mErr.message);

  for (const [convId, update] of Object.entries(lastMessageUpdates)) {
    await supabase.from('conversations').update(update).eq('id', convId);
  }

  console.log(`Created ${conversations.length} conversations, ${messages.length} messages.`);
  return { conversations, messages };
}

async function createWatchlistAndAlerts(users, listings) {
  console.log('Creating watchlist items and price alerts...');
  const watchlist = [];
  const alerts = [];

  for (const user of users) {
    // Watch a few species.
    for (const species of pickN(speciesCatalog, randInt(1, 4))) {
      watchlist.push({
        id: UUID(),
        user_id: user.id,
        watch_type: 'species',
        target_id: species.id,
        created_at: randDate(90, 0),
      });
    }

    // Watch a few active listings.
    for (const listing of pickN(listings.filter((l) => l.status === 'active'), randInt(0, 3))) {
      watchlist.push({
        id: UUID(),
        user_id: user.id,
        watch_type: 'listing',
        target_id: listing.id,
        created_at: randDate(60, 0),
      });
    }

    // Price alerts.
    for (const species of pickN(speciesCatalog, randInt(0, 2))) {
      const size = pick(['S', 'M', 'L', 'XL']);
      const threshold = Math.round(priceFor(species, size) * (Math.random() > 0.5 ? 0.8 : 1.2));
      alerts.push({
        id: UUID(),
        user_id: user.id,
        species_id: species.id,
        size_category: size,
        threshold_thb: threshold,
        direction: threshold < species.high ? 'below' : 'above',
        triggered_at: Math.random() > 0.8 ? randDate(30, 0) : null,
        created_at: randDate(120, 0),
      });
    }
  }

  const { error: wErr } = await supabase.from('watchlist').insert(watchlist);
  if (wErr) console.error('Failed to insert watchlist:', wErr.message);

  const { error: aErr } = await supabase.from('price_alerts').insert(alerts);
  if (aErr) console.error('Failed to insert price_alerts:', aErr.message);

  console.log(`Created ${watchlist.length} watchlist items and ${alerts.length} price alerts.`);
}

async function createNotifications(users, transactions) {
  console.log('Creating notifications...');
  const notifications = [];
  const titles = {
    order: 'New order',
    shipment: 'Order shipped',
    message: 'New message',
    offer: 'New offer',
    review: 'New review',
  };

  for (const user of users) {
    const count = randInt(1, 5);
    for (let i = 0; i < count; i++) {
      const type = pick(['order', 'shipment', 'message', 'offer', 'review']);
      notifications.push({
        id: UUID(),
        user_id: user.id,
        type,
        title: titles[type],
        message: `You have a new ${type} notification.`,
        read: Math.random() > 0.5,
        link: type === 'order' ? '/orders' : type === 'message' ? '/messages' : '/seller/dashboard',
        created_at: randDate(30, 0),
      });
    }
  }

  // Add some order notifications tied to real transactions.
  for (const tx of transactions.slice(0, 8)) {
    notifications.push({
      id: UUID(),
      user_id: tx.seller_id,
      type: 'order',
      title: 'New order received',
      message: `A buyer purchased your plant for ฿${tx.sale_price_thb.toLocaleString()}.`,
      read: true,
      link: `/seller/orders`,
      created_at: tx.created_at,
    });
  }

  const { error } = await supabase.from('notifications').insert(notifications);
  if (error) console.error('Failed to insert notifications:', error.message);
  console.log(`Created ${notifications.length} notifications.`);
}

async function createUserLocations(users) {
  console.log('Creating user locations...');
  const locations = [];

  for (const user of users) {
    const province = provinces.find((p) => p.name === user.location) || pick(provinces);
    locations.push({
      id: UUID(),
      profile_id: user.id,
      name: 'Home',
      address_line: `${randInt(1, 999)} ${pick(['Sukhumvit', 'Ratchadaphisek', 'Nimmanhaemin', 'Charoen Krung', 'Phuket Road'])} ${pick(['Soi', 'Road', 'Lane'])} ${randInt(1, 50)}`,
      province: province.name,
      lat: province.lat + (Math.random() - 0.5) * 0.03,
      lng: province.lng + (Math.random() - 0.5) * 0.03,
      is_default: true,
      verified_at: Math.random() > 0.3 ? randDate(200, 10) : null,
      verification_method: Math.random() > 0.3 ? 'phone' : null,
      created_at: randDate(300, 0),
      updated_at: randDate(30, 0),
    });
  }

  const { error } = await supabase.from('user_locations').insert(locations);
  if (error) console.error('Failed to insert user_locations:', error.message);
  console.log(`Created ${locations.length} user locations.`);
}

async function createQRScans(plants, users) {
  console.log('Creating QR scans...');
  const scans = [];

  for (const plant of plants.slice(0, Math.floor(plants.length * 0.6))) {
    const scanner = Math.random() > 0.3 ? pick(users) : null;
    scans.push({
      id: UUID(),
      plant_id: plant.id,
      scanner_user_id: scanner?.id || null,
      scan_source: pick(['camera', 'manual', 'url']),
      ip_hash: crypto.createHash('sha256').update(`ip-${randInt(1, 100000)}`).digest('hex').slice(0, 32),
      user_agent_hash: crypto.createHash('sha256').update('Mozilla/5.0').digest('hex').slice(0, 32),
      created_at: randDate(90, 0),
    });
  }

  const { error } = await supabase.from('qr_scans').insert(scans);
  if (error) console.error('Failed to insert qr_scans:', error.message);
  console.log(`Created ${scans.length} QR scans.`);
}

async function createPriceSnapshots() {
  console.log('Creating price snapshots...');
  const snapshots = [];
  const targetSpecies = speciesCatalog.filter((s) => ['sp-aroid-2', 'sp-aroid-3', 'sp-aroid-4', 'sp-hoya-1', 'sp-fol-1'].includes(s.id));
  const targetSpeciesIds = targetSpecies.map((s) => s.id);
  const sizes = ['S', 'M', 'L'];

  // Remove any existing seed snapshots for the same species/size/date combos to stay idempotent.
  await supabase.from('price_snapshots').delete().in('species_id', targetSpeciesIds);

  for (const species of targetSpecies) {
    for (const size of sizes) {
      const base = priceFor(species, size);
      for (let day = 365; day >= 0; day--) {
        const date = new Date();
        date.setDate(date.getDate() - day);
        const trend = Math.sin(day / 30) * base * 0.08;
        const noise = (Math.random() - 0.5) * base * 0.1;
        const median = Math.max(Math.round(base + trend + noise), 10);
        const min = Math.round(median * (0.8 + Math.random() * 0.1));
        const max = Math.round(median * (1.1 + Math.random() * 0.2));
        const mean = Math.round((min + max) / 2);
        const saleCount = randInt(0, 5);

        snapshots.push({
          id: UUID(),
          species_id: species.id,
          size_category: size,
          snapshot_date: date.toISOString().slice(0, 10),
          median_price_thb: median,
          mean_price_thb: mean,
          min_price_thb: min,
          max_price_thb: max,
          sale_count: saleCount,
          listing_count: randInt(1, 8),
          avg_asking_price: Math.round(mean * (0.95 + Math.random() * 0.15)),
        });
      }
    }
  }

  // Insert in chunks to avoid oversized payloads.
  const chunkSize = 500;
  for (let i = 0; i < snapshots.length; i += chunkSize) {
    const chunk = snapshots.slice(i, i + chunkSize);
    const { error } = await supabase.from('price_snapshots').insert(chunk);
    if (error) console.error(`Failed to insert price_snapshots chunk ${i}:`, error.message);
  }

  console.log(`Created ${snapshots.length} price snapshots.`);
}

async function main() {
  await clearPreviousSeed();
  const users = await createUsers();
  if (users.length === 0) {
    console.error('No users created; aborting.');
    process.exit(1);
  }

  const { plants, listings, activeListings } = await createPlantsAndListings(users);
  const { transactions } = await createTransactionsAndTransfers(users, listings);
  await createOffers(users, activeListings);
  await createComments(users, listings);
  await createConversations(users, listings);
  await createWatchlistAndAlerts(users, listings);
  await createNotifications(users, transactions);
  await createUserLocations(users);
  await createQRScans(plants, users);
  await createPriceSnapshots();

  console.log('\nSeed complete.');
}

main().catch((err) => {
  console.error('Seed script failed:', err);
  process.exit(1);
});
