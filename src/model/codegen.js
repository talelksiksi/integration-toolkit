/**
 * codegen.js - one small Node.js service per link.
 *
 * Each file reads from the source over the link's protocol, delivers to the
 * target, and (when the link is marked so) keeps an outbox with retries and
 * raises an alert after repeated failures. Real libraries, real patterns:
 * a starting point to review, not a finished product.
 */

import { FREQUENCIES } from './catalog';

const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const env = (s) => slug(s).replace(/-/g, '_').toUpperCase();

// How to read from the source, per protocol. Each calls handle(record).
const READERS = {
  rest: (c, a) => ({
    deps: [],
    code: `// Poll ${a.name} over REST and hand every new record to handle().
let cursor = process.env.START_CURSOR || '1970-01-01T00:00:00Z';
async function poll() {
  const res = await fetch(\`\${process.env.${env(a.name)}_URL}/${c.data}?since=\${encodeURIComponent(cursor)}\`, {
    headers: { Authorization: \`Bearer \${process.env.${env(a.name)}_TOKEN}\` },
  });
  if (!res.ok) throw new Error(\`${a.name} answered \${res.status}\`);
  for (const record of await res.json()) {
    await handle(record);
    cursor = record.updatedAt || cursor;
  }
}
schedule(poll);`,
  }),
  webhook: (c, a) => ({
    deps: ['express'],
    code: `// ${a.name} calls this endpoint for every change (webhook).
const crypto = require('node:crypto');
const express = require('express');
const app = express();
app.use(express.raw({ type: '*/*' }));
app.post('/hooks/${slug(a.name)}', async (req, res) => {
  const expected = crypto.createHmac('sha256', process.env.WEBHOOK_SECRET).update(req.body).digest('hex');
  if (req.get('X-Signature') !== expected) return res.sendStatus(401);
  try {
    await handle(JSON.parse(req.body));
    res.sendStatus(202); // acknowledge only once it is safely handled
  } catch (err) {
    res.sendStatus(503); // the sender retries later
  }
});
app.listen(process.env.PORT || 8080);`,
  }),
  idoc: (c, a) => ({
    deps: ['express', 'fast-xml-parser'],
    code: `// SAP sends IDocs over HTTP (port configured in SM59 / WE21).
const express = require('express');
const { XMLParser } = require('fast-xml-parser');
const app = express();
app.use(express.text({ type: ['application/xml', 'text/xml'], limit: '5mb' }));
const parser = new XMLParser({ ignoreAttributes: false });
app.post('/idoc', async (req, res) => {
  const doc = parser.parse(req.body);
  const idoc = doc.IDOC || doc['ORDERS05']?.IDOC || doc;
  try {
    await handle({ docnum: idoc?.EDI_DC40?.DOCNUM, type: idoc?.EDI_DC40?.IDOCTYP, payload: idoc });
    res.status(200).send('OK'); // SAP marks the IDoc as sent (status 03)
  } catch (err) {
    res.status(500).send('Retry'); // stays in SAP for resend (status 02)
  }
});
app.listen(process.env.PORT || 8080);`,
  }),
  opcua: (c, a) => ({
    deps: ['node-opcua'],
    code: `// Subscribe to ${a.name} over OPC UA: the server pushes every change.
const { OPCUAClient, AttributeIds, TimestampsToReturn } = require('node-opcua');
const NODES = (process.env.OPCUA_NODES || 'ns=3;s=Line1.Output,ns=3;s=Line1.State').split(',');
async function start() {
  const client = OPCUAClient.create({ endpointMustExist: false, keepSessionAlive: true });
  client.on('connection_lost', () => alert('OPC UA connection to ${a.name} lost'));
  await client.connect(process.env.OPCUA_ENDPOINT || 'opc.tcp://${slug(a.name)}:4840');
  const session = await client.createSession();
  const sub = await session.createSubscription2({ requestedPublishingInterval: 1000, publishingEnabled: true });
  for (const nodeId of NODES) {
    const item = await sub.monitor({ nodeId, attributeId: AttributeIds.Value },
      { samplingInterval: 500, queueSize: 10, discardOldest: true }, TimestampsToReturn.Both);
    item.on('changed', (v) => handle({ nodeId, value: v.value.value, at: v.sourceTimestamp }));
  }
}
start().catch((err) => { console.error(err); process.exit(1); });`,
  }),
  modbus: (c, a) => ({
    deps: ['modbus-serial'],
    code: `// Read holding registers from ${a.name} over Modbus TCP.
const ModbusRTU = require('modbus-serial');
const plc = new ModbusRTU();
plc.setTimeout(2000);
async function poll() {
  if (!plc.isOpen) await plc.connectTCP(process.env.MODBUS_HOST || '${slug(a.name)}', { port: 502 });
  plc.setID(Number(process.env.MODBUS_UNIT || 1));
  const { data } = await plc.readHoldingRegisters(0, 10); // registers 40001-40010
  await handle({ registers: data, at: new Date().toISOString() });
}
schedule(poll);`,
  }),
  s7: (c, a) => ({
    deps: ['nodes7'],
    code: `// Read data blocks from ${a.name} (Siemens S7, ISO-on-TCP).
const nodes7 = require('nodes7');
const plc = new nodes7();
const TAGS = { output: 'DB10,REAL0', state: 'DB10,INT4' };
plc.initiateConnection({ host: process.env.S7_HOST || '${slug(a.name)}', port: 102, rack: 0, slot: 1 }, (err) => {
  if (err) { alert('Cannot reach ${a.name}'); process.exit(1); }
  plc.setTranslationCB((tag) => TAGS[tag]);
  plc.addItems(Object.keys(TAGS));
  schedule(() => new Promise((resolve, reject) => plc.readAllItems((bad, values) => (bad ? reject(new Error('S7 read failed')) : handle(values).then(resolve, reject)))));
});`,
  }),
  socket: (c, a) => ({
    deps: [],
    code: `// Telegrams from ${a.name}: $BODY*CS=XX# with an XOR checksum, one ACK per message.
const net = require('node:net');
const xor = (s) => [...s].reduce((x, ch) => x ^ ch.charCodeAt(0), 0).toString(16).toUpperCase().padStart(2, '0');
net.createServer((sock) => {
  let buf = '';
  sock.on('data', async (chunk) => {
    buf += chunk.toString('latin1');
    let end;
    while ((end = buf.indexOf('#')) !== -1) {
      const frame = buf.slice(buf.indexOf('$') + 1, end); buf = buf.slice(end + 1);
      const [body, cs] = frame.split('*CS=');
      const seq = body.split('*')[1];
      if (xor(body) !== cs) { sock.write(\`$NAK*\${seq}*CS*CS=\${xor(\`NAK*\${seq}*CS\`)}#\`); continue; }
      try { await handle({ body, seq }); sock.write(\`$ACK*\${seq}*OK*CS=\${xor(\`ACK*\${seq}*OK\`)}#\`); }
      catch (err) { /* no ACK: the sender asks for the status instead of resending blindly */ }
    }
  });
}).listen(Number(process.env.TELEGRAM_PORT || 2000));`,
  }),
  mqtt: (c, a) => ({
    deps: ['mqtt'],
    code: `// Subscribe to ${a.name}'s topics over MQTT (QoS 1, persistent session).
const mqtt = require('mqtt');
const client = mqtt.connect(process.env.MQTT_URL || 'mqtts://broker:8883', {
  clientId: '${slug(a.name)}-to-target', clean: false,
  username: process.env.MQTT_USER, password: process.env.MQTT_PASSWORD,
});
client.on('connect', () => client.subscribe('${slug(a.name)}/${c.data}/#', { qos: 1 }));
client.on('message', (topic, message) => handle({ topic, ...JSON.parse(message.toString()) }));
client.on('offline', () => alert('MQTT broker unreachable'));`,
  }),
  kafka: (c, a) => ({
    deps: ['kafkajs'],
    code: `// Consume ${c.data} from Kafka; commit the offset only after delivery.
const { Kafka } = require('kafkajs');
const kafka = new Kafka({ clientId: 'integration', brokers: (process.env.KAFKA_BROKERS || 'kafka:9092').split(','), ssl: true });
const consumer = kafka.consumer({ groupId: '${slug(a.name)}-consumers' });
(async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: '${slug(a.name)}.${c.data}', fromBeginning: false });
  await consumer.run({ autoCommit: false, eachMessage: async ({ topic, partition, message }) => {
    await handle(JSON.parse(message.value.toString()));
    await consumer.commitOffsets([{ topic, partition, offset: (Number(message.offset) + 1).toString() }]);
  } });
})();`,
  }),
  sql: (c, a) => ({
    deps: ['pg'],
    code: `// Read new rows from ${a.name} using a high-water mark.
const { Pool } = require('pg');
const source = new Pool({ connectionString: process.env.${env(a.name)}_DB });
let lastId = Number(process.env.START_ID || 0);
async function poll() {
  const { rows } = await source.query('SELECT * FROM ${c.data} WHERE id > $1 ORDER BY id LIMIT 500', [lastId]);
  for (const row of rows) { await handle(row); lastId = row.id; }
}
schedule(poll);`,
  }),
  sftp: (c, a) => ({
    deps: ['ssh2-sftp-client'],
    code: `// Pick up CSV files from ${a.name}'s SFTP folder, then move them to /processed.
const Client = require('ssh2-sftp-client');
async function poll() {
  const sftp = new Client();
  await sftp.connect({ host: process.env.SFTP_HOST, username: process.env.SFTP_USER, privateKey: process.env.SFTP_KEY });
  try {
    for (const f of await sftp.list('/outbox', (x) => x.name.endsWith('.csv'))) {
      const text = (await sftp.get(\`/outbox/\${f.name}\`)).toString('utf8');
      const [head, ...lines] = text.trim().split(/\\r?\\n/);
      const cols = head.split(';');
      for (const line of lines) await handle(Object.fromEntries(line.split(';').map((v, i) => [cols[i], v])));
      await sftp.rename(\`/outbox/\${f.name}\`, \`/processed/\${f.name}\`);
    }
  } finally { await sftp.end(); }
}
schedule(poll);`,
  }),
  email: (c, a) => ({ deps: [], code: `// ${a.name} does not send data by email; read it from its API or database instead.\nschedule(async () => {});` }),
};

