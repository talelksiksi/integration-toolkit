/** Inspector.jsx - details of the selection, or the plan overview with business impact. */

import React from 'react';
import { SYSTEMS, PROTOCOLS, DATA, FREQ_ORDER, LAYERS } from '../model/catalog';
import { SystemIcon, UiIcon } from './Icons';

function Toggle({ label, hint, checked, onChange }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-ui" aria-hidden="true" />
      <span className="toggle-text"><b>{label}</b><small>{hint}</small></span>
    </label>
  );
}

function Metrics({ t, s }) {
  return (
    <div className="metrics">
      <div className="metric ok"><b>{s.d}</b><span>{t('delivered')}</span></div>
      <div className="metric held"><b>{s.q}</b><span>{t('waiting')}</span></div>
      <div className="metric lost"><b>{s.l}</b><span>{t('lost')}</span></div>
    </div>
  );
}

export default function Inspector({
  t, plan, byId, selection, setSelection, updateNode, removeNode, updateConn, removeConn,
  offline, down, toggleOffline, toggleDown, stats, totals, rev, openReview, setConnecting, running, resetStats,
}) {
  const node = selection?.kind === 'node' ? byId[selection.id] : null;
  const conn = selection?.kind === 'conn' ? plan.connections.find((c) => c.id === selection.id) : null;
  const open = !!(node || conn);

  let body;
  if (node) {
    const meta = SYSTEMS[node.type];
    body = (
      <>
        <div className="insp-title" style={{ '--c': LAYERS[meta.layer].color }}>
          <span className="node-icon"><SystemIcon id={meta.icon} /></span>
          <div><small>{t('system')}</small><b>{node.name}</b></div>
        </div>
        <label className="field"><span>{t('name')}</span>
          <input value={node.name} onChange={(e) => updateNode(node.id, { name: e.target.value })} />
        </label>
        <label className="field"><span>{t('type')}</span>
          <select value={node.type} onChange={(e) => updateNode(node.id, { type: e.target.value })}>
            {Object.keys(SYSTEMS).map((k) => <option key={k} value={k}>{t('sys_' + k)}</option>)}
          </select>
          <small>{t('sysd_' + node.type)}</small>
        </label>
        <button type="button" className="btn wide" onClick={() => setConnecting(node.id)}><UiIcon id="link" />{t('connectFrom')}</button>
        <div className="danger-zone">
          <button type="button" className={`btn wide ${offline[node.id] ? 'restore' : 'cut'}`} onClick={() => toggleOffline(node.id)}>
            <UiIcon id="power" />{offline[node.id] ? t('bringOnline') : t('takeOffline')}
          </button>
          <small>{t('offlineHint')}</small>
        </div>
        <button type="button" className="btn wide subtle" onClick={() => removeNode(node.id)}><UiIcon id="trash" />{t('deleteSystem')}</button>
      </>
    );
  } else if (conn && byId[conn.from] && byId[conn.to]) {
    const a = byId[conn.from];
    const b = byId[conn.to];
    const s = { d: 0, q: 0, l: 0, ...stats[conn.id] };
    const protos = [...new Set([...SYSTEMS[a.type].protocols.filter((p) => SYSTEMS[b.type].protocols.includes(p)), ...SYSTEMS[b.type].protocols, ...SYSTEMS[a.type].protocols, ...Object.keys(PROTOCOLS)])];
    body = (
      <>
        <div className="insp-title link-title">
          <small>{t('link')}</small>
          <b>{a.name} <span className="arrow-r">{'→'}</span> {b.name}</b>
        </div>
        <label className="field"><span>{t('carries')}</span>
          <select value={conn.data} onChange={(e) => updateConn(conn.id, { data: e.target.value })}>
            {Object.keys(DATA).map((k) => <option key={k} value={k}>{t('d_' + k)}</option>)}
          </select>
        </label>
        <label className="field"><span>{t('protocol')}</span>
          <select value={conn.protocol} onChange={(e) => updateConn(conn.id, { protocol: e.target.value, mode: PROTOCOLS[e.target.value].pattern })}>
            {protos.map((k) => <option key={k} value={k}>{t('p_' + k)}</option>)}
          </select>
        </label>
        <div className="field"><span>{t('how')}</span>
          <div className="seg">
            {['push', 'poll'].map((m) => (
              <button key={m} type="button" className={conn.mode === m ? 'on' : ''} onClick={() => updateConn(conn.id, { mode: m, frequency: m === 'push' ? 'event' : conn.frequency === 'event' ? 'm1' : conn.frequency })}>{t('mode_' + m)}</button>
            ))}
          </div>
        </div>
        <label className="field"><span>{t('freq')}</span>
          <select value={conn.frequency} onChange={(e) => updateConn(conn.id, { frequency: e.target.value })}>
            {FREQ_ORDER.map((k) => <option key={k} value={k}>{t('f_' + k)}</option>)}
          </select>
        </label>
        <Toggle label={t('buffered')} hint={t('bufferedHint')} checked={!!conn.buffered} onChange={(v) => updateConn(conn.id, { buffered: v })} />
        <Toggle label={t('alerts')} hint={t('alertsHint')} checked={!!conn.alerts} onChange={(v) => updateConn(conn.id, { alerts: v })} />
        <Toggle label={t('auth')} hint={t('authHint')} checked={!!conn.auth} onChange={(v) => updateConn(conn.id, { auth: v })} />
        <div className="danger-zone">
          <button type="button" className={`btn wide ${down[conn.id] ? 'restore' : 'cut'}`} onClick={() => toggleDown(conn.id)}>
            <UiIcon id="cut" />{down[conn.id] ? t('restoreLink') : t('cutLink')}
          </button>
          <small>{t('cutHint')}</small>
          <Metrics t={t} s={s} />
        </div>
        <button type="button" className="btn wide subtle" onClick={() => removeConn(conn.id)}><UiIcon id="trash" />{t('deleteLink')}</button>
      </>
    );
  } else {
    const losses = plan.connections
      .map((c) => ({ c, s: stats[c.id] }))
      .filter(({ c, s }) => s && s.l > 0 && byId[c.to]);
    body = (
      <>
        <div className="insp-title"><div><small>{t('overview')}</small><b>{plan.name || t('untitled')}</b></div></div>
        <p className="muted">{plan.nodes.length} {t('systems')} · {plan.connections.length} {t('links')}</p>
        {plan.nodes.length === 0 ? <p className="muted">{t('overviewEmpty')}</p> : (
          <>
            <Metrics t={t} s={totals} />
            <h3 className="sub">{t('impactTitle')}</h3>
            {losses.length === 0 && totals.saved === 0 && <p className="muted">{t('impactNone')}</p>}
            <ul className="impact">
              {losses.map(({ c, s }) => (
                <li key={c.id}>
                  <button type="button" onClick={() => setSelection({ kind: 'conn', id: c.id })}>
                    <UiIcon id="warn" className="ui-icon tiny" />{t('impact_' + c.data, s.l, byId[c.to].name)}
                  </button>
                </li>
              ))}
              {totals.saved > 0 && <li className="saved"><UiIcon id="check" className="ui-icon tiny" />{t('savedTitle', totals.saved)}</li>}
            </ul>
            {(totals.d + totals.l + totals.q > 0) && !running && (
              <button type="button" className="btn small subtle" onClick={resetStats}><UiIcon id="reset" />{t('reset')}</button>
            )}
            {rev.score != null && (
              <button type="button" className="review-teaser" onClick={openReview}>
                <span className="ring" style={{ '--p': rev.score }}><b>{rev.score}</b></span>
                <span><b>{t('reviewTitle')}</b><small>{t('grade', rev.score)} · {rev.findings.length} {'→'}</small></span>
              </button>
            )}
          </>
        )}
      </>
    );
  }

  return (
    <aside className={`inspector ${open ? 'open' : ''}`} aria-label={t('overview')}>
      {open && (
        <button type="button" className="btn icon small insp-close" onClick={() => setSelection(null)} aria-label={t('close')}><UiIcon id="x" /></button>
      )}
      <div className="insp-body">{body}</div>
    </aside>
  );
}
