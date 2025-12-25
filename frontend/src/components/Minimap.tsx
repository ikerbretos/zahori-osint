import React, { useEffect, useRef } from 'react';

interface MinimapProps {
    nodes: any[];
    offset: { x: number; y: number };
    scale: number;
    viewportWidth: number;
    viewportHeight: number;
    onNavigate: (x: number, y: number) => void;
}

export const Minimap: React.FC<MinimapProps> = ({ nodes, offset, scale, viewportWidth, viewportHeight, onNavigate }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Constants for minimap display
    const WIDTH = 200;
    const HEIGHT = 150;
    const PADDING = 20;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.clearRect(0, 0, WIDTH, HEIGHT);

        // 1. Calculate bounding box of all nodes
        if (nodes.length === 0) return;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        nodes.forEach(n => {
            if (n.x < minX) minX = n.x;
            if (n.x > maxX) maxX = n.x;
            if (n.y < minY) minY = n.y;
            if (n.y > maxY) maxY = n.y;
        });

        // Add padding to bounds
        const worldWidth = Math.max(maxX - minX + PADDING * 2, 100);
        const worldHeight = Math.max(maxY - minY + PADDING * 2, 100);

        // 2. Calculate scaling factor to fit world into minimap
        const scaleX = WIDTH / worldWidth;
        const scaleY = HEIGHT / worldHeight;
        const miniScale = Math.min(scaleX, scaleY) * 0.8; // 0.8 to give some margin

        // Center the world in minimap
        const mapOffsetX = (WIDTH - worldWidth * miniScale) / 2;
        const mapOffsetY = (HEIGHT - worldHeight * miniScale) / 2;

        // Helper to transform world coords to minimap coords
        const toMini = (x: number, y: number) => ({
            x: mapOffsetX + (x - minX + PADDING) * miniScale,
            y: mapOffsetY + (y - minY + PADDING) * miniScale
        });

        // 3. Draw Nodes (Larger and with border)
        nodes.forEach(n => {
            const pos = toMini(n.x, n.y);
            ctx.fillStyle = n.type === 'target' ? '#ef4444' : '#06b6d4';

            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2); // Increased radius from 2 to 4
            ctx.fill();

            // Optional: Border for visibility
            ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            ctx.lineWidth = 1;
            ctx.stroke();
        });

        // 4. Draw Viewport Rect (The "Camera")
        // Viewport in world coords:
        // visible_x = -offset.x / scale
        // visible_y = -offset.y / scale
        // visible_w = viewportWidth / scale
        // visible_h = viewportHeight / scale

        const vx = -offset.x / scale;
        const vy = -offset.y / scale;
        const vw = viewportWidth / scale;
        const vh = viewportHeight / scale;

        const vStart = toMini(vx, vy);
        const vEnd = toMini(vx + vw, vy + vh);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(vStart.x, vStart.y, vEnd.x - vStart.x, vEnd.y - vStart.y);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(vStart.x, vStart.y, vEnd.x - vStart.x, vEnd.y - vStart.y);

    }, [nodes, offset, scale, viewportWidth, viewportHeight]);

    return (
        // Moved up to avoid covering zoom controls (bottom-6 -> bottom-36)
        <div className="absolute bottom-6 right-6 z-30 pointer-events-none">
            {/* Positioned via absolute but we'll use a container in App.tsx to place it correctly next to zoom controls */}
            <div className="bg-[#0a0a0a]/80 backdrop-blur-md border border-white/10 rounded-lg shadow-2xl overflow-hidden pointer-events-auto">
                <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="block" />
            </div>
        </div>
    );
};
