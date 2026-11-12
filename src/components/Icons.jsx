/**
 * Icons.jsx - line icons in the cictnardc.net style (24px grid, 1.8 stroke).
 */

import React from 'react';

const SYS = {
  erp: (<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M8 9v11M12 13h5M12 16h5" /></>),
  wms: (<><path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" /><path d="M3 8l9 5 9-5M12 13v8" /></>),
  mes: (<><path d="M3 20V10l5 3V10l5 3V6l8 4v10z" /><path d="M7 17h2M12 17h2M17 17h2" /></>),
  shop: (<><path d="M4 7h16l-1.5 8.5a2 2 0 0 1-2 1.5h-9a2 2 0 0 1-2-1.5z" /><path d="M8 7a4 4 0 0 1 8 0" /><circle cx="9" cy="20.5" r="1" /><circle cx="16" cy="20.5" r="1" /></>),
  plc: (<><rect x="6" y="6" width="12" height="12" rx="2" /><rect x="10" y="10" width="4" height="4" rx="0.5" /><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" /></>),
  scada: (<><rect x="2.5" y="4" width="19" height="13" rx="2" /><path d="M6 13l3-3 3 2 5-5M9 21h6M12 17v4" /></>),
  controller: (<><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M3 15h18M9 3v18M15 3v18" /></>),
  edge: (<><rect x="4" y="9" width="16" height="10" rx="2" /><path d="M8 9V6M12 9V4M16 9V6M8 14h.01M12 14h4" /></>),
  middleware: (<><path d="M4 7h6l4 10h6" /><path d="M4 17h6l4-10h6" /><circle cx="4" cy="7" r="1.5" /><circle cx="4" cy="17" r="1.5" /><circle cx="20" cy="7" r="1.5" /><circle cx="20" cy="17" r="1.5" /></>),
  broker: (<><path d="M3 6h12M12 3l3 3-3 3" /><path d="M3 12h18" /><path d="M3 18h12M12 15l3 3-3 3" /></>),
  database: (<><ellipse cx="12" cy="5.5" rx="7.5" ry="2.8" /><path d="M4.5 5.5v6.5c0 1.6 3.4 2.8 7.5 2.8s7.5-1.2 7.5-2.8V5.5" /><path d="M4.5 12v6.5c0 1.6 3.4 2.8 7.5 2.8s7.5-1.2 7.5-2.8V12" /></>),
  dashboard: (<><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 16v-4M11 16V8M15 16v-6M19 16v-2" /></>),
  carrier: (<><path d="M2 6h11v10H2zM13 10h4l3 3v3h-7z" /><circle cx="6" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></>),
  file: (<><path d="M6 2h9l5 5v15H6z" /><path d="M14 2v6h6M9 13h6M9 17h6" /></>),
  email: (<><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3.5 6.5l8.5 6.5 8.5-6.5" /></>),
};

const UI = {
  play: <path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none" />,
  pause: (<><rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none" /><rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none" /></>),
  review: (<><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></>),
  export: (<><path d="M12 3v12M7 10l5 5 5-5" /><path d="M4 17v3h16v-3" /></>),
  share: (<><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4" /></>),
  help: (<><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 0 1 5 .5c0 1.7-2.5 2-2.5 3.5M12 17h.01" /></>),
  plus: <path d="M12 5v14M5 12h14" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  cut: (<><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M8.6 7.5L20 18M8.6 16.5L20 6" /></>),
  link: (<><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>),
  power: (<><path d="M12 3v8" /><path d="M6.3 7.3a8 8 0 1 0 11.4 0" /></>),
  grid: (<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>),
  zoomIn: (<><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4M8 11h6M11 8v6" /></>),
  zoomOut: (<><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4M8 11h6" /></>),
  fit: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  send: (<><path d="M21 3L3 10.5l7.5 3L21 3zM10.5 13.5L13 21l8-18" /></>),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  warn: (<><path d="M12 3l9.5 17h-19z" /><path d="M12 10v4M12 17h.01" /></>),
  info: (<><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5h.01" /></>),
  trash: (<><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></>),
  reset: (<><path d="M4 4v6h6" /><path d="M5.5 15a7 7 0 1 0 1.6-7.4L4 10" /></>),
  print: (<><path d="M7 9V3h10v6M7 17H4v-7h16v7h-3" /><rect x="7" y="14" width="10" height="7" /></>),
  copy: (<><rect x="8" y="8" width="13" height="13" rx="2" /><path d="M16 8V4H3v13h5" /></>),
};

function Svg({ children, className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

export function SystemIcon({ id, className = 'system-icon' }) {
  return <Svg className={className}>{SYS[id] || SYS.middleware}</Svg>;
}

export function UiIcon({ id, className = 'ui-icon' }) {
  return <Svg className={className}>{UI[id] || UI.info}</Svg>;
}
