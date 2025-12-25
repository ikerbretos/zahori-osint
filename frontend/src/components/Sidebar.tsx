import React from 'react';
import { ENTITY_CONFIG } from '../constants/entities';
import { Calendar, Printer, Settings, Shield, Save } from 'lucide-react'; // Added Save

interface SidebarProps {
    mode: 'select' | 'add' | 'link' | 'eraser';
    setMode: (mode: 'select' | 'add' | 'link' | 'eraser') => void;
    addType: string;
    setAddType: (type: string) => void;
    showTimeline: boolean;
    setShowTimeline: (show: boolean) => void;
    handleExportPDF: () => void;
    setShowSettings: (show: boolean) => void;
    setShowExportMenu: (show: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    mode, setMode, addType, setAddType,
    showTimeline, setShowTimeline,
    handleExportPDF, setShowSettings, setShowExportMenu
}) => {
    return (
        <aside className="w-16 bg-[#0a0a0a] border-r border-white/5 flex flex-col items-center py-4 z-40 shadow-xl">
            <div className="flex-1 w-full px-2 space-y-4 overflow-y-auto hide-scrollbar mt-4">
                <div className="space-y-2">


                    {Object.entries(ENTITY_CONFIG).map(([type, config]: [any, any]) => (
                        <button
                            key={type}
                            onClick={() => { setMode('add'); setAddType(type); }}
                            className={`w-full aspect-square rounded-lg flex items-center justify-center transition-all duration-200 group relative
                  ${mode === 'add' && addType === type
                                    ? 'bg-cyan-500/10 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.1)] border border-cyan-500/30'
                                    : 'text-neutral-500 hover:bg-white/5 hover:text-neutral-300'}`}
                            title={config.label}
                        >
                            {React.createElement(config.icon, { size: 18 })}
                            {mode === 'add' && addType === type && (
                                <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-6 bg-cyan-400 rounded-r-full shadow-lg shadow-cyan-500" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-auto px-2 space-y-2 w-full pt-4 border-t border-[var(--color-border)]">
                <button
                    onClick={() => setShowTimeline(!showTimeline)}
                    className={`tool-btn w-full flex justify-center ${showTimeline ? 'bg-cyan-900/50 text-cyan-400' : ''}`}
                    title="Línea de Tiempo"
                >
                    <Calendar size={18} />
                </button>

                {/* EXPORT MENU TRIGGER */}
                <button
                    onClick={() => setShowExportMenu(true)}
                    className="tool-btn w-full flex justify-center text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300"
                    title="Exportar Caso (JSON/IMG)"
                >
                    <Save size={18} />
                </button>

                <button
                    onClick={() => handleExportPDF()}
                    className="tool-btn w-full flex justify-center"
                    title="Generar Informe PDF"
                >
                    <Printer size={18} />
                </button>
                <button
                    onClick={() => setShowSettings(true)}
                    className="tool-btn w-full flex justify-center"
                    title="Configuración"
                >
                    <Settings size={18} />
                </button>
            </div>
        </aside>
    );
};
