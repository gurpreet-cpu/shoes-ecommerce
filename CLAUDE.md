# CLAUDE.md — Shoe Ecommerce Backend

> This is the operating manual for Claude Code.
> Read this ENTIRE file before writing a single line of code.
> The frontend does NOT exist yet. Build and test the backend completely first.

---

## 🧠 Project Overview

A production-ready REST API backend for a shoe ecommerce store selling Men's and Women's shoes.
Built with Node.js + Express + MongoDB Atlas. Payments via Paytm + Cash on Delivery.
Email notifications via Nodemailer (Gmail SMTP). Deployed on Railway or Render.

**Current Phase: BACKEND ONLY**
Frontend (React + Vite) will be built in Phase 2 after this backend is fully tested.

---

## 🏗️ Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Runtime | Node.js 20 LTS | |
| Framework | Express 4.x | |
| Database | MongoDB Atlas + Mongoose 8.x | Free M0 cluster |
| Auth | JWT — access + refresh tokens | jsonwebtoken + bcryptjs |
| Payments | Paytm Payment Gateway | paytmchecksum npm package |
| File Uploads | Multer + Cloudinary | Product images |
| Email | Nodemailer | Gmail App Password |
| Validation | Joi | Every POST/PUT body |
| Security | helmet, cors, express-rate-limit, xss-clean, hpp | |
| Logging | Morgan + Winston | |
| Deployment | Railway (primary) | Render as fallback |

---

## 📁 Folder Structure

```
server/
├── config/
│   ├── db.js                  # MongoDB Atlas connection
│   ├── cloudinary.js          # Cloudinary setup
│   └── paytm.js               # Paytm config values
├── controllers/
│   ├── authController.js      # register, login, logout, refresh, forgotPassword, resetPassword
│   ├── productController.js   # CRUD, filters, search, featured
│   ├── orderController.js     # create, getMyOrders, getById, updateStatus, cancel
│   ├── cartController.js      # get, addItem, updateItem, removeItem, clear, applyCoupon
│   ├── userController.js      # getProfile, updateProfile, addresses CRUD
│   ├── paymentController.js   # Paytm initiate, callback, status + COD confirm
│   ├── reviewController.js    # add, list, delete
│   ├── couponController.js    # validate, admin CRUD
│   └── adminController.js     # dashboard stats, orders mgmt, user mgmt, analytics
├── middleware/
│   ├── auth.js                # verifyToken — attaches req.user
│   ├── adminOnly.js           # role === 'admin' guard
│   ├── validate.js            # Joi schema validation wrapper
│   ├── upload.js              # Multer + Cloudinary storage
│   ├── rateLimiter.js         # Per-route rate limits
│   └── errorHandler.js        # Global error handler (registered last in server.js)
├── models/
│   ├── User.js
│   ├── Product.js
│   ├── Order.js
│   ├── Cart.js
│   ├── Review.js
│   └── Coupon.js
├── routes/
│   ├── auth.js
│   ├── products.js
│   ├── orders.js
│   ├── cart.js
│   ├── users.js
│   ├── payment.js
│   ├── reviews.js
│   ├── coupons.js
│   └── admin.js
├── services/
│   ├── emailService.js        # All Nodemailer logic + HTML email templates
│   └── paytmService.js        # Paytm checksum generation + verification
├── utils/
│   ├── ApiError.js            # Custom error class (statusCode, message, errors[])
│   ├── ApiResponse.js         # Consistent success response shape
│   ├── asyncHandler.js        # Wraps async controllers — no bare try/catch
│   └── generateTokens.js      # JWT access + refresh token helpers
├── validators/
│   ├── authValidator.js
│   ├── productValidator.js
│   ├── orderValidator.js
│   └── couponValidator.js
├── .env                       # NEVER commit
├── .env.example               # Commit this — all keys, empty values
├── .gitignore
├── server.js                  # Entry point
└── package.json
```

---

## ⚙️ Environment Variables

### `.env` (never commit)

```env
# App
NODE_ENV=production
PORT=5000

# MongoDB
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/shoesdb?retryWrites=true&w=majority

# JWT
JWT_ACCESS_SECRET=at_least_64_random_chars_here
JWT_REFRESH_SECRET=different_64_random_chars_here
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Paytm
PAYTM_MID=               
PAYTM_MERCHANT_KEY=      
PAYTM_WEBSITE=WEBSTAGING   # Change to WEBPROD for live
PAYTM_CHANNEL_ID=WEB
PAYTM_INDUSTRY_TYPE=Retail
PAYTM_CALLBACK_URL=https://your-api.railway.app/api/payment/paytm/callback

# Email (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=yourstore@gmail.com
EMAIL_PASS=your_16_char_app_password   # Gmail App Password — not your real password
EMAIL_FROM="YourStore <yourstore@gmail.com>"

# Frontend (CORS + email links)
CLIENT_URL=https://yourstore.vercel.app

# First admin account (used by seed script)
ADMIN_EMAIL=admin@yourstore.com
ADMIN_PASSWORD=StrongAdminPass123!
```

