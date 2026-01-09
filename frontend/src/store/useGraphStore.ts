import { create } from 'zustand';
import axios from 'axios';

export interface Node {
    id: string;
    type: string;
    data: any;
    notes?: string;
    date?: string; // For Timeline
    x: number;
    y: number;
}

export interface Link {
    id: string;
    source: string;
    target: string;
}

interface GraphState {
    nodes: Node[];
    links: Link[];
    selectedNodeId: string | null;
    hoveredNodeId: string | null;
    mode: 'select' | 'add' | 'link' | 'eraser';
    addType: string;
    scale: number;
    offset: { x: number; y: number };

    setNodes: (nodes: Node[] | ((prev: Node[]) => Node[])) => void;
    setLinks: (links: Link[] | ((prev: Link[]) => Link[])) => void;
    setSelectedNodeId: (id: string | null) => void;
    setHoveredNodeId: (id: string | null) => void;
    setMode: (mode: 'select' | 'add' | 'link' | 'eraser') => void;
    setAddType: (type: string) => void;
    setScale: (scale: number | ((prev: number) => number)) => void;
    setOffset: (offset: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => void;
    loadCase: (caseId: string) => Promise<void>;
    saveCase: (caseId: string) => Promise<void>;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const useGraphStore = create<GraphState>((set, get) => ({
    nodes: [],
    links: [],
    selectedNodeId: null,
    hoveredNodeId: null,
    mode: 'select',
    addType: 'target',
    scale: 1,
    offset: { x: 0, y: 0 },

    setNodes: (nodes) => set((state) => ({ nodes: typeof nodes === 'function' ? nodes(state.nodes) : nodes })),
    setLinks: (links) => set((state) => ({ links: typeof links === 'function' ? links(state.links) : links })),
    setSelectedNodeId: (id) => set({ selectedNodeId: id }),
    setHoveredNodeId: (id) => set({ hoveredNodeId: id }),
    setMode: (mode) => set({ mode }),
    setAddType: (type) => set({ addType: type }),
    setScale: (scale) => set((state) => ({ scale: typeof scale === 'function' ? scale(state.scale) : scale })),
    setOffset: (offset) => set((state) => ({ offset: typeof offset === 'function' ? offset(state.offset) : offset })),

    loadCase: async (caseId: string) => {
        try {
            const response = await axios.get(`${API_URL}/cases/${caseId}`);
            const data = response.data;
            set({
                nodes: data.nodes.map((n: any) => ({ ...n, data: JSON.parse(n.data) })),
                links: data.links
            });
        } catch (err) {
            console.error("Failed to load case", err);
        }
    },

    saveCase: async (caseId: string) => {
        const { nodes, links } = get();
        try {
            await axios.post(`${API_URL}/cases/${caseId}/graph`, { nodes, links });
        } catch (err) {
            console.error("Failed to save case", err);
        }
    }
}));
