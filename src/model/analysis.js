/**
 * analysis.js - the integration review. Plain rules distilled from what
 * breaks in real projects. Each finding can carry a fix that the UI applies
 * with one click.
 */

import { SYSTEMS, DATA, FREQUENCIES } from './catalog';

const layer = (n) => SYSTEMS[n.type].layer;
const isExternal = (n) => layer(n) === 'external';

export function review(plan) {
  const { nodes, connections } = plan;
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const findings = [];
  const add = (f) => findings.push(f);

  const live = connections.filter((c) => byId[c.from] && byId[c.to]);

  for (const c of live) {
    const a = byId[c.from];
    const b = byId[c.to];
    const crit = DATA[c.data]?.critical;
    const base = { conn: c.id, from: a.name, to: b.name, data: c.data };

    if (crit && !c.buffered) {
      add({ id: `lost-${c.id}`, severity: 'critical', key: 'lostOnOutage', params: base, fix: { conn: c.id, set: { buffered: true } } });
    }
    if (!crit && (c.data === 'telemetry') && !c.buffered && ['floor', 'glue'].includes(layer(a))) {
      add({ id: `gaps-${c.id}`, severity: 'warning', key: 'dataGaps', params: base, fix: { conn: c.id, set: { buffered: true } } });
    }
    if (['orders', 'confirmations', 'stock', 'shipments', 'commands'].includes(c.data) && FREQUENCIES[c.frequency].seconds >= 900) {
      add({ id: `slow-${c.id}`, severity: 'warning', key: 'slowSync', params: { ...base, freq: c.frequency }, fix: { conn: c.id, set: { frequency: 'event', mode: 'push' } } });
    }
    if (crit && !c.alerts) {
      add({ id: `silent-${c.id}`, severity: 'warning', key: 'silent', params: base, fix: { conn: c.id, set: { alerts: true } } });
    }
    if ((isExternal(a) || isExternal(b)) && !c.auth) {
      add({ id: `auth-${c.id}`, severity: 'critical', key: 'noAuth', params: base, fix: { conn: c.id, set: { auth: true } } });
    }
    const field = (n) => n.type === 'plc';
    const office = (n) => ['business', 'external'].includes(layer(n));
    if ((field(a) && office(b)) || (office(a) && field(b))) {
      add({ id: `direct-${c.id}`, severity: 'warning', key: 'directField', params: base, fix: { conn: c.id, insertEdge: true } });
    }
  }

  // Both directions carrying the same owned data.
  const seen = new Set();
  for (const c of live) {
    if (!['stock', 'masterdata'].includes(c.data)) continue;
    const back = live.find((d) => d.from === c.to && d.to === c.from && d.data === c.data);
    const key = [c.from, c.to].sort().join('|') + c.data;
    if (back && !seen.has(key)) {
      seen.add(key);
      add({ id: `masters-${key}`, severity: 'warning', key: 'twoMasters', params: { a: byId[c.from].name, b: byId[c.to].name, data: c.data }, fix: { removeConn: back.id } });
    }
  }

  for (const n of nodes) {
    const degree = live.filter((c) => c.from === n.id || c.to === n.id).length;
    if (degree === 0 && nodes.length > 1) {
      add({ id: `iso-${n.id}`, severity: 'info', key: 'isolated', params: { name: n.name }, fix: { removeNode: n.id } });
    }
    if (degree >= 5 && !['broker', 'middleware'].includes(n.type)) {
      add({ id: `hub-${n.id}`, severity: 'info', key: 'hub', params: { name: n.name, n: degree } });
    }
  }

  // What is already right.
  const critLinks = live.filter((c) => DATA[c.data]?.critical);
  const good = [];
  const nb = critLinks.filter((c) => c.buffered).length;
  const ne = critLinks.filter((c) => c.frequency === 'event' || FREQUENCIES[c.frequency].seconds <= 5).length;
  const na = live.filter((c) => c.alerts).length;
  if (nb) good.push({ id: 'g-b', severity: 'good', key: 'g_buffered', n: nb });
  if (ne) good.push({ id: 'g-e', severity: 'good', key: 'g_event', n: ne });
  if (na) good.push({ id: 'g-a', severity: 'good', key: 'g_alerts', n: na });

  const weights = { critical: 10, warning: 5, info: 2 };
  const penalty = findings.reduce((s, f) => s + (weights[f.severity] || 0), 0);
  const score = live.length === 0 ? null : Math.max(0, 100 - penalty);
  const order = { critical: 0, warning: 1, info: 2 };
  findings.sort((x, y) => order[x.severity] - order[y.severity]);
  return { findings, good, score };
}

/** Apply a finding's fix to a plan and return the new plan. */
export function applyFix(plan, fix, makeId, edgeName) {
  let { nodes, connections } = plan;
  if (fix.set) {
    connections = connections.map((c) => (c.id === fix.conn ? { ...c, ...fix.set } : c));
  }
  if (fix.removeConn) connections = connections.filter((c) => c.id !== fix.removeConn);
  if (fix.removeNode) {
    nodes = nodes.filter((n) => n.id !== fix.removeNode);
    connections = connections.filter((c) => c.from !== fix.removeNode && c.to !== fix.removeNode);
  }
  if (fix.insertEdge) {
    const c = connections.find((x) => x.id === fix.conn);
    if (c) {
      const a = nodes.find((n) => n.id === c.from);
      const b = nodes.find((n) => n.id === c.to);
      const plcSide = a.type === 'plc' ? a : b;
      const edge = { id: makeId('n'), type: 'edge', name: edgeName, x: Math.round((a.x + b.x) / 2), y: Math.round((a.y + b.y) / 2) + 40 };
      const fieldProto = ['opcua', 'modbus', 's7'].includes(c.protocol) ? c.protocol : 'opcua';
      const first = { ...c, id: makeId('c'), to: edge.id, from: c.from, protocol: plcSide === a ? fieldProto : 'rest', mode: plcSide === a ? 'push' : 'push', buffered: true };
      const second = { ...c, id: makeId('c'), from: edge.id, to: c.to, protocol: plcSide === a ? 'rest' : fieldProto, mode: 'push', buffered: true, alerts: true };
      nodes = [...nodes, edge];
      connections = [...connections.filter((x) => x.id !== c.id), first, second];
    }
  }
  return { ...plan, nodes, connections };
}
