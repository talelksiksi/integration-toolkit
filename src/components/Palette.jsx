/** Palette.jsx - the systems you can add. A side list on desktop, a sheet on phones. */

import React from 'react';
import { PALETTE, LAYERS, SYSTEMS } from '../model/catalog';
import { SystemIcon, UiIcon } from './Icons';

export default function Palette({ t, onAdd, open, onClose, collapsed, onToggle }) {
  return (
    <aside className={`palette ${open ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`} aria-label={t('paletteTitle')}>
      <div className="palette-head">
        <div className="palette-titles">
          <h2>{t('paletteTitle')}</h2>
          <p>{t('paletteHint')}</p>
        </div>
        <button type="button" className="btn icon small rail-toggle" onClick={onToggle} aria-label={t('paletteTitle')} title={t('paletteTitle')}>
          <UiIcon id={collapsed ? 'plus' : 'x'} />
        </button>
        <button type="button" className="btn icon small sheet-close" onClick={onClose} aria-label={t('close')}><UiIcon id="x" /></button>
      </div>
      <div className="palette-body">
        {PALETTE.map(([layer, types]) => (
          <section key={layer}>
            <h3>{t('layer_' + layer)}</h3>
            {types.map((type) => (
              <button
                key={type} type="button" className="pal-item" draggable
                style={{ '--c': LAYERS[SYSTEMS[type].layer].color }}
                onDragStart={(e) => { e.dataTransfer.setData('text/plain', type); e.dataTransfer.effectAllowed = 'copy'; }}
                onClick={() => onAdd(type)} title={`${t('sys_' + type)}: ${t('sysd_' + type)}`}
              >
                <span className="pal-icon"><SystemIcon id={SYSTEMS[type].icon} /></span>
                <span className="pal-text"><b>{t('sys_' + type)}</b><small>{t('sysd_' + type)}</small></span>
                <UiIcon id="plus" className="ui-icon tiny pal-plus" />
              </button>
            ))}
          </section>
        ))}
      </div>
    </aside>
  );
}
