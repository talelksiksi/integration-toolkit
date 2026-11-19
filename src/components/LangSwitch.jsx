import React from 'react';

const NAMES = { en: 'EN', fr: 'FR', ar: 'عربي' };

/** EN / FR / عربي, the same three languages as the rest of cictnardc.net. */
export default function LangSwitch({ lang, setLang }) {
  return (
    <span className="lang-switch" role="group" aria-label="Language">
      {Object.keys(NAMES).map((l) => (
        <button key={l} type="button" aria-pressed={lang === l} lang={l} onClick={() => setLang(l)}>{NAMES[l]}</button>
      ))}
    </span>
  );
}
