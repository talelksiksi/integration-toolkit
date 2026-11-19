/**
 * App.jsx - Integration Toolkit by CICTNA RDC.
 *
 * Map how systems exchange data, stress-test the plan with simulated
 * traffic and outages, get an automatic review with one-click fixes, and
 * export a spec, starter code or send the plan to CICTNA RDC.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { makeT, detectLang } from './i18n/strings';
import { TEMPLATES } from './model/templates';
import { review, applyFix } from './model/analysis';
import { FREQUENCIES, defaultConnection } from './model/catalog';
import { encodePlan, decodePlan } from './model/share';
import Canvas from './components/Canvas';
import Palette from './components/Palette';
import Inspector from './components/Inspector';
import ReviewPanel from './components/ReviewPanel';
import ExportModal from './components/ExportModal';
import Welcome from './components/Welcome';
import LangSwitch from './components/LangSwitch';
import HelpModal from './components/HelpModal';
import { UiIcon } from './components/Icons';
import BrandLogo from './BrandLogo';
import './App.css';

const EMPTY = { name: '', nodes: [], connections: [] };
const SAVE_KEY = 'it-plan-v1';

let seq = 1000;
const makeId = (prefix) => `${prefix}${(seq += 1).toString(36)}${Math.random().toString(36).slice(2, 5)}`;

function readHashPlan() {
  const m = window.location.hash.match(/plan=([A-Za-z0-9_-]+)/);
  return m ? decodePlan(m[1]) : null;
}
function readSaved() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    return s && s.nodes && s.nodes.length ? s : null;
  } catch (e) {
    return null;
  }
}

export default function App() {
  const [lang, setLang] = useState(detectLang);
  const t = useMemo(() => makeT(lang), [lang]);
  const [plan, setPlan] = useState(EMPTY);
  const [selection, setSelection] = useState(null); // { kind: 'node'|'conn', id }
  const [connecting, setConnecting] = useState(null); // node id
  const [offline, setOffline] = useState({}); // node id -> true
  const [down, setDown] = useState({}); // conn id -> true
  const [running, setRunning] = useState(false);
  const [stats, setStats] = useState({});
  const [panel, setPanel] = useState(null); // 'review' | 'export' | 'help' | 'palette'
  const [welcome, setWelcome] = useState(true);
  const [progress, setProgress] = useState({ ran: false, broke: false, reviewed: false });
  const [toast, setToast] = useState(null);
  const [railed, setRailed] = useState(() => window.innerWidth < 1600);
  const sharedPlan = useRef(readHashPlan());
  const savedPlan = useRef(readSaved());
  const packets = useRef([]);
  const acc = useRef({});

  // The language setting is shared with the rest of cictnardc.net, so only save it
  // when the visitor switches here; opening the app must not overwrite a choice
  // made elsewhere (for example Arabic, which this app does not offer).
  const langChosen = useRef(false);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    if (!langChosen.current) { langChosen.current = true; return; }
    try { localStorage.setItem('lang', lang); } catch (e) { /* ignore */ }
  }, [lang]);

  // Autosave the plan in this browser.
  useEffect(() => {
    if (!plan.nodes.length) return;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(plan)); } catch (e) { /* ignore */ }
  }, [plan]);

  const flash = useCallback((msg) => {
    setToast(msg);
    window.clearTimeout(flash.timer);
    flash.timer = window.setTimeout(() => setToast(null), 3200);
  }, []);

  const rev = useMemo(() => review(plan), [plan]);
  const byId = useMemo(() => Object.fromEntries(plan.nodes.map((n) => [n.id, n])), [plan.nodes]);

  // ---------------------------------------------------------- plan editing
  const resetSim = useCallback(() => {
    setStats({}); setOffline({}); setDown({});
    packets.current = []; acc.current = {};
  }, []);

  const loadPlan = useCallback((p) => {
    resetSim();
    setSelection(null); setConnecting(null);
    setPlan(p);
    setWelcome(false);
    setPanel(null);
  }, [resetSim]);

  const loadTemplate = useCallback((key) => {
    const tpl = TEMPLATES[key];
    const L = (en, fr, ar) => (lang === 'fr' ? fr : lang === 'ar' ? (ar || en) : en);
    loadPlan({ name: t(tpl.nameKey), ...tpl.build(L) });
    setProgress({ ran: false, broke: false, reviewed: false });
  }, [lang, t, loadPlan]);

  const addNode = useCallback((type, at) => {
    setPlan((p) => {
      const n = p.nodes.length;
      const pos = at || { x: 60 + (n % 5) * 250, y: 60 + Math.floor(n / 5) * 170 + (n % 2) * 40 };
      const node = { id: makeId('n'), type, name: t('sys_' + type), x: Math.max(0, pos.x), y: Math.max(0, pos.y) };
      setSelection({ kind: 'node', id: node.id });
      return { ...p, name: p.name || t('untitled'), nodes: [...p.nodes, node] };
    });
    setPanel((x) => (x === 'palette' ? null : x));
  }, [t]);

  const updateNode = useCallback((id, patch) => {
    setPlan((p) => ({ ...p, nodes: p.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) }));
  }, []);

  const removeNode = useCallback((id) => {
    setPlan((p) => ({ ...p, nodes: p.nodes.filter((n) => n.id !== id), connections: p.connections.filter((c) => c.from !== id && c.to !== id) }));
    setSelection(null);
  }, []);

  const connect = useCallback((from, to) => {
    setConnecting(null);
    if (from === to) return;
    setPlan((p) => {
      if (p.connections.some((c) => c.from === from && c.to === to)) return p;
      const a = p.nodes.find((n) => n.id === from);
      const b = p.nodes.find((n) => n.id === to);
      const conn = { id: makeId('c'), from, to, ...defaultConnection(a, b) };
      setSelection({ kind: 'conn', id: conn.id });
      return { ...p, connections: [...p.connections, conn] };
    });
  }, []);

  const updateConn = useCallback((id, patch) => {
    setPlan((p) => ({ ...p, connections: p.connections.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  }, []);

  const removeConn = useCallback((id) => {
    setPlan((p) => ({ ...p, connections: p.connections.filter((c) => c.id !== id) }));
    setSelection(null);
  }, []);

  const fix = useCallback((f) => {
    setPlan((p) => applyFix(p, f, makeId, t('sys_edge')));
  }, [t]);

  const fixAll = useCallback(() => {
    setPlan((p) => {
      let cur = p;
      for (let i = 0; i < 40; i += 1) {
        const next = review(cur).findings.find((f) => f.fix && !f.fix.removeNode && !f.fix.removeConn);
        if (!next) break;
        cur = applyFix(cur, next.fix, makeId, t('sys_edge'));
      }
      return cur;
    });
  }, [t]);

  const toggleOffline = useCallback((id) => {
    setOffline((o) => ({ ...o, [id]: !o[id] }));
    setProgress((p) => ({ ...p, broke: true }));
  }, []);
  const toggleDown = useCallback((id) => {
    setDown((d) => ({ ...d, [id]: !d[id] }));
    setProgress((p) => ({ ...p, broke: true }));
    if (!running) setRunning(true);
  }, [running]);

  // ---------------------------------------------------------- simulation
  useEffect(() => {
    if (!running) return undefined;
    setProgress((p) => (p.ran ? p : { ...p, ran: true }));
    const DT = 0.25;
    const timer = window.setInterval(() => {
      setStats((prev) => {
        const next = { ...prev };
        for (const c of plan.connections) {
          const a = byId[c.from];
          const b = byId[c.to];
          if (!a || !b) continue;
          const s = { d: 0, q: 0, l: 0, saved: 0, ...next[c.id] };
          const blocked = down[c.id] || offline[c.to];
          const rate = FREQUENCIES[c.frequency].perMin / 12; // messages per real second
          if (!offline[c.from]) {
            acc.current[c.id] = (acc.current[c.id] || 0) + rate * DT;
            while (acc.current[c.id] >= 1) {
              acc.current[c.id] -= 1;
              let kind = 'ok';
              if (blocked) {
                if (c.buffered) { s.q += 1; kind = 'held'; } else { s.l += 1; kind = 'lost'; }
              } else {
                s.d += 1;
              }
              if (packets.current.length < 140) packets.current.push({ id: Math.random(), conn: c.id, t: 0, kind });
            }
          }
          if (!blocked && s.q > 0) {
            const k = Math.min(s.q, Math.max(1, Math.round(rate * DT * 4)));
            s.q -= k; s.d += k; s.saved += k;
            if (packets.current.length < 140) packets.current.push({ id: Math.random(), conn: c.id, t: 0, kind: 'drain' });
          }
          next[c.id] = s;
        }
        return next;
      });
    }, DT * 1000);
    return () => window.clearInterval(timer);
  }, [running, plan.connections, byId, down, offline]);

  // ---------------------------------------------------------- keyboard
  useEffect(() => {
    const onKey = (e) => {
      const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '');
      if (e.key === 'Escape') {
        if (connecting) setConnecting(null);
        else if (panel) setPanel(null);
        else setSelection(null);
      }
      if (typing || welcome) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selection) {
        e.preventDefault();
        if (selection.kind === 'node') removeNode(selection.id); else removeConn(selection.id);
      }
      if (e.key === ' ' && plan.connections.length) { e.preventDefault(); setRunning((r) => !r); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [connecting, panel, selection, welcome, plan.connections.length, removeNode, removeConn]);

  // ---------------------------------------------------------- share
  const shareLink = useCallback(() => {
    const url = `${window.location.origin}${window.location.pathname}#plan=${encodePlan(plan)}`;
    return url;
  }, [plan]);
  const doShare = useCallback(async () => {
    const url = shareLink();
    window.history.replaceState(null, '', url);
    try {
      await navigator.clipboard.writeText(url);
      flash(t('linkCopied'));
    } catch (e) {
      window.prompt(t('linkCopyFail'), url);
    }
  }, [shareLink, flash, t]);

  const openReview = () => { setPanel('review'); setProgress((p) => ({ ...p, reviewed: true })); };

  // ---------------------------------------------------------- guide
  let guide = null;
  if (!plan.nodes.length || !plan.connections.length) guide = t('guideBuild');
  else if (!progress.ran) guide = t('guideRun');
  else if (!progress.broke) guide = t('guideCut');
  else if (!progress.reviewed) guide = t('guideReview');
  else guide = t('guideExport');

  const totals = Object.values(stats).reduce((s, x) => ({ d: s.d + x.d, q: s.q + x.q, l: s.l + x.l, saved: s.saved + x.saved }), { d: 0, q: 0, l: 0, saved: 0 });
  const scoreClass = rev.score == null ? '' : rev.score >= 90 ? 'good' : rev.score >= 70 ? 'ok' : rev.score >= 45 ? 'risky' : 'bad';

  return (
    <div className={`app ${railed ? 'railed' : ''}`}>
      <header className="topbar">
        <a className="brand" href="https://cictnardc.net" target="_blank" rel="noopener noreferrer" title="cictnardc.net">
          <BrandLogo className="mark" />
          <span className="brand-text"><b>{t('appName')}</b><small>{t('appTag')}</small></span>
        </a>
        <input className="plan-name" value={plan.name} placeholder={t('untitled')} aria-label={t('name')}
          onChange={(e) => setPlan((p) => ({ ...p, name: e.target.value }))} />
        <nav className="actions">
          <button type="button" className="btn ghost hide-sm" onClick={() => setWelcome(true)}><UiIcon id="grid" /><span>{t('scenarios')}</span></button>
          <button type="button" className={`btn run ${running ? 'on' : ''}`} disabled={!plan.connections.length} onClick={() => setRunning((r) => !r)}>
            <UiIcon id={running ? 'pause' : 'play'} /><span>{running ? t('pause') : t('run')}</span>
          </button>
          <button type="button" className="btn" disabled={!plan.connections.length} onClick={openReview}>
            <UiIcon id="review" /><span className="hide-xs">{t('review')}</span>
            {rev.score != null && <span className={`score-pill ${scoreClass}`}>{rev.score}</span>}
          </button>
          <button type="button" className="btn" disabled={!plan.nodes.length} onClick={() => setPanel('export')}><UiIcon id="export" /><span className="hide-xs">{t('export')}</span></button>
          <button type="button" className="btn icon hide-sm" disabled={!plan.nodes.length} onClick={doShare} title={t('share')} aria-label={t('share')}><UiIcon id="share" /></button>
          <button type="button" className="btn icon" onClick={() => setPanel('help')} title={t('help')} aria-label={t('help')}><UiIcon id="help" /></button>
          <LangSwitch lang={lang} setLang={setLang} />
        </nav>
      </header>

      <div className="workspace">
        <Palette t={t} onAdd={addNode} open={panel === 'palette'} onClose={() => setPanel(null)} collapsed={railed} onToggle={() => setRailed((r) => !r)} />
        <main className="stage">
          <Canvas
            t={t} plan={plan} byId={byId} selection={selection} setSelection={setSelection}
            connecting={connecting} setConnecting={setConnecting} connect={connect}
            updateNode={updateNode} addNode={addNode} offline={offline} down={down}
            stats={stats} packets={packets} running={running}
          />
          {guide && !welcome && (
            <div className="guide" role="status"><span className="guide-dot" />{guide}</div>
          )}
          {connecting && (
            <div className="connect-banner" role="status">
              {t('connectHint')}
              <button type="button" className="btn small" onClick={() => setConnecting(null)}>{t('cancel')}</button>
            </div>
          )}
          <button type="button" className="fab" onClick={() => setPanel('palette')}><UiIcon id="plus" />{t('addSystem')}</button>
        </main>
        <Inspector
          t={t} plan={plan} byId={byId} selection={selection} setSelection={setSelection}
          updateNode={updateNode} removeNode={removeNode} updateConn={updateConn} removeConn={removeConn}
          offline={offline} down={down} toggleOffline={toggleOffline} toggleDown={toggleDown}
          stats={stats} totals={totals} rev={rev} openReview={openReview} setConnecting={setConnecting}
          running={running} resetStats={() => { setStats({}); packets.current = []; }}
        />
      </div>

      {panel === 'review' && <ReviewPanel t={t} rev={rev} onFix={fix} onFixAll={fixAll} onClose={() => setPanel(null)} />}
      {panel === 'export' && <ExportModal t={t} lang={lang} plan={plan} rev={rev} link={shareLink()} onClose={() => setPanel(null)} />}
      {panel === 'help' && <HelpModal t={t} onClose={() => setPanel(null)} />}
      {welcome && (
        <Welcome
          t={t} onTemplate={loadTemplate} onBlank={() => { loadPlan({ ...EMPTY, name: t('untitled') }); }}
          shared={sharedPlan.current} onShared={() => loadPlan(sharedPlan.current)}
          saved={savedPlan.current} onSaved={() => loadPlan(savedPlan.current)}
          canClose={plan.nodes.length > 0} onClose={() => setWelcome(false)}
          lang={lang} setLang={setLang}
        />
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
