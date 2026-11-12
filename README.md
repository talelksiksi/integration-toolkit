# Integration Toolkit

An interactive integration planner by CICTNA RDC. Map how your systems exchange
data, stress-test the plan with simulated traffic and outages, get an instant
review with one-click fixes, then export a written spec and starter code, or
send the plan to CICTNA RDC.

**Live demo:** https://integration-toolkit-eight.vercel.app

## What a visitor does

1. **Map**: start from a real-world scenario (warehouse order flow, plant data
   to the boardroom, automated storage system) or an empty canvas. 15 system
   types: ERP, WMS, MES, webshop, PLC, SCADA, machine controller, edge gateway,
   integration layer, message broker, database, dashboard, carrier, file
   exchange, email.
2. **Stress-test**: press Run and watch messages flow. Cut a link or take a
   system offline: messages on links without store-and-forward are lost (red),
   buffered ones wait (orange) and are delivered when the link comes back. The
   overview translates losses into business impact ("9 orders never reached
   the WMS").
3. **Review and fix**: an automatic review scores the plan out of 100 and flags
   real-world risks (data lost on outage, slow sync of critical data, PLCs wired
   straight into business systems, silent failures, unauthenticated links to
   partners, two sources of truth, isolated systems). Each finding has a
   one-click fix, or apply them all.
4. **Export**: a written integration specification (Markdown download, or print
   to PDF), one Node.js starter service per link (real libraries: node-opcua,
   modbus-serial, nodes7, kafkajs, mqtt, pg, express, ssh2-sftp-client, with
   outbox, retries and alerting where the link asks for it), the plan as JSON,
   or a form that sends the plan to CICTNA RDC.

Also: every link's protocol, data, push/poll mode, frequency, store-and-forward,
alerting and authentication are editable; plans autosave in the browser and can
be shared as a link (`#plan=...`); English and French; works with mouse, touch
and keyboard (Delete, Escape, Space to run or pause).

## Run

```bash
npm install
npm start          # development
npm run build      # production build in ./build
```

Everything runs in the browser on simulated traffic. No backend.

## Code layout

```
src/model/catalog.js     system types, protocols, data kinds, frequencies
src/model/templates.js   the three scenarios
src/model/analysis.js    the review rules, score and one-click fixes
src/model/codegen.js     starter code per link
src/model/spec.js        the written specification (Markdown + HTML)
src/model/share.js       plans in the URL
src/i18n/strings.js      every visible word, EN + FR
src/components/          Canvas, Palette, Inspector, ReviewPanel, ExportModal, Welcome, HelpModal, Icons
```
