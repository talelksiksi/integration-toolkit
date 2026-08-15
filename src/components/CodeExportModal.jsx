/**
 * CodeExportModal.jsx
 *
 * Shows generated code for the current workflow (JavaScript, cURL, or Python)
 * and lets the user copy it to the clipboard.
 */

import React, { useState } from 'react';
import '../styles/CodeExportModal.css';

function generateCode(format, nodes, connections) {
  if (nodes.length === 0) {
    return '// Add some systems to the canvas and connect them to generate code.';
  }

  if (format === 'javascript') {
    let code = `// Generated Integration Workflow\n\nconst systems = {\n`;
    nodes.forEach((node) => {
      code += `  '${node.id}': { name: '${node.system.name}', type: '${node.system.id}' },\n`;
    });
    code += `};\n\nconst connections = [\n`;
    connections.forEach((conn) => {
      code += `  { from: '${conn.from}', to: '${conn.to}', dataType: '${conn.dataType || 'json'}', direction: '${conn.direction || 'one-way'}', frequency: '${conn.frequency || 'real-time'}' },\n`;
    });
    code += `];\n\n// TODO: Implement data flow between systems\n`;
    return code;
  }

  if (format === 'curl') {
    if (connections.length === 0) {
      return '# Add connections between systems to generate cURL commands.';
    }
    return connections
      .map((conn) => {
        const fromNode = nodes.find((n) => n.id === conn.from);
        const toNode = nodes.find((n) => n.id === conn.to);
        const dataType = conn.dataType || 'json';
        const contentType = { json: 'application/json', xml: 'application/xml', csv: 'text/csv', binary: 'application/octet-stream' }[dataType];
        return `# ${fromNode?.system.name} -> ${toNode?.system.name} (${conn.frequency || 'real-time'})\ncurl -X POST https://${toNode?.system.id}.example.com/ingest \\\n  -H "Content-Type: ${contentType}" \\\n  -d @${fromNode?.system.id}-payload.${dataType === 'json' ? 'json' : dataType}`;
      })
      .join('\n\n');
  }

  if (format === 'python') {
    let code = `# Generated Integration Workflow\nimport requests\n\nsystems = {\n`;
    nodes.forEach((node) => {
      code += `    "${node.id}": {"name": "${node.system.name}", "type": "${node.system.id}"},\n`;
    });
    code += `}\n\nconnections = [\n`;
    connections.forEach((conn) => {
      code += `    {"from": "${conn.from}", "to": "${conn.to}", "data_type": "${conn.dataType || 'json'}", "frequency": "${conn.frequency || 'real-time'}"},\n`;
    });
    code += `]\n\n# TODO: Implement data flow between systems\n`;
    return code;
  }

  return '';
}

function CodeExportModal({ nodes, connections, onClose }) {
  const [format, setFormat] = useState('javascript');
  const [copied, setCopied] = useState(false);

  const code = generateCode(format, nodes, connections);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('[CodeExportModal] Copy failed:', err);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content export-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Export Workflow</h2>

        <div className="export-tabs">
          {['javascript', 'curl', 'python'].map((f) => (
            <button
              key={f}
              className={`export-tab ${format === f ? 'active' : ''}`}
              onClick={() => setFormat(f)}
            >
              {f === 'javascript' ? 'JavaScript' : f === 'curl' ? 'cURL' : 'Python'}
            </button>
          ))}
        </div>

        <pre className="export-code">{code}</pre>

        <div className="modal-buttons">
          <span className="copy-status">{copied ? '✓ Copied!' : ''}</span>
          <div className="modal-buttons-right">
            <button onClick={onClose} className="btn-cancel">Close</button>
            <button onClick={handleCopy} className="btn-save">Copy to Clipboard</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CodeExportModal;
