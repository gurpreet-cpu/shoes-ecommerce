# SPEC.md — Shoe Ecommerce Backend Specification
# The single source of truth for WHAT to build.
# If it's not in here, don't build it yet.

---

## 🎬 Demo / Test Script (Read This First)




> The exact API test sequence that proves the backend works.
> Run this in Thunder Client / Postman before calling Phase complete.

```
Step 1:  POST /api/auth/register           → 201, user created, verification email sent
Step 2:  POST /api/auth/login              → 200, accessToken in body, refreshToken cookie set
Step 3:  POST /api/products (admin JWT)    → 201, product created with image on Cloudinary
Step 4:  GET  /api/products?category=mens  → 200, filtered product list returned
Step 5:  POST /api/cart/items              → 200, item added to cart
Step 6:  POST /api/coupons/validate        → 200, discount calculated correctly
Step 7:  POST /api/orders                  → 201, order created, stock decremented, orderNumber assigned
Step 8:  POST /api/payment/paytm/initiate  → 200, txnToken returned
Step 9:  POST /api/payment/paytm/callback  → 200, checksum verified, order marked paid, email sent
Step 10: GET  /api/admin/dashboard         → 200, revenue + order stats returned
Step 11: PUT  /api/admin/orders/:id/status → 200, status updated to 'shipped', email triggered
Step 12: POST /api/reviews/products/:id    → 201, review added, product rating recalculated
```

**Backend is done when:** Every step above returns the expected status code with correct data, no console errors, and emails arrive in the test inbox.

---

## 🔴 The Problem

**Who has this problem:** Someone who wants to sell shoes online in India and needs a solid, production-ready backend they can trust before building the UI on top of it.

**Pain score: 8/10** — Building a backend with payment integration, auth, and order management from scratch is time-consuming and error-prone. Getting Paytm integration right, securing auth properly, and handling edge cases (stock race conditions, payment failures, order status flow) are all genuinely hard to get right the first time.

**Proof it's real:**
1. A developer builds checkout, goes live, and discovers Paytm callback isn't being verified — anyone can fake a payment success.
2. Orders are placed simultaneously for the last pair in stock (size 9) — both succeed, overselling the inventory.
3. JWT access tokens never expire or refresh tokens aren't rotated — security vulnerability goes unnoticed until production.

---

## 🟢 The Solution

**In one sentence:** A fully tested Node.js/Express REST API that handles auth, product management, cart, orders, Paytm payments, and admin operations for a shoe ecommerce store — ready to connect a frontend to.

**Core loop:**
```
Step 1: Admin adds products with images via API
Step 2: Customer registers, browses, adds to cart, applies coupon
Step 3: Customer creates order → initiates Paytm payment
Step 4: Paytm posts callback → backend verifies → marks paid → sends email → decrements stock
Step 5: Admin updates order status → email sent at each step
```

**Better than starting from scratch because:**
1. Security is built in from day one — helmet, rate limiting, JWT rotation, input validation
2. Paytm checksum verification is implemented correctly — no payment spoofing
3. Stock is managed atomically — no overselling
4. Clean architecture means frontend can be dropped in without touching backend logic

---

## 🎯 MVP Scope

### ✅ IN SCOPE (Backend Phase 1)

| # | Feature | Why It's Core |
|---|---------|--------------|
| 1 | Auth (register, login, JWT refresh, forgot password) | Nothing else works without it |
| 2 | Product CRUD with Cloudinary image upload + filters | No store without products |
| 3 | Cart with coupon support | Core purchase flow |
| 4 | Order creation with stock validation + price lock | Heart of ecommerce |
| 5 | Paytm payment + COD with callback verification | Revenue depends on this |
| 6 | Order status management + email notifications | Customer communication |
| 7 | Admin dashboard API (stats, order mgmt, user mgmt) | Business operations |
| 8 | Product reviews (verified buyers only) | Trust + conversion |

### ❌ OUT OF SCOPE (Phase 2 / V2)

| Feature | Why Not Now |
|---------|------------|
| React frontend | Backend-first — build and test API completely first |
| SMS notifications (Twilio) | Email covers it for now, SMS adds complexity |
| Return / Refund flow | Complex, V2 feature |
| Wishlist | Nice to have, not core |
| Multiple payment methods (Razorpay etc.) | Paytm + COD covers launch |
| Real-time order tracking (WebSockets) | V2 — polling is fine for now |
| Product recommendations / AI | V2 |
| Multi-vendor / seller marketplace | Out of scope entirely |
| Mobile app | Frontend Phase 2 is web only |
| Loyalty points / referral system | V2 |

