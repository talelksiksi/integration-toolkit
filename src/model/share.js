/** share.js - put a whole plan in the URL so it can be sent as a link. */

export function encodePlan(plan) {
  const slim = {
    v: 1,
    name: plan.name,
    n: plan.nodes.map((n) => [n.id, n.type, n.name, Math.round(n.x), Math.round(n.y)]),
    c: plan.connections.map((c) => [c.id, c.from, c.to, c.protocol, c.data, c.frequency, c.mode, +c.buffered, +c.alerts, +c.auth]),
  };
  const json = JSON.stringify(slim);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodePlan(code) {
  try {
    const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(escape(atob(b64)));
    const s = JSON.parse(json);
    if (s.v !== 1) return null;
    return {
      name: s.name,
      nodes: s.n.map(([id, type, name, x, y]) => ({ id, type, name, x, y })),
      connections: s.c.map(([id, from, to, protocol, data, frequency, mode, b, a, au]) => ({
        id, from, to, protocol, data, frequency, mode, buffered: !!b, alerts: !!a, auth: !!au,
      })),
    };
  } catch (e) {
    return null;
  }
}
