import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { useGraphStore } from './store/useGraphStore';
import { ENTITY_CONFIG } from './constants/entities';
import { toPng, toJpeg } from 'html-to-image';
import { generatePDFReport } from './utils/pdfGenerator';
import { TimelinePanel } from './TimelinePanel';
import { Sidebar } from './components/Sidebar';
import { InspectorPanel } from './components/InspectorPanel';
import { Minimap } from './components/Minimap';
import { ContextMenu } from './components/ContextMenu';
import {
  User, Mail, Phone, Globe, CreditCard, FileText, Link as LinkIcon,
  Trash2, Save, ZoomIn, ZoomOut, Move, Shield, MousePointer2, Eraser, Search,
  Smartphone, Building, X, GitBranch, CircleDot, Grid, Edit3, Lock,
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
  const [isEditing, setIsEditing] = useState(false);
  const [linkingSource, setLinkingSource] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const hoverTimeoutRef = React.useRef<any>(null);
  const dragStartPosRef = React.useRef<{ x: number, y: number } | null>(null);
  const justLinkedRef = React.useRef(false);

  // UI Functionality State
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, nodeId: string, nodeType: string } | null>(null);

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

  // PREVENT BROWSER ZOOM (Ctrl+Wheel) & HANDLE CUSTOM ZOOM
  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;

    const handleWheel = (e: WheelEvent) => {
      // Check for CTRL + WHEEL (Zoom)
      if (e.ctrlKey) {
        e.preventDefault();
        e.stopPropagation();

        const zoomSensitivity = 0.001;
        const delta = e.deltaY;
        setScale(s => Math.min(Math.max(0.1, s - delta * zoomSensitivity), 3));
      }
      // OPTIONAL: Prevent default scrolling if we want ONLY middle-click pan?
      // For now, let's leave default scroll unless Ctrl is pressed.
    };

    // Use { passive: false } to allow preventDefault()
    workspace.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      workspace.removeEventListener('wheel', handleWheel);
    };
  }, [isWelcomeScreen]);

  // Layout State
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set()); // Format: "parentId_type"
  const [collapsedTargets, setCollapsedTargets] = useState<Set<string>>(new Set()); // Format: "targetId"
  const [lockedNodes, setLockedNodes] = useState<Set<string>>(new Set());
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
          // Logic to load last case if needed
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
        const res = await axios.post('http://localhost:3001/api/cases', {
          name: `IMPORT_${Date.now()}`,
          description: 'Importado de JSON'
        });
        setCurrentCaseId(res.data.id);

        if (json.nodes && json.links) {
          setNodes(json.nodes);
          setLinks(json.links);
          setCollapsedGroups(new Set());
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

  // --- ENRICHMENT ---
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

  const handleNodeContextMenu = (e: React.MouseEvent, node: any) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      nodeId: node.id,
      nodeType: node.type
    });
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
      await generatePDFReport(workspaceRef, nodes, currentCaseId || "INVESTIGACIÓN");
    } catch (e) {
      console.error("PDF Fail", e);
    }
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

  const toggleGroupCollapse = (parentId: string, type: string) => {
    if (draggingNode) return;
    const key = `${parentId}_${type}`;
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleLink = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const exists = links.some(l => (l.source === sourceId && l.target === targetId) || (l.source === targetId && l.target === sourceId));
    if (!exists) {
      setLinks(prev => [...prev, { id: `L_${Date.now()}`, source: sourceId, target: targetId, caseId: currentCaseId || 'DRAFT' }]);
    }
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

  // --- LÓGICA DE LAYOUT ---
  const applyLayout = (type: string) => {
    setActiveLayout(type);
    if (nodes.length === 0) return;

    const newNodes = [...nodes];
    const w = workspaceRef.current ? workspaceRef.current.clientWidth : window.innerWidth;
    const h = workspaceRef.current ? workspaceRef.current.clientHeight : window.innerHeight;
    const cx = (w / 2 - offset.x) / scale; // Adjust center based on pan/zoom
    const cy = (h / 2 - offset.y) / scale;

    const targets = newNodes.filter(n => n.type === 'target');
    const rootId = targets.length > 0 ? targets[0].id : newNodes[0].id;

    // Helper to get children
    const getChildren = (pid: string) => links.filter(l => l.source === pid).map(l => l.target);

    if (type === 'grid') {
      const cols = Math.ceil(Math.sqrt(newNodes.length));
      newNodes.forEach((node, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        node.x = cx + (col - cols / 2) * 150;
        node.y = cy + (row - cols / 2) * 150;
      });
    } else if (type === 'radial') {
      newNodes.forEach((node, i) => {
        if (node.id === rootId) {
          node.x = cx; node.y = cy;
        } else {
          const angle = (i / (newNodes.length - 1)) * 2 * Math.PI;
          const radius = 300;
          node.x = cx + Math.cos(angle) * radius;
          node.y = cy + Math.sin(angle) * radius;
        }
      });
    } else if (type === 'tree') {
      // Simple tree layout
      const levels: { [key: string]: number } = {};
      const processLevel = (id: string, lvl: number) => {
        levels[id] = lvl;
        getChildren(id).forEach(cid => processLevel(cid, lvl + 1));
      };
      processLevel(rootId, 0);

      const levelCounts: { [key: number]: number } = {};
      newNodes.forEach(n => {
        const lvl = levels[n.id] || 0;
        levelCounts[lvl] = (levelCounts[lvl] || 0) + 1;
      });

      const currentCount: { [key: number]: number } = {};
      newNodes.forEach(n => {
        const lvl = levels[n.id] || 0;
        const count = levelCounts[lvl];
        const idx = currentCount[lvl] || 0;
        currentCount[lvl] = idx + 1;

        n.x = cx + (idx - (count - 1) / 2) * 120;
        n.y = cy + lvl * 150;
      });
    } else if (type === 'force') {
      // Force layout is typically handled by D3 or similar, usually continuous.
      // For static apply, we might just randomize or leave as is if physics engine is separate.
      // Assuming user wants to "reset" to a random-ish state to let simulation take over if we had one.
      // Since we don't have a live simulation engine in this snippet, we'll do a circle pack.
      newNodes.forEach((node, i) => {
        const angle = (i / newNodes.length) * 2 * Math.PI;
        const radius = 200 + Math.random() * 100;
        node.x = cx + Math.cos(angle) * radius;
        node.y = cy + Math.sin(angle) * radius;
        if (node.id === rootId) { node.x = cx; node.y = cy; }
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
      // ... Virtual Node logic ...
    });

    // ... Visibility logic ...

    links.forEach(l => displayLinks.push({ ...l, isVirtual: false })); // Simplified for now

    return { visibleIds, virtualNodes, displayLinks };
  }, [nodes, links, collapsedGroups, expandedCategories, virtualNodePositions, activeLayout]);

  // AUTO-SPREAD CHILDREN (Keep useEffect)
  useEffect(() => {
    // ...
  }, [expandedCategories, activeLayout, nodes.length]);


  // --- RENDER WELCOME SCREEN ---
  if (isWelcomeScreen) {
    return (
      <div className="h-screen bg-[#050505] flex items-center justify-center font-sans text-white bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900 via-[#050505] to-[#050505]">
        {/* Welcome Screen Content */}
        <div className="max-w-md w-full p-8 border border-white/5 rounded-2xl text-center space-y-8 animate-in fade-in zoom-in duration-500 bg-white/5 backdrop-blur-xl shadow-2xl">
          <div className="space-y-4">
            <div className="w-20 h-20 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(6,182,212,0.15)]"><Shield className="text-cyan-400" size={40} /></div>
            <h1 className="text-3xl font-bold tracking-[0.3em] uppercase italic text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-500">NEXUS</h1>
          </div>
          <div className="grid gap-3">
            <button onClick={() => handleCreateProject(`CASE_${Math.floor(Math.random() * 1000)}`)} className="flex items-center gap-4 p-4 bg-black/40 border border-white/10 rounded-xl hover:bg-cyan-500/10 transition-all text-neutral-300 hover:text-cyan-400 group">
              <FolderPlus size={20} className="group-hover:text-cyan-400 text-neutral-500 transition-colors" />
              <span className="font-bold text-sm tracking-wide">NUEVO PROYECTO</span>
            </button>

            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={handleImportProject}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <button className="w-full flex items-center gap-4 p-4 bg-black/40 border border-white/10 rounded-xl hover:bg-cyan-500/10 transition-all text-neutral-300 hover:text-cyan-400 group">
                <Upload size={20} className="group-hover:text-cyan-400 text-neutral-500 transition-colors" />
                <span className="font-bold text-sm tracking-wide">IMPORTAR PROYECTO</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- APP RENDER ---
  return (
    <div className="flex h-screen bg-[#111111] text-neutral-300 font-sans selection:bg-cyan-500/20" onContextMenu={(e) => e.preventDefault()}>

      <Sidebar
        mode={mode} setMode={setMode}
        addType={addType} setAddType={setAddType}
        showTimeline={showTimeline} setShowTimeline={setShowTimeline}
        handleExportPDF={handleExportPDF} setShowSettings={setShowSettings}
        setShowExportMenu={setShowExportMenu}
      />

      <main className="flex-1 flex flex-col relative overflow-hidden bg-[#111111]">
        {/* ... */}

        {/* EXPORT MENU  */}
        {showExportMenu && (
          <div className="absolute bottom-20 left-20 z-50 bg-[#0a0a0a] border border-white/10 rounded-lg shadow-2xl p-2 w-48 flex flex-col gap-1 animate-in slide-in-from-bottom-2 fade-in">
            <div className="text-[10px] font-bold text-neutral-500 px-2 py-1 uppercase tracking-wider">Guardar Como</div>
            <button onClick={() => handleExport('json')} className="flex items-center gap-3 px-3 py-2 hover:bg-white/5 rounded text-xs text-neutral-300 hover:text-cyan-400 transition-colors">
              <FileJson size={14} /> Archivo JSON (Proyecto)
            </button>
            <div className="h-px bg-white/5 my-1" />
            <button onClick={() => handleExport('jpg')} className="flex items-center gap-3 px-3 py-2 hover:bg-white/5 rounded text-xs text-neutral-300 hover:text-cyan-400 transition-colors">
              <ImageIcon size={14} /> Imagen JPG
            </button>
            <button onClick={() => handleExport('png')} className="flex items-center gap-3 px-3 py-2 hover:bg-white/5 rounded text-xs text-neutral-300 hover:text-cyan-400 transition-colors">
              <ImageIcon size={14} /> Imagen PNG (Transparente)
            </button>
            <button onClick={() => setShowExportMenu(false)} className="mt-2 text-[10px] text-center w-full py-1 text-neutral-600 hover:text-white transition">Cancelar</button>
          </div>
        )}

        {/* TIMELINE */}
        {/* HEADER */}
        <header className="h-14 bg-[#111111]/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 z-30 shrink-0 relative">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsWelcomeScreen(true)} className="w-8 h-8 flex items-center justify-center bg-cyan-950/30 rounded border border-cyan-500/20 text-cyan-400 hover:scale-105 transition"><Shield size={16} /></button>
            <h1 className="font-bold text-lg tracking-widest text-white uppercase italic">NEXUS <span className="text-neutral-600 font-mono text-[10px] not-italic tracking-normal">{currentCaseId || 'UNSAVED'}</span></h1>
          </div>
          {/* ... Header Right with Export ... */}
        </header>

        {/* ZOOM CONTROLS - TOP CENTER (Redirected) */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 flex gap-2">
          <div className="glass-panel p-1 rounded-full flex gap-1 border border-white/5 bg-[#161b22]/90 backdrop-blur-xl shadow-xl">
            <button onClick={() => setScale(s => Math.max(s - 0.1, 0.1))} className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition" title="Zoom Out"><ZoomOut size={16} /></button>
            <div className="w-px h-6 bg-white/10 my-auto mx-1"></div>
            <button onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }} className="w-20 px-2 text-[10px] font-bold tracking-widest flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 rounded transition uppercase" title="Reset View">
              {Math.round(scale * 100)}%
            </button>
            <div className="w-px h-6 bg-white/10 my-auto mx-1"></div>
            <button onClick={() => setScale(s => Math.min(s + 0.1, 3))} className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition" title="Zoom In"><ZoomIn size={16} /></button>
          </div>
        </div>

        {/* TOOLBAR */}
        <div className="absolute top-20 left-6 z-30 glass-panel rounded-lg flex items-center p-1 gap-1 border border-white/5 bg-black/40 backdrop-blur-xl">
          <button onClick={() => setMode('select')} className={`tool-btn ${mode === 'select' ? 'active text-cyan-400 bg-white/5' : ''}`} title="Seleccionar"><MousePointer2 size={16} /></button>
          <button onClick={() => setMode('link')} className={`tool-btn ${mode === 'link' ? 'active text-cyan-400 bg-white/5' : ''}`} title="Conectar"><LinkIcon size={16} /></button>
          <button onClick={() => setMode('eraser')} className={`tool-btn ${mode === 'eraser' ? 'active text-red-400 bg-white/5' : ''}`} title="Eliminar"><Eraser size={16} /></button>
        </div>

        {/* WORKSPACE */}
        <div ref={workspaceRef} className="flex-1 relative cursor-crosshair overflow-hidden"

          onMouseDown={(e) => {
            // MIDDLE CLICK PAN
            if (e.button === 1) { // Middle Mouse Button
              e.preventDefault();
              setIsDraggingCanvas(true);
              setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
              return;
            }

            // ... Mouse Down Logic ...
            setContextMenu(null); // Close context menu on click
            if (mode === 'add') {
              // ... add node ...
              const rect = workspaceRef.current!.getBoundingClientRect();
              const id = `N_${Date.now()}`;
              setNodes(prev => [...prev, { id, type: addType, data: {}, notes: '', x: (e.clientX - rect.left - offset.x) / scale, y: (e.clientY - rect.top - offset.y) / scale }]);
              setSelectedNodeId(id); setMode('select'); setIsEditing(true);
            }
            // ...
          }}
          onMouseMove={(e) => {
            // DRAGGING CANVAS (Middle Click or Space mode)
            if (isDraggingCanvas) {
              setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
              return;
            }

            if (draggingNode) {
              const rect = workspaceRef.current!.getBoundingClientRect();
              const mouseX = (e.clientX - rect.left - offset.x) / scale;
              const mouseY = (e.clientY - rect.top - offset.y) / scale;

              // Check if dragging a GROUP or a NORMAL NODE
              if (draggingNode.includes('_group')) {
                // GROUP DRAG LOGIC
                // 1. Move the Virtual Group Node
                setVirtualNodePositions((prev: any) => ({
                  ...prev,
                  [draggingNode]: { x: mouseX, y: mouseY }
                }));

                // 2. Move Children (Calculate Delta)
                // Problem: We need the OLD group position to calculate delta.
                // React state update is async.
                // Better approach: Calculate delta from MOUSE movement (e.movementX).

                const deltaX = e.movementX / scale;
                const deltaY = e.movementY / scale;

                // Find children of this group to move them
                // We need to parse the group ID or store map.
                // ID format: targetId_type_group
                // Let's iterate nodes and find matches.
                const [targetId, type] = draggingNode.split('_'); // Rough split, careful with IDs containing underscores.
                // Better: We stored 'childrenIds' in the renderNode but we can't access it here easily without re-deriving.
                // Re-deriving is fast enough.

                // Parse ID carefully: "TARGETID_TYPE_group"
                // Actually, let's just use the `nodes` array.
                // We need to find nodes that are children of the group's parent and match type?
                // Or... we passed `childrenIds` to the Group Node but that's in render.

                // Let's assume we can scan `nodes`.
                // Wait, `draggingNode` string ID is "parentId_type_group".
                // Let's regex it.
                const match = draggingNode.match(/(.+)_([^_]+)_group$/);
                if (match) {
                  const parentId = match[1];
                  const nodeType = match[2];

                  setNodes(prev => prev.map(n => {
                    // Move only children of the specific group
                    // To match logic: child acts as neighbor to parentId and has type nodeType?
                    // Or we rely on `links`?
                    // Relying on links in `prev`? No, links are separate state.
                    // We need to know who belongs to this group.
                    // "Children of target X with type Y".

                    // We need to verify connectivity.
                    // Simplified heuristic: If node.type === nodeType and is linked to parentId.
                    // This requires access to Links.

                    // Accessing 'links' state here is fine.
                    const isLinked = links.some(l =>
                      (l.source === parentId && l.target === n.id) ||
                      (l.target === parentId && l.source === n.id)
                    );

                    if (n.type === nodeType && isLinked) {
                      return { ...n, x: n.x + deltaX, y: n.y + deltaY };
                    }
                    return n;
                  }));
                }
              } else {
                // NORMAL NODE DRAG
                setNodes(prev => prev.map(n => n.id === draggingNode ? { ...n, x: mouseX, y: mouseY } : n));
              }
              return;
            }

            return;
          }}
          onMouseUp={() => { setDraggingNode(null); setIsDraggingCanvas(false); }}
        >
          {/* GRID (DOT PATTERN - WHITER DOTS) */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.8]" style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)',
            backgroundSize: `${25 * scale}px ${25 * scale}px`,
            backgroundPosition: `${offset.x}px ${offset.y}px`
          }} />

          {/* NODES LAYER */}
          <div className="absolute inset-0 pointer-events-none origin-top-left z-10" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}>

            {/* CALCULATE RENDER DATA (Virtual Hierarchy) */}
            {(() => {
              // We create a temporary structure for rendering to handle the "Target -> Group -> Child" logic
              // This replaces drawing raw links/nodes directly

              const renderNodes: any[] = [];
              const renderLinks: any[] = [];
              const processedNodeIds = new Set<string>();

              // 1. Add ALL Targets first
              nodes.filter(n => n.type === 'target').forEach(target => {
                const isTargetCollapsed = collapsedTargets.has(target.id);

                // Calculate Total Children for Badge
                const totalChildren = links.filter(l => l.source === target.id || l.target === target.id)
                  .filter(l => {
                    const neighborId = l.source === target.id ? l.target : l.source;
                    return nodes.find(n => n.id === neighborId)?.type !== 'target';
                  }).length;

                renderNodes.push({
                  ...target,
                  isVirtual: false,
                  collapsed: isTargetCollapsed,
                  totalChildren
                });
                processedNodeIds.add(target.id);

                // IF TARGET IS COLLAPSED, SKIP CHILDREN RENDERING (But mark them processed to avoid orphans)
                if (isTargetCollapsed) {
                  // Mark all children as processed
                  const childrenLinks = links.filter(l => l.source === target.id || l.target === target.id);
                  childrenLinks.forEach(l => {
                    const childId = l.source === target.id ? l.target : l.source;
                    // Verify it's not another target
                    if (nodes.find(n => n.id === childId)?.type !== 'target') {
                      processedNodeIds.add(childId);
                    }
                  });
                  return; // STOP HERE for this target
                }

                // 2. Process Children by Type (Normal Flow)
                const childrenLinks = links.filter(l => l.source === target.id || l.target === target.id);
                const childrenByType: { [key: string]: any[] } = {};

                childrenLinks.forEach(l => {
                  const childId = l.source === target.id ? l.target : l.source;
                  const child = nodes.find(n => n.id === childId);
                  if (child && child.type !== 'target') {
                    if (!childrenByType[child.type]) childrenByType[child.type] = [];
                    childrenByType[child.type].push(child);
                  }
                });

                // 3. Generate Groups or Direct Links
                Object.entries(childrenByType).forEach(([type, children]) => {
                  if (children.length > 1) {
                    // HAS GROUP
                    const groupId = `${target.id}_${type}_group`;
                    const isGroupCollapsed = collapsedGroups.has(`${target.id}_${type}`);

                    const avgX = children.reduce((sum, c) => sum + c.x, 0) / children.length;
                    const avgY = children.reduce((sum, c) => sum + c.y, 0) / children.length;

                    // User wants independent position. Use VIRTUAL POSITION if set, else CENTROID.
                    // CRITICAL: We DO NOT auto-update virtual position on re-renders, or it will snap back.
                    // We only set it if it's MISSING.

                    const existingPos = virtualNodePositions[groupId];
                    let groupX = existingPos ? existingPos.x : avgX;
                    let groupY = existingPos ? existingPos.y : avgY;

                    // If naive first render, save it? No, avoid infinite loop. Just use avgX as default.

                    const groupNode = {
                      id: groupId,
                      type: type, // Visual type
                      isGroup: true,
                      parentId: target.id,
                      childrenIds: children.map(c => c.id), // STORE CHILDREN IDs to allow mass-drag
                      count: children.length,
                      x: groupX,
                      y: groupY,
                      collapsed: isGroupCollapsed,
                      data: { label: `${children.length} ${type}s` }
                    };
                    renderNodes.push(groupNode);

                    // Link Target -> Group
                    renderLinks.push({
                      id: `link_${target.id}_${groupId}`,
                      x1: target.x, y1: target.y,
                      x2: groupX, y2: groupY,
                      isVirtual: true
                    });

                    // Always mark children as processed
                    children.forEach(child => processedNodeIds.add(child.id));

                    if (!isGroupCollapsed) {
                      // Link Group -> Children
                      children.forEach(child => {
                        renderNodes.push({ ...child, isVirtual: false });
                        renderLinks.push({
                          id: `link_${groupId}_${child.id}`,
                          x1: groupX, y1: groupY,
                          x2: child.x, y2: child.y,
                          isVirtual: true
                        });
                      });
                    }
                  } else {
                    // SINGLE CHILD - DIRECT LINK
                    children.forEach(child => {
                      renderNodes.push({ ...child, isVirtual: false });
                      processedNodeIds.add(child.id);
                      renderLinks.push({
                        id: `link_${target.id}_${child.id}`,
                        x1: target.x, y1: target.y,
                        x2: child.x, y2: child.y,
                        isVirtual: false // Real link visually
                      });
                    });
                  }
                });
              });

              // Add any orphans or unconnected nodes not processed (e.g. strict standalone? Unlikely in this app logic but safe to add)
              nodes.forEach(n => {
                if (!processedNodeIds.has(n.id) && n.type !== 'target') {
                  renderNodes.push(n);
                  // Find links for it? 
                  // Simplified: Only drawing hierarchy for Targets for now as per request.
                }
              });


              return (
                <>
                  {/* RENDER LINKS */}
                  <svg className="absolute inset-0 w-full h-full z-0 pointer-events-none overflow-visible">
                    <g>
                      {renderLinks.map(l => {
                        // Calculate Smart Bezier Curve
                        const dx = Math.abs(l.x2 - l.x1);
                        const dy = Math.abs(l.y2 - l.y1);
                        const isHorizontal = dx > dy;

                        let d = '';
                        if (isHorizontal) {
                          // Horizontal S-Curve
                          const midX = (l.x1 + l.x2) / 2;
                          d = `M ${l.x1} ${l.y1} C ${midX} ${l.y1}, ${midX} ${l.y2}, ${l.x2} ${l.y2}`;
                        } else {
                          // Vertical S-Curve
                          const midY = (l.y1 + l.y2) / 2;
                          d = `M ${l.x1} ${l.y1} C ${l.x1} ${midY}, ${l.x2} ${midY}, ${l.x2} ${l.y2}`;
                        }

                        return (
                          <path
                            key={l.id}
                            d={d}
                            fill="none"
                            stroke="rgba(6,182,212,0.3)"
                            strokeWidth="2"
                          />
                        );
                      })}
                    </g>
                  </svg>

                  {/* RENDER NODES */}
                  {renderNodes.map(node => {
                    if (node.isGroup) {
                      // RENDERING GROUP NODE
                      const Icon = ENTITY_CONFIG[node.type]?.icon || CircleDot;
                      const isCollapsed = node.collapsed;

                      return (

                        <div key={node.id}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            // Start Group Drag
                            if (!isCollapsed) {
                              // If expanded, we drag group + children
                              setDraggingNode(node.id);
                              // We might need to store offset? Simplified logic: 
                              // We rely on global onMouseMove + node ID logic. 
                              // BUT: virtualNodePositions might be empty if never moved. 
                              // Initialize it NOW if empty to avoid jump?
                              if (!virtualNodePositions[node.id]) {
                                setVirtualNodePositions(prev => ({ ...prev, [node.id]: { x: node.x, y: node.y } }));
                              }
                            } else {
                              // If collapsed, just visual drag? 
                              // Simplified: Dragging works same way.
                              setDraggingNode(node.id);
                              if (!virtualNodePositions[node.id]) {
                                setVirtualNodePositions(prev => ({ ...prev, [node.id]: { x: node.x, y: node.y } }));
                              }
                            }
                          }}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleGroupCollapse(node.parentId, node.type); }}
                          className={`absolute -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-auto cursor-pointer flex flex-col items-center group
                                                    ${isCollapsed ? 'hover:scale-110' : ''}`}
                          style={{ left: node.x, top: node.y }}>

                          <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors shadow-lg backdrop-blur-md
                                                         bg-cyan-950/90 border-cyan-400 shadow-cyan-500/30`}>
                            <Icon size={20} className="text-cyan-400" />
                          </div>

                          {/* COUNT BADGE: ONLY VISIBLE IF COLLAPSED OR ALWAYS? 
                              User said: "ahora si hiciese click ... y quedarse solo el grupo ahora si con el 2"
                              This implies Badge is the indicator of hidden items. 
                              So logic: Show badge if isCollapsed.
                           */}
                          {isCollapsed && (
                            <div className="absolute -top-1 -right-1 bg-cyan-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-lg border border-white/20">
                              {node.count}
                            </div>
                          )}
                        </div>
                      );
                    } else {
                      // STANDARD NODE RENDERING
                      const display = getNodeDisplayInfo(node);
                      const isSel = selectedNodeId === node.id;
                      const isCollapsedTarget = node.collapsed; // Prop passed for Target

                      return (
                        <div key={node.id}
                          onClick={(e) => {
                            if (node.type === 'target' && mode === 'select') {
                              e.stopPropagation();
                              // CHECK IF JUST LINKED
                              if (justLinkedRef.current) {
                                justLinkedRef.current = false;
                                return;
                              }
                              // CHECK FOR DRAG
                              if (dragStartPosRef.current) {
                                const dist = Math.hypot(e.clientX - dragStartPosRef.current.x, e.clientY - dragStartPosRef.current.y);
                                if (dist > 5) return; // It was a drag, ignore click
                              }
                              toggleTargetCollapse(node.id);
                            }
                          }}
                          onMouseDown={(e) => {
                            dragStartPosRef.current = { x: e.clientX, y: e.clientY };
                            if (mode === 'select' || mode === 'link') {
                              e.stopPropagation();
                              if (e.button === 0) { // Left Click
                                if (mode === 'link') {
                                  if (!linkingSource) setLinkingSource(node.id);
                                  else {
                                    handleLink(linkingSource, node.id);
                                    setLinkingSource(null);
                                    setMode('select');
                                    // PREVENT IMMEDIATE CLICK TRIGGER
                                    justLinkedRef.current = true;
                                    setTimeout(() => justLinkedRef.current = false, 200);
                                  }
                                } else {
                                  setSelectedNodeId(node.id);
                                  // ONLY DRAG IF NOT LOCKED
                                  if (!lockedNodes.has(node.id)) {
                                    setDraggingNode(node.id);
                                  }
                                  setIsEditing(false); // Do not open edit mode automatically
                                }
                              }
                            } else if (mode === 'eraser') {
                              e.stopPropagation();
                              setNodes(prev => prev.filter(n => n.id !== node.id));
                              setLinks(prev => prev.filter(l => l.source !== node.id && l.target !== node.id));
                            }
                          }}
                          onMouseEnter={() => {
                            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                            setHoveredNodeId(node.id);
                          }}
                          onMouseLeave={() => {
                            hoverTimeoutRef.current = setTimeout(() => setHoveredNodeId(null), 300);
                          }}
                          onContextMenu={(e) => handleNodeContextMenu(e, node)}
                          className={`absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer flex flex-col items-center group ${isSel ? 'z-50 scale-110' : 'z-10'}`}
                          style={{ left: node.x, top: node.y }}>

                          {/* NODE LOCKING INDICATOR */}
                          {lockedNodes.has(node.id) && (
                            <div className="absolute -top-1 -left-1 bg-neutral-800 text-neutral-400 p-0.5 rounded-full border border-white/10 z-50">
                              <Lock size={10} />
                            </div>
                          )}

                          <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 relative overflow-hidden backdrop-blur-md
                 ${isSel ? 'bg-black/80 ring-2 ring-white/50' : 'bg-black/40 hover:bg-black/60'}
                 ${lockedNodes.has(node.id) ? 'opacity-80 grayscale-[0.5]' : ''}
              `}
                            style={{
                              boxShadow: isSel
                                ? `0 0 30px ${display.color}60, inset 0 0 10px ${display.color}20` // Selected Glow
                                : `0 0 15px ${display.color}20, inset 0 0 5px ${display.color}10`, // Passive Glow
                              border: `1px solid ${isSel ? display.color : display.color + '40'}` // Dynamic Border Color
                            }}
                          >

                            {React.createElement(display.Icon, { size: 20, style: { color: isSel ? '#fff' : display.color, filter: 'drop-shadow(0 0 5px rgba(0,0,0,0.5))' } })}
                          </div>

                          {/* TARGET COLLAPSE BADGE */}
                          {node.type === 'target' && isCollapsedTarget && (
                            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-lg border border-white/20">
                              {node.totalChildren}
                            </div>
                          )}

                          <div className="mt-2 text-[9px] font-mono font-medium tracking-tight text-cyan-100/70 bg-black/80 px-2 py-0.5 rounded border border-white/5 backdrop-blur-sm shadow-sm whitespace-nowrap overflow-hidden max-w-[120px] text-ellipsis"
                            style={{ borderColor: display.color + '30' }}
                          >
                            {display.main}
                          </div>
                        </div>
                      );
                    }
                  })}
                </>
              );
            })()}
          </div>
        </div>

        {/* INSPECTOR PANEL */}
        {/* INSPECTOR PANEL - ONLY SHOW ON EDIT */}
        {
          isEditing && (
            <InspectorPanel isEditing={isEditing} setIsEditing={setIsEditing} handleEnrich={handleEnrich} />
          )
        }

        {/* CONTEXT MENU */}
        {
          contextMenu && (
            <ContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              nodeId={contextMenu.nodeId}
              nodeType={contextMenu.nodeType}
              onClose={() => setContextMenu(null)}
              apiKeys={apiKeys}
              isLocked={lockedNodes.has(contextMenu.nodeId)}
              onToggleLock={() => {
                const id = contextMenu.nodeId;
                setLockedNodes(prev => {
                  const next = new Set(prev);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                });
              }}
            />
          )
        }



        {/* LAYOUT CONTROLS - TOP RIGHT (HORIZONTAL) */}
        <div className="absolute top-20 right-6 z-30 flex items-center gap-2 glass-panel p-1 rounded-lg border border-white/5 bg-black/40 backdrop-blur-xl">
          <button onClick={() => applyLayout('force')} className={`w-8 h-8 flex items-center justify-center rounded transition ${activeLayout === 'force' ? 'text-cyan-400 bg-cyan-950/30' : 'text-neutral-400 hover:text-white'}`} title="Fuerza"><Share2 size={16} /></button>
          <button onClick={() => applyLayout('grid')} className={`w-8 h-8 flex items-center justify-center rounded transition ${activeLayout === 'grid' ? 'text-cyan-400 bg-cyan-950/30' : 'text-neutral-400 hover:text-white'}`} title="Cuadrícula"><Grid size={16} /></button>
          <button onClick={() => applyLayout('radial')} className={`w-8 h-8 flex items-center justify-center rounded transition ${activeLayout === 'radial' ? 'text-cyan-400 bg-cyan-950/30' : 'text-neutral-400 hover:text-white'}`} title="Radial"><CircleDot size={16} /></button>
          <button onClick={() => applyLayout('tree')} className={`w-8 h-8 flex items-center justify-center rounded transition ${activeLayout === 'tree' ? 'text-cyan-400 bg-cyan-950/30' : 'text-neutral-400 hover:text-white'}`} title="Árbol"><GitBranch size={16} /></button>
        </div>



        {/* MINIMAP */}
        <Minimap
          nodes={nodes}
          offset={offset}
          scale={scale}
          viewportWidth={workspaceRef.current?.clientWidth || 0}
          viewportHeight={workspaceRef.current?.clientHeight || 0}
          onNavigate={(x, y) => setOffset({ x, y })}
        />

        {/* HOVER DETAILS CARD (WITH PENCIL) */}
        {
          hoveredNodeId && !contextMenu && !draggingNode && (
            (() => {
              const node = nodes.find(n => n.id === hoveredNodeId);
              if (!node) return null;
              return (
                <div className="absolute pointer-events-auto z-50 bg-[#0a0a0a]/95 border border-cyan-500/30 text-white p-3 rounded-lg shadow-2xl backdrop-blur-md max-w-xs animate-in fade-in zoom-in-95 duration-150"
                  style={{ left: (node.x * scale) + offset.x + 40, top: (node.y * scale) + offset.y - 40 }}
                  onMouseEnter={() => {
                    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                  }}
                  onMouseLeave={() => {
                    hoverTimeoutRef.current = setTimeout(() => setHoveredNodeId(null), 300);
                  }}
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2 gap-4">
                    <span className="font-bold text-xs text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow shadow-cyan-500/50" />
                      {node.type}
                    </span>
                    {/* PENCIL INSIDE THE CARD */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNodeId(node.id);
                        setIsEditing(true);
                        setHoveredNodeId(null);
                      }}
                      className="p-1 hover:bg-white/10 rounded text-neutral-400 hover:text-white transition-colors"
                      title="Editar en Panel Lateral"
                    >
                      <Edit3 size={12} />
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                    {Object.entries(node.data).map(([k, v]) => {
                      if (['x', 'y', 'id'].includes(k)) return null;
                      const valStr = typeof v === 'object' ? JSON.stringify(v) : String(v);
                      if (!valStr) return null;
                      return (
                        <div key={k} className="text-[10px] grid grid-cols-[70px_1fr] gap-2 items-start">
                          <span className="text-neutral-500 font-bold font-mono overflow-hidden text-ellipsis uppercase">{k}</span>
                          <span className="text-neutral-300 font-medium break-all leading-tight">{valStr}</span>
                        </div>
                      );
                    })}
                    {node.notes && (
                      <div className="mt-2 text-[10px] text-neutral-400 italic bg-white/5 p-1.5 rounded border border-white/5">
                        "{node.notes}"
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
          )
        }

        {/* SETTINGS MODAL */}
        {
          showSettings && (
            <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
              <div className="w-[500px] glass-panel rounded-xl shadow-2xl p-6 border border-white/10 relative bg-[#0a0a0a]">
                <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 text-neutral-500 hover:text-white"><X size={16} /></button>
                <h2 className="text-white font-bold mb-6 flex items-center gap-2"><Settings size={18} className="text-cyan-400" /> Configuración API</h2>

                <div className="space-y-4">
                  {['shodan', 'virustotal', 'hunter', 'abuseipdb', 'numverify'].map(key => (
                    <div key={key} className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider block">{key}</label>
                      <input
                        type="password"
                        value={apiKeys[key] || ''}
                        onChange={e => setApiKeys({ ...apiKeys, [key]: e.target.value })}
                        className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none transition-all placeholder-neutral-800"
                        placeholder={`Ingrese su API Key de ${key}...`}
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <button onClick={() => setShowSettings(false)} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-neutral-300 rounded text-xs font-bold transition">Cancelar</button>
                  <button onClick={() => setShowSettings(false)} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-bold transition shadow-lg shadow-cyan-500/20">Guardar Cambios</button>
                </div>
              </div>
            </div>
          )
        }

        {/* TIMELINE */}
        {showTimeline && <TimelinePanel nodes={nodes} onNodeClick={setSelectedNodeId} onClose={() => setShowTimeline(false)} />}
      </main >
    </div >
  );
}