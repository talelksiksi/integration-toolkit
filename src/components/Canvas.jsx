/**
 * Canvas.jsx - systems as cards, links as curves, traffic as moving dots.
 * Pointer events throughout, so mouse, pen and touch all work.
 */

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { SYSTEMS, LAYERS, DATA } from '../model/catalog';
import { SystemIcon, UiIcon } from './Icons';

export const NODE_W = 172;
export const NODE_H = 68;

function geometry(c, byId, connections) {
  const a = byId[c.from];
  const b = byId[c.to];
  const twin = connections.some((d) => d.from === c.to && d.to === c.from);
  const off = twin ? (c.from < c.to ? -14 : 14) : 0;
  const lt = twin ? (c.from < c.to ? 0.4 : 0.6) : 0.5;
  // Forward: right side to left side.
  if (b.x >= a.x + NODE_W + 24) {
    const sx = a.x + NODE_W; const sy = a.y + NODE_H / 2 + off;
    const ex = b.x; const ey = b.y + NODE_H / 2 + off;
    const dx = Math.max(40, (ex - sx) * 0.5);
    return { sx, sy, c1x: sx + dx, c1y: sy, c2x: ex - dx, c2y: ey, ex, ey, lt };
  }
  // Backward: left side to right side, so return flows read as a parallel line.
  if (b.x + NODE_W + 24 <= a.x) {
    const sx = a.x; const sy = a.y + NODE_H / 2 + off;
    const ex = b.x + NODE_W; const ey = b.y + NODE_H / 2 + off;
    const dx = Math.max(40, (sx - ex) * 0.5);
    return { sx, sy, c1x: sx - dx, c1y: sy, c2x: ex + dx, c2y: ey, ex, ey, lt };
  }
  // Stacked: bottom to top (or top to bottom).
  const down = b.y >= a.y;
  const sx = a.x + NODE_W / 2 + off; const ex = b.x + NODE_W / 2 + off;
  const sy = down ? a.y + NODE_H : a.y; const ey = down ? b.y : b.y + NODE_H;
  const dy = Math.max(30, Math.abs(ey - sy) * 0.5) * (down ? 1 : -1);
  return { sx, sy, c1x: sx, c1y: sy + dy, c2x: ex, c2y: ey - dy, ex, ey, lt };
}
function pointAt(g, t) {
  const u = 1 - t;
  return {
    x: u * u * u * g.sx + 3 * u * u * t * g.c1x + 3 * u * t * t * g.c2x + t * t * t * g.ex,
    y: u * u * u * g.sy + 3 * u * u * t * g.c1y + 3 * u * t * t * g.c2y + t * t * t * g.ey,
  };
}
const pathOf = (g) => `M${g.sx},${g.sy} C${g.c1x},${g.c1y} ${g.c2x},${g.c2y} ${g.ex},${g.ey}`;

