/** HelpModal.jsx - short how-to. */

import React from 'react';
import { UiIcon } from './Icons';

export default function HelpModal({ t, onClose }) {
  return (
    <div className="modal-wrap" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="modal" role="dialog" aria-label={t('helpTitle')}>
        <header className="modal-head">
          <h2>{t('helpTitle')}</h2>
          <button type="button" className="btn icon small" onClick={onClose} aria-label={t('close')}><UiIcon id="x" /></button>
        </header>
        <div className="modal-body">
          <ol className="help-list">{[1, 2, 3, 4, 5, 6].map((i) => <li key={i}>{t('help' + i)}</li>)}</ol>
          <p className="muted small">{t('demoBy')} <a href="https://cictnardc.net" target="_blank" rel="noopener noreferrer">CICTNA RDC</a></p>
        </div>
      </section>
    </div>
  );
}
