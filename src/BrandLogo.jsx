/**
 * BrandLogo.jsx
 *
 * The CICTNA RDC mark - a sun rising over the sea, in a circle. Same artwork
 * as cictnardc.net (and public/favicon.svg), inlined so it needs no request.
 */

import React from 'react';

function BrandLogo({ className = 'mark', title }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title && <title>{title}</title>}
      <defs>
        <clipPath id="cictna-mark-clip">
          <circle cx="50" cy="50" r="50" />
        </clipPath>
      </defs>
      <g clipPath="url(#cictna-mark-clip)">
        <rect width="100" height="100" fill="#d6e2e5" />
        <circle cx="50" cy="54" r="25" fill="#e7a982" />
        <rect y="52" width="100" height="48" fill="#3d6d78" />
        <g stroke="#f1c09b" strokeLinecap="round" fill="none">
          <path d="M33 63h34" strokeWidth="3.6" />
          <path d="M39 71.5h22" strokeWidth="3.2" />
          <path d="M44.5 79.5h11" strokeWidth="2.8" />
        </g>
        <g stroke="#ffffff" strokeOpacity=".38" strokeLinecap="round" fill="none" strokeWidth="2.2">
          <path d="M75 66h13M12 74h11M70 85h9" />
        </g>
      </g>
    </svg>
  );
}

export default BrandLogo;
