/** ReviewPanel.jsx - the integration review with one-click fixes. */

import React from 'react';
import { UiIcon } from './Icons';

const SEV_ICON = { critical: 'warn', warning: 'warn', info: 'info', good: 'check' };

export default function ReviewPanel({ t, rev, onFix, onFixAll, onClose }) {
  const fixable = rev.findings.filter((f) => f.fix && !f.fix.removeNode && !f.fix.removeConn).length;
  const words = (f) => {
    const p = { ...f.params };
    if (p.data) p.data = t('d_' + p.data);
    if (p.freq) p.freq = t('f_' + p.freq);
    return p;
  };
  return (
    <div className="drawer-wrap" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="drawer" role="dialog" aria-label={t('reviewTitle')}>
        <header className="drawer-head">
          <h2>{t('reviewTitle')}</h2>
          <button type="button" className="btn icon small" onClick={onClose} aria-label={t('close')}><UiIcon id="x" /></button>
        </header>
        <div className="drawer-body">
          {rev.score == null ? <p className="muted">{t('reviewEmpty')}</p> : (
            <>
              <div className="score-row">
                <span className={`ring big ${rev.score >= 90 ? 'good' : rev.score >= 70 ? 'ok' : rev.score >= 45 ? 'risky' : 'bad'}`} style={{ '--p': rev.score }}>
                  <b>{rev.score}</b><small>/100</small>
                </span>
                <div>
                  <b className="grade">{t('grade', rev.score)}</b>
                  <p className="muted">{t('reviewIntro')}</p>
                  {fixable > 1 && <button type="button" className="btn primary" onClick={onFixAll}><UiIcon id="check" />{t('fixAll')} ({fixable})</button>}
                </div>
              </div>
              <ul className="findings">
                {rev.findings.map((f) => (
                  <li key={f.id} className={`finding ${f.severity}`}>
                    <span className="sev"><UiIcon id={SEV_ICON[f.severity]} className="ui-icon tiny" />{t('sev_' + f.severity)}</span>
                    <b>{t('f_' + f.key, words(f))}</b>
                    <p>{t('f_' + f.key + 'D')}</p>
                    {f.fix && <button type="button" className="btn small" onClick={() => onFix(f.fix)}><UiIcon id="check" />{t('fix')}</button>}
                  </li>
                ))}
                {rev.good.map((g) => (
                  <li key={g.id} className="finding good">
                    <span className="sev"><UiIcon id="check" className="ui-icon tiny" />{t('sev_good')}</span>
                    <b>{t(g.key, g.n)}</b>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
