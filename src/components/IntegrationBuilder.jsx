/**
 * IntegrationBuilder.jsx
 *
 * Main component for the API Integration Toolkit.
 * Displays a palette of system types on the left
 * and a canvas on the right where users can drop nodes.
 *
 * Features:
 * - Drag systems from palette to canvas
 * - Drag nodes on canvas to reposition
 * - Delete nodes
 * - Visual feedback during dragging
 */

import React, { useState } from 'react';
import '../styles/IntegrationBuilder.css';

function IntegrationBuilder() {
  const [nodes, setNodes] = useState([]);
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const systemTypes = [
    {
      id: 'wms',
      name: 'WMS',
      icon: '📦',
      color: '#2196F3',
      description: 'Warehouse Management System'
    },
    {
      id: 'plc',
      name: 'PLC',
      icon: '⚙️',
      color: '#4CAF50',
      description: 'Programmable Logic Controller'
    },
    {
      id: 'api',
      name: 'API',
      icon: '🔗',
      color: '#FF9800',
      description: 'REST/HTTP API'
    },
    {
      id: 'database',
      name: 'Database',
      icon: '💾',
      color: '#9C27B0',
      description: 'PostgreSQL / SQL Database'
    },
    {
      id: 'kafka',
      name: 'Kafka',
      icon: '📨',
      color: '#F44336',
      description: 'Message Stream / Kafka'
    },
    {
      id: 'rest',
      name: 'REST',
      icon: '🌐',
      color: '#00BCD4',
      description: 'REST Service'
    }
  ];

  // Drag from palette
  const handleDragStart = (e, system) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('system', JSON.stringify(system));
  };

  // Drag over canvas
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    e.currentTarget.classList.add('drag-over');
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('drag-over');
  };

  // Drop on canvas - create new node
  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');

    const systemJson = e.dataTransfer.getData('system');
    if (!systemJson) return; // Not from palette

    const system = JSON.parse(systemJson);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newNode = {
      id: Date.now(),
      system,
      x,
      y
    };

    setNodes([...nodes, newNode]);
    console.log(`[IntegrationBuilder] Node created: ${system.name} at (${x}, ${y})`);
  };

  // Handle node drag start
  const handleNodeMouseDown = (e, nodeId) => {
    // Don't drag if clicking the delete button
    if (e.target.closest('.node-delete')) {
      return;
    }

    e.preventDefault();
    setDraggingNodeId(nodeId);

    // Calculate offset from mouse to node position
    const node = nodes.find((n) => n.id === nodeId);
    const rect = e.currentTarget.getBoundingClientRect();

    setDragOffset({
      x: e.clientX - rect.left - node.x,
      y: e.clientY - rect.top - node.y
    });

    console.log(`[IntegrationBuilder] Started dragging node ${nodeId}`);
  };

  // Handle node drag - move mouse while held down
  const handleCanvasMouseMove = (e) => {
    if (!draggingNodeId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const newX = e.clientX - rect.left - dragOffset.x;
    const newY = e.clientY - rect.top - dragOffset.y;

    setNodes(
      nodes.map((node) =>
        node.id === draggingNodeId
          ? { ...node, x: Math.max(0, newX), y: Math.max(0, newY) }
          : node
      )
    );
  };

  // Handle node drag end - release mouse
  const handleCanvasMouseUp = () => {
    if (draggingNodeId) {
      console.log(`[IntegrationBuilder] Finished dragging node ${draggingNodeId}`);
      setDraggingNodeId(null);
    }
  };

  // Delete node
  const handleDeleteNode = (nodeId) => {
    setNodes(nodes.filter((node) => node.id !== nodeId));
    console.log(`[IntegrationBuilder] Node deleted: ${nodeId}`);
  };

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
              style={{
                borderLeftColor: system.color,
                cursor: 'grab'
              }}
              title={system.description}
            >
              <span className="palette-icon">{system.icon}</span>
              <span className="palette-name">{system.name}</span>
            </div>
          ))}
        </div>

        <div className="palette-info">
          <p>💡 Drag a system to the canvas to add it to your workflow</p>
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
        onMouseLeave={handleCanvasMouseUp} // Stop dragging if mouse leaves canvas
      >
        {/* Canvas Header */}
        <div className="canvas-header">
          <h1>Integration Builder</h1>
          <div className="canvas-stats">
            <span className="stat-item">
              Nodes: <strong>{nodes.length}</strong>
            </span>
          </div>
        </div>

        {/* Empty State */}
        {nodes.length === 0 && (
          <div className="canvas-empty">
            <div className="empty-icon">🎯</div>
            <p>Drag systems from the left to build your workflow</p>
          </div>
        )}

        {/* Nodes on Canvas */}
        <div className="nodes-container">
          {nodes.map((node) => (
            <div
              key={node.id}
              className={`node ${draggingNodeId === node.id ? 'dragging' : ''}`}
              style={{
                left: `${node.x}px`,
                top: `${node.y}px`,
                borderColor: node.system.color
              }}
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
                <div className="point point-in" title="Input"></div>
                <div className="point point-out" title="Output"></div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default IntegrationBuilder;
