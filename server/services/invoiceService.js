const PDFDocument = require('pdfkit');

const GST_RATE = 0.18;

function generateInvoice(order, user) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width - 100; // usable width (margins 50 each side)

    // ── Header ────────────────────────────────────────────────────────────────
    doc
      .fontSize(28)
      .font('Helvetica-Bold')
      .fillColor('#C9A84C')
      .text('STEPSTYLE', 50, 50, { align: 'left' })
      .fontSize(10)
      .fillColor('#888888')
      .text('Premium Footwear', 50, 82);

    doc
      .fontSize(28)
      .font('Helvetica-Bold')
      .fillColor('#333333')
      .text('INVOICE', 50, 50, { align: 'right' });

    doc.moveDown(0.5);

    // ── Invoice meta ──────────────────────────────────────────────────────────
    const metaY = 110;
    doc
      .fontSize(9)
      .fillColor('#888888')
      .font('Helvetica')
      .text('Invoice #', 50, metaY)
      .fillColor('#333333')
      .text(order.orderNumber, 50, metaY + 12)
      .fillColor('#888888')
      .text('Date', 50, metaY + 30)
      .fillColor('#333333')
      .text(new Date(order.createdAt).toLocaleDateString('en-IN'), 50, metaY + 42)
      .fillColor('#888888')
      .text('Order #', 50, metaY + 60)
      .fillColor('#333333')
      .text(order.orderNumber, 50, metaY + 72);

    // ── Divider ───────────────────────────────────────────────────────────────
    doc
      .moveTo(50, 205)
      .lineTo(545, 205)
      .strokeColor('#DDDDDD')
      .lineWidth(1)
      .stroke();

    // ── Bill To ───────────────────────────────────────────────────────────────
    const addr = order.shippingAddress;
    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor('#888888')
      .text('BILL TO', 50, 220)
      .fontSize(11)
      .fillColor('#333333')
      .font('Helvetica-Bold')
      .text(addr.name, 50, 235)
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#555555')
      .text(addr.street, 50, 250)
      .text(`${addr.city}, ${addr.state} - ${addr.pincode}`, 50, 262)
      .text(`Phone: ${addr.phone}`, 50, 274);

    if (user?.email) {
      doc.text(`Email: ${user.email}`, 50, 286);
    }

    // Payment info on the right
    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor('#888888')
      .text('PAYMENT', 400, 220)
      .fontSize(10)
      .fillColor('#333333')
      .font('Helvetica')
      .text(order.paymentMethod.toUpperCase(), 400, 235)
      .fillColor(order.paymentStatus === 'paid' ? '#4CAF78' : '#888888')
      .font('Helvetica-Bold')
      .text(order.paymentStatus.toUpperCase(), 400, 248);

    if (order.paymentDetails?.transactionId) {
      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#888888')
        .text(`Txn: ${order.paymentDetails.transactionId}`, 400, 262);
    }

    // ── Items table ───────────────────────────────────────────────────────────
    const tableTop = 320;
    const colX = { num: 50, product: 70, size: 320, qty: 370, unit: 420, total: 490 };

    // Table header background
    doc
      .rect(50, tableTop - 8, W, 22)
      .fillColor('#F5F5F5')
      .fill();

    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor('#333333')
      .text('#',          colX.num,     tableTop)
      .text('PRODUCT',    colX.product,  tableTop)
      .text('SIZE',       colX.size,    tableTop)
      .text('QTY',        colX.qty,     tableTop)
      .text('UNIT PRICE', colX.unit,    tableTop)
      .text('TOTAL',      colX.total,   tableTop);

    let y = tableTop + 24;
    let rowNum = 1;

    for (const item of order.items) {
      if (y > 680) {
        doc.addPage();
        y = 50;
      }

      const itemTotal = item.price * item.quantity;

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#555555')
        .text(String(rowNum++), colX.num, y)
        .fillColor('#333333')
        .text(item.name, colX.product, y, { width: 240, ellipsis: true })
        .fillColor('#555555')
        .text(`UK ${item.size}`, colX.size, y)
        .text(String(item.quantity), colX.qty, y)
        .text(`₹${item.price.toLocaleString('en-IN')}`, colX.unit, y)
        .font('Helvetica-Bold')
        .fillColor('#333333')
        .text(`₹${itemTotal.toLocaleString('en-IN')}`, colX.total, y);

      y += 20;

      doc
        .moveTo(50, y - 4)
        .lineTo(545, y - 4)
        .strokeColor('#EEEEEE')
        .lineWidth(0.5)
        .stroke();
    }

    // ── Pricing summary ───────────────────────────────────────────────────────
    y += 12;
    const summaryX = 380;

    const gstBase    = order.pricing.subtotal - (order.pricing.discount || 0);
    const gstAmount  = Math.round(gstBase * GST_RATE * 100) / 100;
    const grandTotal = order.pricing.total;

    const addSummaryRow = (label, value, bold = false, color = '#333333') => {
      doc
        .fontSize(9)
        .font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .fillColor('#888888')
        .text(label, summaryX, y)
        .fillColor(color)
        .font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .text(value, 490, y, { align: 'right', width: 55 });
      y += 16;
    };

    addSummaryRow('Subtotal', `₹${order.pricing.subtotal.toLocaleString('en-IN')}`);
    if (order.pricing.discount) {
      addSummaryRow('Discount', `-₹${order.pricing.discount.toLocaleString('en-IN')}`, false, '#4CAF78');
    }
    addSummaryRow('Shipping', order.pricing.shippingCharge ? `₹${order.pricing.shippingCharge}` : 'FREE');
    addSummaryRow(`GST (${GST_RATE * 100}%)`, `₹${gstAmount.toLocaleString('en-IN')}`);

    doc
      .moveTo(summaryX, y)
      .lineTo(545, y)
      .strokeColor('#C9A84C')
      .lineWidth(1)
      .stroke();
    y += 8;

    addSummaryRow('GRAND TOTAL', `₹${grandTotal.toLocaleString('en-IN')}`, true, '#C9A84C');

    // ── Footer ────────────────────────────────────────────────────────────────
    const footerY = 760;
    doc
      .moveTo(50, footerY)
      .lineTo(545, footerY)
      .strokeColor('#DDDDDD')
      .lineWidth(1)
      .stroke();

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#888888')
      .text('Thank you for shopping with StepStyle', 50, footerY + 10, { align: 'center', width: W })
      .fontSize(8)
      .text('This is a computer-generated invoice and does not require a signature.', 50, footerY + 24, {
        align: 'center',
        width: W,
      });

    doc.end();
  });
}

module.exports = { generateInvoice };
