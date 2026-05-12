const https = require('https');
const PaytmChecksum = require('paytmchecksum');

const PAYTM_HOST =
  process.env.NODE_ENV === 'production' ? 'securegw.paytm.in' : 'securegw-stage.paytm.in';

async function generateChecksum(params) {
  return PaytmChecksum.generateSignature(params, process.env.PAYTM_MERCHANT_KEY);
}

async function verifyChecksum(params, checksum) {
  return PaytmChecksum.verifySignature(params, process.env.PAYTM_MERCHANT_KEY, checksum);
}

// Build the standard Paytm param object — controller adds EMAIL and MOBILE_NO
function buildPaytmParams(order) {
  return {
    MID:              process.env.PAYTM_MID,
    WEBSITE:          process.env.PAYTM_WEBSITE,
    CHANNEL_ID:       process.env.PAYTM_CHANNEL_ID,
    INDUSTRY_TYPE_ID: process.env.PAYTM_INDUSTRY_TYPE,
    ORDER_ID:         order.orderNumber,
    CUST_ID:          order.user.toString(),
    TXN_AMOUNT:       Number(order.pricing.total).toFixed(2),
    CALLBACK_URL:     process.env.PAYTM_CALLBACK_URL,
    EMAIL:            '',
    MOBILE_NO:        '',
  };
}

function initiateTransaction(params) {
  return new Promise((resolve, reject) => {
    const bodyObj = {
      requestType: 'Payment',
      mid:         params.MID,
      websiteName: params.WEBSITE,
      orderId:     params.ORDER_ID,
      txnAmount:   { value: params.TXN_AMOUNT, currency: 'INR' },
      userInfo:    { custId: params.CUST_ID },
      callbackUrl: params.CALLBACK_URL,
    };
    const bodyStr = JSON.stringify({ body: bodyObj });

    PaytmChecksum.generateSignatureByString(bodyStr, process.env.PAYTM_MERCHANT_KEY)
      .then((checksum) => {
        const options = {
          hostname: PAYTM_HOST,
          path:     `/theia/api/v1/initiateTransaction?mid=${params.MID}&orderId=${params.ORDER_ID}`,
          method:   'POST',
          headers:  {
            'Content-Type': 'application/json',
            'x-mid':        params.MID,
            'x-checksum':   checksum,
          },
        };
        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              if (parsed.body?.txnToken) resolve(parsed.body.txnToken);
              else reject(new Error(parsed.body?.resultInfo?.resultMsg || 'Failed to get txnToken'));
            } catch {
              reject(new Error('Invalid Paytm response'));
            }
          });
        });
        req.on('error', reject);
        req.write(bodyStr);
        req.end();
      })
      .catch(reject);
  });
}

module.exports = { generateChecksum, verifyChecksum, buildPaytmParams, initiateTransaction };
