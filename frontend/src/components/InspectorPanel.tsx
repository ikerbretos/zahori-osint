import React, { useState } from 'react';
import { useGraphStore } from '../store/useGraphStore';
import { ENTITY_CONFIG } from '../constants/entities';
import { X, Calendar, Monitor, ChevronDown, Shield, Trash2, Edit3, Save } from 'lucide-react';

interface InspectorPanelProps {
    isEditing: boolean;
    setIsEditing: (editing: boolean) => void;
    handleEnrich: (nodeId: string) => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({ isEditing, setIsEditing, handleEnrich }) => {
    const { nodes, setNodes, links, setLinks, selectedNodeId, setSelectedNodeId } = useGraphStore();
    const [showAdvancedProps, setShowAdvancedProps] = useState(false);

    const selectedNode = nodes.find(n => n.id === selectedNodeId);

    // Render if a node is selected (regardless of editing state)
    if (!selectedNode) return null;

    return (
        <div className="absolute top-20 right-6 w-80 glass-panel rounded-xl flex flex-col z-50 animate-slide-down shadow-2xl max-h-[calc(100vh-6rem)] bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/10">
            {/* HEADER */}
            <div className="p-4 border-b border-white/10 flex justify-between items-center shrink-0 rounded-t-xl bg-white/5">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full shadow-[0_0_10px_rgba(6,182,212,1)] ${isEditing ? 'bg-amber-500 shadow-amber-500/50' : 'bg-cyan-500'}`}></div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-300">
                        {isEditing ? 'Editando' : 'Detalles'}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {/* EDIT TOGGLE BUTTON - AS REQUESTED */}
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${isEditing ? 'bg-amber-500/20 text-amber-400' : 'hover:bg-white/10 text-neutral-400'}`}
                        title={isEditing ? "Guardar / Dejar de Editar" : "Editar"}
                    >
                        {isEditing ? <Save size={14} /> : <Edit3 size={14} />}
                    </button>
                    <button onClick={() => setSelectedNodeId(null)} className="text-neutral-500 hover:text-white"><X size={14} /></button>
                </div>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                {/* READ ONLY VIEW */}
                {!isEditing && (
                    <div className="space-y-4">
                        <div className="text-center p-4 bg-black/40 rounded-lg border border-white/5">
                            <div className="text-2xl font-bold text-white mb-1 flex flex-col items-center gap-2">
                                {(() => {
                                    const Icon = ENTITY_CONFIG[selectedNode.type]?.icon || Shield;
                                    return <Icon size={40} className="text-cyan-400" />;
                                })()}
                            </div>
                            <div className="text-[10px] uppercase tracking-widest text-cyan-500 font-bold">{selectedNode.id}</div>
                        </div>
                        <div className="grid grid-cols-[1fr_2fr] gap-2 text-xs">
                            <div className="text-neutral-500 font-bold uppercase">Tipo</div>
                            <div className="text-neutral-300">{selectedNode.type}</div>
                            {Object.entries(selectedNode.data).map(([k, v]) => {
                                if (['x', 'y', 'id', 'label'].includes(k)) return null;
                                return (
                                    <React.Fragment key={k}>
                                        <div className="text-neutral-500 font-bold uppercase truncate" title={k}>{k}</div>
                                        <div className="text-neutral-300 break-all">{String(v)}</div>
                                    </React.Fragment>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* EDIT FORM (Legacy Logic) */}
                {isEditing && (
                    <>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[9px] text-cyan-700 font-bold uppercase block tracking-wider flex items-center gap-2">
                                    <Calendar size={10} /> Fecha
                                </label>
                                <input type="date" value={selectedNode.date || ''}
                                    onChange={(e) => setNodes(p => p.map(n => n.id === selectedNodeId ? { ...n, date: e.target.value } : n))}
                                    className="w-full bg-black border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:border-cyan-500 outline-none transition-all placeholder-neutral-700" />
                            </div>
                            {selectedNode.type === 'ip' && (
                                <div className="space-y-1">
                                    <label className="text-[9px] text-cyan-700 font-bold uppercase block tracking-wider flex items-center gap-2">
                                        <Monitor size={10} /> Hora
                                    </label>
                                    <input type="time" value={selectedNode.data.time || ''}
                                        onChange={(e) => setNodes(p => p.map(n => n.id === selectedNodeId ? { ...n, data: { ...n.data, time: e.target.value } } : n))}
                                        className="w-full bg-black border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:border-cyan-500 outline-none transition-all placeholder-neutral-700" />
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            {(ENTITY_CONFIG[selectedNode.type]?.fields || []).slice(0, 5).map((f: any) => (
                                <div key={f.key} className="space-y-1 group">
                                    <label className="text-[9px] text-neutral-500 font-bold uppercase block tracking-wider group-focus-within:text-cyan-500 transition-colors">{f.label}</label>
                                    <input type="text" value={selectedNode.data[f.key] || ''}
                                        onChange={(e) => setNodes(p => p.map(n => n.id === selectedNodeId ? { ...n, data: { ...n.data, [f.key]: e.target.value } } : n))}
                                        className="w-full bg-black border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:border-cyan-500 outline-none transition-all placeholder-neutral-800"
                                        placeholder={`...`} />
                                </div>
                            ))}
                        </div>

                        {(ENTITY_CONFIG[selectedNode.type]?.fields || []).length > 5 && (
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
                                        {ENTITY_CONFIG[selectedNode.type].fields.slice(5).map((f: any) => (
                                            <div key={f.key} className="space-y-1">
                                                <label className="text-[8px] text-neutral-600 font-bold uppercase block truncate">{f.label}</label>
                                                <input type="text" value={selectedNode.data[f.key] || ''}
                                                    onChange={(e) => setNodes(p => p.map(n => n.id === selectedNodeId ? { ...n, data: { ...n.data, [f.key]: e.target.value } } : n))}
                                                    className="w-full bg-black border border-white/10 rounded px-2 py-1 text-[11px] text-neutral-300 focus:border-cyan-800 outline-none transition-colors" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            <div className="p-4 border-t border-white/10 bg-[#0a0a0a]/95 shrink-0 rounded-b-xl flex gap-2">
                <button onClick={() => handleEnrich(selectedNodeId!)} className="flex-1 py-1.5 bg-cyan-950/20 border border-cyan-900/50 text-cyan-400 text-[10px] font-bold uppercase tracking-wider rounded hover:bg-cyan-900/40 hover:text-cyan-300 transition shadow-lg shadow-cyan-900/10 flex items-center justify-center gap-2 group">
                    <Shield size={12} className="group-hover:rotate-12 transition-transform" /> Auto-Completar
                </button>
                <button onClick={() => {
                    setNodes(p => p.filter(n => n.id !== selectedNodeId));
                    setLinks(l => l.filter(x => x.source !== selectedNodeId && x.target !== selectedNodeId));
                    setSelectedNodeId(null);
                    setIsEditing(false);
                }}
                    className="p-1.5 bg-red-950/10 border border-red-900/20 text-red-600 rounded hover:bg-red-900/30 hover:text-red-500 transition">
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    );
};
