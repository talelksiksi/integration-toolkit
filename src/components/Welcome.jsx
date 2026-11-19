/** Welcome.jsx - what this is, why it matters, and where to start. */

import React from 'react';
import { TEMPLATES } from '../model/templates';
import { SystemIcon, UiIcon } from './Icons';
import BrandLogo from '../BrandLogo';
import LangSwitch from './LangSwitch';

export default function Welcome({ t, onTemplate, onBlank, shared, onShared, saved, onSaved, canClose, onClose, lang, setLang }) {
  return (
    <div className="welcome-wrap">
      <section className="welcome" role="dialog" aria-label={t('appName')}>
        <div className="welcome-top">
          <span className="brand"><BrandLogo className="mark" /><span className="brand-text"><b>{t('appName')}</b><small>{t('appTag')}</small></span></span>
          <div className="welcome-tools">
            <LangSwitch lang={lang} setLang={setLang} />
            {canClose && <button type="button" className="btn icon small" onClick={onClose} aria-label={t('close')}><UiIcon id="x" /></button>}
          </div>
        </div>
        <p className="kicker">{t('welcomeKicker')}</p>
        <h1>{t('welcomeTitle')}</h1>
        <p className="lead">{t('welcomeLead')}</p>
        <ol className="how">
          {[1, 2, 3].map((i) => (
            <li key={i}><span className="how-n">{i}</span><div><b>{t(`how${i}t`)}</b><span>{t(`how${i}`)}</span></div></li>
          ))}
        </ol>
        {shared && (
          <button type="button" className="btn primary wide" onClick={onShared}><UiIcon id="link" />{t('openLink')}: {shared.name}</button>
        )}
        <h2>{t('pickScenario')}</h2>
        <div className="scenarios">
          {Object.entries(TEMPLATES).map(([key, tpl]) => (
            <button key={key} type="button" className="scenario" onClick={() => onTemplate(key)}>
              <span className="scenario-icon"><SystemIcon id={tpl.icon} /></span>
              <b>{t(tpl.nameKey)}</b>
              <small>{t(tpl.nameKey + 'D')}</small>
              <span className="go">{'→'}</span>
            </button>
          ))}
        </div>
        <div className="welcome-foot">
          <button type="button" className="btn" onClick={onBlank}><UiIcon id="plus" />{t('startBlank')}</button>
          {saved && <button type="button" className="btn" onClick={onSaved}><UiIcon id="reset" />{saved.name}</button>}
          <p className="muted small">{t('simulatedNote')}</p>
        </div>
      </section>
    </div>
  );
}