// How to deliver to the target, by target system type.
function writer(c, b) {
  const t = b.type;
  if (t === 'database') return { deps: ['pg'], code: `const { Pool: TargetPool } = require('pg');
const target = new TargetPool({ connectionString: process.env.${env(b.name)}_DB });
async function deliver(record) {
  await target.query(
    'INSERT INTO ${c.data} (id, payload, received_at) VALUES ($1, $2, now()) ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload',
    [record.id ?? record.seq ?? Date.now(), record]);
}` };
  if (t === 'broker') return { deps: ['mqtt'], code: `const mqttOut = require('mqtt');
const broker = mqttOut.connect(process.env.MQTT_URL || 'mqtts://broker:8883');
function deliver(record) {
  return new Promise((ok, fail) => broker.publish('${c.data}', JSON.stringify(record), { qos: 1 }, (e) => (e ? fail(e) : ok())));
}` };
  if (t === 'email') return { deps: ['nodemailer'], code: `const nodemailer = require('nodemailer');
const mail = nodemailer.createTransport(process.env.SMTP_URL);
async function deliver(record) {
  await mail.sendMail({ from: process.env.MAIL_FROM, to: process.env.MAIL_TO, subject: '${b.name}', text: JSON.stringify(record, null, 2) });
}` };
  if (t === 'file') return { deps: ['ssh2-sftp-client'], code: `const SftpOut = require('ssh2-sftp-client');
async function deliver(record) {
  const sftp = new SftpOut();
  await sftp.connect({ host: process.env.SFTP_HOST, username: process.env.SFTP_USER, privateKey: process.env.SFTP_KEY });
  const line = Object.values(record).join(';') + '\\n';
  await sftp.append(Buffer.from(line), '/inbox/${c.data}.csv').finally(() => sftp.end());
}` };
  if ((t === 'plc' || t === 'controller') && c.protocol === 'opcua') return { deps: ['node-opcua'], code: `const opcuaOut = require('node-opcua');
let session;
async function deliver(record) {
  if (!session) {
    const client = opcuaOut.OPCUAClient.create({ endpointMustExist: false });
    await client.connect(process.env.TARGET_OPCUA || 'opc.tcp://${slug(b.name)}:4840');
    session = await client.createSession();
  }
  const status = await session.write({ nodeId: process.env.TARGET_NODE || 'ns=3;s=Command', attributeId: 13,
    value: { value: { dataType: opcuaOut.DataType.String, value: JSON.stringify(record) } } });
  if (status.name !== 'Good') throw new Error(\`Write refused: \${status.name}\`);
}` };
  if (t === 'plc' || t === 'controller') return { deps: [], code: `const netOut = require('node:net');
const xorOut = (s) => [...s].reduce((x, ch) => x ^ ch.charCodeAt(0), 0).toString(16).toUpperCase().padStart(2, '0');
let seq = 0;
function deliver(record) {
  // One telegram at a time; resolve only on the matching ACK.
  return new Promise((ok, fail) => {
    const n = String(++seq % 10000).padStart(4, '0');
    const body = \`MOV*\${n}*\${record.body || JSON.stringify(record)}\`;
    const sock = netOut.connect(Number(process.env.TARGET_PORT || 2000), process.env.TARGET_HOST || '${slug(b.name)}');
    const timer = setTimeout(() => { sock.destroy(); fail(new Error('No ACK in 5 s')); }, 5000);
    sock.on('connect', () => sock.write(\`$\${body}*CS=\${xorOut(body)}#\`));
    sock.on('data', (d) => { if (d.toString().includes(\`ACK*\${n}*OK\`)) { clearTimeout(timer); sock.end(); ok(); } });
    sock.on('error', (e) => { clearTimeout(timer); fail(e); });
  });
}` };
  return { deps: [], code: `async function deliver(record) {
  const res = await fetch(\`\${process.env.${env(b.name)}_URL}/${c.data}\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json'${c.auth ? `, Authorization: \`Bearer \${process.env.${env(b.name)}_TOKEN}\`` : ''}, 'Idempotency-Key': String(record.id ?? record.seq ?? '') },
    body: JSON.stringify(record),
  });
  if (!res.ok) throw new Error(\`${b.name} answered \${res.status}\`);
}` };
}

