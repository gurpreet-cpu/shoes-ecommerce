require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const axios = require('axios');
const BASE = 'https://shoes-ecommerce-production.up.railway.app/api';

let adminToken  = '';
let userToken   = '';
let productId   = '';
let productSlug = '';
let orderId     = '';
const couponCode = 'WELCOME20';

const pass = (msg)       => console.log('  ✅', msg);
const fail = (msg, err)  => console.log('  ❌', msg, err?.response?.data?.message || err?.message);

async function runTests() {
  console.log('\n🧪 STARTING E2E TESTS ON RAILWAY\n');
  console.log('BASE URL:', BASE);
  console.log('================================\n');

  // ─── AUTH ────────────────────────────────────────────────────────────────────
  console.log('📋 AUTH TESTS');

  // Admin login
  try {
    const res = await axios.post(`${BASE}/auth/login`, {
      email: 'admin@stepstyle.com',
      password: 'Admin@123456',
    });
    adminToken = res.data.data.accessToken;
    pass('Admin login → got accessToken');
  } catch (e) { fail('Admin login', e); }

  // Normal user login
  try {
    const res = await axios.post(`${BASE}/auth/login`, {
      email: 'rahul@test.com',
      password: 'Test@123456',
    });
    userToken = res.data.data.accessToken;
    pass('User login → got accessToken');
  } catch (e) { fail('User login', e); }

  // Get me
  try {
    const res = await axios.get(`${BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    pass(`GET /auth/me → ${res.data.data.user.email}`);
  } catch (e) { fail('GET /auth/me', e); }

  // Invalid login → 401
  try {
    await axios.post(`${BASE}/auth/login`, {
      email: 'wrong@test.com', password: 'wrongpass',
    });
    fail('Invalid login should have failed');
  } catch (e) {
    if (e.response?.status === 401) pass('Invalid login → 401 correctly');
    else fail('Invalid login wrong status', e);
  }

  // ─── PRODUCTS ────────────────────────────────────────────────────────────────
  console.log('\n📋 PRODUCT TESTS');

  // Get all products
  try {
    const res = await axios.get(`${BASE}/products`);
    const count = res.data.data.totalCount;
    pass(`GET /products → ${count} products returned`);
  } catch (e) { fail('GET /products', e); }

  // Filter by mens — pick a product with size 8 for cart/order tests
  try {
    const res = await axios.get(`${BASE}/products?category=mens`);
    // Default sort is newest-first; find first mens product that stocks size '8'
    const candidate = res.data.data.products.find(
      (p) => p.sizes.some((s) => s.size === '8' && s.stock > 0)
    );
    productId   = candidate._id;
    productSlug = candidate.slug;
    pass(`GET /products?category=mens → ${res.data.data.products.length} results (using ${candidate.name} for cart/order tests)`);
  } catch (e) { fail('GET /products?category=mens', e); }

  // Filter by womens
  try {
    const res = await axios.get(`${BASE}/products?category=womens`);
    pass(`GET /products?category=womens → ${res.data.data.products.length} results`);
  } catch (e) { fail('GET /products?category=womens', e); }

  // Filter by subCategory
  try {
    const res = await axios.get(`${BASE}/products?subCategory=sports`);
    pass(`GET /products?subCategory=sports → ${res.data.data.products.length} results`);
  } catch (e) { fail('GET /products?subCategory=sports', e); }

  // Filter by price
  try {
    const res = await axios.get(`${BASE}/products?minPrice=1000&maxPrice=2000`);
    pass(`GET /products?minPrice=1000&maxPrice=2000 → ${res.data.data.products.length} results`);
  } catch (e) { fail('GET /products price filter', e); }

  // Get by slug
  try {
    await axios.get(`${BASE}/products/slug/${productSlug}`);
    pass(`GET /products/slug/${productSlug} → product returned`);
  } catch (e) { fail('GET /products/slug/:slug', e); }

  // Get featured
  try {
    const res = await axios.get(`${BASE}/products/featured`);
    pass(`GET /products/featured → ${res.data.data.length} featured products`);
  } catch (e) { fail('GET /products/featured', e); }

  // Search
  try {
    const res = await axios.get(`${BASE}/products?search=running`);
    pass(`GET /products?search=running → ${res.data.data.products.length} results`);
  } catch (e) { fail('GET /products search', e); }

  // Non-admin create product → 403
  try {
    await axios.post(`${BASE}/products`, {}, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    fail('Non-admin product create should be 403');
  } catch (e) {
    if (e.response?.status === 403) pass('Non-admin create product → 403 correctly');
    else fail('Non-admin create product wrong status', e);
  }

  // ─── CART ────────────────────────────────────────────────────────────────────
  console.log('\n📋 CART TESTS');

  // Add to cart
  try {
    await axios.post(`${BASE}/cart/items`, {
      productId, size: '8', quantity: 1,
    }, { headers: { Authorization: `Bearer ${userToken}` } });
    pass('POST /cart/items → item added');
  } catch (e) { fail('POST /cart/items', e); }

  // Get cart
  try {
    const res = await axios.get(`${BASE}/cart`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    pass(`GET /cart → ${res.data.data.items.length} items, total ₹${res.data.data.totals.total}`);
  } catch (e) { fail('GET /cart', e); }

  // Apply coupon
  try {
    await axios.post(`${BASE}/cart/coupon`, { code: couponCode }, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    pass(`POST /cart/coupon → ${couponCode} applied`);
  } catch (e) { fail('POST /cart/coupon', e); }

  // Remove coupon
  try {
    await axios.delete(`${BASE}/cart/coupon`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    pass('DELETE /cart/coupon → coupon removed');
  } catch (e) { fail('DELETE /cart/coupon', e); }

  // Validate coupon
  try {
    const res = await axios.post(`${BASE}/coupons/validate`, {
      code: 'FLAT100', cartTotal: 1500,
    }, { headers: { Authorization: `Bearer ${userToken}` } });
    pass(`POST /coupons/validate → discount ₹${res.data.data.discountAmount}`);
  } catch (e) { fail('POST /coupons/validate', e); }

  // ─── ORDERS ──────────────────────────────────────────────────────────────────
  console.log('\n📋 ORDER TESTS');

  // Create COD order
  try {
    const res = await axios.post(`${BASE}/orders`, {
      items: [{ productId, size: '8', quantity: 1 }],
      shippingAddress: {
        name: 'Rahul Sharma',
        phone: '9876543211',
        street: '123 MG Road',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110001',
      },
      paymentMethod: 'cod',
    }, { headers: { Authorization: `Bearer ${userToken}` } });
    // order is nested under res.data.data.order
    orderId = res.data.data.order._id;
    pass(`POST /orders → COD order created: ${res.data.data.order.orderNumber}`);
  } catch (e) { fail('POST /orders COD', e); }

  // Get my orders
  try {
    const res = await axios.get(`${BASE}/orders`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    pass(`GET /orders → ${res.data.data.totalCount} orders`);
  } catch (e) { fail('GET /orders', e); }

  // Get order by id
  try {
    await axios.get(`${BASE}/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    pass('GET /orders/:id → order detail returned');
  } catch (e) { fail('GET /orders/:id', e); }

  // Oversell → 400
  try {
    await axios.post(`${BASE}/orders`, {
      items: [{ productId, size: '8', quantity: 999 }],
      shippingAddress: {
        name: 'Test', phone: '9876543211',
        street: '123 Road', city: 'Delhi',
        state: 'Delhi', pincode: '110001',
      },
      paymentMethod: 'cod',
    }, { headers: { Authorization: `Bearer ${userToken}` } });
    fail('Oversell should have failed');
  } catch (e) {
    if (e.response?.status === 400) pass('Oversell attempt → 400 correctly');
    else fail('Oversell wrong status', e);
  }

  // ─── ADMIN ───────────────────────────────────────────────────────────────────
  console.log('\n📋 ADMIN TESTS');

  // Dashboard
  try {
    const res = await axios.get(`${BASE}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const d = res.data.data;
    pass(`GET /admin/dashboard → Revenue: ₹${d.totalRevenue}, Orders: ${JSON.stringify(d.orderStats)}, Products: ${d.totalProducts}, Users: ${d.totalUsers}`);
  } catch (e) { fail('GET /admin/dashboard', e); }

  // Admin orders list
  try {
    const res = await axios.get(`${BASE}/admin/orders`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    pass(`GET /admin/orders → ${res.data.data.totalCount} total orders`);
  } catch (e) { fail('GET /admin/orders', e); }

  // Update order status → confirmed
  try {
    await axios.put(`${BASE}/admin/orders/${orderId}/status`, {
      status: 'confirmed',
      note: 'E2E test confirmation',
    }, { headers: { Authorization: `Bearer ${adminToken}` } });
    pass('PUT /admin/orders/:id/status → confirmed');
  } catch (e) { fail('PUT /admin/orders/:id/status confirmed', e); }

  // Update order status → processing
  try {
    await axios.put(`${BASE}/admin/orders/${orderId}/status`, {
      status: 'processing',
      note: 'Being packed',
    }, { headers: { Authorization: `Bearer ${adminToken}` } });
    pass('PUT /admin/orders/:id/status → processing');
  } catch (e) { fail('PUT /admin/orders/:id/status processing', e); }

  // Admin users list
  try {
    const res = await axios.get(`${BASE}/admin/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    pass(`GET /admin/users → ${res.data.data.totalCount} users`);
  } catch (e) { fail('GET /admin/users', e); }

  // Revenue analytics
  try {
    await axios.get(`${BASE}/admin/analytics/revenue?period=month`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    pass('GET /admin/analytics/revenue → data returned');
  } catch (e) { fail('GET /admin/analytics/revenue', e); }

  // Product analytics
  try {
    await axios.get(`${BASE}/admin/analytics/products`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    pass('GET /admin/analytics/products → data returned');
  } catch (e) { fail('GET /admin/analytics/products', e); }

  // ─── SECURITY ────────────────────────────────────────────────────────────────
  console.log('\n📋 SECURITY TESTS');

  // No token → 401
  try {
    await axios.get(`${BASE}/auth/me`);
    fail('No token should return 401');
  } catch (e) {
    if (e.response?.status === 401) pass('No token → 401 correctly');
    else fail('No token wrong status', e);
  }

  // User hitting admin route → 403
  try {
    await axios.get(`${BASE}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    fail('User hitting admin route should be 403');
  } catch (e) {
    if (e.response?.status === 403) pass('User → admin route → 403 correctly');
    else fail('User admin route wrong status', e);
  }

  // Invalid ObjectId → 400 or 404
  try {
    await axios.get(`${BASE}/orders/invalidid123`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    fail('Invalid ObjectId should return 400');
  } catch (e) {
    if (e.response?.status === 400 || e.response?.status === 404) pass(`Invalid ObjectId → ${e.response.status} correctly`);
    else fail('Invalid ObjectId wrong status', e);
  }

  // ─── COUPONS ─────────────────────────────────────────────────────────────────
  console.log('\n📋 COUPON TESTS');

  // List coupons (admin)
  try {
    const res = await axios.get(`${BASE}/coupons`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    pass(`GET /coupons → ${res.data.data.length} coupons`);
  } catch (e) { fail('GET /coupons', e); }

  // Invalid coupon → 400
  try {
    await axios.post(`${BASE}/coupons/validate`, {
      code: 'FAKECOUPON123', cartTotal: 1000,
    }, { headers: { Authorization: `Bearer ${userToken}` } });
    fail('Invalid coupon should fail');
  } catch (e) {
    if (e.response?.status === 400) pass('Invalid coupon → 400 correctly');
    else fail('Invalid coupon wrong status', e);
  }

  // ─── HEALTH ──────────────────────────────────────────────────────────────────
  console.log('\n📋 HEALTH CHECK');
  try {
    const res = await axios.get('https://shoes-ecommerce-production.up.railway.app/health');
    pass(`/health → ${JSON.stringify(res.data)}`);
  } catch (e) { fail('/health', e); }

  console.log('\n================================');
  console.log('🏁 E2E TESTS COMPLETE');
  console.log('================================\n');
}

runTests().catch(console.error);
