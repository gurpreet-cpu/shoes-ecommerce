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
      from: process.env.EMAIL_FROM || `"Shoe Store" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    logger.error(`[Email] Failed to send "${subject}" to ${to}: ${err.message}`);
  }
};

// ── Templates ────────────────────────────────────────────────────────────────

const sendWelcomeEmail = (user, verificationToken) => {
  const link = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;
  const html = `
    <h2>Welcome to Shoe Store, ${user.name}!</h2>
    <p>Thanks for signing up. Please verify your email address to get started.</p>
    <p><a href="${link}" style="background:#000;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;">Verify Email</a></p>
    <p>Or copy this link: ${link}</p>
    <p>This link does not expire.</p>
  `;
  return sendEmail(user.email, 'Welcome! Please verify your email', html);
};

const sendVerificationEmail = (user, verificationToken) => {
  const link = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;
  const html = `
    <h2>Verify your email address</h2>
    <p>Hi ${user.name}, click the button below to verify your email.</p>
    <p><a href="${link}" style="background:#000;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;">Verify Email</a></p>
    <p>Or copy this link: ${link}</p>
  `;
  return sendEmail(user.email, 'Verify your email address', html);
};

const sendPasswordResetEmail = (user, resetToken) => {
  const link = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
  const html = `
    <h2>Reset your password</h2>
    <p>Hi ${user.name}, we received a request to reset your Shoe Store password.</p>
    <p><a href="${link}" style="background:#000;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;">Reset Password</a></p>
    <p>Or copy this link: ${link}</p>
    <p>This link expires in <strong>1 hour</strong>. If you did not request this, you can ignore this email.</p>
  `;
  return sendEmail(user.email, 'Password reset request', html);
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
    ${order.paymentStatus === 'refunded'
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

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendOrderConfirmationEmail,
  sendPaymentConfirmedEmail,
  sendPaymentFailedEmail,
  sendOrderStatusEmail,
  sendOrderCancelledEmail,
};
