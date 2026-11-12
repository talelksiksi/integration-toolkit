/**
 * templates.js - ready-made scenarios. Each one is realistic and has a few
 * weak spots on purpose, so the review has something to show.
 */

const N = (id, type, name, x, y) => ({ id, type, name, x, y });
const C = (id, from, to, protocol, data, frequency, opts = {}) => ({
  id, from, to, protocol, data, frequency,
  mode: opts.mode || (['rest', 'modbus', 's7', 'sql', 'sftp'].includes(protocol) ? 'poll' : 'push'),
  buffered: !!opts.buffered, alerts: !!opts.alerts, auth: opts.auth !== false,
});

export const TEMPLATES = {
  warehouse: {
    nameKey: 'scWarehouse',
    icon: 'wms',
    build: (L) => ({
      nodes: [
        N('n1', 'shop', L('Webshop', 'Site e-commerce'), 30, 200),
        N('n2', 'erp', 'ERP (SAP)', 280, 200),
        N('n3', 'wms', 'WMS', 560, 200),
        N('n4', 'controller', L('Conveyor controller', 'Contrôleur convoyeurs'), 830, 60),
        N('n5', 'plc', L('Sorter PLC', 'Automate trieur'), 1090, 60),
        N('n6', 'carrier', L('Carrier API', 'API transporteur'), 830, 340),
        N('n7', 'database', L('Reporting DB', 'Base reporting'), 280, 420),
        N('n8', 'dashboard', L('Management dashboard', 'Tableau de bord direction'), 560, 420),
      ],
      connections: [
        C('c1', 'n1', 'n2', 'rest', 'orders', 'm15', { buffered: true, alerts: true }),
        C('c2', 'n2', 'n3', 'idoc', 'orders', 'event'),
        C('c3', 'n3', 'n2', 'idoc', 'confirmations', 'event'),
        C('c4', 'n3', 'n4', 'socket', 'commands', 'event', { buffered: true, alerts: true }),
        C('c5', 'n4', 'n5', 'socket', 'commands', 'event', { buffered: true, alerts: true }),
        C('c6', 'n3', 'n6', 'rest', 'shipments', 'event', { mode: 'push', auth: false }),
        C('c7', 'n2', 'n7', 'sql', 'stock', 'h1', { buffered: true }),
        C('c8', 'n7', 'n8', 'sql', 'reports', 'm1'),
      ],
    }),
  },
  plant: {
    nameKey: 'scPlant',
    icon: 'plc',
    build: (L) => ({
      nodes: [
        N('n1', 'plc', L('Line 1 PLC', 'Automate ligne 1'), 30, 40),
        N('n2', 'plc', L('Line 2 PLC', 'Automate ligne 2'), 30, 220),
        N('n3', 'scada', 'SCADA', 30, 400),
        N('n4', 'edge', L('Edge collector', 'Collecteur edge'), 300, 220),
        N('n5', 'database', L('Historian (PostgreSQL)', 'Historien (PostgreSQL)'), 560, 220),
        N('n6', 'dashboard', L('Live dashboard', 'Tableau de bord'), 830, 40),
        N('n7', 'erp', 'ERP', 830, 220),
        N('n8', 'email', L('Daily report', 'Rapport quotidien'), 830, 400),
      ],
      connections: [
        C('c1', 'n1', 'n4', 'opcua', 'telemetry', 'event'),
        C('c2', 'n2', 'n4', 'modbus', 'telemetry', 's1'),
        C('c3', 'n3', 'n4', 'opcua', 'alarms', 'event'),
        C('c4', 'n4', 'n5', 'sql', 'telemetry', 's5', { mode: 'push' }),
        C('c5', 'n5', 'n6', 'sql', 'telemetry', 's5'),
        C('c6', 'n5', 'n7', 'sql', 'reports', 'nightly', { buffered: true }),
        C('c7', 'n5', 'n8', 'email', 'reports', 'nightly'),
        C('c8', 'n1', 'n7', 'rest', 'telemetry', 'm15', { mode: 'push' }),
      ],
    }),
  },
  asrs: {
    nameKey: 'scAsrs',
    icon: 'controller',
    build: (L) => ({
      nodes: [
        N('n1', 'erp', 'ERP', 30, 80),
        N('n2', 'wms', 'WMS', 280, 80),
        N('n3', 'controller', L('Storage controller', 'Contrôleur de stockage'), 540, 230),
        N('n4', 'plc', L('Storage PLC', 'Automate stockeur'), 810, 80),
        N('n5', 'plc', L('Conveyor PLC', 'Automate convoyeur'), 810, 390),
        N('n6', 'dashboard', L('Operator screen', 'Écran opérateur'), 540, 430),
        N('n7', 'database', L('Movements DB', 'Base mouvements'), 280, 390),
      ],
      connections: [
        C('c1', 'n1', 'n2', 'idoc', 'orders', 'event', { buffered: true, alerts: true }),
        C('c2', 'n2', 'n3', 'rest', 'orders', 'event', { mode: 'push' }),
        C('c3', 'n3', 'n2', 'rest', 'confirmations', 'event', { mode: 'push' }),
        C('c4', 'n3', 'n4', 'socket', 'commands', 'event', { buffered: true, alerts: true }),
        C('c5', 'n4', 'n3', 'socket', 'telemetry', 'event'),
        C('c6', 'n3', 'n5', 'opcua', 'commands', 'event', { buffered: true }),
        C('c7', 'n3', 'n6', 'webhook', 'telemetry', 'event'),
        C('c8', 'n3', 'n7', 'sql', 'telemetry', 's5', { mode: 'push' }),
        C('c9', 'n2', 'n1', 'idoc', 'stock', 'h1'),
      ],
    }),
  },
};
