require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const slugify = require('slugify');

const User = require('../models/User');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');

// ─── DB Connect ──────────────────────────────────────────────────────────────

async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✔  MongoDB connected');
}

// ─── Users ───────────────────────────────────────────────────────────────────

const users = [
  {
    name: 'Store Admin',
    email: 'admin@stepstyle.com',
    password: 'Admin@123456',
    role: 'admin',
    isEmailVerified: true,
    phone: '9999999999',
  },
  {
    name: 'Gurpreet Admin',
    email: 'gurpreetjoey@gmail.com',
    password: 'Gurpreet@123456',
    role: 'admin',
    isEmailVerified: true,
    phone: '9876543210',
  },
  {
    name: 'Rahul Sharma',
    email: 'rahul@test.com',
    password: 'Test@123456',
    role: 'user',
    isEmailVerified: true,
    phone: '9876543211',
  },
];

async function seedUsers() {
  console.log('\n── Seeding users…');
  for (const u of users) {
    const hashed = await bcrypt.hash(u.password, 12);
    await User.findOneAndUpdate(
      { email: u.email },
      {
        name: u.name,
        email: u.email,
        password: hashed,
        role: u.role,
        isEmailVerified: u.isEmailVerified,
        phone: u.phone,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`   ✔  ${u.role === 'admin' ? '(admin)' : '(user) '} ${u.email}`);
  }
}

// ─── Products ─────────────────────────────────────────────────────────────────

const products = [
  // ── Men's Sports ────────────────────────────────────────────────────────────
  {
    name: 'AirStride Pro Running Shoes',
    brand: 'StrideTech',
    category: 'mens',
    subCategory: 'sports',
    price: 2999,
    discountPrice: 1999,
    color: 'Black/Red',
    material: 'Mesh Upper, Rubber Sole',
    description:
      'Engineered for peak performance on the track and road. Lightweight mesh upper provides breathability while the cushioned sole absorbs impact. Perfect for daily runs and gym sessions.',
    sizes: [
      { size: '6', stock: 5 }, { size: '7', stock: 8 },
      { size: '8', stock: 12 }, { size: '9', stock: 10 },
      { size: '10', stock: 6 }, { size: '11', stock: 3 }, { size: '12', stock: 2 },
    ],
    isFeatured: true,
    tags: ['running', 'sports', 'lightweight', 'gym'],
    images: [{ url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800', publicId: 'seed_1' }],
  },
  {
    name: 'FlexRun Ultra Sneakers',
    brand: 'FlexFoot',
    category: 'mens',
    subCategory: 'sports',
    price: 3499,
    discountPrice: 2499,
    color: 'White/Blue',
    material: 'Knit Upper, EVA Sole',
    description:
      'Ultra-responsive knit upper molds to your foot for a sock-like fit. EVA midsole provides exceptional energy return. Built for speed, designed for style.',
    sizes: [
      { size: '7', stock: 6 }, { size: '8', stock: 9 },
      { size: '9', stock: 11 }, { size: '10', stock: 7 }, { size: '11', stock: 4 },
    ],
    isFeatured: true,
    tags: ['running', 'sports', 'ultralight'],
    images: [{ url: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800', publicId: 'seed_2' }],
  },
  {
    name: 'PowerStep Training Shoes',
    brand: 'PowerGear',
    category: 'mens',
    subCategory: 'sports',
    price: 1999,
    discountPrice: 1499,
    color: 'Grey/Orange',
    material: 'Synthetic Upper, Rubber Sole',
    description:
      'Versatile training shoe built for cross-training, weightlifting, and HIIT workouts. Wide flat sole for stability during lifts.',
    sizes: [
      { size: '6', stock: 4 }, { size: '7', stock: 7 },
      { size: '8', stock: 10 }, { size: '9', stock: 8 }, { size: '10', stock: 5 },
    ],
    isFeatured: false,
    tags: ['training', 'gym', 'crossfit'],
    images: [{ url: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800', publicId: 'seed_3' }],
  },
  {
    name: 'TerraGrip Hiking Shoes',
    brand: 'TrailMaster',
    category: 'mens',
    subCategory: 'sports',
    price: 4499,
    discountPrice: 3299,
    color: 'Brown/Green',
    material: 'Leather + Mesh, Vibram Sole',
    description:
      'Conquer any trail with confidence. Vibram outsole grips wet rocks and muddy paths. Waterproof membrane keeps feet dry in all conditions.',
    sizes: [
      { size: '7', stock: 5 }, { size: '8', stock: 8 },
      { size: '9', stock: 6 }, { size: '10', stock: 4 }, { size: '11', stock: 3 },
    ],
    isFeatured: false,
    tags: ['hiking', 'outdoor', 'waterproof', 'trail'],
    images: [{ url: 'https://images.unsplash.com/photo-1520219306100-ec4afeeefe58?w=800', publicId: 'seed_4' }],
  },
  {
    name: 'SpeedMax Court Shoes',
    brand: 'CourtKing',
    category: 'mens',
    subCategory: 'sports',
    price: 2499,
    discountPrice: 1799,
    color: 'White/Green',
    material: 'Synthetic Leather, Gum Sole',
    description:
      'Designed for badminton and tennis courts. Non-marking gum sole provides excellent grip. Lateral support prevents ankle rolls during quick direction changes.',
    sizes: [
      { size: '6', stock: 6 }, { size: '7', stock: 9 },
      { size: '8', stock: 11 }, { size: '9', stock: 7 }, { size: '10', stock: 4 },
    ],
    isFeatured: false,
    tags: ['badminton', 'tennis', 'court', 'indoor'],
    images: [{ url: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800', publicId: 'seed_5' }],
  },

  // ── Men's Casual ─────────────────────────────────────────────────────────────
  {
    name: 'Urban Walk Canvas Sneakers',
    brand: 'UrbanFeet',
    category: 'mens',
    subCategory: 'casual',
    price: 1499,
    discountPrice: 999,
    color: 'White/Navy',
    material: 'Canvas Upper, Rubber Sole',
    description:
      'Classic canvas sneakers that go with everything. Lightweight and breathable for all-day comfort. A wardrobe staple for the modern Indian man.',
    sizes: [
      { size: '6', stock: 10 }, { size: '7', stock: 12 },
      { size: '8', stock: 15 }, { size: '9', stock: 10 },
      { size: '10', stock: 6 }, { size: '11', stock: 3 },
    ],
    isFeatured: true,
    tags: ['casual', 'canvas', 'everyday', 'lightweight'],
    images: [{ url: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800', publicId: 'seed_6' }],
  },
  {
    name: 'Denim Street Loafers',
    brand: 'StreetStyle',
    category: 'mens',
    subCategory: 'casual',
    price: 1799,
    discountPrice: 1299,
    color: 'Denim Blue',
    material: 'Denim Upper, Leather Lining',
    description:
      'Slip-on loafers with a denim twist. Perfect for casual Fridays and weekend outings. Leather lining ensures comfort all day long.',
    sizes: [
      { size: '7', stock: 8 }, { size: '8', stock: 10 },
      { size: '9', stock: 9 }, { size: '10', stock: 5 },
    ],
    isFeatured: false,
    tags: ['loafers', 'casual', 'slip-on', 'denim'],
    images: [{ url: 'https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=800', publicId: 'seed_7' }],
  },
  {
    name: 'Comfort Walk Moccasins',
    brand: 'EaseStep',
    category: 'mens',
    subCategory: 'casual',
    price: 1299,
    discountPrice: 899,
    color: 'Tan Brown',
    material: 'Suede Upper, Memory Foam Insole',
    description:
      'Premium suede moccasins with memory foam insole for cloud-like comfort. Perfect for long days at work or leisurely walks.',
    sizes: [
      { size: '6', stock: 7 }, { size: '7', stock: 9 },
      { size: '8', stock: 11 }, { size: '9', stock: 8 }, { size: '10', stock: 4 },
    ],
    isFeatured: false,
    tags: ['moccasins', 'comfort', 'suede', 'casual'],
    images: [{ url: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=800', publicId: 'seed_8' }],
  },
  {
    name: 'Classic White Sneakers',
    brand: 'PureStep',
    category: 'mens',
    subCategory: 'casual',
    price: 2199,
    discountPrice: 1599,
    color: 'All White',
    material: 'Leather Upper, Rubber Sole',
    description:
      'Timeless all-white leather sneakers. Clean minimal design pairs with jeans, chinos, or shorts. Easy to clean and built to last.',
    sizes: [
      { size: '6', stock: 5 }, { size: '7', stock: 8 },
      { size: '8', stock: 12 }, { size: '9', stock: 10 },
      { size: '10', stock: 7 }, { size: '11', stock: 3 },
    ],
    isFeatured: true,
    tags: ['white', 'minimal', 'classic', 'leather'],
    images: [{ url: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=800', publicId: 'seed_9' }],
  },

  // ── Men's Formal ──────────────────────────────────────────────────────────────
  {
    name: 'Executive Oxford Shoes',
    brand: 'EliteStep',
    category: 'mens',
    subCategory: 'formal',
    price: 3999,
    discountPrice: 2999,
    color: 'Black',
    material: 'Genuine Leather, Leather Sole',
    description:
      'Handcrafted genuine leather oxfords for the discerning professional. Goodyear welt construction ensures durability. A boardroom essential.',
    sizes: [
      { size: '7', stock: 4 }, { size: '8', stock: 6 },
      { size: '9', stock: 8 }, { size: '10', stock: 5 }, { size: '11', stock: 2 },
    ],
    isFeatured: false,
    tags: ['formal', 'oxford', 'leather', 'office'],
    images: [{ url: 'https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=800', publicId: 'seed_10' }],
  },
  {
    name: 'Derby Brogue Shoes',
    brand: 'ClassicCraft',
    category: 'mens',
    subCategory: 'formal',
    price: 3499,
    discountPrice: 2499,
    color: 'Tan Brown',
    material: 'Full Grain Leather, Rubber Sole',
    description:
      'Full grain leather derby with intricate brogue detailing. Rubber sole for all-weather grip. Transitions seamlessly from office to evening.',
    sizes: [
      { size: '7', stock: 5 }, { size: '8', stock: 7 },
      { size: '9', stock: 6 }, { size: '10', stock: 4 },
    ],
    isFeatured: false,
    tags: ['formal', 'brogue', 'derby', 'leather'],
    images: [{ url: 'https://images.unsplash.com/photo-1582897085656-c636d006a246?w=800', publicId: 'seed_11' }],
  },
  {
    name: 'Monk Strap Premium Shoes',
    brand: 'EliteStep',
    category: 'mens',
    subCategory: 'formal',
    price: 4499,
    discountPrice: 3299,
    color: 'Dark Brown',
    material: 'Italian Leather, Leather Sole',
    description:
      'Double monk strap shoes in premium Italian leather. The buckle closure adds a sophisticated touch. Perfect for weddings and corporate events.',
    sizes: [
      { size: '7', stock: 3 }, { size: '8', stock: 5 },
      { size: '9', stock: 7 }, { size: '10', stock: 4 }, { size: '11', stock: 2 },
    ],
    isFeatured: true,
    tags: ['formal', 'monk', 'premium', 'italian'],
    images: [{ url: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=800', publicId: 'seed_12' }],
  },

  // ── Men's Boots ───────────────────────────────────────────────────────────────
  {
    name: 'Rugged Leather Boots',
    brand: 'RoughRider',
    category: 'mens',
    subCategory: 'boots',
    price: 5999,
    discountPrice: 4499,
    color: 'Dark Brown',
    material: 'Full Grain Leather, Rubber Sole',
    description:
      'Built for the long haul. Full grain leather upper develops a beautiful patina over time. Waterproof and built to handle Indian monsoons with ease.',
    sizes: [
      { size: '7', stock: 4 }, { size: '8', stock: 6 },
      { size: '9', stock: 5 }, { size: '10', stock: 3 }, { size: '11', stock: 2 },
    ],
    isFeatured: false,
    tags: ['boots', 'leather', 'waterproof', 'rugged'],
    images: [{ url: 'https://images.unsplash.com/photo-1520219306100-ec4afeeefe58?w=800', publicId: 'seed_13' }],
  },

  // ── Women's Casual ────────────────────────────────────────────────────────────
  {
    name: 'CloudStep Comfort Flats',
    brand: 'SoftStep',
    category: 'womens',
    subCategory: 'casual',
    price: 1299,
    discountPrice: 899,
    color: 'Nude Pink',
    material: 'Faux Leather, Memory Foam',
    description:
      'All-day comfort flats with memory foam insole. Versatile nude pink pairs with any outfit from office wear to casual brunch.',
    sizes: [
      { size: '3', stock: 8 }, { size: '4', stock: 10 },
      { size: '5', stock: 12 }, { size: '6', stock: 9 }, { size: '7', stock: 5 },
    ],
    isFeatured: true,
    tags: ['flats', 'comfort', 'casual', 'everyday'],
    images: [{ url: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800', publicId: 'seed_14' }],
  },
  {
    name: 'Boho Canvas Slip-ons',
    brand: 'FreeSpirit',
    category: 'womens',
    subCategory: 'casual',
    price: 999,
    discountPrice: 699,
    color: 'Multicolor',
    material: 'Canvas, Jute Sole',
    description:
      'Vibrant boho-inspired canvas slip-ons with jute sole. Lightweight and breathable for summer days. Handcrafted with love.',
    sizes: [
      { size: '3', stock: 10 }, { size: '4', stock: 12 },
      { size: '5', stock: 15 }, { size: '6', stock: 10 }, { size: '7', stock: 6 },
    ],
    isFeatured: false,
    tags: ['boho', 'canvas', 'slip-on', 'summer'],
    images: [{ url: 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=800', publicId: 'seed_15' }],
  },
  {
    name: 'Sport Chic Sneakers',
    brand: 'ActiveGlow',
    category: 'womens',
    subCategory: 'casual',
    price: 1999,
    discountPrice: 1499,
    color: 'White/Rose Gold',
    material: 'Mesh Upper, Rubber Sole',
    description:
      'Where sport meets style. Rose gold accents elevate this everyday sneaker. Cushioned sole keeps you comfortable from morning to night.',
    sizes: [
      { size: '3', stock: 6 }, { size: '4', stock: 9 },
      { size: '5', stock: 11 }, { size: '6', stock: 8 }, { size: '7', stock: 4 },
    ],
    isFeatured: true,
    tags: ['sneakers', 'sport', 'casual', 'rose-gold'],
    images: [{ url: 'https://images.unsplash.com/photo-1515347619252-60a4bf4fff4f?w=800', publicId: 'seed_16' }],
  },
  {
    name: 'Ethnic Kolhapuri Flats',
    brand: 'DesiCraft',
    category: 'womens',
    subCategory: 'casual',
    price: 1199,
    discountPrice: 849,
    color: 'Gold/Brown',
    material: 'Genuine Leather, Handcrafted',
    description:
      'Authentic Kolhapuri chappals handcrafted by artisans from Maharashtra. Perfect for ethnic wear and festive occasions. Each pair is unique.',
    sizes: [
      { size: '3', stock: 7 }, { size: '4', stock: 10 },
      { size: '5', stock: 8 }, { size: '6', stock: 6 }, { size: '7', stock: 3 },
    ],
    isFeatured: false,
    tags: ['ethnic', 'kolhapuri', 'handcrafted', 'festive'],
    images: [{ url: 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=800', publicId: 'seed_17' }],
  },

  // ── Women's Formal ────────────────────────────────────────────────────────────
  {
    name: 'Power Heel Pumps',
    brand: 'ElleStep',
    category: 'womens',
    subCategory: 'formal',
    price: 2499,
    discountPrice: 1799,
    color: 'Black',
    material: 'Patent Leather, Cushioned Insole',
    description:
      'Classic pointed-toe pumps with 3-inch block heel. Patent leather finish adds polish to any corporate outfit. Cushioned insole for all-day wear.',
    sizes: [
      { size: '3', stock: 5 }, { size: '4', stock: 7 },
      { size: '5', stock: 9 }, { size: '6', stock: 6 }, { size: '7', stock: 3 },
    ],
    isFeatured: false,
    tags: ['heels', 'formal', 'pumps', 'office'],
    images: [{ url: 'https://images.unsplash.com/photo-1515347619252-60a4bf4fff4f?w=800', publicId: 'seed_18' }],
  },
  {
    name: 'Ballet Court Shoes',
    brand: 'GraceStep',
    category: 'womens',
    subCategory: 'formal',
    price: 1799,
    discountPrice: 1299,
    color: 'Nude/Black',
    material: 'Suede, Leather Sole',
    description:
      'Elegant ballet-inspired court shoes with subtle bow detail. Low heel makes them practical for long office days without sacrificing elegance.',
    sizes: [
      { size: '3', stock: 6 }, { size: '4', stock: 8 },
      { size: '5', stock: 10 }, { size: '6', stock: 7 }, { size: '7', stock: 4 },
    ],
    isFeatured: false,
    tags: ['ballet', 'formal', 'elegant', 'office'],
    images: [{ url: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800', publicId: 'seed_19' }],
  },

  // ── Women's Sandals ───────────────────────────────────────────────────────────
  {
    name: 'Strappy Gladiator Sandals',
    brand: 'SunStep',
    category: 'womens',
    subCategory: 'sandals',
    price: 1499,
    discountPrice: 999,
    color: 'Tan/Gold',
    material: 'Faux Leather Straps, Rubber Sole',
    description:
      'Trendy gladiator sandals with gold hardware. Ankle wrap closure for secure fit. Perfect for beach days, brunches, and summer parties.',
    sizes: [
      { size: '3', stock: 9 }, { size: '4', stock: 11 },
      { size: '5', stock: 13 }, { size: '6', stock: 8 }, { size: '7', stock: 5 },
    ],
    isFeatured: true,
    tags: ['sandals', 'gladiator', 'summer', 'strappy'],
    images: [{ url: 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=800', publicId: 'seed_20' }],
  },
  {
    name: 'Comfort Footbed Sandals',
    brand: 'EaseStep',
    category: 'womens',
    subCategory: 'sandals',
    price: 1199,
    discountPrice: 849,
    color: 'Brown',
    material: 'Cork Footbed, Leather Straps',
    description:
      'Orthopedic cork footbed sandals that mold to the shape of your foot over time. Adjustable leather straps for perfect fit. Ideal for monsoon and summer.',
    sizes: [
      { size: '3', stock: 7 }, { size: '4', stock: 9 },
      { size: '5', stock: 11 }, { size: '6', stock: 8 }, { size: '7', stock: 4 },
    ],
    isFeatured: false,
    tags: ['sandals', 'comfort', 'cork', 'orthopedic'],
    images: [{ url: 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=800', publicId: 'seed_21' }],
  },

  // ── Women's Boots ─────────────────────────────────────────────────────────────
  {
    name: 'Ankle Boot Chic',
    brand: 'BohoChic',
    category: 'womens',
    subCategory: 'boots',
    price: 3499,
    discountPrice: 2499,
    color: 'Black',
    material: 'Faux Leather, Block Heel',
    description:
      'Sleek ankle boots with block heel and side zip. Pairs perfectly with dresses, skirts, or skinny jeans. A wardrobe essential for every season.',
    sizes: [
      { size: '3', stock: 5 }, { size: '4', stock: 7 },
      { size: '5', stock: 9 }, { size: '6', stock: 6 }, { size: '7', stock: 3 },
    ],
    isFeatured: false,
    tags: ['boots', 'ankle', 'block-heel', 'chic'],
    images: [{ url: 'https://images.unsplash.com/photo-1603808033192-082d6919d3e1?w=800', publicId: 'seed_22' }],
  },
  {
    name: 'Knee High Leather Boots',
    brand: 'ElleStep',
    category: 'womens',
    subCategory: 'boots',
    price: 5499,
    discountPrice: 3999,
    color: 'Dark Brown',
    material: 'Genuine Leather, Leather Sole',
    description:
      'Statement knee-high boots in genuine leather. Inside zip for easy on/off. Low block heel for all-day wearability. A luxury investment piece.',
    sizes: [
      { size: '3', stock: 3 }, { size: '4', stock: 5 },
      { size: '5', stock: 7 }, { size: '6', stock: 4 }, { size: '7', stock: 2 },
    ],
    isFeatured: true,
    tags: ['boots', 'knee-high', 'leather', 'luxury'],
    images: [{ url: 'https://images.unsplash.com/photo-1603808033192-082d6919d3e1?w=800', publicId: 'seed_23' }],
  },
];

async function seedProducts() {
  console.log('\n── Seeding products…');
  for (const p of products) {
    const slug = slugify(p.name, { lower: true, strict: true });
    await Product.findOneAndUpdate(
      { slug },
      { ...p, slug },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`   ✔  [${p.category}/${p.subCategory}] ${p.name}`);
  }
}

// ─── Coupons ──────────────────────────────────────────────────────────────────

const coupons = [
  {
    code: 'WELCOME20',
    discountType: 'percentage',
    discountValue: 20,
    minOrderAmount: 500,
    maxDiscountAmount: 300,
    usageLimit: 1000,
    expiresAt: new Date('2026-12-31'),
    isActive: true,
  },
  {
    code: 'FLAT100',
    discountType: 'flat',
    discountValue: 100,
    minOrderAmount: 800,
    usageLimit: 500,
    expiresAt: new Date('2026-12-31'),
    isActive: true,
  },
  {
    code: 'FIRST50',
    discountType: 'flat',
    discountValue: 50,
    minOrderAmount: 0,
    usageLimit: 2000,
    expiresAt: new Date('2026-12-31'),
    isActive: true,
  },
  {
    code: 'STEPSTYLE15',
    discountType: 'percentage',
    discountValue: 15,
    minOrderAmount: 1000,
    maxDiscountAmount: 500,
    usageLimit: 300,
    expiresAt: new Date('2026-12-31'),
    isActive: true,
  },
];

async function seedCoupons() {
  console.log('\n── Seeding coupons…');
  for (const c of coupons) {
    await Coupon.findOneAndUpdate(
      { code: c.code },
      c,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`   ✔  ${c.code}  (${c.discountType === 'percentage' ? c.discountValue + '%' : '₹' + c.discountValue} off)`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  try {
    await connectDB();
    await seedUsers();
    await seedProducts();
    await seedCoupons();

    console.log('\n✅ Seeded successfully:');
    console.log('   👤 3 users (2 admin, 1 normal)');
    console.log('   👟 23 products');
    console.log('   🎟️  4 coupons');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Seed failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

main();