### `.env.example` (commit this)
Same file with all keys present but values left blank.

---

## 🗄️ Data Models — Field Reference

### User
```
_id, name, email (unique), password (select:false, bcrypt),
phone, role (enum: user|admin, default: user),
addresses: [{ _id, label, street, city, state, pincode, isDefault }],
refreshToken (select:false),
passwordResetToken, passwordResetExpires,
isEmailVerified (default:false), emailVerificationToken,
createdAt, updatedAt
```

### Product
```
_id, name, slug (auto from name, unique),
description, brand,
category (enum: mens|womens),
subCategory (enum: casual|sports|formal|sandals|boots),
images: [{ url, publicId }],
price (Number, in rupees),
discountPrice (Number),
sizes: [{ size (String: "6"|"7"|...|"12"), stock (Number) }],
color, material, tags: [String],
ratings: { average (default:0), count (default:0) },
isFeatured (default:false),
isActive (default:true),   ← soft delete flag, never hard delete
createdAt, updatedAt
```

### Order
```
_id,
orderNumber (String, unique — format: SS-YYYYMMDD-XXXX, auto-generated),
user (ref: User),
items: [{ product (ref), name, image, size, price, quantity }],
shippingAddress: { name, phone, street, city, state, pincode },
pricing: { subtotal, discount, shippingCharge (free over ₹999), total },
coupon: { code, discountAmount },
paymentMethod (enum: paytm|cod),
paymentStatus (enum: pending|paid|failed|refunded, default: pending),
paymentDetails: { paytmOrderId, transactionId, paidAt },
orderStatus (enum: pending|confirmed|processing|shipped|out_for_delivery|delivered|cancelled),
statusHistory: [{ status, timestamp, note }],
cancelReason,
deliveredAt,
createdAt, updatedAt
```

### Cart
```
_id, user (ref: User, unique),
items: [{ product (ref), size, quantity, price }],
appliedCoupon: { code, discountAmount },
createdAt, updatedAt
```

### Review
```
_id, product (ref), user (ref),
rating (Number 1-5), title, comment,
isVerifiedPurchase (Boolean — checked against orders),
createdAt, updatedAt
```
Compound index: `{ product: 1, user: 1 }` unique — one review per user per product.

### Coupon
```
_id, code (String unique uppercase),
discountType (enum: percentage|flat),
discountValue (Number),
minOrderAmount (Number),
maxDiscountAmount (Number — caps percentage discounts),
usageLimit (Number), usedCount (default:0),
expiresAt (Date), isActive (default:true),
createdAt, updatedAt
```

---

## 🔗 Complete API Routes

### Auth — `/api/auth`
| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| POST | /register | Register new user | No |
| POST | /login | Login → access token in body + refresh in httpOnly cookie | No |
| POST | /logout | Clear refresh cookie | No |
| POST | /refresh | Use refresh cookie → new access token | No |
| POST | /forgot-password | Send reset link to email | No |
| POST | /reset-password/:token | Set new password | No |
| GET | /verify-email/:token | Verify email address | No |

### Users — `/api/users`
| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| GET | /me | Get own profile | User |
| PUT | /me | Update name, phone | User |
| PUT | /me/password | Change password | User |
| GET | /me/addresses | List saved addresses | User |
| POST | /me/addresses | Add new address | User |
| PUT | /me/addresses/:id | Update address | User |
| DELETE | /me/addresses/:id | Delete address | User |

### Products — `/api/products`
| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| GET | / | List products — query: `category, subCategory, brand, size, minPrice, maxPrice, sort, page, limit, search` | No |
| GET | /featured | Get featured products | No |
| GET | /:slug | Single product detail | No |
| POST | / | Create product (multipart/form-data) | Admin |
| PUT | /:id | Update product | Admin |
| DELETE | /:id | Soft delete (isActive: false) | Admin |
| POST | /:id/images | Upload additional images | Admin |
| DELETE | /:id/images/:publicId | Remove an image | Admin |

### Cart — `/api/cart`
| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| GET | / | Get cart | User |
| POST | /items | Add item `{ productId, size, quantity }` | User |
| PUT | /items/:productId | Update quantity `{ size, quantity }` | User |
| DELETE | /items/:productId | Remove item `{ size }` | User |
| DELETE | / | Clear entire cart | User |
| POST | /apply-coupon | Apply coupon `{ code }` | User |
| DELETE | /remove-coupon | Remove applied coupon | User |

### Orders — `/api/orders`
| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| POST | / | Create order (validates stock, locks prices from DB) | User |
| GET | /my | My orders (paginated) | User |
| GET | /my/:id | Single order detail | User |
| POST | /my/:id/cancel | Cancel order (only if status is pending/confirmed) | User |

