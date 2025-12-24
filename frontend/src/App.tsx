import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { useGraphStore } from './store/useGraphStore';
import { ENTITY_CONFIG } from './constants/entities';
import { toPng, toJpeg } from 'html-to-image';
import { TimelinePanel } from './TimelinePanel';
import {
  User, Mail, Phone, Globe, CreditCard, FileText, Link as LinkIcon,
  Trash2, Save, ZoomIn, ZoomOut, Move, Shield, MousePointer2, Eraser, Search,
  Smartphone, Building, X, GitBranch, CircleDot, Grid, Edit3,
  Coins, AtSign, ChevronDown, Plus, Monitor, Settings, Map, Share2, Layers,
  Download, Image as ImageIcon, FileJson, Upload, Calendar, Printer,
  FolderPlus, LayoutTemplate
} from 'lucide-react';

export default function App() {
  const {
    nodes, setNodes, links, setLinks,
    selectedNodeId, setSelectedNodeId,
    hoveredNodeId, setHoveredNodeId,
    mode, setMode,
    addType, setAddType,
    scale, setScale,
    offset, setOffset,
    saveCase, loadCase
  } = useGraphStore();

  const [currentCaseId, setCurrentCaseId] = useState<string | null>(null);
  const [isCardHovered, setIsCardHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [linkingSource, setLinkingSource] = useState<string | null>(null);
  const [showAdvancedProps, setShowAdvancedProps] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // UI Functionality State
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  // --- GESTIÓN DE PROYECTOS (NUEVO) ---
  const [isWelcomeScreen, setIsWelcomeScreen] = useState(true);

  const [apiKeys, setApiKeys] = useState(() => {
    const saved = localStorage.getItem('nexus_api_keys');
    const defaults = { shodan: '', virustotal: '', hunter: '', abuseipdb: '', numverify: '' };
    try {
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch (e) {
      return defaults;
    }
  });

  useEffect(() => {
    localStorage.setItem('nexus_api_keys', JSON.stringify(apiKeys));
  }, [apiKeys]);

  // Layout State
  const [collapsedTargets, setCollapsedTargets] = useState(new Set());
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [virtualNodePositions, setVirtualNodePositions] = useState<any>({});

  // UI State
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [activeLayout, setActiveLayout] = useState<string>('force');
  const workspaceRef = useRef<HTMLDivElement>(null);

  // Initialize
  useEffect(() => {
    const init = async () => {
      try {
        const res = await axios.get('http://localhost:3001/api/cases');
        if (res.data.length > 0) {
          // Opcional: Cargar último caso o mantenerse en bienvenida
          // setCurrentCaseId(res.data[0].id);
          // await loadCase(res.data[0].id);
        }
      } catch (err) {
        console.error("Initialization failed", err);
      }
    };
    init();
  }, []);

  // --- HANDLERS DE PROYECTO ---
  const handleCreateProject = async (name: string) => {
    try {
      const res = await axios.post('http://localhost:3001/api/cases', {
        name: name.toUpperCase(),
        description: 'Nueva investigación Manual'
      });
      setCurrentCaseId(res.data.id);
      setIsWelcomeScreen(false);
      setNodes([]); setLinks([]);
    } catch (err) {
      console.error("Error creando proyecto", err);
    }
  };

  const handleImportProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        // Crear caso importado
        const res = await axios.post('http://localhost:3001/api/cases', {
          name: `IMPORT_${Date.now()}`,
          description: 'Importado de JSON'
        });
        setCurrentCaseId(res.data.id);

        if (json.nodes && json.links) {
          setNodes(json.nodes);
          setLinks(json.links);
          setCollapsedTargets(new Set());
          setExpandedCategories(new Set());
          setVirtualNodePositions({});
          setIsWelcomeScreen(false);
        }
      } catch (err) {
        console.error("Failed to parse JSON", err);
        alert("Error al importar el archivo: Formato inválido.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Helpers
  const getNodeInfo = useCallback((id: string) => nodes.find(n => n.id === id), [nodes]);

  const getNodeDisplayInfo = useCallback((node: any) => {
    if (!node) return { main: '', sub: '', color: '#fff', Icon: User };
    const config = ENTITY_CONFIG[node.type] || ENTITY_CONFIG.target;
    let main = config.label;

    if (node.type === 'target') main = node.data.alias || node.data.name || 'OBJETIVO';
    else if (node.type === 'ip') main = node.data.ip || 'DIRECCIÓN IP';
    else if (node.type === 'domain') main = node.data.domain || 'DOMINIO';
    else if (node.type === 'email') main = node.data.email || 'EMAIL';
    else if (node.type === 'phone') main = node.data.number || 'TELÉFONO';
    else if (node.type === 'crypto') main = node.data.address ? `${node.data.address.substring(0, 8)}...` : 'WALLET';
    else if (node.type === 'identity') main = node.data.handle || node.data.username || 'USUARIO';
    else if (node.type === 'company') main = node.data.name || 'ORGANIZACIÓN';
    else if (node.type === 'bank') main = node.data.iban || node.data.bank_name || 'CUENTA';

    return { main, color: config.color, Icon: config.icon };
  }, []);

  // --- ENRICHMENT (MODIFICADO: SOLO DATOS, NO CREA NODOS) ---
  const handleEnrich = async (nodeId: string) => {
    const node = getNodeInfo(nodeId);
    if (!node) return;

    let searchValue = '';
    if (node.type === 'ip') searchValue = node.data.ip;
    else if (node.type === 'email') searchValue = node.data.email;
    else if (node.type === 'domain') searchValue = node.data.domain;
    else if (node.type === 'phone') searchValue = node.data.number;
    else if (node.type === 'crypto') searchValue = node.data.address;

    if (!searchValue) return;

    try {
      const response = await axios.post('http://localhost:3001/api/enrich', {
        nodeId,
        type: node.type,
        searchValue,
        apiKeys
      });

      if (response.data.success) {
        const { enrichedData } = response.data.result;

        // Solo actualizamos datos del nodo existente
        if (enrichedData) {
          setNodes(prev => prev.map(n => n.id === nodeId ? {
            ...n,
            data: { ...n.data, ...enrichedData },
            notes: (n.notes || '') + `\n[Auto-Complete ${new Date().toLocaleDateString()}]`
          } : n));
        }
      }
    } catch (err) {
      console.error("Enrichment failed", err);
    }
  };

  const handleExport = async (format: 'json' | 'jpg' | 'png') => {
    setShowExportMenu(false);
    if (format === 'json') {
      const data = JSON.stringify({ nodes, links }, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CASE_${currentCaseId || 'O1'}_${Date.now()}.json`;
      a.click();
    } else {
      if (!workspaceRef.current) return;
      try {
        const dataUrl = format === 'png'
          ? await toPng(workspaceRef.current, { backgroundColor: '#050505' })
          : await toJpeg(workspaceRef.current, { backgroundColor: '#050505', quality: 0.95 });

        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `CASE_EXPORT_${Date.now()}.${format}`;
        a.click();
      } catch (err) { console.error("Export failed", err); }
    }
  };

  const handleExportPDF = async () => {
    if (!workspaceRef.current) return;
    try {
      const dataUrl = await toPng(workspaceRef.current, { backgroundColor: '#0a0a0a' });

      const win = window.open('', '_blank');
      if (!win) {
        alert("Bloqueo de ventanas emergentes activado. Permite popups para generar el reporte.");
        return;
      }

      const dateStr = new Date().toLocaleDateString();
      const caseName = "CASO ALPHA - INVESTIGACIÓN";

      const grouped: { [key: string]: any[] } = {};
      nodes.forEach((n: any) => {
        if (!grouped[n.type]) grouped[n.type] = [];
        grouped[n.type].push(n);
      });

      const sortedTypes = Object.keys(grouped).sort((a, b) => {
        if (a === 'target') return -1;
        if (b === 'target') return 1;
        return a.localeCompare(b);
      });

      let html = `
            <html>
            <head>
                <title>Reporte NEXUS OSINT - ${dateStr}</title>
                <style>
                    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #fff; padding: 40px; color: #333; }
                    h1 { border-bottom: 3px solid #0891b2; padding-bottom: 15px; margin-bottom: 30px; text-transform: uppercase; color: #155e75; font-size: 24px; letter-spacing: 1px; }
                    h2 { margin-top: 50px; margin-bottom: 20px; color: #fff; background: #0891b2; padding: 10px 15px; font-size: 16px; border-radius: 4px; text-transform: uppercase; letter-spacing: 1px; }
                    .meta { margin-bottom: 40px; background: #f0f9ff; padding: 20px; border-radius: 8px; border: 1px solid #bae6fd; display: flex; justify-content: space-between; }
                    .meta div { font-size: 12px; }
                    .meta strong { color: #0369a1; display: block; margin-bottom: 4px; }
                    .graph-img { width: 100%; border: 1px solid #ccc; margin-bottom: 40px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
                    .entity-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; margin-bottom: 15px; page-break-inside: avoid; }
                    .entity-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 10px; }
                    .entity-title { font-weight: bold; font-size: 14px; color: #111; }
                    .entity-date { font-size: 11px; color: #6b7280; font-family: monospace; }
                    .data-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; font-size: 11px; }
                    .data-item { overflow: hidden; }
                    .data-label { color: #6b7280; font-size: 9px; text-transform: uppercase; font-weight: bold; margin-bottom: 2px; }
                    .data-value { color: #374151; font-weight: 500; word-break: break-all; }
                    .notes-section { margin-top: 10px; padding-top: 8px; border-top: 1px dashed #e5e7eb; font-size: 11px; color: #4b5563; font-style: italic; }
                    .footer { margin-top: 60px; text-align: center; font-size: 10px; border-top: 1px solid #e5e7eb; padding-top: 20px; color: #6b7280; }
                </style>
            </head>
            <body>
                <h1>Reporte de Inteligencia Nexus OSINT</h1>
                <div class="meta">
                    <div><strong>FECHA / HORA</strong> ${new Date().toLocaleString()}</div>
                    <div><strong>CASO</strong> ${caseName}</div>
                    <div><strong>TOTAL ELEMENTOS</strong> ${nodes.length}</div>
                </div>

                <h2>1. Panorámica de la Investigación</h2>
                <img src="${dataUrl}" class="graph-img" />
        `;

      sortedTypes.forEach(type => {
        const groupNodes = grouped[type];
        const config = ENTITY_CONFIG[type] || ENTITY_CONFIG.target;
        const label = config.label || type.toUpperCase();

        html += `<h2>2.${sortedTypes.indexOf(type) + 1} Identificación de ${label}s (${groupNodes.length})</h2>`;

        groupNodes.forEach(n => {
          const mainLabel = n.data.label || n.data.ip || n.data.email || n.data.address || n.data.number || n.data.name || n.id;
          const timelineDate = n.date ? `Fecha Evento: ${n.date}` : 'Sin fecha asignada';

          html += `<div class="entity-card">`;
          html += `  <div class="entity-header">`;
          html += `    <div class="entity-title">${mainLabel}</div>`;
          html += `    <div class="entity-date">${timelineDate}</div>`;
          html += `  </div>`;
          html += `  <div class="data-grid">`;

          Object.entries(n.data).forEach(([key, val]) => {
            if (['x', 'y', 'id', 'label', 'name', 'ip', 'email', 'number', 'address'].includes(key) && val === mainLabel) return;
            if (['x', 'y', 'id'].includes(key)) return;
            if (!val || val === '') return;

            let displayVal = typeof val === 'object' ? JSON.stringify(val) : String(val);

            html += `    <div class="data-item">`;
            html += `      <div class="data-label">${key.replace(/_/g, ' ')}</div>`;
            html += `      <div class="data-value">${displayVal}</div>`;
            html += `    </div>`;
          });

          html += `  </div>`;
          if (n.notes) {
            html += `  <div class="notes-section"><strong>Notas del Analista:</strong> ${n.notes}</div>`;
          }
          html += `</div>`;
        });
      });

      html += `
                <div class="footer">NEXUS OSINT TECHNOLOGY - CONFIDENTIAL INTELLIGENCE DOCUMENT - AUTOMATED DOSSIER</div>
                <script>window.print();</script>
            </body>
            </html>
        `;

      win.document.write(html);
      win.document.close();

    } catch (e) {
      console.error("PDF Fail", e);
      alert("Error generando reporte. Revisa la consola.");
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Wrapper for internal import logic if triggered from header
    handleImportProject(e);
  };

  const toggleGroup = (groupKey: string) => {
    if (draggingNode) return;
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  const toggleTargetCollapse = (targetId: string) => {
    if (draggingNode) return;
    setCollapsedTargets(prev => {
      const next = new Set(prev);
      if (next.has(targetId)) next.delete(targetId);
      else next.add(targetId);
      return next;
    });
  };

  // --- LÓGICA DE LAYOUT (PRESERVADA) ---
  const applyLayout = (type: string) => {
    setActiveLayout(type);

    if (nodes.length === 0) return;
    const newNodes = [...nodes];
    const w = workspaceRef.current ? workspaceRef.current.clientWidth : 800;
    const h = workspaceRef.current ? workspaceRef.current.clientHeight : 600;
    const cx = w / 2 - offset.x;
    const cy = h / 2 - offset.y;

    const targets = newNodes.filter(n => n.type === 'target');
    const rootId = targets.length > 0 ? targets[0].id : newNodes[0].id;
    const rootNode = newNodes.find(n => n.id === rootId);

    if (type === 'grid') {
      if (rootNode) {
        rootNode.x = cx;
        rootNode.y = cy - 300;
      }

      const grouped: { [key: string]: any[] } = {};
      const neighbors = newNodes.filter(n => n.id !== rootId);

      neighbors.forEach(n => {
        if (!grouped[n.type]) grouped[n.type] = [];
        grouped[n.type].push(n);
      });

      const typeOrder = ['ip', 'domain', 'server', 'company', 'phone', 'email', 'identity', 'crypto', 'bank'];
      const sortedTypes = Object.keys(grouped).sort((a, b) => {
        const idxA = typeOrder.indexOf(a);
        const idxB = typeOrder.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
      });

      let currentY = (rootNode ? rootNode.y : cy - 300) + 100;

      sortedTypes.forEach(t => {
        const groupNodes = grouped[t];
        if (groupNodes.length === 0) return;
        const spread = 120;
        const totalWidth = groupNodes.length * spread;
        const startX = cx - (totalWidth / 2) + (spread / 2);

        groupNodes.forEach((n, i) => {
          n.x = startX + (i * spread);
          n.y = currentY;
        });
        currentY += 110;
      });

    } else if (type === 'radial') {
      const layers: { [key: string]: number } = { [rootId]: 0 };
      const queue = [rootId];
      const visited = new Set([rootId]);

      while (queue.length > 0) {
        const curr = queue.shift()!;
        const currentLayer = layers[curr];
        const neighbors = links
          .filter(l => l.source === curr || l.target === curr)
          .map(l => l.source === curr ? l.target : l.source);

        neighbors.forEach(nid => {
          if (!visited.has(nid)) {
            visited.add(nid);
            layers[nid] = currentLayer + 1;
            queue.push(nid);
          }
        });
      }

      newNodes.forEach(n => {
        if (!visited.has(n.id)) layers[n.id] = 2;
      });

      const layerGroups: { [key: number]: any[] } = {};
      Object.entries(layers).forEach(([id, layer]) => {
        if (!layerGroups[layer]) layerGroups[layer] = [];
        layerGroups[layer].push(newNodes.find(n => n.id === id));
      });

      Object.entries(layerGroups).forEach(([layerStr, nodesInLayer]) => {
        const layer = parseInt(layerStr);
        const radius = layer * 250;
        const count = nodesInLayer.length;

        nodesInLayer.forEach((n, i) => {
          if (layer === 0) {
            n!.x = cx;
            n!.y = cy;
          } else {
            const angle = (i / count) * Math.PI * 2;
            n!.x = cx + radius * Math.cos(angle);
            n!.y = cy + radius * Math.sin(angle);
          }
        });
      });

    } else if (type === 'tree') {
      const rootId = targets.length > 0 ? targets[0].id : newNodes[0].id;
      const rootNode = newNodes.find(n => n.id === rootId);
      if (rootNode) {
        rootNode.x = cx;
        rootNode.y = cy - 250;
      }
      const neighbors = newNodes.filter(n => n.id !== rootId);
      const grouped: { [key: string]: any[] } = {};
      neighbors.forEach(n => {
        if (!grouped[n.type]) grouped[n.type] = [];
        grouped[n.type].push(n);
      });

      const types = Object.keys(grouped).sort((a, b) => {
        const avgX_a = grouped[a].reduce((s, n) => s + n.x, 0) / grouped[a].length;
        const avgX_b = grouped[b].reduce((s, n) => s + n.x, 0) / grouped[b].length;
        return avgX_a - avgX_b;
      });

      const spacing = 160;
      const totalWidth = types.length * spacing;
      const startX = cx - (totalWidth / 2) + (spacing / 2);
      const levelY = (rootNode ? rootNode.y : cy - 250) + 180;

      types.forEach((t, i) => {
        const items = grouped[t];
        const slotX = startX + (i * spacing);
        items.forEach(n => {
          n.x = slotX;
          n.y = levelY;
        });
      });
    }

    setNodes(newNodes);
    setVirtualNodePositions({});
  };

  const layoutData = useMemo(() => {
    const visibleIds = new Set(nodes.map(n => n.id));
    const hiddenIds = new Set<string>();
    const virtualNodes: any[] = [];
    const displayLinks: any[] = [];
    const handledLinkIds = new Set<string>();

    nodes.forEach(target => {
      if (target.type !== 'target') return;
      const connectedLinks = links.filter(l => l.source === target.id || l.target === target.id);
      const children = nodes.filter(n => connectedLinks.some(l => (l.source === n.id || l.target === n.id)) && n.id !== target.id && n.type !== 'target');

      if (collapsedTargets.has(target.id)) {
        children.forEach(c => hiddenIds.add(c.id));
        return;
      }

      const groups: any = {};
      children.forEach(c => {
        if (!groups[c.type]) groups[c.type] = [];
        groups[c.type].push(c);
      });

      Object.entries(groups).forEach(([type, items]: [any, any], typeIdx) => {
        const groupKey = `${target.id}_${type}`;
        const isExpanded = expandedCategories.has(groupKey);
        const shouldGroup = items.length > 1 && activeLayout !== 'grid' && type !== 'company';

        if (shouldGroup) {
          items.forEach((item: any) => {
            const link = links.find(l => (l.source === target.id && l.target === item.id) || (l.target === target.id && l.source === item.id));
            if (link) handledLinkIds.add(link.id);
          });

          const vId = `vgroup_${groupKey}`;
          const manualPos = virtualNodePositions[vId];
          let vx, vy;

          if (items.length > 0) {
            const cx = items.reduce((s: number, n: any) => s + n.x, 0) / items.length;
            const cy = items.reduce((s: number, n: any) => s + n.y, 0) / items.length;

            if (activeLayout === 'tree') {
              vx = cx;
              vy = target.y + 180;
            } else {
              vx = cx;
              vy = cy;
            }

            if (activeLayout !== 'tree' && Math.abs(vx) < 1 && Math.abs(vy) < 1) {
              if (activeLayout === 'tree') {
                const levelDistance = 200;
                const siblingSpacing = 160;
                const groupCount = Object.keys(groups).length;
                const totalWidth = groupCount * siblingSpacing;
                const startX = target.x - (totalWidth / 2) + (siblingSpacing / 2);
                vx = startX + (typeIdx * siblingSpacing);
                vy = target.y + levelDistance;
              } else {
                const angle = ((typeIdx / (Object.keys(groups).length || 1)) - 0.5) * Math.PI;
                vx = target.x + 200 * Math.cos(angle);
                vy = target.y + 200 * Math.sin(angle);
              }
            }

          } else {
            vx = target.x; vy = target.y;
          }

          virtualNodes.push({
            id: vId, isVirtual: true, type, count: items.length, targetId: target.id, groupKey,
            x: manualPos ? manualPos.x : vx,
            y: manualPos ? manualPos.y : vy,
            expanded: isExpanded
          });

          displayLinks.push({ id: `vl_${vId}`, source: target.id, target: vId, isVirtual: true });

          if (!isExpanded) items.forEach((item: any) => hiddenIds.add(item.id));
          else items.forEach((item: any) => displayLinks.push({ id: `cl_${item.id}`, source: vId, target: item.id, isVirtual: true }));
        }
      });
    });

    hiddenIds.forEach(id => visibleIds.delete(id));
    links.forEach(l => {
      if (!handledLinkIds.has(l.id) && visibleIds.has(l.source) && visibleIds.has(l.target)) {
        displayLinks.push({ ...l, isVirtual: false });
      }
    });

    return { visibleIds, virtualNodes, displayLinks };
  }, [nodes, links, collapsedTargets, expandedCategories, virtualNodePositions, activeLayout]);

  // AUTO-SPREAD CHILDREN
  useEffect(() => {
    const expandedKeys = Array.from(expandedCategories);
    if (expandedKeys.length === 0) return;

    let modified = false;
    const newNodes = [...nodes];
    const activeChildIds = new Set<string>();
    expandedKeys.forEach((k: unknown) => {
      const key = k as string;
      const [tId, tType] = key.split('_');
      newNodes.forEach(n => {
        if (n.type === tType && links.some(l => (l.source === tId && l.target === n.id) || (l.target === tId && l.source === n.id))) {
          activeChildIds.add(n.id);
        }
      });
    });

    const obstacles = newNodes.filter(n => !activeChildIds.has(n.id));

    expandedKeys.forEach((k: unknown) => {
      const key = k as string;
      const [targetId, type] = key.split('_');
      const target = newNodes.find(n => n.id === targetId);
      if (!target) return;

      const children = newNodes.filter(n => {
        if (n.id === targetId || n.type !== type) return false;
        return links.some(l => (l.source === targetId && l.target === n.id) || (l.target === targetId && l.source === n.id));
      });

      if (children.length > 0) {
        let ox = 0, oy = 0;
        const vId = `vgroup_${key}`;
        const manual = virtualNodePositions[vId];

        if (manual) {
          ox = manual.x; oy = manual.y;
        } else {
          if (children.length > 0) {
            const anchor = children[0];
            ox = anchor.x;
            oy = anchor.y;
          } else {
            const cx = children.reduce((s, c) => s + c.x, 0) / children.length;
            const cy = children.reduce((s, c) => s + c.y, 0) / children.length;
            ox = cx; oy = cy;
          }
        }

        if (activeLayout === 'tree') {
          const startY = oy + 100;
          const verticalGap = 80;
          children.forEach((c, i) => {
            let tx = ox;
            let ty = startY + (i * verticalGap);
            if (Math.abs(c.x - tx) > 1 || Math.abs(c.y - ty) > 1) {
              c.x = tx;
              c.y = ty;
              modified = true;
            }
          });
        } else {
          const dx = ox - target.x;
          const dy = oy - target.y;
          let angle = Math.atan2(dy, dx);
          if (dx === 0 && dy === 0) angle = Math.PI / 2;
          const distance = 180;

          children.forEach((c, i) => {
            const offsetIdx = i - (children.length - 1) / 2;
            const spacing = 100;
            const fX = Math.cos(angle) * distance;
            const fY = Math.sin(angle) * distance;
            const pX = -Math.sin(angle) * spacing * offsetIdx;
            const pY = Math.cos(angle) * spacing * offsetIdx;
            let tx = ox + fX + pX;
            let ty = oy + fY + pY;

            obstacles.forEach(obs => {
              const distX = tx - obs.x;
              const distY = ty - obs.y;
              const dist = Math.sqrt(distX * distX + distY * distY);
              if (dist < 80) {
                const pushX = distX === 0 ? (Math.random() - 0.5) : distX;
                tx += (distX / (dist || 1)) * 60;
                ty += (distY / (dist || 1)) * 60;
              }
            });

            if (Math.abs(c.x - tx) > 1 || Math.abs(c.y - ty) > 1) {
              c.x = tx;
              c.y = ty;
              modified = true;
            }
          });
        }
      }
    });

    if (modified) setNodes(newNodes);
  }, [expandedCategories, activeLayout, nodes.length]);


  const activeNode = useMemo(() => {
    const combined = [...nodes, ...layoutData.virtualNodes];
    return combined.find(n => n.id === (hoveredNodeId || selectedNodeId));
  }, [nodes, layoutData.virtualNodes, hoveredNodeId, selectedNodeId]);

  // --- RENDER WELCOME SCREEN (NUEVO) ---
  if (isWelcomeScreen) {
    return (
      <div className="h-screen bg-[#050505] flex items-center justify-center font-sans text-white bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900 via-[#050505] to-[#050505]">
        <div className="max-w-md w-full p-8 border border-white/5 rounded-2xl text-center space-y-8 animate-in fade-in zoom-in duration-500 bg-white/5 backdrop-blur-xl shadow-2xl">
          <div className="space-y-4">
            <div className="w-20 h-20 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(6,182,212,0.15)]">
              <Shield className="text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]" size={40} />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-[0.3em] uppercase italic text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-500">NEXUS</h1>
              <p className="text-cyan-500 text-[10px] font-mono tracking-widest uppercase mt-1">Manual Intelligence Suite</p>
            </div>
          </div>

          <div className="grid gap-3">
            <button
              onClick={() => handleCreateProject(`CASE_${Math.floor(Math.random() * 1000)}`)}
              className="flex items-center gap-4 p-4 bg-black/40 border border-white/10 rounded-xl hover:bg-cyan-500/10 hover:border-cyan-500/50 transition-all group hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="p-2 rounded-lg bg-neutral-900 group-hover:bg-cyan-950/50 transition-colors">
                <FolderPlus className="text-neutral-500 group-hover:text-cyan-400" size={20} />
              </div>
              <div className="text-left flex-1">
                <div className="text-sm font-bold uppercase tracking-wider text-neutral-200 group-hover:text-white">Nuevo Proyecto</div>
                <div className="text-[10px] text-neutral-600 group-hover:text-cyan-400/70">Lienzo en blanco</div>
              </div>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-4 p-4 bg-black/40 border border-white/10 rounded-xl hover:bg-purple-500/10 hover:border-purple-500/50 transition-all group hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="p-2 rounded-lg bg-neutral-900 group-hover:bg-purple-950/50 transition-colors">
                <Upload className="text-neutral-500 group-hover:text-purple-400" size={20} />
              </div>
              <div className="text-left flex-1">
                <div className="text-sm font-bold uppercase tracking-wider text-neutral-200 group-hover:text-white">Importar Caso</div>
                <div className="text-[10px] text-neutral-600 group-hover:text-purple-400/70">Cargar .json</div>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImportProject} />
            </button>
          </div>

          <div className="pt-6 border-t border-white/5 text-[10px] text-neutral-600 font-mono">
            MANUAL OPERATION MODE // ENCRYPTED
          </div>
        </div>
      </div>
    );
  }

  // --- APP RENDER ---
  return (
    <div className="flex h-screen bg-[#050505] text-neutral-300 font-sans selection:bg-cyan-500/20">

      {/* SIDEBAR */}
      <aside className="w-16 bg-[#0a0a0a] border-r border-white/5 flex flex-col items-center py-4 z-40 shadow-xl">
        <div className="flex-1 w-full px-2 space-y-4 overflow-y-auto hide-scrollbar mt-4">
          <div className="space-y-2">
            <div className="text-[9px] font-bold text-neutral-600 uppercase text-center tracking-widest mb-1">Entidades</div>
            {Object.entries(ENTITY_CONFIG).map(([type, config]: [any, any]) => (
              <button key={type} onClick={() => { setMode('add'); setAddType(type); }}
                className={`w-full aspect-square rounded-lg flex items-center justify-center transition-all duration-200 group relative
                    ${mode === 'add' && addType === type ? 'bg-cyan-500/10 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.1)] border border-cyan-500/30' : 'text-neutral-500 hover:bg-white/5 hover:text-neutral-300'}`}
                title={config.label}>
                {React.createElement(config.icon, { size: 18 })}
                {mode === 'add' && addType === type && <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-6 bg-cyan-400 rounded-r-full shadow-lg shadow-cyan-500" />}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto px-2 space-y-2 w-full pt-4 border-t border-[var(--color-border)]">
          <button onClick={() => setShowTimeline(!showTimeline)} className={`tool-btn w-full flex justify-center ${showTimeline ? 'bg-cyan-900/50 text-cyan-400' : ''}`} title="Línea de Tiempo"><Calendar size={18} /></button>
          <button onClick={() => handleExportPDF()} className="tool-btn w-full flex justify-center" title="Generar Informe PDF"><Printer size={18} /></button>
          <button onClick={() => setShowSettings(true)} className="tool-btn w-full flex justify-center" title="Configuración"><Settings size={18} /></button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-neutral-900/20 via-[#050505] to-[#050505]">
        {/* HEADER */}
        <header className="h-14 bg-[#0a0a0a]/50 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 z-30 shrink-0 relative">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsWelcomeScreen(true)} className="w-8 h-8 flex items-center justify-center bg-cyan-950/30 rounded border border-cyan-500/20 text-cyan-400 hover:scale-105 transition">
              <Shield size={16} />
            </button>
            <h1 className="font-bold text-lg tracking-widest text-white uppercase italic">NEXUS <span className="text-neutral-600 font-mono text-[10px] not-italic tracking-normal">{currentCaseId || 'UNSAVED'}</span></h1>
          </div>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-96 group">
            <div className="absolute inset-0 bg-cyan-500/5 rounded-full blur-md opacity-0 group-hover:opacity-100 transition duration-500"></div>
            <div className="relative group">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-cyan-400 transition-colors" />
              <input type="text" placeholder="Búsqueda de inteligencia..."
                className="w-full bg-[#111] border border-white/10 rounded-full py-1.5 pl-10 pr-4 text-xs text-neutral-300 focus:outline-none focus:border-cyan-800 focus:bg-black transition-all font-mono" />
            </div>
          </div>

          <div className="flex items-center gap-3 relative">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".json"
              onChange={handleImportProject}
            />
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-1.5 text-neutral-400 hover:text-white text-[10px] font-bold uppercase tracking-widest transition mr-2">
              <Upload size={12} /> Importar
            </button>
            <div className="flex rounded-md overflow-hidden border border-neutral-700">
              <button onClick={() => saveCase(currentCaseId!)} className="flex items-center gap-2 px-3 py-1.5 bg-[#0a0a0a] text-neutral-300 text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-800 transition border-r border-neutral-700">
                <Save size={12} /> Guardar
              </button>
              <button onClick={() => setShowExportMenu(!showExportMenu)} className="px-1.5 bg-[#0a0a0a] text-neutral-300 hover:bg-neutral-800 hover:text-white transition">
                <ChevronDown size={12} />
              </button>
            </div>

            {showExportMenu && (
              <div className="absolute top-full right-0 mt-2 w-48 glass-panel rounded-lg shadow-xl overflow-hidden z-50 flex flex-col border border-white/10 bg-[#0a0a0a]">
                <button onClick={() => handleExport('json')} className="flex items-center gap-3 px-4 py-3 text-xs text-neutral-300 hover:bg-white/5 hover:text-white text-left transition">
                  <FileJson size={14} className="text-yellow-500" /> Exportar JSON
                </button>
                <button onClick={() => handleExport('jpg')} className="flex items-center gap-3 px-4 py-3 text-xs text-neutral-300 hover:bg-white/5 hover:text-white text-left transition">
                  <ImageIcon size={14} className="text-blue-500" /> Exportar Imagen (JPG)
                </button>
                <button onClick={() => handleExport('png')} className="flex items-center gap-3 px-4 py-3 text-xs text-neutral-300 hover:bg-white/5 hover:text-white text-left transition">
                  <ImageIcon size={14} className="text-purple-500" /> Exportar Imagen (PNG)
                </button>
              </div>
            )}
          </div>
        </header>

        {/* TOOLBAR */}
        <div className="absolute top-20 left-6 z-30 glass-panel rounded-lg flex items-center p-1 gap-1 border border-white/5 bg-black/40 backdrop-blur-xl">
          <button onClick={() => setMode('select')} className={`tool-btn ${mode === 'select' ? 'active text-cyan-400 bg-white/5' : ''}`} title="Seleccionar"><MousePointer2 size={16} /></button>
          <button onClick={() => setMode('link')} className={`tool-btn ${mode === 'link' ? 'active text-cyan-400 bg-white/5' : ''}`} title="Conectar"><LinkIcon size={16} /></button>
          <button onClick={() => setMode('eraser')} className={`tool-btn ${mode === 'eraser' ? 'active text-red-400 bg-white/5' : ''}`} title="Eliminar"><Eraser size={16} /></button>
        </div>

        {/* LAYOUT CONTROLS */}
        <div className="absolute bottom-6 left-6 z-30 glass-panel rounded-lg flex items-center p-1 gap-1 border border-white/5 bg-black/40 backdrop-blur-xl">
          <button onClick={() => applyLayout('grid')} className={`tool-btn ${activeLayout === 'grid' ? 'bg-cyan-900/50 text-cyan-400 border border-cyan-800' : ''}`} title="Cuadrícula"><Grid size={16} /></button>
          <button onClick={() => applyLayout('radial')} className={`tool-btn ${activeLayout === 'radial' ? 'bg-cyan-900/50 text-cyan-400 border border-cyan-800' : ''}`} title="Radial"><CircleDot size={16} /></button>
          <button onClick={() => applyLayout('tree')} className={`tool-btn ${activeLayout === 'tree' ? 'bg-cyan-900/50 text-cyan-400 border border-cyan-800' : ''}`} title="Árbol"><GitBranch size={16} /></button>
        </div>

        {/* WORKSPACE */}
        <div ref={workspaceRef} className="flex-1 relative cursor-crosshair overflow-hidden"
          onMouseDown={(e) => {
            if (mode === 'add') {
              const rect = workspaceRef.current!.getBoundingClientRect();
              const id = `N_${Date.now()}`;
              setNodes(prev => [...prev, { id, type: addType, data: {}, notes: '', x: (e.clientX - rect.left - offset.x) / scale, y: (e.clientY - rect.top - offset.y) / scale }]);
              setSelectedNodeId(id); setMode('select'); setIsEditing(true); setShowAdvancedProps(false);
            } else if (mode === 'select' && !draggingNode) {
              setIsDraggingCanvas(true); setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
              if (e.target === e.currentTarget) { setSelectedNodeId(null); setIsEditing(false); }
            }
          }}
          onMouseMove={(e) => {
            const r = workspaceRef.current!.getBoundingClientRect();
            const mx = (e.clientX - r.left - offset.x) / scale;
            const my = (e.clientY - r.top - offset.y) / scale;

            if (draggingNode) {
              const node = nodes.find(n => n.id === draggingNode);
              const vNode = layoutData.virtualNodes.find(vn => vn.id === draggingNode);

              if (vNode) {
                const oldX = virtualNodePositions[draggingNode]?.x || vNode.x;
                const oldY = virtualNodePositions[draggingNode]?.y || vNode.y;
                const dx = mx - oldX;
                const dy = my - oldY;
                setVirtualNodePositions((prev: any) => ({ ...prev, [draggingNode]: { x: mx, y: my } }));
                const targetId = vNode.targetId;
                const type = vNode.type;
                setNodes(prev => prev.map(n => {
                  const isChild = n.type === type && links.some(l => (l.source === targetId && l.target === n.id) || (l.target === targetId && l.source === n.id));
                  if (isChild) {
                    return { ...n, x: n.x + dx, y: n.y + dy };
                  }
                  return n;
                }));
              } else if (node) {
                setNodes(prev => prev.map(n => n.id === draggingNode ? { ...n, x: mx, y: my } : n));
              }
            } else if (isDraggingCanvas) {
              setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
            }
          }}
          onMouseUp={() => { setDraggingNode(null); setIsDraggingCanvas(false); }}
        >
          {/* DOT GRID */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
              backgroundSize: `${50 * scale}px ${50 * scale}px`,
              backgroundPosition: `${offset.x}px ${offset.y}px`
            }} />

          {/* SVG LAYER (CURVAS BEZIER MEJORADAS) */}
          {/* SVG LAYER (CURVAS BEZIER MEJORADAS & INTERACTIVAS) */}
          <svg className="absolute inset-0 w-full h-full z-0 pointer-events-none">
            <g transform={`translate(${offset.x}, ${offset.y}) scale(${scale})`}>
              {layoutData.displayLinks.map((l, i) => {
                const s = nodes.find(n => n.id === l.source) || layoutData.virtualNodes.find(n => n.id === l.source);
                const t = nodes.find(n => n.id === l.target) || layoutData.virtualNodes.find(n => n.id === l.target);
                if (!s || !t) return null;

                const dx = t.x - s.x;
                const dy = t.y - s.y;
                const pathData = `M ${s.x} ${s.y} C ${s.x + dx * 0.5} ${s.y}, ${t.x - dx * 0.5} ${t.y}, ${t.x} ${t.y}`;

                return (
                  <g key={l.id || i}
                    className={`${mode === 'eraser' ? 'cursor-pointer hover:opacity-50' : ''}`}
                    onClick={(e) => {
                      if (mode === 'eraser') {
                        e.stopPropagation();
                        setLinks(prev => prev.filter(link => link.id !== l.id));
                      }
                    }}
                  >
                    {/* Invisible Hit Area (Wider) */}
                    <path d={pathData} stroke="transparent" strokeWidth="15" fill="none" className="pointer-events-auto" />

                    {/* Visual Line */}
                    <path d={pathData} stroke={mode === 'eraser' ? '#ef4444' : "rgba(6,182,212,0.1)"} strokeWidth="4" fill="none" className={`transition-all ${mode === 'eraser' ? 'opacity-50' : ''}`} />
                    <path d={pathData} stroke={mode === 'eraser' ? '#f87171' : "#444"} strokeWidth="1.5" fill="none" className="transition-all pointer-events-none" />
                  </g>
                );
              })}
            </g>
          </svg>

          {/* NODES LAYER */}
          <div className="absolute inset-0 pointer-events-none origin-top-left z-10" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}>
            {layoutData.virtualNodes.map((gv: any) => (
              <div key={gv.id}
                onMouseDown={(e) => { e.stopPropagation(); setDraggingNode(gv.id); }}
                onClick={(e) => { e.stopPropagation(); toggleGroup(gv.groupKey); }}
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer flex flex-col items-center group/vnode"
                style={{ left: gv.x, top: gv.y }}>
                <div className={`w-9 h-9 rounded-full border border-dashed flex items-center justify-center bg-[#0a0a0a] transition-all hover:border-cyan-500 hover:scale-110 shadow-lg
                        ${gv.expanded ? 'border-cyan-500 shadow-cyan-500/20' : 'border-neutral-600'}`}>
                  {React.createElement(ENTITY_CONFIG[gv.type].icon, { size: 15, className: gv.expanded ? 'text-cyan-400' : 'text-neutral-500' })}
                </div>
                <span className={`mt-1.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-colors
                        ${gv.expanded ? 'bg-cyan-950 text-cyan-400' : 'bg-neutral-900 text-neutral-500'}`}>
                  {gv.count}
                </span>
              </div>
            ))}

            {nodes.filter(n => layoutData.visibleIds.has(n.id)).map(node => {
              const display = getNodeDisplayInfo(node);
              const isSel = selectedNodeId === node.id;
              const isCollapsed = collapsedTargets.has(node.id);
              const childCount = links.filter(l => l.source === node.id || l.target === node.id).length;

              return (
                <div key={node.id}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    if (mode === 'eraser') {
                      setNodes(prev => prev.filter(n => n.id !== node.id));
                      setLinks(prev => prev.filter(l => l.source !== node.id && l.target !== node.id));
                      return;
                    }
                    if (mode === 'link') {
                      if (linkingSource) { setLinks(p => [...p, { id: `L_${Date.now()}`, source: linkingSource, target: node.id }]); setLinkingSource(null); }
                      else setLinkingSource(node.id);
                    } else {
                      setSelectedNodeId(node.id); setDraggingNode(node.id); setShowAdvancedProps(false);
                    }
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    // if (node.type === 'target' && mode === 'select') {
                    //   toggleTargetCollapse(node.id);
                    // }
                  }}
                  onMouseEnter={() => {
                    if ((window as any).hoverTimeout) { clearTimeout((window as any).hoverTimeout); (window as any).hoverTimeout = null; }
                    setHoveredNodeId(node.id);
                  }}
                  onMouseLeave={() => { (window as any).hoverTimeout = setTimeout(() => { setHoveredNodeId(null); }, 500); }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer flex flex-col items-center group
                     ${isSel ? 'z-50 scale-110' : 'z-10'}`}
                  style={{ left: node.x, top: node.y }}>

                  {/* GLOW EFFECT & NODE STYLE */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-[#0a0a0a] border-2 transition-all duration-300 relative overflow-hidden
                       ${isSel ? 'border-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.4)] ring-1 ring-white/20' : 'border-white/10 group-hover:border-cyan-500/50 group-hover:shadow-[0_0_15px_rgba(6,182,212,0.2)]'}
                       ${linkingSource === node.id ? 'ring-2 ring-emerald-500 animate-pulse' : ''}
                       ${isCollapsed ? 'ring-2 ring-red-500/50' : ''}`}>

                    {/* Background sheen */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                    {React.createElement(display.Icon, { size: 20, style: { color: isSel ? '#22d3ee' : display.color }, className: "transition-colors" })}

                    {isCollapsed && childCount > 0 && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center shadow-lg border border-black">
                        {childCount}
                      </div>
                    )}
                  </div>

                  <div className={`mt-2 px-3 py-1 rounded-full bg-black/80 border border-white/10 backdrop-blur-sm text-[9px] font-bold tracking-widest text-neutral-300 pointer-events-none transition-all
                        ${isSel ? 'opacity-100 text-cyan-400 border-cyan-500/30 translate-y-0' : 'opacity-70 group-hover:opacity-100 group-hover:translate-y-0 translate-y-1'}`}>
                    {display.main}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* EDITOR SIDEBAR (PANEL DERECHO) */}
        {selectedNodeId && isEditing && getNodeInfo(selectedNodeId) && (
          <div className="absolute top-20 right-6 w-80 glass-panel rounded-xl flex flex-col z-50 animate-slide-down shadow-2xl max-h-[calc(100vh-6rem)] flex flex-col bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/10">
            <div className="p-4 border-b border-white/10 flex justify-between items-center shrink-0 rounded-t-xl">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,1)]"></div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-300">Inspector</span>
              </div>
              <button onClick={() => setIsEditing(false)} className="text-neutral-500 hover:text-white"><X size={14} /></button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] text-cyan-700 font-bold uppercase block tracking-wider flex items-center gap-2">
                    <Calendar size={10} /> Fecha
                  </label>
                  <input type="date" value={getNodeInfo(selectedNodeId)!.date || ''}
                    onChange={(e) => setNodes((p: any) => p.map((n: any) => n.id === selectedNodeId ? { ...n, date: e.target.value } : n))}
                    className="w-full bg-black border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:border-cyan-500 outline-none transition-all placeholder-neutral-700" />
                </div>
                {getNodeInfo(selectedNodeId)!.type === 'ip' && (
                  <div className="space-y-1">
                    <label className="text-[9px] text-cyan-700 font-bold uppercase block tracking-wider flex items-center gap-2">
                      <Monitor size={10} /> Hora
                    </label>
                    <input type="time" value={getNodeInfo(selectedNodeId)!.data.time || ''}
                      onChange={(e) => setNodes((p: any) => p.map((n: any) => n.id === selectedNodeId ? { ...n, data: { ...n.data, time: e.target.value } } : n))}
                      className="w-full bg-black border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:border-cyan-500 outline-none transition-all placeholder-neutral-700" />
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {ENTITY_CONFIG[getNodeInfo(selectedNodeId)!.type].fields.slice(0, 5).map((f: any) => (
                  <div key={f.key} className="space-y-1 group">
                    <label className="text-[9px] text-neutral-500 font-bold uppercase block tracking-wider group-focus-within:text-cyan-500 transition-colors">{f.label}</label>
                    <input type="text" value={getNodeInfo(selectedNodeId)!.data[f.key] || ''}
                      onChange={(e) => setNodes(p => p.map(n => n.id === selectedNodeId ? { ...n, data: { ...n.data, [f.key]: e.target.value } } : n))}
                      className="w-full bg-black border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:border-cyan-500 outline-none transition-all placeholder-neutral-800"
                      placeholder={`...`} />
                  </div>
                ))}
              </div>

              {ENTITY_CONFIG[getNodeInfo(selectedNodeId)!.type].fields.length > 5 && (
                <div className="pt-2 border-t border-white/5">
                  <button
                    onClick={() => setShowAdvancedProps(!showAdvancedProps)}
                    className="w-full flex items-center justify-between p-2 rounded hover:bg-white/5 group transition-all"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-600 group-hover:text-cyan-400 transition-colors">
                      {showAdvancedProps ? 'Menos Detalles' : 'Propiedades Avanzadas'}
                    </span>
                    <ChevronDown size={14} className={`text-cyan-600 transition-transform duration-300 ${showAdvancedProps ? 'rotate-180' : ''}`} />
                  </button>

                  {showAdvancedProps && (
                    <div className="grid grid-cols-2 gap-3 pt-3 animate-slide-down">
                      {ENTITY_CONFIG[getNodeInfo(selectedNodeId)!.type].fields.slice(5).map((f: any) => (
                        <div key={f.key} className="space-y-1">
                          <label className="text-[8px] text-neutral-600 font-bold uppercase block truncate">{f.label}</label>
                          <input type="text" value={getNodeInfo(selectedNodeId)!.data[f.key] || ''}
                            onChange={(e) => setNodes(p => p.map(n => n.id === selectedNodeId ? { ...n, data: { ...n.data, [f.key]: e.target.value } } : n))}
                            className="w-full bg-black border border-white/10 rounded px-2 py-1 text-[11px] text-neutral-300 focus:border-cyan-800 outline-none transition-colors" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-white/10 bg-[#0a0a0a]/95 shrink-0 rounded-b-xl flex gap-2">
              <button onClick={() => handleEnrich(selectedNodeId)} className="flex-1 py-1.5 bg-cyan-950/20 border border-cyan-900/50 text-cyan-400 text-[10px] font-bold uppercase tracking-wider rounded hover:bg-cyan-900/40 hover:text-cyan-300 transition shadow-lg shadow-cyan-900/10 flex items-center justify-center gap-2 group">
                <Shield size={12} className="group-hover:rotate-12 transition-transform" /> Auto-Completar
              </button>
              <button onClick={() => { setNodes(p => p.filter(n => n.id !== selectedNodeId)); setLinks(l => l.filter(x => x.source !== selectedNodeId && x.target !== selectedNodeId)); setIsEditing(false); }} className="p-1.5 bg-red-950/10 border border-red-900/20 text-red-600 rounded hover:bg-red-900/30 hover:text-red-500 transition"><Trash2 size={14} /></button>
            </div>
          </div>
        )}

        {/* ZOOM CONTROLS */}
        <div className="absolute bottom-6 right-6 flex flex-col gap-1 glass-panel rounded-lg p-1 border border-white/5 bg-black/40 backdrop-blur-xl">
          <button onClick={() => setScale(s => Math.min(4, s + 0.1))} className="tool-btn"><ZoomIn size={16} /></button>
          <button onClick={() => setScale(s => Math.max(0.1, s - 0.1))} className="tool-btn"><ZoomOut size={16} /></button>
          <button onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }} className="tool-btn"><Move size={16} /></button>
        </div>

        {/* HOVER TOOLTIP CARD */}
        {hoveredNodeId && !draggingNode && getNodeInfo(hoveredNodeId) && (() => {
          const n = getNodeInfo(hoveredNodeId)!;
          const screenX = (n.x * scale) + offset.x;
          const screenY = (n.y * scale) + offset.y;
          // Decide if we show on Left or Right based on screen width (default to Right unless close to edge)
          const showLeft = screenX > (window.innerWidth - 300);

          return (
            <div
              className="absolute z-50 pointer-events-auto"
              style={{
                // If showing left, position to left of node (- gap). If right, position to right (+ gap).
                left: showLeft ? (screenX - (25 * scale)) : (screenX + (25 * scale)),
                top: screenY - 20, // Vertically aligned slightly above center
                transform: showLeft ? 'translateX(-100%)' : 'none'
              }}
              onMouseEnter={() => {
                if ((window as any).hoverTimeout) {
                  clearTimeout((window as any).hoverTimeout);
                  (window as any).hoverTimeout = null;
                }
              }}
              onMouseLeave={() => {
                (window as any).hoverTimeout = setTimeout(() => {
                  setHoveredNodeId(null);
                }, 500); // Increased to 500ms for better reachability
              }}
            >
              <div className={`bg-black/95 backdrop-blur-xl border border-cyan-500/50 rounded-lg p-3 shadow-[0_0_30px_rgba(6,182,212,0.2)] flex flex-col gap-2 min-w-[240px] animate-fade-in mb-2 cursor-default relative
                  ${showLeft ? 'origin-right' : 'origin-left'}`}>

                <div className="flex items-center justify-between border-b border-white/20 pb-2">
                  <div className="flex items-center gap-2">
                    {React.createElement(ENTITY_CONFIG[n.type]?.icon || CircleDot, { size: 14, className: "text-cyan-400" })}
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white">
                      {ENTITY_CONFIG[n.type]?.label || 'ENTIDAD'}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNodeId(hoveredNodeId);
                      setIsEditing(true);
                      setHoveredNodeId(null);
                    }}
                    className="p-1.5 hover:bg-cyan-500/20 rounded-md text-neutral-400 hover:text-cyan-400 transition-all border border-transparent hover:border-cyan-500/30 group"
                    title="Editar Información"
                  >
                    <Edit3 size={14} className="group-hover:scale-110 transition-transform" />
                  </button>
                </div>

                <div className="space-y-1.5 py-1">
                  {Object.entries(n.data)
                    .filter(([k, v]) => v && typeof v === 'string' && v.trim() !== '' && !['x', 'y', 'id', 'label'].includes(k))
                    .slice(0, 8) // Increased to 8 fields
                    .map(([k, v]: [string, any]) => {
                      const field = ENTITY_CONFIG[n.type]?.fields?.find((f: any) => f.key === k);
                      const label = field ? field.label : k.replace(/_/g, ' ').toUpperCase();
                      return (
                        <div key={k} className="flex flex-col text-[10px] leading-tight">
                          <span className="text-neutral-500 font-mono uppercase text-[9px] mb-0.5">{label}</span>
                          <span className="text-neutral-200 font-medium break-words max-h-[60px] overflow-hidden text-ellipsis">{v}</span>
                        </div>
                      );
                    })}
                  {Object.keys(n.data).length === 0 && (
                    <span className="text-neutral-600 text-[10px] italic">Sin datos adicionales</span>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* SETTINGS MODAL */}
        {showSettings && (
          <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center">
            <div className="w-[500px] glass-panel rounded-xl shadow-2xl p-6 border border-white/10 relative bg-[#0a0a0a]">
              <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 text-neutral-500 hover:text-white"><X size={16} /></button>
              <h2 className="text-sm font-bold uppercase tracking-widest text-white mb-6 flex items-center gap-2">
                <Settings size={16} className="text-cyan-400" /> Configuración del Sistema
              </h2>
              <div className="space-y-6">
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-neutral-400 uppercase">API Keys (Enrichment)</h3>
                  <div className="space-y-2">
                    <label className="block text-[10px] text-neutral-500 uppercase font-bold">Shodan API Key</label>
                    <input type="password" value={apiKeys.shodan} onChange={e => setApiKeys((p: any) => ({ ...p, shodan: e.target.value }))}
                      className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none" placeholder="sk_..." />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] text-neutral-500 uppercase font-bold">VirusTotal API Key</label>
                    <input type="password" value={apiKeys.virustotal} onChange={e => setApiKeys((p: any) => ({ ...p, virustotal: e.target.value }))}
                      className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none" placeholder="vt_..." />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] text-neutral-500 uppercase font-bold">AbuseIPDB API Key</label>
                    <input type="password" value={apiKeys.abuseipdb} onChange={e => setApiKeys((p: any) => ({ ...p, abuseipdb: e.target.value }))}
                      className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none" placeholder="abuse_..." />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] text-neutral-500 uppercase font-bold">Hunter.io API Key</label>
                    <input type="password" value={apiKeys.hunter} onChange={e => setApiKeys((p: any) => ({ ...p, hunter: e.target.value }))}
                      className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none" placeholder="hunter_..." />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] text-neutral-500 uppercase font-bold">Numverify API Key (Phone)</label>
                    <input type="password" value={apiKeys.numverify} onChange={e => setApiKeys((p: any) => ({ ...p, numverify: e.target.value }))}
                      className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none" placeholder="nv_..." />
                  </div>
                </div>
                <div className="pt-6 border-t border-white/10 flex justify-end gap-3">
                  <button onClick={() => setShowSettings(false)} className="px-4 py-2 text-xs font-bold text-neutral-400 hover:text-white transition">Cancelar</button>
                  <button onClick={() => setShowSettings(false)} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded transition shadow-lg shadow-cyan-900/50">Guardar Cambios</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TIMELINE PANEL */}
        {showTimeline && (
          <TimelinePanel
            nodes={nodes}
            onNodeClick={(id) => { setSelectedNodeId(id); setHoveredNodeId(null); setIsEditing(true); }}
            onClose={() => setShowTimeline(false)}
          />
        )}
      </main>
    </div>
  );
}