// Run through scripts/test-edge-gate.sh: checks the payment signature helpers against independently computed HMACs.
const assert = require('assert'); const crypto = require('crypto');
const g = require(process.argv[2]);
(async () => {
  const hex = (k, m) => crypto.createHmac('sha256', k).update(m).digest('hex');
  assert.strictEqual(await g.hmacHex('secret', 'abc'), hex('secret', 'abc'));
  assert.ok(await g.verifyCheckoutSignature('order_1', 'pay_1', hex('ks', 'order_1|pay_1'), 'ks'), 'valid checkout signature');
  assert.ok(!(await g.verifyCheckoutSignature('order_1', 'pay_2', hex('ks', 'order_1|pay_1'), 'ks')), 'payment id swapped');
  assert.ok(!(await g.verifyCheckoutSignature('order_1', 'pay_1', hex('other', 'order_1|pay_1'), 'ks')), 'wrong secret');
  assert.ok(!(await g.verifyCheckoutSignature('', 'pay_1', 'x', 'ks')), 'empty order id');
  const body = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_1', amount: 20000 } } } });
  assert.ok(await g.verifyWebhookSignature(body, hex('wh', body), 'wh'), 'valid webhook');
  assert.ok(!(await g.verifyWebhookSignature(body + ' ', hex('wh', body), 'wh')), 'tampered body');
  assert.ok(!(await g.verifyWebhookSignature(body, hex('wh', body).toUpperCase().slice(1), 'wh')), 'truncated signature');
  assert.ok(!(await g.verifyWebhookSignature(body, '', 'wh')), 'missing signature');
  assert.ok(!(await g.verifyWebhookSignature(body, hex('wh', body), '')), 'missing secret');
  assert.strictEqual(g.gatewayConfig(() => undefined), null);
  assert.deepStrictEqual(g.gatewayConfig((k) => ({ RAZORPAY_KEY_ID: 'id', RAZORPAY_KEY_SECRET: 's' }[k])), { keyId: 'id', keySecret: 's' });
  console.log('PASS gateway signatures (11 checks)');
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
