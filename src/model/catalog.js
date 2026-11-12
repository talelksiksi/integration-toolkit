/**
 * catalog.js
 *
 * What the toolkit knows about: system types, protocols, kinds of data and
 * how often data moves. Everything the canvas, simulation, review and code
 * generator do is driven by these tables.
 */

// Layer decides colour and where a system sits in a typical architecture.
export const LAYERS = {
  business: { color: 'var(--sys-wms)' },
  floor: { color: 'var(--sys-plc)' },
  data: { color: 'var(--sys-database)' },
  external: { color: 'var(--sys-api)' },
  glue: { color: 'var(--sys-kafka)' },
  people: { color: 'var(--sys-rest)' },
};

export const SYSTEMS = {
  erp: { layer: 'business', icon: 'erp', protocols: ['idoc', 'rest', 'sql', 'sftp'] },
  wms: { layer: 'business', icon: 'wms', protocols: ['rest', 'webhook', 'sql', 'socket'] },
  mes: { layer: 'business', icon: 'mes', protocols: ['rest', 'opcua', 'sql'] },
  plc: { layer: 'floor', icon: 'plc', protocols: ['opcua', 'modbus', 's7', 'socket'] },
  scada: { layer: 'floor', icon: 'scada', protocols: ['opcua', 'modbus', 'sql'] },
  controller: { layer: 'floor', icon: 'controller', protocols: ['socket', 'opcua', 'rest'] },
  edge: { layer: 'glue', icon: 'edge', protocols: ['opcua', 'modbus', 's7', 'mqtt', 'sql'] },
  middleware: { layer: 'glue', icon: 'middleware', protocols: ['rest', 'webhook', 'idoc', 'kafka', 'mqtt', 'sql', 'sftp'] },
  broker: { layer: 'glue', icon: 'broker', protocols: ['kafka', 'mqtt'] },
  database: { layer: 'data', icon: 'database', protocols: ['sql'] },
  dashboard: { layer: 'people', icon: 'dashboard', protocols: ['rest', 'sql', 'webhook'] },
  shop: { layer: 'external', icon: 'shop', protocols: ['rest', 'webhook'] },
  carrier: { layer: 'external', icon: 'carrier', protocols: ['rest', 'webhook'] },
  file: { layer: 'external', icon: 'file', protocols: ['sftp'] },
  email: { layer: 'people', icon: 'email', protocols: ['email'] },
};

// Shown in the palette in this order, grouped.
export const PALETTE = [
  ['business', ['erp', 'wms', 'mes', 'shop']],
  ['floor', ['plc', 'scada', 'controller']],
  ['glue', ['edge', 'middleware', 'broker']],
  ['data', ['database', 'dashboard', 'file', 'email', 'carrier']],
];

// push: the sender delivers as soon as something happens.
// poll: the receiver asks on a schedule, so data waits up to one interval.
export const PROTOCOLS = {
  rest: { pattern: 'poll', ack: true },
  webhook: { pattern: 'push', ack: true },
  idoc: { pattern: 'push', ack: true },
  opcua: { pattern: 'push', ack: false },
  modbus: { pattern: 'poll', ack: false },
  s7: { pattern: 'poll', ack: false },
  socket: { pattern: 'push', ack: true },
  mqtt: { pattern: 'push', ack: true },
  kafka: { pattern: 'push', ack: true },
  sql: { pattern: 'poll', ack: true },
  sftp: { pattern: 'poll', ack: false },
  email: { pattern: 'push', ack: false },
};

// critical: losing one item has a direct business consequence.
export const DATA = {
  orders: { critical: true },
  confirmations: { critical: true },
  stock: { critical: true },
  shipments: { critical: true },
  masterdata: { critical: false },
  telemetry: { critical: false },
  commands: { critical: true },
  alarms: { critical: true },
  reports: { critical: false },
};

// Seconds between two deliveries, and messages per simulated minute.
export const FREQUENCIES = {
  event: { seconds: 2, perMin: 24 },
  s1: { seconds: 1, perMin: 40 },
  s5: { seconds: 5, perMin: 12 },
  m1: { seconds: 60, perMin: 6 },
  m15: { seconds: 900, perMin: 3 },
  h1: { seconds: 3600, perMin: 2 },
  nightly: { seconds: 86400, perMin: 1 },
};

export const FREQ_ORDER = ['event', 's1', 's5', 'm1', 'm15', 'h1', 'nightly'];

/** A connection with sensible defaults for the two systems it joins. */
export function defaultConnection(from, to) {
  const f = SYSTEMS[from.type];
  const tt = SYSTEMS[to.type];
  const shared = f.protocols.find((p) => tt.protocols.includes(p));
  const protocol = shared || tt.protocols[0];
  const floor = (n) => SYSTEMS[n.type].layer === 'floor';
  const data = floor(from) ? 'telemetry' : to.type === 'carrier' ? 'shipments' : from.type === 'shop' ? 'orders' : 'orders';
  return {
    protocol,
    data,
    mode: PROTOCOLS[protocol].pattern,
    frequency: PROTOCOLS[protocol].pattern === 'push' ? 'event' : 'm1',
    buffered: false,
    alerts: false,
    auth: SYSTEMS[to.type].layer !== 'external' && SYSTEMS[from.type].layer !== 'external',
  };
}
