/**
 * IntegrationBuilder.jsx
 *
 * Main component for the API Integration Toolkit.
 *
 * Features:
 * - Drag systems from palette to canvas
 * - Drag nodes on canvas to reposition
 * - Connect nodes by clicking output -> input points
 * - Configure connections (data type, direction, frequency)
 * - Animated data packets flowing along connections
 * - Export the workflow as JavaScript / cURL / Python
 * - Keyboard shortcuts (Delete, Escape, ?)
 */

import React, { useState, useEffect } from 'react';
import ConnectionModal from './ConnectionModal';
import CodeExportModal from './CodeExportModal';
import '../styles/IntegrationBuilder.css';

const NODE_WIDTH = 120;
const NODE_HEADER_CENTER_Y = 30;

function IntegrationBuilder() {
  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [drawingConnection, setDrawingConnection] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [showExport, setShowExport] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [animatingPackets, setAnimatingPackets] = useState([]);

  const systemTypes = [
    { id: 'wms', name: 'WMS', icon: '📦', color: '#2196F3', description: 'Warehouse Management System' },
    { id: 'plc', name: 'PLC', icon: '⚙️', color: '#4CAF50', description: 'Programmable Logic Controller' },
    { id: 'api', name: 'API', icon: '🔗', color: '#FF9800', description: 'REST/HTTP API' },
    { id: 'database', name: 'Database', icon: '💾', color: '#9C27B0', description: 'PostgreSQL / SQL Database' },
    { id: 'kafka', name: 'Kafka', icon: '📨', color: '#F44336', description: 'Message Stream / Kafka' },
    { id: 'rest', name: 'REST', icon: '🌐', color: '#00BCD4', description: 'REST Service' }
  ];

  // ============= PALETTE DRAG =============

  const handleDragStart = (e, system) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('system', JSON.stringify(system));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    e.currentTarget.classList.add('drag-over');
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('drag-over');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');

    const systemJson = e.dataTransfer.getData('system');
    if (!systemJson) return; // Not from palette

    const system = JSON.parse(systemJson);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newNode = { id: Date.now(), system, x, y };
    setNodes((prev) => [...prev, newNode]);
    console.log(`[IntegrationBuilder] Node created: ${system.name} at (${x}, ${y})`);
  };

  // ============= NODE REPOSITION DRAG =============

  const handleNodeMouseDown = (e, nodeId) => {
    if (e.target.closest('.node-delete') || e.target.closest('.point')) {
      return;
    }

    e.preventDefault();
    setDraggingNodeId(nodeId);
    setSelectedNodeId(nodeId);

    const node = nodes.find((n) => n.id === nodeId);
    const rect = e.currentTarget.getBoundingClientRect();

    setDragOffset({
      x: e.clientX - rect.left - node.x,
      y: e.clientY - rect.top - node.y
    });

    console.log(`[IntegrationBuilder] Started dragging node ${nodeId}`);
  };

  const handleCanvasMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });

    if (!draggingNodeId) return;

    const newX = e.clientX - rect.left - dragOffset.x;
    const newY = e.clientY - rect.top - dragOffset.y;

    setNodes((prev) =>
      prev.map((node) =>
        node.id === draggingNodeId
          ? { ...node, x: Math.max(0, newX), y: Math.max(0, newY) }
          : node
      )
    );
  };

  const handleCanvasMouseUp = () => {
    if (draggingNodeId) {
      console.log(`[IntegrationBuilder] Finished dragging node ${draggingNodeId}`);
      setDraggingNodeId(null);
    }
  };

  const handleCanvasClick = (e) => {
    // Clicking empty canvas clears selection / cancels an in-progress connection
    if (e.target.classList.contains('canvas') || e.target.classList.contains('nodes-container')) {
      setSelectedNodeId(null);
      setDrawingConnection(null);
    }
  };

  const handleDeleteNode = (nodeId) => {
    setNodes((prev) => prev.filter((node) => node.id !== nodeId));
    setConnections((prev) => prev.filter((c) => c.from !== nodeId && c.to !== nodeId));
    console.log(`[IntegrationBuilder] Node deleted: ${nodeId}`);
  };

  // ============= CONNECTIONS =============

  const handleConnectionPointClick = (e, nodeId, pointType) => {
    e.stopPropagation();

    if (!drawingConnection) {
      setDrawingConnection({ from: nodeId, fromType: pointType });
      return;
    }

    if (drawingConnection.from === nodeId) {
      // Clicked the same node again - cancel
      setDrawingConnection(null);
      return;
    }

    const newConnection = {
      id: Date.now(),
      from: drawingConnection.from,
      to: nodeId,
      dataType: 'json',
      direction: 'one-way',
      frequency: 'real-time'
    };
    setConnections((prev) => [...prev, newConnection]);
    console.log(`[Connection] ${drawingConnection.from} → ${nodeId}`);
    setDrawingConnection(null);
  };

  const handleConnectionClick = (conn) => {
    setSelectedConnection(conn);
  };

  const handleSaveConnectionConfig = (config) => {
    setConnections((prev) =>
      prev.map((c) => (c.id === selectedConnection.id ? { ...c, ...config } : c))
    );
    setSelectedConnection(null);
  };

  const handleDeleteConnection = (connId) => {
    setConnections((prev) => prev.filter((c) => c.id !== connId));
    setSelectedConnection(null);
  };

  // ============= DATA FLOW SIMULATION =============

  useEffect(() => {
    if (connections.length === 0) return undefined;

    const interval = setInterval(() => {
      const randomConnection = connections[Math.floor(Math.random() * connections.length)];
      const packet = { id: Date.now() + Math.random(), connectionId: randomConnection.id, progress: 0 };

      setAnimatingPackets((prev) => [...prev, packet]);

      setTimeout(() => {
        setAnimatingPackets((prev) => prev.filter((p) => p.id !== packet.id));
      }, 2000);
    }, 1000);

    return () => clearInterval(interval);
  }, [connections]);

  useEffect(() => {
    const animationFrame = setInterval(() => {
      setAnimatingPackets((prev) =>
        prev.map((packet) => ({ ...packet, progress: Math.min(packet.progress + 0.05, 1) }))
      );
    }, 30);

    return () => clearInterval(animationFrame);
  }, []);

  // ============= CODE EXPORT =============
  // (rendering handled by CodeExportModal)

  // ============= KEYBOARD SHORTCUTS =============

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId) {
          handleDeleteNode(selectedNodeId);
          setSelectedNodeId(null);
        }
      }

      if (e.key === 'Escape') {
        setSelectedNodeId(null);
        setDrawingConnection(null);
        setSelectedConnection(null);
        setShowExport(false);
        setShowShortcuts(false);
      }

      if (e.key === '?') {
        setShowShortcuts((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeId]);

  const shortcuts = [
    { key: 'Delete / Backspace', action: 'Delete selected node' },
    { key: 'Escape', action: 'Clear selection / close dialogs' },
    { key: '?', action: 'Toggle this help panel' },
    { key: 'Drag node', action: 'Move it around the canvas' },
    { key: 'Click output → input', action: 'Create a connection' }
  ];

  return (
    <div className="integration-builder">
      {/* Left Sidebar: System Palette */}
      <aside className="palette">
        <div className="palette-header">
          <h2>Systems</h2>
          <p className="palette-subtitle">Drag to canvas</p>
        </div>

        <div className="palette-items">
          {systemTypes.map((system) => (
            <div
              key={system.id}
              className="palette-item"
              draggable
              onDragStart={(e) => handleDragStart(e, system)}
              style={{ borderLeftColor: system.color, cursor: 'grab' }}
              title={system.description}
            >
              <span className="palette-icon">{system.icon}</span>
              <span className="palette-name">{system.name}</span>
            </div>
          ))}
        </div>

        <div className="palette-info">
          <p>💡 Drag a system to the canvas, then click its output → another node's input to connect them.</p>
        </div>
      </aside>

      {/* Main Canvas: Drop Zone */}
      <main
        className="canvas"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
        onClick={handleCanvasClick}
      >
        {/* Canvas Header */}
        <div className="canvas-header">
          <h1>Integration Builder</h1>
          <div className="canvas-stats">
            <span className="stat-item">
              Nodes: <strong>{nodes.length}</strong>
            </span>
            <span className="stat-item">
              Connections: <strong>{connections.length}</strong>
            </span>
            <button className="btn-toolbar" onClick={() => setShowExport(true)}>Export Code</button>
            <button className="btn-toolbar btn-icon" onClick={() => setShowShortcuts(true)} title="Keyboard shortcuts">?</button>
          </div>
        </div>

        {/* Empty State */}
        {nodes.length === 0 && (
          <div className="canvas-empty">
            <div className="empty-icon">🎯</div>
            <p>Drag systems from the left to build your workflow</p>
          </div>
        )}

        {/* Nodes + Connections Container */}
        <div className="nodes-container">
          {/* SVG for connection lines */}
          <svg className="connections-svg" width="100%" height="100%">
            {connections.map((conn) => {
              const fromNode = nodes.find((n) => n.id === conn.from);
              const toNode = nodes.find((n) => n.id === conn.to);
              if (!fromNode || !toNode) return null;

              const x1 = fromNode.x + NODE_WIDTH;
              const y1 = fromNode.y + NODE_HEADER_CENTER_Y;
              const x2 = toNode.x;
              const y2 = toNode.y + NODE_HEADER_CENTER_Y;

              return (
                <g key={conn.id} className="connection-group" onClick={() => handleConnectionClick(conn)}>
                  <path
                    d={`M ${x1} ${y1} C ${x1 + 50} ${y1}, ${x2 - 50} ${y2}, ${x2} ${y2}`}
                    stroke="transparent"
                    strokeWidth="16"
                    fill="none"
                  />
                  <path
                    d={`M ${x1} ${y1} C ${x1 + 50} ${y1}, ${x2 - 50} ${y2}, ${x2} ${y2}`}
                    stroke="#666"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                  />
                  <circle cx={(x1 + x2) / 2} cy={(y1 + y2) / 2} r="6" fill="white" stroke="#666" strokeWidth="2" />
                </g>
              );
            })}

            {/* Connection currently being drawn */}
            {drawingConnection && nodes.find((n) => n.id === drawingConnection.from) && (
              <path
                d={`M ${nodes.find((n) => n.id === drawingConnection.from).x + NODE_WIDTH} ${nodes.find((n) => n.id === drawingConnection.from).y + NODE_HEADER_CENTER_Y} L ${mousePos.x} ${mousePos.y}`}
                stroke="#2196F3"
                strokeWidth="2"
                strokeDasharray="5,5"
                fill="none"
              />
            )}
          </svg>

          {/* Animated data packets */}
          {animatingPackets.map((packet) => {
            const connection = connections.find((c) => c.id === packet.connectionId);
            if (!connection) return null;

            const fromNode = nodes.find((n) => n.id === connection.from);
            const toNode = nodes.find((n) => n.id === connection.to);
            if (!fromNode || !toNode) return null;

            const x1 = fromNode.x + NODE_WIDTH;
            const y1 = fromNode.y + NODE_HEADER_CENTER_Y;
            const x2 = toNode.x;
            const y2 = toNode.y + NODE_HEADER_CENTER_Y;

            const t = packet.progress;
            const x = x1 + (x2 - x1) * t;
            const y = y1 + (y2 - y1) * t;

            return <div key={packet.id} className="data-packet" style={{ left: x, top: y }} />;
          })}

          {/* Nodes */}
          {nodes.map((node) => (
            <div
              key={node.id}
              className={`node ${draggingNodeId === node.id ? 'dragging' : ''} ${selectedNodeId === node.id ? 'selected' : ''}`}
              style={{ left: `${node.x}px`, top: `${node.y}px`, borderColor: node.system.color }}
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
            >
              {/* Node Header */}
              <div className="node-header" style={{ backgroundColor: node.system.color }}>
                <span className="node-icon">{node.system.icon}</span>
                <button
                  className="node-delete"
                  onClick={() => handleDeleteNode(node.id)}
                  title="Delete node"
                >
                  ✕
                </button>
              </div>

              {/* Node Body */}
              <div className="node-body">
                <div className="node-name">{node.system.name}</div>
                <div className="node-id">ID: {node.id}</div>
              </div>

              {/* Connection Points */}
              <div className="connection-points">
                <div
                  className={`point point-in ${drawingConnection && drawingConnection.from !== node.id ? 'active' : ''}`}
                  title="Input"
                  onClick={(e) => handleConnectionPointClick(e, node.id, 'in')}
                ></div>
                <div
                  className={`point point-out ${drawingConnection && drawingConnection.from === node.id ? 'active' : ''}`}
                  title="Output"
                  onClick={(e) => handleConnectionPointClick(e, node.id, 'out')}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {selectedConnection && (
        <ConnectionModal
          connection={selectedConnection}
          nodes={nodes}
          onClose={() => setSelectedConnection(null)}
          onSave={handleSaveConnectionConfig}
          onDelete={handleDeleteConnection}
        />
      )}

      {showExport && (
        <CodeExportModal
          nodes={nodes}
          connections={connections}
          onClose={() => setShowExport(false)}
        />
      )}

      {showShortcuts && (
        <div className="modal-overlay" onClick={() => setShowShortcuts(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Keyboard Shortcuts</h2>
            <table className="shortcuts-table">
              <tbody>
                {shortcuts.map((s) => (
                  <tr key={s.key}>
                    <td><kbd>{s.key}</kbd></td>
                    <td>{s.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="modal-buttons">
              <span />
              <div className="modal-buttons-right">
                <button onClick={() => setShowShortcuts(false)} className="btn-save">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default IntegrationBuilder;