### Payment — `/api/payment`
| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| POST | /paytm/initiate | Create Paytm txn token for an order | User |
| POST | /paytm/callback | Paytm posts here on completion (verify checksum here) | No (Paytm) |
| GET | /paytm/status/:orderId | Poll payment status | User |
| POST | /cod/confirm | Confirm COD order | User |

### Reviews — `/api/reviews`
| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| POST | /products/:productId | Add review (only verified buyers) | User |
| GET | /products/:productId | Get reviews for product | No |
| DELETE | /:reviewId | Delete own review / admin deletes any | User/Admin |

### Coupons — `/api/coupons`
| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| POST | /validate | Validate coupon `{ code, cartTotal }` | User |
| GET | / | List all coupons | Admin |
| POST | / | Create coupon | Admin |
| PUT | /:id | Update coupon | Admin |
| DELETE | /:id | Delete coupon | Admin |

### Admin — `/api/admin`
| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| GET | /dashboard | Stats: revenue, orders count, users count, top products | Admin |
| GET | /orders | All orders with filters: `status, paymentMethod, dateFrom, dateTo, page` | Admin |
| GET | /orders/:id | Full order detail | Admin |
| PUT | /orders/:id/status | Update order status `{ status, note }` | Admin |
| GET | /users | List all users with filters | Admin |
| PUT | /users/:id/role | Change user role | Admin |
| DELETE | /users/:id | Deactivate user account | Admin |
| GET | /analytics/revenue | Revenue breakdown by day/week/month | Admin |
| GET | /analytics/products | Top selling products | Admin |

---

## 🔒 Auth & Security Rules

1. **Access Token** — 15 min TTL, returned in response body as JSON
2. **Refresh Token** — 7 day TTL, set as `httpOnly; Secure; SameSite=Strict` cookie
3. **Refresh token rotation** — on every `/refresh` call, old token is invalidated, new one issued
4. **bcrypt** salt rounds: 12
5. **Helmet** on all routes
6. **CORS** — allow only `CLIENT_URL` in production, `localhost:5173` in development
7. **Rate limits:**
   - Auth routes: 10 req / 15 min per IP
   - General API: 100 req / 15 min per IP
   - Payment routes: 5 req / 15 min per user
8. **Joi validation** on every POST/PUT — reject with 400 before hitting controller
9. **XSS & HPP** protection on all inputs
10. **Password field** has `select: false` on schema — never returned in queries

---

## 💳 Paytm Payment Flow (Step by Step)

```
1. User creates order via POST /api/orders → gets orderId back
2. User calls POST /api/payment/paytm/initiate { orderId }
3. Backend fetches order, generates Paytm checksum via paytmchecksum lib
4. Backend returns { txnToken, orderId, amount, mid } to client
5. Client (Phase 2) opens Paytm JS checkout modal with txnToken
6. User completes payment on Paytm
7. Paytm sends POST to /api/payment/paytm/callback with payment result
8. Backend VERIFIES checksum on callback payload — reject if mismatch
9. If verified + success: order.paymentStatus → 'paid', orderStatus → 'confirmed'
   Decrement product stock, send confirmation email, clear user cart
10. If failed: order.paymentStatus → 'failed', restore stock
```

**Never skip checksum verification. It's the only proof payment is genuine.**

---

## 📧 Email Notifications — Trigger Map

| Event | Template | What It Contains |
|-------|---------|-----------------|
| User registers | Welcome | Welcome message + email verification link |
| Forgot password | Reset Password | Reset link (1 hour expiry) |
| Order placed (COD) | Order Confirmation | Order number, items, total, address |
| Payment successful | Payment Confirmed | Transaction ID, order summary |
| Payment failed | Payment Failed | Order ID, retry instructions |
| Order → confirmed | Status Update | Order confirmed message |
| Order → shipped | Shipped | Estimated delivery + tracking number |
| Order → delivered | Delivered | Delivery confirmation + review request link |
| Order cancelled | Cancelled | Cancellation details + refund info if applicable |

All templates are HTML in `services/emailService.js`. Keep them clean — plain HTML, no heavy dependencies.

---

## 📦 Order Status Rules

```
pending          ← created, waiting for payment
  ↓ (auto on payment success OR admin for COD)
confirmed        ← payment verified
  ↓ (admin)
processing       ← being packed
  ↓ (admin)
shipped          ← dispatched, tracking added
  ↓ (admin)
out_for_delivery ← with delivery agent
  ↓ (admin)
delivered        ← completed
```

- Cancellation allowed at: `pending`, `confirmed`, `processing`
- After `shipped`: no cancellation (return flow is V2)
- Every status change → append to `statusHistory` array + trigger email

---

## 💰 Money Rules