export default function Canvas({
  t, plan, byId, selection, setSelection, connecting, setConnecting, connect,
  updateNode, addNode, offline, down, stats, packets, running,
}) {
  const scroller = useRef(null);
  const world = useRef(null);
  const drag = useRef(null);
  const [box, setBox] = useState({ w: 1000, h: 600 });
  const [zoom, setZoom] = useState(null); // null = fit
  const [ghost, setGhost] = useState(null);
  const [, setFrame] = useState(0);

  const size = useMemo(() => {
    const maxX = plan.nodes.reduce((m, n) => Math.max(m, n.x + NODE_W), 0);
    const maxY = plan.nodes.reduce((m, n) => Math.max(m, n.y + NODE_H), 0);
    return { w: Math.max(900, maxX + 60), h: Math.max(480, maxY + 70) };
  }, [plan.nodes]);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setBox({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const minFit = box.w < 700 ? 0.42 : 0.5;
  const fit = Math.max(minFit, Math.min(1.15, (box.w - 16) / size.w, (box.h - 16) / size.h));
  const scale = zoom ?? fit;

  const toWorld = useCallback((e) => {
    const r = world.current.getBoundingClientRect();
    return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
  }, [scale]);

  // Traffic animation.
  useEffect(() => {
    if (!running && packets.current.length === 0) return undefined;
    let raf;
    let last = performance.now();
    const step = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      packets.current = packets.current.filter((p) => (p.t += dt / 1.25) < 1);
      setFrame((f) => (f + 1) % 1e6);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [running, packets]);

  // ---------------------------------------------------------- pointer
  const onNodeDown = (e, n) => {
    if (e.button !== undefined && e.button !== 0) return;
    if (e.target.closest('.port')) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { id: n.id, x0: e.clientX, y0: e.clientY, nx: n.x, ny: n.y, moved: false };
  };
  const onNodeMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.x0) / scale;
    const dy = (e.clientY - d.y0) / scale;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    d.moved = true;
    updateNode(d.id, { x: Math.max(0, Math.round(d.nx + dx)), y: Math.max(0, Math.round(d.ny + dy)) });
  };
  const onNodeUp = (e, n) => {
    if (e.target.closest('.port')) return;
    const d = drag.current;
    drag.current = null;
    if (d && d.moved) return;
    if (connecting && connecting !== n.id) connect(connecting, n.id);
    else if (connecting === n.id) setConnecting(null);
    else setSelection({ kind: 'node', id: n.id });
  };

  const onPortDown = (e, n) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    if (connecting && connecting !== n.id) { connect(connecting, n.id); return; }
    setConnecting(n.id);
    drag.current = { port: n.id, x0: e.clientX, y0: e.clientY, moved: false };
    setGhost(toWorld(e));
  };
  const onWorldMove = (e) => {
    if (connecting) setGhost(toWorld(e));
    const d = drag.current;
    if (d && d.port && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) > 6) d.moved = true;
  };
  const onPortUp = (e) => {
    e.stopPropagation();
    const d = drag.current;
    drag.current = null;
    if (!d || !d.port || !d.moved) return; // a click: stay in connect mode, tap the target next
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const target = el && el.closest('[data-node]');
    if (target && target.dataset.node !== d.port) connect(d.port, target.dataset.node);
  };

  const onBackground = (e) => {
    if (e.target === e.currentTarget || e.target.classList.contains('edges')) {
      if (connecting) setConnecting(null); else setSelection(null);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('text/plain');
    if (!SYSTEMS[type]) return;
    const p = toWorld(e);
    addNode(type, { x: Math.round(p.x - NODE_W / 2), y: Math.round(p.y - NODE_H / 2) });
  };

  // ---------------------------------------------------------- render
  const conns = plan.connections.filter((c) => byId[c.from] && byId[c.to]);
  const geo = Object.fromEntries(conns.map((c) => [c.id, geometry(c, byId, plan.connections)]));
  const selC = selection?.kind === 'conn' ? selection.id : null;
  const selN = selection?.kind === 'node' ? selection.id : null;

  return (
    <div className="canvas-scroller" ref={scroller} dir="ltr">
      <div className="world-size" style={{ width: size.w * scale, height: size.h * scale }}>
        <div
          className={`world ${connecting ? 'is-connecting' : ''}`} ref={world}
          style={{ width: size.w, height: size.h, transform: `scale(${scale})` }}
          onPointerMove={onWorldMove} onPointerDown={onBackground}
          onDragOver={(e) => e.preventDefault()} onDrop={onDrop}
        >
          <svg className="edges" width={size.w} height={size.h}>
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0 0L10 5L0 10z" className="arrow" />
              </marker>
              <marker id="arrow-sel" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0 0L10 5L0 10z" className="arrow sel" />
              </marker>
            </defs>
            {conns.map((c) => {
              const g = geo[c.id];
              const isDown = down[c.id] || offline[c.to];
              const cls = ['edge', selC === c.id && 'sel', isDown && 'down', c.buffered && 'buffered', DATA[c.data]?.critical && 'critical'].filter(Boolean).join(' ');
              return (
                <g key={c.id} className={cls}>
                  <path d={pathOf(g)} className="edge-line" markerEnd={`url(#${selC === c.id ? 'arrow-sel' : 'arrow'})`} />
                  <path d={pathOf(g)} className="edge-hit" onPointerDown={(e) => { e.stopPropagation(); setSelection({ kind: 'conn', id: c.id }); }} />
                </g>
              );
            })}
            {connecting && ghost && byId[connecting] && (
              <path className="edge-ghost" d={pathOf({
                sx: byId[connecting].x + NODE_W, sy: byId[connecting].y + NODE_H / 2,
                c1x: byId[connecting].x + NODE_W + 60, c1y: byId[connecting].y + NODE_H / 2,
                c2x: ghost.x - 60, c2y: ghost.y, ex: ghost.x, ey: ghost.y,
              })} />
            )}
            {packets.current.map((p) => {
              const g = geo[p.conn];
              if (!g) return null;
              const stop = p.kind === 'lost' || p.kind === 'held';
              const tt = stop ? Math.min(p.t, 0.46) : p.t;
              const pt = pointAt(g, tt);
              const fade = stop && p.t > 0.46 ? Math.max(0, 1 - (p.t - 0.46) * 1.9) : 1;
              if (p.kind === 'lost' && p.t > 0.46) {
                return <g key={p.id} transform={`translate(${pt.x},${pt.y})`} opacity={fade} className="pkt-x"><path d="M-5,-5L5,5M5,-5L-5,5" /></g>;
              }
              return <circle key={p.id} cx={pt.x} cy={pt.y} r={p.kind === 'drain' ? 5.5 : 4.5} className={`pkt ${p.kind}`} opacity={fade} />;
            })}
          </svg>

          {conns.map((c) => {
            const g = geo[c.id];
            const m = pointAt(g, g.lt);
            const s = stats[c.id];
            const isDown = down[c.id] || offline[c.to];
            return (
              <button
                key={c.id} type="button" className={`edge-label ${selC === c.id ? 'sel' : ''} ${isDown ? 'down' : ''}`}
                style={{ left: m.x, top: m.y }} onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setSelection({ kind: 'conn', id: c.id })}
                title={`${t('d_' + c.data)} · ${t('p_' + c.protocol)}`}
              >
                {down[c.id] && <UiIcon id="cut" className="ui-icon tiny" />}
                <span>{t('p_' + c.protocol)}</span>
                {s && s.q > 0 && <span className="badge held">{s.q}</span>}
                {s && s.l > 0 && <span className="badge lost">{s.l}</span>}
              </button>
            );
          })}

          {plan.nodes.map((n) => {
            const meta = SYSTEMS[n.type];
            const cls = ['node', selN === n.id && 'sel', offline[n.id] && 'off', connecting === n.id && 'source', connecting && connecting !== n.id && 'target'].filter(Boolean).join(' ');
            return (
              <div
                key={n.id} data-node={n.id} className={cls}
                style={{ left: n.x, top: n.y, width: NODE_W, height: NODE_H, '--c': LAYERS[meta.layer].color }}
                onPointerDown={(e) => onNodeDown(e, n)} onPointerMove={onNodeMove} onPointerUp={(e) => onNodeUp(e, n)}
                role="button" tabIndex={0} aria-label={n.name}
                onKeyDown={(e) => { if (e.key === 'Enter') setSelection({ kind: 'node', id: n.id }); }}
              >
                <span className="node-icon"><SystemIcon id={meta.icon} /></span>
                <span className="node-text" dir="auto"><b dir="auto">{n.name}</b><small dir="auto">{offline[n.id] ? t('offline') : t('sys_' + n.type)}</small></span>
                {offline[n.id] && <span className="node-off"><UiIcon id="power" className="ui-icon tiny" /></span>}
                <span className="port in" aria-hidden="true" />
                <span className="port out" title={t('connectFrom')} onPointerDown={(e) => onPortDown(e, n)} onPointerUp={onPortUp} />
              </div>
            );
          })}
        </div>
      </div>

      {plan.connections.length > 0 && (
        <div className="legend" aria-hidden="true">
          <span className="l-safe"><i />{t('legendSafe')}</span>
          <span className="l-direct"><i />{t('legendDirect')}</span>
          <span className="l-cut"><i />{t('legendCut')}</span>
        </div>
      )}

      {plan.nodes.length === 0 && (
        <div className="empty-hint">{t('overviewEmpty')}</div>
      )}

      <div className="zoom">
        <button type="button" className="btn icon small" onClick={() => setZoom(Math.min(1.6, scale + 0.15))} aria-label="Zoom in"><UiIcon id="zoomIn" /></button>
        <button type="button" className="btn icon small" onClick={() => setZoom(Math.max(0.3, scale - 0.15))} aria-label="Zoom out"><UiIcon id="zoomOut" /></button>
        <button type="button" className="btn icon small" onClick={() => setZoom(null)} aria-label="Fit"><UiIcon id="fit" /></button>
      </div>
    </div>
  );
}
