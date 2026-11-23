// Tests the pure helpers of the channel senders and the integration vault (config selection, encryption, validation).
const assert = require('assert'); const path = require('path');
const out = path.resolve(process.argv[2]);
const ch = require(path.join(out, 'channels.js')), integ = require(path.join(out, 'integrations.js'));
(async () => {
  let n = 0; const ok = (c, msg) => { assert.ok(c, msg); n++; };
  ok(ch.channelConfig(() => undefined).email === null && ch.channelConfig(() => undefined).sms === null && ch.channelConfig(() => undefined).whatsapp === null, 'nothing configured -> no channel');
  ok(ch.channelConfig(k => ({ RESEND_API_KEY: 'k', MAIL_FROM: 'a@b.c' })[k]).email?.from === 'a@b.c', 'env email');
  ok(ch.channelConfig(k => ({ RESEND_API_KEY: 'k' })[k]).email === null, 'email needs key and sender');
  ok(ch.channelConfig(k => ({ TWILIO_ACCOUNT_SID: 's', TWILIO_AUTH_TOKEN: 't', TWILIO_FROM: '+1', TWILIO_WHATSAPP_FROM: '+14155238886' })[k]).whatsapp?.provider === 'twilio_whatsapp', 'env whatsapp');
  ok(ch.safeEqual('abcdefgh', 'abcdefgh') && !ch.safeEqual('abcdefgh', 'abcdefgx') && !ch.safeEqual('a', 'ab'), 'safeEqual');
  ok(!ch.emailHtml('College', '<b>x</b>', '<script>alert(1)</script>').includes('<script>'), 'html is escaped');

  const key = 'a-long-random-secret-of-24-chars!!';
  ok(integ.encryptionReady(k => key) && !integ.encryptionReady(k => 'short'), 'encryption key length check');
  const c1 = await integ.encryptSecrets({ api_key: 'sk_live_123' }, key), c2 = await integ.encryptSecrets({ api_key: 'sk_live_123' }, key);
  ok(c1 !== c2 && !c1.includes('sk_live'), 'ciphertext is salted and hides the value');
  ok((await integ.decryptSecrets(c1, key)).api_key === 'sk_live_123', 'round trip');
  let threw = false; try { await integ.decryptSecrets(c1, 'another-secret-another-secret-xx'); } catch { threw = true; } ok(threw, 'wrong key fails');
  const tampered = c1.slice(0, -4) + (c1.endsWith('AAAA') ? 'BBBB' : 'AAAA'); threw = false; try { await integ.decryptSecrets(tampered, key); } catch { threw = true; } ok(threw, 'tampering is detected');

  const v = (o, ex = {}) => integ.validateSave(Object.assign({ kind: 'email', provider: 'resend', enabled: true, public_config: { from: 'a@b.co' }, secrets: { api_key: 'k' } }, o), ex);
  ok(v({}).ok, 'valid email config');
  ok(!v({ provider: 'nope' }).ok, 'unknown provider refused');
  ok(!v({ public_config: { from: 'not-an-email' } }).ok, 'bad sender refused');
  ok(!v({ secrets: {} }).ok, 'enabling needs the secret');
  ok(v({ secrets: {} }, { api_key: 'saved' }).ok, 'blank secret keeps the saved one');
  ok(v({ secrets: {} }, { api_key: 'saved' }).secrets.api_key === 'saved', 'kept value carried over');
  ok(v({ enabled: false, secrets: {}, public_config: {} }).ok, 'a disabled draft may be incomplete');
  ok(!v({ kind: 'payments', provider: 'razorpay', public_config: { key_id: 'rzp_test_1' }, secrets: { key_secret: '' } }).ok, 'payments need the key secret');
  ok(v({ kind: 'payments', provider: 'razorpay', public_config: { key_id: 'rzp_test_1' }, secrets: { key_secret: 's' } }).ok, 'payments valid without webhook secret');
  ok(v({ kind: 'whatsapp', provider: 'meta_whatsapp', public_config: { phone_number_id: '123' }, secrets: { access_token: 't' } }).ok, 'meta whatsapp valid');
  ok(!v({ kind: 'whatsapp', provider: 'resend' }).ok, 'provider must belong to the kind');
  ok(Object.keys(integ.CATALOG).join() === 'payments,email,sms,whatsapp', 'catalogue kinds');
  console.log(`PASS channels & integrations (${n} checks)`);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
