/**
 * ConnectionModal.jsx
 *
 * Modal for configuring a connection between two nodes:
 * data type, direction, and update frequency.
 */

import React, { useState } from 'react';
import '../styles/ConnectionModal.css';

function ConnectionModal({ connection, nodes, onClose, onSave, onDelete }) {
  const [dataType, setDataType] = useState(connection.dataType || 'json');
  const [direction, setDirection] = useState(connection.direction || 'one-way');
  const [frequency, setFrequency] = useState(connection.frequency || 'real-time');

  const fromNode = nodes.find((n) => n.id === connection.from);
  const toNode = nodes.find((n) => n.id === connection.to);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Configure Connection</h2>
        <p className="connection-label">
          {fromNode?.system.name} → {toNode?.system.name}
        </p>

        <div className="form-group">
          <label>Data Type</label>
          <select value={dataType} onChange={(e) => setDataType(e.target.value)}>
            <option value="json">JSON</option>
            <option value="xml">XML</option>
            <option value="csv">CSV</option>
            <option value="binary">Binary</option>
          </select>
        </div>

        <div className="form-group">
          <label>Direction</label>
          <select value={direction} onChange={(e) => setDirection(e.target.value)}>
            <option value="one-way">One-Way</option>
            <option value="two-way">Two-Way</option>
          </select>
        </div>

        <div className="form-group">
          <label>Frequency</label>
          <select value={frequency} onChange={(e) => setFrequency(e.target.value)}>
            <option value="real-time">Real-Time</option>
            <option value="batch">Batch (hourly)</option>
            <option value="scheduled">Scheduled (daily)</option>
          </select>
        </div>

        <div className="modal-buttons">
          <button onClick={() => onDelete(connection.id)} className="btn-delete">Delete Connection</button>
          <div className="modal-buttons-right">
            <button onClick={onClose} className="btn-cancel">Cancel</button>
            <button onClick={() => onSave({ dataType, direction, frequency })} className="btn-save">Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConnectionModal;
