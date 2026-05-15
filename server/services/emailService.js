const nodemailer = require('nodemailer');
const logger = require('./logger');

const createTransporter = () =>
  nodemailer.createTransport({
    host:   process.env.EMAIL_HOST || 'smtp.gmail.com',
    port:   Number(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

const sendEmail = async (to, subject, html) => {
  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"StepStyle" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    logger.error(`[Email] Failed to send "${subject}" to ${to}: ${err.message}`);
  }
};

// Send to all admin recipients (ADMIN_EMAIL + ADMIN_EMAIL_2)
const sendAdminEmail = (subject, html) => {
  const recipients = [process.env.ADMIN_EMAIL, process.env.ADMIN_EMAIL_2].filter(Boolean).join(',');
  if (!recipients) return Promise.resolve();
  return sendEmail(recipients, subject, html);
};

// ── Shared style helpers ─────────────────────────────────────────────────────

const adminDashboardUrl = () => `${process.env.CLIENT_URL || ''}/admin`;

const baseAdminHtml = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin:0; padding:0; background:#0A0A0A; font-family:'DM Sans',Arial,sans-serif; color:#F5F5F0; }
    .wrapper { max-width:640px; margin:0 auto; padding:24px 16px; }
    .card { background:#111111; border:1px solid #2A2A2A; border-radius:12px; padding:32px; }
    .header { text-align:center; margin-bottom:28px; }
    .logo { font-size:22px; font-weight:700; letter-spacing:3px; color:#C9A84C; }
    h1 { font-size:26px; font-weight:700; color:#F5F5F0; margin:16px 0 8px; }
    h2 { font-size:18px; color:#C9A84C; margin:20px 0 10px; }
    .badge { display:inline-block; padding:4px 12px; border-radius:4px; font-size:13px; font-weight:600; }
    .badge-cod { background:#7A4F00; color:#FFB84D; }
    .badge-paytm { background:#00204A; color:#4DA6FF; }
    .badge-warning { background:#4A2000; color:#FFA040; }
    .badge-danger { background:#4A0000; color:#FF6060; }
    .badge-success { background:#004A20; color:#60FF90; }
    .section { background:#1A1A1A; border:1px solid #2A2A2A; border-radius:8px; padding:16px; margin:16px 0; }
    table { width:100%; border-collapse:collapse; }
    th { background:#1A1A1A; color:#A0998A; font-size:12px; text-transform:uppercase; letter-spacing:1px; padding:10px 12px; text-align:left; }
    td { padding:10px 12px; border-bottom:1px solid #2A2A2A; color:#F5F5F0; font-size:14px; }
    tr:last-child td { border-bottom:none; }
    .price { font-family:monospace; color:#C9A84C; }
    .total-row td { font-weight:700; color:#C9A84C; font-size:16px; border-top:1px solid #2A2A2A; }
    .btn { display:inline-block; padding:12px 24px; border-radius:4px; font-weight:600; font-size:14px; text-decoration:none; margin:6px; }
    .btn-gold { background:#C9A84C; color:#000; }
    .btn-outline { background:transparent; border:1px solid #C9A84C; color:#C9A84C; }
    .footer { text-align:center; color:#5C5650; font-size:12px; margin-top:24px; }
    .kv { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #2A2A2A; }
    .kv:last-child { border-bottom:none; }
    .kv-key { color:#A0998A; font-size:13px; }
    .kv-val { color:#F5F5F0; font-size:13px; font-weight:500; }
    .stat-box { background:#1A1A1A; border:1px solid #2A2A2A; border-radius:8px; padding:16px; margin:8px 0; }
    .stat-num { font-size:28px; font-weight:700; color:#C9A84C; font-family:monospace; }
    .stat-label { font-size:12px; color:#A0998A; text-transform:uppercase; letter-spacing:1px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="logo">STEPSTYLE</div>
        <div style="color:#5C5650;font-size:12px;margin-top:4px;">Admin Panel</div>
      </div>
      ${content}
    </div>
    <div class="footer">StepStyle Admin Panel &mdash; Confidential</div>
  </div>
</body>
</html>`;

// ── Customer email templates ─────────────────────────────────────────────────

const sendWelcomeEmail = (user, verificationToken) => {
  const link = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;
  const html = `
    <h2>Welcome to StepStyle, ${user.name}!</h2>
    <p>Thanks for signing up. Please verify your email address to get started.</p>
    <p><a href="${link}" style="background:#C9A84C;color:#000;padding:10px 20px;text-decoration:none;border-radius:4px;font-weight:600;">Verify Email</a></p>
    <p>Or copy this link: ${link}</p>
  `;
  return sendEmail(user.email, 'Welcome to StepStyle! Please verify your email', html);
};

const sendVerificationEmail = (user, verificationToken) => {
  const link = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;
  const html = `
    <h2>Verify your email address</h2>
    <p>Hi ${user.name}, click the button below to verify your email.</p>
    <p><a href="${link}" style="background:#C9A84C;color:#000;padding:10px 20px;text-decoration:none;border-radius:4px;font-weight:600;">Verify Email</a></p>
    <p>Or copy this link: ${link}</p>
  `;
  return sendEmail(user.email, 'Verify your email address', html);
};

const sendPasswordResetEmail = (user, resetToken) => {
  const link = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
  const html = `
    <h2>Reset your password</h2>
    <p>Hi ${user.name}, we received a request to reset your StepStyle password.</p>
    <p><a href="${link}" style="background:#C9A84C;color:#000;padding:10px 20px;text-decoration:none;border-radius:4px;font-weight:600;">Reset Password</a></p>
    <p>Or copy this link: ${link}</p>
    <p>This link expires in <strong>1 hour</strong>. If you did not request this, you can ignore this email.</p>
  `;
  return sendEmail(user.email, 'Password reset request — StepStyle', html);
};

const sendOrderConfirmationEmail = (user, order) => {
  const itemRows = order.items
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px;border-bottom:1px solid #eee;">${item.name} (Size: ${item.size})</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">x${item.quantity}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">₹${item.price * item.quantity}</td>
        </tr>`
    )
    .join('');
  const addr = order.shippingAddress;
  const html = `
    <h2>Order Confirmed!</h2>
    <p>Hi ${user.name}, your order has been placed successfully.</p>
    <p><strong>Order Number:</strong> ${order.orderNumber}</p>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#f5f5f5;">
          <th style="padding:8px;text-align:left;">Item</th>
          <th style="padding:8px;text-align:right;">Qty</th>
          <th style="padding:8px;text-align:right;">Amount</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>
    <p style="text-align:right;"><strong>Total: ₹${order.pricing.total}</strong></p>
    <h3>Shipping to:</h3>
    <p>${addr.name}, ${addr.street}, ${addr.city}, ${addr.state} - ${addr.pincode}<br>Phone: ${addr.phone}</p>
    <p>Payment method: ${order.paymentMethod.toUpperCase()}</p>
  `;
  return sendEmail(user.email, `Order Confirmed — ${order.orderNumber}`, html);
};

const sendPaymentConfirmedEmail = (user, order) => {
  const html = `
    <h2>Payment Successful!</h2>
    <p>Hi ${user.name}, your payment for order <strong>${order.orderNumber}</strong> has been confirmed.</p>
    <p><strong>Transaction ID:</strong> ${order.paymentDetails?.transactionId || 'N/A'}</p>
    <p><strong>Amount Paid:</strong> ₹${order.pricing.total}</p>
    <p>Your order is now being processed. We'll notify you when it ships.</p>
  `;
  return sendEmail(user.email, `Payment Confirmed — ${order.orderNumber}`, html);
};

const sendOrderStatusEmail = (user, order, newStatus) => {
  const statusMessages = {
    confirmed:        'Your order has been confirmed and is being prepared.',
    processing:       'Your order is being packed and will ship soon.',
    shipped:          'Great news! Your order is on its way.',
    out_for_delivery: 'Your order is out for delivery today.',
    delivered:        'Your order has been delivered. Enjoy your new shoes!',
    cancelled:        `Your order has been cancelled. ${order.cancelReason ? 'Reason: ' + order.cancelReason : ''}`,
  };
  const html = `
    <h2>Order Update — ${order.orderNumber}</h2>
    <p>Hi ${user.name},</p>
    <p>${statusMessages[newStatus] || `Your order status has been updated to: ${newStatus}.`}</p>
    <p><strong>Order Number:</strong> ${order.orderNumber}</p>
    <p><strong>Current Status:</strong> ${newStatus.replace(/_/g, ' ').toUpperCase()}</p>
  `;
  return sendEmail(user.email, `Order ${order.orderNumber} — Status Update`, html);
};

const sendOrderCancelledEmail = (user, order) => {
  const html = `
    <h2>Order Cancelled — ${order.orderNumber}</h2>
    <p>Hi ${user.name}, your order has been cancelled.</p>
    ${order.cancelReason ? `<p><strong>Reason:</strong> ${order.cancelReason}</p>` : ''}
    <p><strong>Order Total:</strong> ₹${order.pricing.total}</p>
    ${order.paymentStatus === 'refunded' || (order.refund && order.refund.status === 'initiated')
      ? '<p>A refund has been initiated and will be credited within 5–7 business days.</p>'
      : ''}
    <p>If you have any questions, please contact our support team.</p>
  `;
  return sendEmail(user.email, `Order Cancelled — ${order.orderNumber}`, html);
};

const sendPaymentFailedEmail = (user, order) => {
  const html = `
    <h2>Payment Failed</h2>
    <p>Hi ${user.name}, unfortunately your payment for order <strong>${order.orderNumber}</strong> could not be processed.</p>
    <p><strong>Amount:</strong> ₹${order.pricing.total}</p>
    <p>Your cart items have been restocked. Please try placing your order again.</p>
    <p>If you were charged, the amount will be refunded within 5–7 business days.</p>
  `;
  return sendEmail(user.email, `Payment Failed — ${order.orderNumber}`, html);
};

const sendRefundProcessedEmail = (user, order) => {
  const html = `
    <h2>Refund Processed — ${order.orderNumber}</h2>
    <p>Hi ${user.name}, your refund of <strong>₹${order.refund?.amount || order.pricing.total}</strong> has been processed.</p>
    ${order.refund?.transactionId ? `<p><strong>Transaction ID:</strong> ${order.refund.transactionId}</p>` : ''}
    <p>The amount will reflect in your account within 3–5 business days depending on your bank.</p>
    <p>Thank you for shopping with StepStyle.</p>
  `;
  return sendEmail(user.email, `Refund Processed — ₹${order.refund?.amount || order.pricing.total}`, html);
};

const sendRTOCustomerEmail = (user, order) => {
  const html = `
    <h2>Your Order is Being Returned — ${order.orderNumber}</h2>
    <p>Hi ${user.name}, we were unable to deliver your order and it is being returned to our warehouse.</p>
    <p><strong>Reason:</strong> ${(order.rtoDetails?.reason || 'delivery issue').replace(/_/g, ' ')}</p>
    ${order.rtoDetails?.note ? `<p><strong>Note:</strong> ${order.rtoDetails.note}</p>` : ''}
    <p>Our team will contact you to reschedule delivery or process a refund as applicable.</p>
    <p>If you have any questions, please reach out to our support team.</p>
  `;
  return sendEmail(user.email, `Delivery Attempt Failed — Order ${order.orderNumber}`, html);
};

const sendQuestionAnsweredEmail = (user, product, question, answer) => {
  const html = `
    <h2>Your Question Has Been Answered</h2>
    <p>Hi ${user.name}, an admin has answered your question about <strong>${product.name}</strong>.</p>
    <p><strong>Your Question:</strong><br>${question}</p>
    <p><strong>Answer:</strong><br>${answer}</p>
    <p><a href="${process.env.CLIENT_URL}/products/${product.slug}" style="background:#C9A84C;color:#000;padding:10px 20px;text-decoration:none;border-radius:4px;font-weight:600;">View Product</a></p>
  `;
  return sendEmail(user.email, `Your question about ${product.name} has been answered`, html);
};

// ── Admin email templates ────────────────────────────────────────────────────

const sendNewOrderAdminEmail = (order, user) => {
  const paymentBadge = order.paymentMethod === 'cod'
    ? '<span class="badge badge-cod">COD</span>'
    : '<span class="badge badge-paytm">Paytm</span>';

  const itemRows = order.items.map((item) => `
    <tr>
      <td>${item.image ? `<img src="${item.image}" style="width:48px;height:48px;object-fit:cover;border-radius:4px;">` : '—'}</td>
      <td>${item.name}</td>
      <td>UK ${item.size}</td>
      <td style="text-align:center;">${item.quantity}</td>
      <td class="price">₹${(item.price * item.quantity).toLocaleString('en-IN')}</td>
    </tr>`).join('');

  const addr = order.shippingAddress;

  const content = `
    <h1>NEW ORDER RECEIVED</h1>
    <div style="font-size:28px;font-weight:700;color:#C9A84C;font-family:monospace;margin:8px 0 16px;">${order.orderNumber}</div>
    ${paymentBadge}
    <div style="margin-top:4px;color:#A0998A;font-size:13px;">${new Date(order.createdAt || Date.now()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>

    <h2>Customer Details</h2>
    <div class="section">
      <div class="kv"><span class="kv-key">Name</span><span class="kv-val">${user.name || order.shippingAddress?.name || '—'}</span></div>
      <div class="kv"><span class="kv-key">Email</span><span class="kv-val">${user.email || '—'}</span></div>
      <div class="kv"><span class="kv-key">Phone</span><span class="kv-val">${user.phone || addr?.phone || '—'}</span></div>
    </div>

    <h2>Order Items</h2>
    <table>
      <thead>
        <tr>
          <th>Image</th><th>Product</th><th>Size</th><th>Qty</th><th>Price</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <h2>Pricing</h2>
    <div class="section">
      <div class="kv"><span class="kv-key">Subtotal</span><span class="kv-val price">₹${order.pricing.subtotal.toLocaleString('en-IN')}</span></div>
      <div class="kv"><span class="kv-key">Discount</span><span class="kv-val price">−₹${(order.pricing.discount || 0).toLocaleString('en-IN')}</span></div>
      <div class="kv"><span class="kv-key">Shipping</span><span class="kv-val price">${order.pricing.shippingCharge ? '₹' + order.pricing.shippingCharge : 'FREE'}</span></div>
      <div class="kv" style="border-top:1px solid #C9A84C;margin-top:8px;padding-top:8px;"><span class="kv-key" style="font-weight:700;color:#F5F5F0;">TOTAL</span><span class="kv-val" style="font-size:18px;color:#C9A84C;font-family:monospace;">₹${order.pricing.total.toLocaleString('en-IN')}</span></div>
    </div>

    <h2>Delivery Address</h2>
    <div class="section">
      <div style="color:#F5F5F0;line-height:1.8;">${addr.name}<br>${addr.street}, ${addr.city}<br>${addr.state} — ${addr.pincode}<br>📞 ${addr.phone}</div>
    </div>

    <div style="text-align:center;margin-top:24px;">
      <a href="${adminDashboardUrl()}/orders/${order._id}" class="btn btn-gold">VIEW ORDER</a>
      <a href="${adminDashboardUrl()}/orders" class="btn btn-outline">ALL ORDERS</a>
    </div>`;

  const formattedTotal = `₹${order.pricing.total.toLocaleString('en-IN')}`;
  const method = order.paymentMethod.toUpperCase();
  return sendAdminEmail(
    `🛍️ New Order #${order.orderNumber} — ${formattedTotal} (${method})`,
    baseAdminHtml(content)
  );
};

const sendLowStockAdminEmail = (product, size, remainingStock) => {
  const content = `
    <h1 style="color:#FFA040;">⚠️ LOW STOCK ALERT</h1>
    <div class="section">
      <div class="kv"><span class="kv-key">Product</span><span class="kv-val">${product.name}</span></div>
      <div class="kv"><span class="kv-key">Brand</span><span class="kv-val">${product.brand || '—'}</span></div>
      <div class="kv"><span class="kv-key">Size</span><span class="kv-val">UK ${size}</span></div>
      <div class="kv"><span class="kv-key">Remaining Stock</span><span class="kv-val" style="color:#FFA040;font-size:20px;font-family:monospace;">${remainingStock}</span></div>
    </div>
    <p style="color:#A0998A;">Only <strong style="color:#FFA040;">${remainingStock} pair${remainingStock === 1 ? '' : 's'}</strong> remaining. Consider restocking soon.</p>
    <div style="text-align:center;margin-top:24px;">
      <a href="${adminDashboardUrl()}/products/${product._id}" class="btn btn-gold">UPDATE STOCK</a>
    </div>`;

  return sendAdminEmail(
    `⚠️ Low Stock Alert — ${product.name} Size ${size}`,
    baseAdminHtml(content)
  );
};

const sendOutOfStockAdminEmail = (product, size) => {
  const content = `
    <h1 style="color:#FF6060;">🚨 OUT OF STOCK</h1>
    <div class="section">
      <div class="kv"><span class="kv-key">Product</span><span class="kv-val">${product.name}</span></div>
      <div class="kv"><span class="kv-key">Brand</span><span class="kv-val">${product.brand || '—'}</span></div>
      <div class="kv"><span class="kv-key">Size</span><span class="kv-val">UK ${size}</span></div>
      <div class="kv"><span class="kv-key">Remaining Stock</span><span class="kv-val" style="color:#FF6060;font-size:20px;font-family:monospace;">0</span></div>
    </div>
    <p style="color:#FF6060;font-weight:600;">This size is now out of stock. Customers cannot order it until you restock.</p>
    <div style="text-align:center;margin-top:24px;">
      <a href="${adminDashboardUrl()}/products/${product._id}" class="btn btn-gold">RESTOCK NOW</a>
    </div>`;

  return sendAdminEmail(
    `🚨 OUT OF STOCK — ${product.name} Size ${size}`,
    baseAdminHtml(content)
  );
};

const sendRTOAdminEmail = (order, reason) => {
  const itemRows = order.items.map((item) => `
    <tr>
      <td>${item.name}</td>
      <td>UK ${item.size}</td>
      <td style="text-align:center;">${item.quantity}</td>
      <td class="price">₹${(item.price * item.quantity).toLocaleString('en-IN')}</td>
    </tr>`).join('');

  const user = order.user;
  const addr = order.shippingAddress;

  const content = `
    <h1 style="color:#FFA040;">📦 RTO — RETURN TO ORIGIN</h1>
    <div style="font-size:20px;color:#C9A84C;font-family:monospace;margin:8px 0 16px;">${order.orderNumber}</div>

    <h2>Customer Details</h2>
    <div class="section">
      <div class="kv"><span class="kv-key">Name</span><span class="kv-val">${user?.name || addr?.name}</span></div>
      <div class="kv"><span class="kv-key">Email</span><span class="kv-val">${user?.email || '—'}</span></div>
      <div class="kv"><span class="kv-key">Phone</span><span class="kv-val">${user?.phone || addr?.phone || '—'}</span></div>
      <div class="kv"><span class="kv-key">Address</span><span class="kv-val">${addr?.street}, ${addr?.city}, ${addr?.state} - ${addr?.pincode}</span></div>
    </div>

    <h2>Return Reason</h2>
    <div class="section">
      <div class="kv"><span class="kv-key">Reason</span><span class="kv-val badge badge-warning">${(reason || 'other').replace(/_/g, ' ').toUpperCase()}</span></div>
      ${order.rtoDetails?.note ? `<div class="kv"><span class="kv-key">Note</span><span class="kv-val">${order.rtoDetails.note}</span></div>` : ''}
    </div>

    <h2>Items Being Returned</h2>
    <table>
      <thead><tr><th>Product</th><th>Size</th><th>Qty</th><th>Value</th></tr></thead>
      <tbody>${itemRows}</tbody>
    </table>

    <div class="section" style="margin-top:16px;">
      <p style="color:#60FF90;margin:0;">✓ Stock will be restored automatically when RTO is marked complete.</p>
    </div>

    <div style="text-align:center;margin-top:24px;">
      <a href="${adminDashboardUrl()}/orders/${order._id}" class="btn btn-gold">VIEW ORDER</a>
      ${user?.email ? `<a href="mailto:${user.email}" class="btn btn-outline">CONTACT CUSTOMER</a>` : ''}
    </div>`;

  return sendAdminEmail(
    `📦 RTO — Order #${order.orderNumber} Returned`,
    baseAdminHtml(content)
  );
};

const sendRefundInitiatedAdminEmail = (order, refundAmount) => {
  const user = order.user;

  const content = `
    <h1 style="color:#C9A84C;">💰 REFUND REQUIRED</h1>
    <div style="font-size:20px;color:#C9A84C;font-family:monospace;margin:8px 0 16px;">${order.orderNumber}</div>

    <div class="section">
      <div class="kv"><span class="kv-key">Refund Amount</span><span class="kv-val" style="font-size:22px;color:#C9A84C;font-family:monospace;">₹${Number(refundAmount).toLocaleString('en-IN')}</span></div>
      <div class="kv"><span class="kv-key">Payment Method</span><span class="kv-val">${order.paymentMethod.toUpperCase()}</span></div>
      <div class="kv"><span class="kv-key">Transaction ID</span><span class="kv-val">${order.paymentDetails?.transactionId || '—'}</span></div>
    </div>

    <h2>Customer Details</h2>
    <div class="section">
      <div class="kv"><span class="kv-key">Name</span><span class="kv-val">${user?.name || order.shippingAddress?.name}</span></div>
      <div class="kv"><span class="kv-key">Email</span><span class="kv-val">${user?.email || '—'}</span></div>
      <div class="kv"><span class="kv-key">Phone</span><span class="kv-val">${user?.phone || order.shippingAddress?.phone || '—'}</span></div>
    </div>

    <div class="section" style="border-color:#C9A84C;">
      <p style="color:#FFA040;font-weight:600;margin:0;">⏱️ Process refund within 5–7 business days via Paytm/bank transfer.</p>
      <p style="color:#A0998A;margin:8px 0 0;">Mark refund as completed in the admin panel once processed.</p>
    </div>

    <div style="text-align:center;margin-top:24px;">
      <a href="${adminDashboardUrl()}/orders/${order._id}" class="btn btn-gold">VIEW ORDER</a>
    </div>`;

  return sendAdminEmail(
    `💰 Refund Required — Order #${order.orderNumber} ₹${Number(refundAmount).toLocaleString('en-IN')}`,
    baseAdminHtml(content)
  );
};

const sendDailyReportAdminEmail = (stats) => {
  const ordersChange = stats.yesterdayOrders > 0
    ? ((stats.todayOrders - stats.yesterdayOrders) / stats.yesterdayOrders * 100).toFixed(1)
    : 'N/A';
  const revenueChange = stats.yesterdayRevenue > 0
    ? ((stats.todayRevenue - stats.yesterdayRevenue) / stats.yesterdayRevenue * 100).toFixed(1)
    : 'N/A';

  const orderStatusRows = (stats.ordersByStatus || []).map((s) =>
    `<div class="kv"><span class="kv-key">${s._id.replace(/_/g, ' ').toUpperCase()}</span><span class="kv-val">${s.count}</span></div>`
  ).join('');

  const content = `
    <h1>📊 DAILY REPORT</h1>
    <div style="color:#A0998A;margin-bottom:20px;">${stats.date}</div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      <div class="stat-box">
        <div class="stat-num">${stats.todayOrders}</div>
        <div class="stat-label">Orders Today</div>
        ${ordersChange !== 'N/A' ? `<div style="color:${Number(ordersChange) >= 0 ? '#4CAF78' : '#E05252'};font-size:12px;">${Number(ordersChange) >= 0 ? '↑' : '↓'} ${Math.abs(ordersChange)}% vs yesterday</div>` : ''}
      </div>
      <div class="stat-box">
        <div class="stat-num">₹${(stats.todayRevenue || 0).toLocaleString('en-IN')}</div>
        <div class="stat-label">Revenue Today</div>
        ${revenueChange !== 'N/A' ? `<div style="color:${Number(revenueChange) >= 0 ? '#4CAF78' : '#E05252'};font-size:12px;">${Number(revenueChange) >= 0 ? '↑' : '↓'} ${Math.abs(revenueChange)}% vs yesterday</div>` : ''}
      </div>
    </div>

    <div class="stat-box" style="margin-top:12px;">
      <div class="stat-num">${stats.newUsers}</div>
      <div class="stat-label">New Users Today</div>
    </div>

    <h2>Orders by Status</h2>
    <div class="section">${orderStatusRows || '<div style="color:#5C5650;">No orders today</div>'}</div>

    <h2>Top Product Today</h2>
    <div class="section">
      <div style="color:#C9A84C;font-weight:600;">${stats.topProduct || 'No orders today'}</div>
    </div>

    <h2>Yesterday Comparison</h2>
    <div class="section">
      <div class="kv"><span class="kv-key">Yesterday Orders</span><span class="kv-val">${stats.yesterdayOrders}</span></div>
      <div class="kv"><span class="kv-key">Yesterday Revenue</span><span class="kv-val price">₹${(stats.yesterdayRevenue || 0).toLocaleString('en-IN')}</span></div>
    </div>

    <div style="text-align:center;margin-top:24px;">
      <a href="${adminDashboardUrl()}" class="btn btn-gold">VIEW FULL DASHBOARD</a>
    </div>`;

  return sendAdminEmail(
    `📊 Daily Report — ${stats.date} — ₹${(stats.todayRevenue || 0).toLocaleString('en-IN')} Revenue`,
    baseAdminHtml(content)
  );
};

const sendNewUserAdminEmail = async (user) => {
  const totalUsers = await require('../models/User').countDocuments({ role: 'user' });

  const content = `
    <h1>👤 NEW USER REGISTERED</h1>
    <div class="section">
      <div class="kv"><span class="kv-key">Name</span><span class="kv-val">${user.name}</span></div>
      <div class="kv"><span class="kv-key">Email</span><span class="kv-val">${user.email}</span></div>
      <div class="kv"><span class="kv-key">Phone</span><span class="kv-val">${user.phone || '—'}</span></div>
      <div class="kv"><span class="kv-key">Registered At</span><span class="kv-val">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span></div>
      <div class="kv"><span class="kv-key">Method</span><span class="kv-val">${user.googleId ? 'Google OAuth' : 'Email/Password'}</span></div>
    </div>

    <div class="stat-box" style="margin-top:16px;">
      <div class="stat-num">${totalUsers}</div>
      <div class="stat-label">Total Registered Users</div>
    </div>

    <div style="text-align:center;margin-top:24px;">
      <a href="${adminDashboardUrl()}/users" class="btn btn-gold">VIEW USERS</a>
    </div>`;

  return sendAdminEmail(
    `👤 New User Registered — ${user.name}`,
    baseAdminHtml(content)
  );
};

const sendNewQuestionAdminEmail = (product, question, user) => {
  const content = `
    <h1>❓ NEW PRODUCT QUESTION</h1>
    <div class="section">
      <div class="kv"><span class="kv-key">Product</span><span class="kv-val">${product.name}</span></div>
      <div class="kv"><span class="kv-key">Customer</span><span class="kv-val">${user.name} (${user.email})</span></div>
    </div>
    <h2>Question</h2>
    <div class="section">
      <p style="color:#F5F5F0;line-height:1.6;">"${question}"</p>
    </div>
    <div style="text-align:center;margin-top:24px;">
      <a href="${adminDashboardUrl()}/questions" class="btn btn-gold">ANSWER QUESTION</a>
    </div>`;

  return sendAdminEmail(
    `❓ New Question on ${product.name}`,
    baseAdminHtml(content)
  );
};

module.exports = {
  sendEmail,
  sendAdminEmail,
  sendWelcomeEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendOrderConfirmationEmail,
  sendPaymentConfirmedEmail,
  sendPaymentFailedEmail,
  sendOrderStatusEmail,
  sendOrderCancelledEmail,
  sendRefundProcessedEmail,
  sendRTOCustomerEmail,
  sendQuestionAnsweredEmail,
  // Admin notifications
  sendNewOrderAdminEmail,
  sendLowStockAdminEmail,
  sendOutOfStockAdminEmail,
  sendRTOAdminEmail,
  sendRefundInitiatedAdminEmail,
  sendDailyReportAdminEmail,
  sendNewUserAdminEmail,
  sendNewQuestionAdminEmail,
};