- All prices stored in **rupees as Number** (e.g. `999`, `1499.50`)
- Paytm API expects amounts as strings with 2 decimal places: `"999.00"`
- **Never trust price from client** — always fetch from DB when creating order
- Shipping charge: free above ₹999, otherwise ₹99
- Discount cannot exceed order subtotal

---

## 🚀 Deployment Guide (Railway — Recommended)

### One-Time Setup:
1. Create MongoDB Atlas account → free M0 cluster → get connection string
2. Create Cloudinary account → get cloud name, API key, secret
3. Enable Gmail 2FA → Settings → App Passwords → generate 16-char password
4. Create Paytm staging merchant account → get MID + Merchant Key

### Deploy to Railway:
1. Push `server/` folder to GitHub (can be root of repo)
2. railway.app → New Project → Deploy from GitHub → select repo
3. Set start command: `node server.js`
4. Variables tab → add every `.env` key one by one
5. Railway assigns a public domain: `https://xxx.railway.app`
6. Update `PAYTM_CALLBACK_URL` in Railway vars to: `https://xxx.railway.app/api/payment/paytm/callback`
7. In MongoDB Atlas → Network Access → Add IP → allow `0.0.0.0/0` (or get Railway's static IP on paid plan)

### Health check endpoint:
Add `GET /health` → returns `{ status: 'ok', timestamp }` — Railway uses this.

---

## 🧪 Testing Protocol

- Use **Thunder Client** (VS Code extension) or **Postman**
- Save a collection file as `api-tests.json` in repo root
- Test sequence: Auth → Products → Cart → Orders → Payment → Admin
- Always test: happy path + missing fields + invalid values + unauthorized access
- Paytm: use staging credentials and their test card numbers
- Before deploying: run through every route once end-to-end

---

## 🛑 Absolute Rules — Claude Code Must Follow These

1. **asyncHandler on every controller** — zero bare try/catch blocks
2. **Joi validation before every controller** — 400 if body invalid
3. **Never trust client price** — fetch product price from DB in order creation
4. **Stock check is atomic** — use `$inc` on size stock, check result
5. **Verify Paytm checksum** on every callback — hard reject if mismatch
6. **Rotate refresh tokens** on every use
7. **Soft delete only** for products — `isActive: false`, never `deleteOne()`
8. **No .env values in logs** — sanitize before logging
9. **Write .env.example** — commit it, keep it up to date
10. **orderNumber auto-generated** in pre-save hook — never from client

---

## 📋 Build Order for Claude Code

Complete each phase fully before moving to next. Test before proceeding.

```
Phase 1 — Foundation
  ✦ package.json with all dependencies
  ✦ server.js (express app, middleware chain, route mounting)
  ✦ config/db.js (MongoDB Atlas connect with retry)
  ✦ utils: ApiError, ApiResponse, asyncHandler, generateTokens
  ✦ middleware: errorHandler, rateLimiter
  ✦ .env.example
  ✦ GET /health endpoint
  → TEST: server starts, connects to MongoDB, /health returns 200

Phase 2 — All Models
  ✦ User, Product, Order, Cart, Review, Coupon models
  ✦ All indexes (compound, text search on products)
  → TEST: models import without error

Phase 3 — Auth System
  ✦ authController + validators + routes
  ✦ auth.js + adminOnly.js middleware
  ✦ emailService.js (welcome + verification + reset templates)
  → TEST: register, verify email, login, refresh, forgot/reset password

Phase 4 — Products
  ✦ productController + validators + routes
  ✦ upload.js middleware (Multer + Cloudinary)
  → TEST: create product with image, list with filters, get by slug, update, soft delete

Phase 5 — Cart + Coupons
  ✦ cartController + routes
  ✦ couponController + validators + routes
  → TEST: add to cart, update qty, remove, apply/remove coupon, coupon validation

Phase 6 — Orders + Payments
  ✦ orderController + validators + routes (stock check + price lock)
  ✦ paytmService.js (checksum logic)
  ✦ paymentController + routes (initiate, callback, status, COD)
  ✦ Email triggers on order events
  → TEST: full order flow — create order, initiate Paytm, simulate callback, verify status

Phase 7 — Reviews
  ✦ reviewController + routes
  ✦ Post-save hook: recalculate product rating average
  → TEST: add review (only after purchase), list reviews, delete

Phase 8 — Admin API
  ✦ adminController + routes
  ✦ Dashboard stats (MongoDB aggregation)
  ✦ Order status update with email trigger
  → TEST: all admin routes with admin JWT

Phase 9 — Production Hardening
  ✦ helmet, cors config, hpp, xss-clean wired in server.js
  ✦ Winston logger (file + console)
  ✦ Rate limiters on auth + payment routes
  ✦ Final .env.example audit
  ✦ Deploy to Railway
  ✦ End-to-end test on live URL
```