---

## 👤 User Stories

**Core (test path):**
1. As a customer, I want to register and log in so that I can place orders tied to my account.
2. As a customer, I want to add shoes to my cart and apply a coupon so that I can get the best price before checking out.
3. As a customer, I want to place an order and pay via Paytm so that I receive a confirmation and my order is tracked.
4. As an admin, I want to update order status so that customers receive email updates at each stage.

**Secondary:**
5. As an admin, I want to see dashboard stats (revenue, orders, top products) so that I can understand business performance.

---

## 📊 Data Models — Summary

### User
- `_id`: ObjectId
- `name`: String — customer's full name
- `email`: String, unique — login identifier
- `password`: String, select:false — bcrypt hashed
- `phone`: String — for order contact
- `role`: String enum (user|admin) — access control
- `addresses`: Array — saved delivery addresses
- `refreshToken`: String, select:false — current valid refresh token
- `isEmailVerified`: Boolean — gated features until verified
- `createdAt`, `updatedAt`: Date

### Product
- `_id`: ObjectId
- `name`: String — display name
- `slug`: String, unique — URL-friendly identifier, auto-generated
- `category`: String enum (mens|womens)
- `subCategory`: String enum (casual|sports|formal|sandals|boots)
- `images`: Array of `{ url, publicId }` — Cloudinary hosted
- `price`: Number — original price in rupees
- `discountPrice`: Number — sale price in rupees
- `sizes`: Array of `{ size: String, stock: Number }` — per-size inventory
- `ratings`: `{ average: Number, count: Number }` — aggregated from reviews
- `isFeatured`: Boolean — surfaced on homepage
- `isActive`: Boolean — soft delete flag
- `createdAt`, `updatedAt`: Date

### Order
- `_id`: ObjectId
- `orderNumber`: String, unique — format SS-YYYYMMDD-XXXX, auto in pre-save
- `user`: ObjectId ref User
- `items`: Array of `{ product ref, name, image, size, price, quantity }` — snapshot at purchase time
- `shippingAddress`: Object — `{ name, phone, street, city, state, pincode }`
- `pricing`: Object — `{ subtotal, discount, shippingCharge, total }`
- `coupon`: Object — `{ code, discountAmount }`
- `paymentMethod`: String enum (paytm|cod)
- `paymentStatus`: String enum (pending|paid|failed|refunded)
- `paymentDetails`: Object — `{ paytmOrderId, transactionId, paidAt }`
- `orderStatus`: String enum (pending|confirmed|processing|shipped|out_for_delivery|delivered|cancelled)
- `statusHistory`: Array of `{ status, timestamp, note }` — full audit trail
- `createdAt`, `updatedAt`: Date

### Cart
- `_id`: ObjectId
- `user`: ObjectId ref User, unique — one cart per user
- `items`: Array of `{ product ref, size, quantity, price }`
- `appliedCoupon`: Object — `{ code, discountAmount }`
- `createdAt`, `updatedAt`: Date

### Review
- `_id`: ObjectId
- `product`: ObjectId ref Product
- `user`: ObjectId ref User
- `rating`: Number 1–5
- `title`: String
- `comment`: String
- `isVerifiedPurchase`: Boolean — true only if user has a delivered order with this product
- `createdAt`, `updatedAt`: Date
- Unique compound index on `{ product, user }` — one review per user per product

### Coupon
- `_id`: ObjectId
- `code`: String, unique, uppercase — e.g. FIRST10
- `discountType`: String enum (percentage|flat)
- `discountValue`: Number — percentage or flat ₹ amount
- `minOrderAmount`: Number — minimum cart value to apply
- `maxDiscountAmount`: Number — caps percentage discounts
- `usageLimit`: Number — total uses allowed
- `usedCount`: Number — current uses (default 0)
- `expiresAt`: Date
- `isActive`: Boolean
- `createdAt`, `updatedAt`: Date

---

## 🔌 External Services

| Service | Purpose | SDK / Endpoint | Free Tier |
|---------|---------|---------------|-----------|
| MongoDB Atlas | Database hosting | `mongodb+srv://...` | Yes — M0 (512MB) |
| Cloudinary | Product image storage + CDN | `cloudinary` npm package | Yes — 25GB |
| Paytm Payment Gateway | Online payments (India) | `paytmchecksum` npm package | Staging free, prod needs merchant account |
| Nodemailer + Gmail | Transactional emails | `nodemailer`, `smtp.gmail.com:587` | Yes — Gmail free |
| Railway | Backend hosting + CI/CD | railway.app | Yes — $5/mo free credit |

