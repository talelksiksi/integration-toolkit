/** ExportModal.jsx - spec, starter code, and sending the plan to CICTNA RDC. */

import React, { useMemo, useState } from 'react';
import { buildSpec } from '../model/spec';
import { generateAll } from '../model/codegen';
import { UiIcon } from './Icons';

// Public Web3Forms access key: it can only deliver mail to CICTNA RDC's inbox.
const WEB3FORMS_KEY = '6ec4d65c-5286-4a3a-9db2-1b870d8a7333';

function download(name, text, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ExportModal({ t, lang, plan, rev, link, onClose }) {
  const [tab, setTab] = useState('spec');
  const spec = useMemo(() => buildSpec(plan, rev, t, lang, link), [plan, rev, t, lang, link]);
  const files = useMemo(() => generateAll(plan), [plan]);
  const [file, setFile] = useState(0);
  const [copied, setCopied] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', company: '', message: '' });
  const [status, setStatus] = useState(null);
  const slug = (plan.name || 'integration-plan').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const deps = [...new Set(files.flatMap((f) => f.deps))];

  const copy = async (text, key) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 1500); } catch (e) { /* ignore */ }
  };
  const print = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(spec.html); w.document.close(); w.focus();
    setTimeout(() => w.print(), 300);
  };
  const send = async () => {
    if (!form.name.trim() || !/^\S+@\S+\.\S+$/.test(form.email)) { setStatus({ kind: 'err', text: t('needNameEmail') }); return; }
    setStatus({ kind: 'busy', text: t('sending') });
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject: `[Integration Toolkit] ${plan.name} (score ${rev.score ?? '-'})`,
          from_name: `${form.name} via Integration Toolkit`,
          replyto: form.email,
          name: form.name, email: form.email, company: form.company,
          message: `${form.message}\n\nPlan: ${link}\n\n${spec.md}`.slice(0, 15000),
          botcheck: '',
        }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || out.success === false) throw new Error('send');
      setStatus({ kind: 'ok', text: t('sent') });
    } catch (e) {
      setStatus({ kind: 'err', text: t('sendFail') });
    }
  };

  const current = files[file];
  return (
    <div className="modal-wrap" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="modal wide" role="dialog" aria-label={t('exportTitle')}>
        <header className="modal-head">
          <h2>{t('exportTitle')}</h2>
          <button type="button" className="btn icon small" onClick={onClose} aria-label={t('close')}><UiIcon id="x" /></button>
        </header>
        <div className="tabs" role="tablist">
          {['spec', 'code', 'send'].map((k) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
              {t(k === 'spec' ? 'tabSpec' : k === 'code' ? 'tabCode' : 'tabSend')}
            </button>
          ))}
        </div>
        <div className="modal-body">
          {tab === 'spec' && (
            <>
              <p className="muted">{t('specIntro')}</p>
              <div className="row-actions">
                <button type="button" className="btn primary" onClick={() => download(`${slug}-spec.md`, spec.md, 'text/markdown')}><UiIcon id="export" />{t('download')} (.md)</button>
                <button type="button" className="btn" onClick={print}><UiIcon id="print" />{t('print')} / PDF</button>
                <button type="button" className="btn" onClick={() => copy(spec.md, 'spec')}><UiIcon id="copy" />{copied === 'spec' ? t('copied') : t('copy')}</button>
              </div>
              <iframe className="spec-frame" title={t('tabSpec')} srcDoc={spec.html} />
            </>
          )}
          {tab === 'code' && (
            files.length === 0 ? <p className="muted">{t('reviewEmpty')}</p> : (
              <>
                <p className="muted">{t('codeIntro')}</p>
                <div className="code-layout">
                  <ul className="file-list">
                    {files.map((f, i) => (
                      <li key={f.conn}><button type="button" className={i === file ? 'on' : ''} onClick={() => setFile(i)}>{f.file}</button></li>
                    ))}
                  </ul>
                  <div className="code-pane">
                    <div className="row-actions">
                      <code className="deps">{t('codeDeps')}: npm install {deps.join(' ') || '(no packages)'}</code>
                      <button type="button" className="btn small" onClick={() => copy(current.code, 'code')}><UiIcon id="copy" />{copied === 'code' ? t('copied') : t('copy')}</button>
                      <button type="button" className="btn small" onClick={() => download(current.file, current.code, 'text/javascript')}><UiIcon id="export" />{t('download')}</button>
                      <button type="button" className="btn small" onClick={() => download(`${slug}.json`, JSON.stringify(plan, null, 2), 'application/json')}>plan.json</button>
                    </div>
                    <pre className="code"><code>{current.code}</code></pre>
                  </div>
                </div>
              </>
            )
          )}
          {tab === 'send' && (
            <div className="send">
              <p>{t('sendIntro')}</p>
              <div className="form-grid">
                <input placeholder={t('yourName')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
                <input placeholder={t('yourEmail')} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
                <input className="full" placeholder={t('yourCompany')} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} autoComplete="organization" />
                <textarea className="full" rows={4} placeholder={t('yourMessage')} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
              </div>
              <div className="row-actions">
                <button type="button" className="btn primary" disabled={status?.kind === 'busy' || status?.kind === 'ok'} onClick={send}><UiIcon id="send" />{t('sendBtn')}</button>
                {status && <span className={`status ${status.kind}`}>{status.text}</span>}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
