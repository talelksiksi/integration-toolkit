# Integration Toolkit

Visual API Integration Builder for designing data flow workflows between
warehouse systems.

**Live demo:** https://integration-toolkit-eight.vercel.app

## Features

- Drag-and-drop system nodes (6 types: WMS, PLC, API, Database, Kafka, REST)
- Reposition nodes freely on the canvas
- Connect systems by clicking an output point then an input point
- Configure each connection's data type, direction, and update frequency
- Animated data packets simulating live flow along connections
- Export the workflow as JavaScript, cURL, or Python
- Mobile-responsive canvas
- Keyboard shortcuts (`Delete` to remove a selected node, `Escape` to clear
  selection/close dialogs, `?` to view all shortcuts)

## Getting Started

```bash
npm install
npm start
```

## Usage

1. Drag a system from the left palette onto the canvas
2. Drag nodes around to lay out your workflow
3. Click a node's output point, then another node's input point to connect them
4. Click a connection line to configure it
5. Click "Export Code" to generate JavaScript / cURL / Python for the workflow

## Tech Stack

- React 18
- SVG for connection lines
- CSS3 Flexbox
- Vercel deployment

See the [warehouse dashboard repo](https://github.com/talelksiksi/warehouse-dashboard) for the companion project.