---

## 🔗 API Routes — Full Reference

See CLAUDE.md for complete route table. Summary counts:
- Auth: 7 routes
- Users: 7 routes
- Products: 9 routes
- Cart: 7 routes
- Orders: 4 routes
- Payment: 4 routes
- Reviews: 3 routes
- Coupons: 5 routes
- Admin: 9 routes
- **Total: 55 API endpoints**

---

## ✅ Definition of Done

- [ ] **Auth:** Register → verify email → login → get access token → use refresh token → forgot/reset password — all working, tokens secure
- [ ] **Products:** Admin can create product with image upload, image appears on Cloudinary. Public can list with filters and get by slug.
- [ ] **Cart:** Add item → update quantity → apply coupon → coupon discount calculated correctly → remove coupon
- [ ] **Orders:** Create order locks price from DB, decrements stock atomically. Cannot oversell (tested with concurrent requests).
- [ ] **Payments:** Paytm initiate returns txnToken. Callback with valid checksum marks order paid and sends email. Tampered callback is rejected.
- [ ] **COD:** COD order created with `paymentStatus: pending`, admin can mark delivered.
- [ ] **Email:** Confirmation email arrives in inbox on order placed and on each status change.
- [ ] **Admin:** Dashboard returns revenue, order counts. Admin can update order status. Status change triggers email.
- [ ] **Reviews:** Only users with a delivered order containing that product can submit a review. Rating average updates on Product.
- [ ] **Security:** Rate limiting active on auth routes. Invalid JWT returns 401. Non-admin calling admin route returns 403.
- [ ] **Deployed:** Live Railway URL returns 200 on GET /health. All routes work on live URL.
- [ ] **No unhandled promise rejections** in production logs.
- [ ] **`.env.example`** exists and is complete.

---

## ⚠️ Known Risks

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| Paytm staging vs production credential confusion | High | Use `PAYTM_WEBSITE` env var — `WEBSTAGING` vs `WEBPROD`, never hardcode |
| MongoDB Atlas IP whitelist blocking Railway | High | Allow `0.0.0.0/0` in Atlas Network Access for now, restrict later |
| Gmail App Password not set up correctly | Medium | Use App Password (not real password), enable 2FA first |
| Stock oversell on concurrent orders | Medium | Use MongoDB `$inc` with conditional check — reject if stock < qty |
| Paytm callback not reached (firewall/wrong URL) | Medium | Test callback URL with ngrok locally before deploying |
| JWT secrets too weak | Low | Generate with `openssl rand -hex 64` — minimum 64 chars |
| Cloudinary free tier limit | Low | 25GB is plenty for launch, monitor usage |
| Railway free credit exhausted | Low | $5/mo credit covers low-traffic launch; upgrade if needed |

---

## 📅 Build Timeline

| Phase | What Gets Built | Estimate |
|-------|----------------|---------|
| 1 — Foundation | server.js, db, utils, middleware chain, /health | 2–3h |
| 2 — Models | All 6 Mongoose models with indexes | 2h |
| 3 — Auth | Register, login, refresh, forgot/reset, email verification | 3–4h |
| 4 — Products | CRUD, filters, search, Cloudinary upload | 3h |
| 5 — Cart + Coupons | Cart CRUD, coupon validation + admin CRUD | 2h |
| 6 — Orders + Payments | Order creation, Paytm flow, COD, email triggers | 4–5h |
| 7 — Reviews | Review CRUD, verified buyer check, rating aggregation | 1.5h |
| 8 — Admin API | Dashboard stats, order mgmt, user mgmt, analytics | 2–3h |
| 9 — Hardening + Deploy | Security middleware, logging, Railway deploy, E2E test | 2h |
| **Total** | | **~22–25h** |

---

## 🔜 Phase 2 Preview (Frontend — After Backend Complete)

Once all 55 endpoints are tested and live on Railway:

```
Tech: React 18 + Vite + TailwindCSS + Framer Motion + Redux Toolkit
Pages: Home, Shop, Product Detail, Cart, Checkout, Order Success,
       Order History, Profile, Admin Dashboard
Design: Luxury editorial — dark + cream + gold, bold serif headings
State: Redux Toolkit for cart/auth, RTK Query for API calls
Deploy: Vercel (auto-deploy from GitHub)
```

Do NOT start Phase 2 until Phase 1 backend passes all Definition of Done checks.
