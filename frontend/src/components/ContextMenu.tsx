import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useGraphStore } from '../store/useGraphStore';
import { Play, Loader2, X } from 'lucide-react';

interface ContextMenuProps {
    x: number;
    y: number;
    nodeId: string;
    nodeType: string;
    onClose: () => void;
    apiKeys: any;
    isLocked: boolean;
    onToggleLock: () => void;
}

interface Plugin {
    name: string;
    description: string;
    cost: 'free' | 'paid';
    author: string;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, nodeId, nodeType, onClose, apiKeys, isLocked, onToggleLock }) => {
    const [plugins, setPlugins] = useState<Plugin[]>([]);
    const [loading, setLoading] = useState(true);
    const [executing, setExecuting] = useState<string | null>(null);
    // Aunque useGraphStore se importa, aquí no lo usamos directamente para recargar, 
    // pero lo dejamos por si se extiende la funcionalidad.
    const { } = useGraphStore(); 

    // 1. Cargar plugins disponibles al abrir el menú
    useEffect(() => {
        const fetchPlugins = async () => {
            setLoading(true);
            try {
                const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
                const res = await axios.get(`${API_URL}/plugins?type=${nodeType}`);
                setPlugins(res.data);
            } catch (err) {
                console.error("Failed to fetch plugins", err);
                setPlugins([]);
            } finally {
                setLoading(false);
            }
        };

        fetchPlugins();
    }, [nodeType]);

    // 2. Función para ejecutar el plugin
    const handleExecute = async (pluginName: string) => {
        setExecuting(pluginName);
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
            
            await axios.post(`${API_URL}/expand`, {
                nodeId,
                pluginName,
                config: { apiKeys }
            });
            
            alert("Plugin ejecutado correctamente. Por favor, recarga la página o el caso para ver los nuevos nodos.");
            onClose();
        } catch (error) {
            console.error("Error ejecutando plugin:", error);
            alert("Error al ejecutar el plugin.");
        } finally {
            setExecuting(null);
        }
    };

    return (
        <div
            className="fixed z-[100] w-64 bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
            style={{ left: x, top: y }}
            onMouseLeave={onClose}
        >
            {/* ACTIONS HEADER */}
            <div className="px-3 py-2 border-b border-white/5 flex justify-between items-center bg-white/5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">{nodeType}</span>
                <div className="flex gap-2">
                    <button
                        onClick={onToggleLock}
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded transition ${isLocked ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-neutral-800 text-neutral-400 hover:text-white'}`}
                        title={isLocked ? "Desbloquear Posición" : "Bloquear Posición"}
                    >
                        {isLocked ? "UNLOCK" : "LOCK"}
                    </button>
                    <button onClick={onClose}><X size={12} className="text-neutral-600 hover:text-white" /></button>
                </div>
            </div>

            <div className="px-3 py-2 border-b border-white/5 flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Plugins Disponibles</span>
            </div>

            {loading ? (
                <div className="p-4 flex justify-center text-neutral-500"><Loader2 size={16} className="animate-spin" /></div>
            ) : plugins.length === 0 ? (
                <div className="p-4 text-center text-neutral-600 text-[10px] italic">No existen herramientas para este tipo</div>
            ) : (
                <div className="max-h-60 overflow-y-auto">
                    {plugins.map(p => (
                        <button
                            key={p.name}
                            disabled={!!executing}
                            onClick={() => handleExecute(p.name)}
                            className="w-full text-left px-4 py-3 hover:bg-neutral-900 border-l-2 border-transparent hover:border-cyan-500 transition-all group relative flex items-start gap-3"
                        >
                            <div className="mt-0.5 text-cyan-500/50 group-hover:text-cyan-400">
                                {executing === p.name ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} className="fill-current" />}
                            </div>
                            <div>
                                <div className="text-xs font-bold text-neutral-300 group-hover:text-white flex items-center justify-between w-full">
                                    {p.name}
                                    {p.cost === 'paid' && <span className="ml-2 text-[8px] bg-yellow-500/10 text-yellow-500 px-1 rounded uppercase">PAID</span>}
                                </div>
                                <div className="text-[10px] text-neutral-600 group-hover:text-neutral-400 leading-tight mt-0.5">{p.description}</div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