export function generateLink(c, a, b) {
  const r = (READERS[c.protocol] || READERS.rest)(c, a);
  const w = writer(c, b);
  const seconds = FREQUENCIES[c.frequency].seconds;
  const header = `/**
 * ${a.name} -> ${b.name}
 * Carries: ${c.data} | protocol: ${c.protocol} | ${c.mode === 'push' ? 'pushed by the sender' : `polled every ${seconds} s`}
 * Store and forward: ${c.buffered ? 'yes (outbox with retries)' : 'no'} | Alert on failure: ${c.alerts ? 'yes' : 'no'}
 *
 * Generated by the CICTNA RDC Integration Toolkit. Starter code: review,
 * add your field mappings and tests before production.
 */
'use strict';
`;
  const outbox = c.buffered ? `
// ---- Store and forward: nothing is lost while ${b.name} is unavailable ----
const fs = require('node:fs');
const OUTBOX = process.env.OUTBOX_FILE || './outbox-${slug(a.name)}-to-${slug(b.name)}.jsonl';
let failures = 0;
async function handle(record) {
  fs.appendFileSync(OUTBOX, JSON.stringify(record) + '\\n'); // persisted before we acknowledge
  await flush();
}
async function flush() {
  if (!fs.existsSync(OUTBOX)) return;
  const pending = fs.readFileSync(OUTBOX, 'utf8').split('\\n').filter(Boolean);
  while (pending.length) {
    try {
      await deliver(JSON.parse(pending[0]));
      pending.shift();
      fs.writeFileSync(OUTBOX, pending.map((l) => l + '\\n').join(''));
      failures = 0;
    } catch (err) {
      failures += 1;
      if (failures === 5) alert(\`${a.name} -> ${b.name}: \${pending.length} messages waiting (\${err.message})\`);
      return; // keep them; the retry timer tries again
    }
  }
}
setInterval(() => flush().catch(() => {}), Math.min(60000, 2000 * 2 ** Math.min(failures, 5)));
` : `
// ---- Direct delivery: if ${b.name} is down, this record is lost ----
async function handle(record) {
  try { await deliver(record); }
  catch (err) { ${c.alerts ? 'alert' : 'console.error'}(\`${a.name} -> ${b.name} failed: \${err.message}\`); throw err; }
}
`;
  const alert = c.alerts ? `
// ---- Alert on failure ----
function alert(message) {
  console.error('[ALERT]', message);
  if (process.env.ALERT_WEBHOOK_URL) {
    fetch(process.env.ALERT_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: message }) }).catch(() => {});
  }
}
` : `
function alert(message) { console.error('[ALERT]', message); } // wire to email or chat to be told
`;
  const sched = `
// ---- Scheduling ----
function schedule(job) {
  const run = () => job().catch((err) => alert(\`${a.name}: \${err.message}\`));
  run();
  setInterval(run, ${Math.max(1, seconds) * 1000}); // ${c.frequency}
}
`;
  const code = [header, alert, sched, '// ---- Deliver to ' + b.name + ' ----\n' + w.code, outbox, '// ---- Read from ' + a.name + ' ----\n' + r.code, ''].join('\n');
  const deps = [...new Set([...r.deps, ...w.deps])];
  return { file: `${slug(a.name)}-to-${slug(b.name)}.js`, code, deps };
}

export function generateAll(plan) {
  const byId = Object.fromEntries(plan.nodes.map((n) => [n.id, n]));
  return plan.connections
    .filter((c) => byId[c.from] && byId[c.to])
    .map((c) => ({ conn: c.id, ...generateLink(c, byId[c.from], byId[c.to]) }));
}

