// Tests the pure helpers of the channel senders (config selection, constant-time compare, HTML escaping).
const fs = require('fs'), path = require('path'), assert = require('assert'), ts = require('typescript');
const src = fs.readFileSync(path.join(__dirname, '../functions/_shared/channels.ts'), 'utf8');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const m = { exports: {} }; new Function('module', 'exports', 'fetch', 'btoa', js)(m, m.exports, async () => ({ ok: true }), btoa);
const { channelConfig, safeEqual, emailHtml } = m.exports;
let n = 0; const ok = (c, msg) => { assert.ok(c, msg); n++; };
ok(channelConfig(() => undefined).email === null && channelConfig(() => undefined).sms === null, 'nothing configured -> no channel');
ok(channelConfig(k => ({ RESEND_API_KEY: 'k', MAIL_FROM: 'a@b.c' })[k]).email?.from === 'a@b.c', 'email configured');
ok(channelConfig(k => ({ RESEND_API_KEY: 'k' })[k]).email === null, 'email needs both key and sender');
ok(channelConfig(k => ({ TWILIO_ACCOUNT_SID: 's', TWILIO_AUTH_TOKEN: 't', TWILIO_FROM: '+1' })[k]).sms?.sid === 's', 'sms configured');
ok(safeEqual('abcdefgh', 'abcdefgh') && !safeEqual('abcdefgh', 'abcdefgx') && !safeEqual('a', 'ab'), 'safeEqual');
ok(!emailHtml('College', '<b>x</b>', '<script>alert(1)</script>').includes('<script>'), 'html is escaped');
console.log(`PASS channels (${n} checks)`);
