import { toPng } from 'html-to-image';
import { ENTITY_CONFIG } from '../constants/entities';

export const generatePDFReport = async (
    workspaceRef: React.RefObject<HTMLDivElement>,
    nodes: any[],
    caseName: string
) => {
    if (!workspaceRef.current) return;

    try {
        // Capturar imagen del grafo con alta calidad
        const dataUrl = await toPng(workspaceRef.current, { backgroundColor: '#0a0a0a', pixelRatio: 2 });

        // Preparar ventana de impresión
        const win = window.open('', '_blank');
        if (!win) {
            alert("Bloqueo de ventanas emergentes activado. Permite popups para generar el reporte.");
            return;
        }

        const dateStr = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const timeStr = new Date().toLocaleTimeString('es-ES');

        // Agrupar nodos por tipo
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

        // Estilos CSS para el reporte (Estilo Cyberpunk/Professional limpio para impresión)
        const styles = `
      @page { margin: 0; size: A4; }
      body { 
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
        background: #fff; 
        color: #1a1a1a; 
        margin: 0;
        padding: 0;
        -webkit-print-color-adjust: exact; 
      }
      
      /* COVER PAGE */
      .cover {
        height: 100vh;
        width: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        background: #0a0a0a;
        color: #fff;
        text-align: center;
        page-break-after: always;
        position: relative;
        overflow: hidden;
      }
      .cover::before {
        content: "";
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        background: radial-gradient(circle at center, #1e293b 0%, #000 70%);
        z-index: 0;
      }
      .cover-content { position: relative; z-index: 1; width: 80%; }
      .brand { font-size: 14px; letter-spacing: 4px; color: #06b6d4; text-transform: uppercase; margin-bottom: 20px; }
      .title { font-size: 48px; font-weight: bold; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 0 20px rgba(6,182,212,0.5); }
      .subtitle { font-size: 18px; color: #94a3b8; margin-bottom: 60px; font-weight: 300; }
      .meta-box { border-top: 1px solid #334155; border-bottom: 1px solid #334155; padding: 20px 0; margin-top: 40px; display: flex; justify-content: space-around; }
      .meta-item { display: flex; flex-direction: column; gap: 5px; }
      .meta-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
      .meta-value { font-size: 14px; color: #fff; font-weight: bold; }

      /* CONTENT PAGES */
      .page { padding: 40px 50px; page-break-after: always; }
      .page-header { border-bottom: 2px solid #06b6d4; padding-bottom: 10px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
      .page-title { font-size: 16px; color: #0f172a; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; }
      .page-number { font-size: 10px; color: #64748b; }
      
      h2 { margin-top: 0; color: #0f172a; font-size: 20px; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 10px; }
      h2::before { content: ""; display: block; width: 6px; height: 24px; background: #06b6d4; }
      
      .graph-container { margin: 20px 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
      .graph-img { width: 100%; display: block; }
      
      .section-summary { background: #f1f5f9; padding: 15px; border-left: 4px solid #06b6d4; margin-bottom: 30px; font-size: 12px; color: #475569; }

      /* ENTITY CARDS */
      .entity-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
      .entity-card { background: #fff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 15px; break-inside: avoid; page-break-inside: avoid; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
      .entity-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #cbd5e1; padding-bottom: 8px; margin-bottom: 10px; }
      .entity-type { font-size: 9px; background: #0f172a; color: #fff; padding: 2px 6px; rounded: 3px; text-transform: uppercase; border-radius: 3px; }
      .entity-main { font-weight: bold; font-size: 13px; color: #0f172a; }
      
      .data-table { width: 100%; border-collapse: collapse; font-size: 10px; }
      .data-table td { padding: 3px 0; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
      .data-key { width: 35%; color: #64748b; font-weight: 600; text-transform: uppercase; }
      .data-val { color: #334155; word-break: break-all; }
      
      .footer { position: fixed; bottom: 20px; left: 0; right: 0; text-align: center; font-size: 8px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; }
    `;

        let html = `
      <html>
      <head>
        <title>NEXUS DOSSIER - ${caseName}</title>
        <style>${styles}</style>
      </head>
      <body>
        <!-- COVER -->
        <div class="cover">
          <div class="cover-content">
            <div class="brand">Nexus Intelligence Suite</div>
            <div class="title">Dossier de Investigación</div>
            <div class="subtitle">${caseName}</div>
            
            <div class="meta-box">
              <div class="meta-item">
                <span class="meta-label">Fecha</span>
                <span class="meta-value">${dateStr}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Hora</span>
                <span class="meta-value">${timeStr}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Entidades</span>
                <span class="meta-value">${nodes.length}</span>
              </div>
            </div>
          </div>
          <div style="position: absolute; bottom: 40px; font-size: 10px; color: #475569;">CONFIDENTIAL / FOR OFFICIAL USE ONLY</div>
        </div>

        <!-- PAGE 1: OVERVIEW -->
        <div class="page">
          <div class="page-header">
            <div class="page-title">Mapa de Relaciones</div>
            <div class="page-number">01</div>
          </div>
          
          <h2>Visualización Gráfica</h2>
          <div class="section-summary">
            Este gráfico representa todas las conexiones y entidades descubiertas durante la investigación.
            Se han detectado <strong>${nodes.length} nodos</strong> y múltiples relaciones cruzadas.
          </div>
          
          <div class="graph-container">
            <img src="${dataUrl}" class="graph-img" />
          </div>
        </div>
    `;

        // PAGES FOR ENTITIES
        let pageNum = 2;

        sortedTypes.forEach(type => {
            const groupNodes = grouped[type];
            const config = ENTITY_CONFIG[type] || ENTITY_CONFIG.target;
            const typeLabel = config.label || type.toUpperCase();

            html += `
        <div class="page">
          <div class="page-header">
            <div class="page-title">Inteligencia de ${typeLabel}s</div>
            <div class="page-number">0${pageNum++}</div>
          </div>
          
          <h2>Detalle de ${typeLabel}s (${groupNodes.length})</h2>
          <div class="entity-grid">
        `;

            groupNodes.forEach(n => {
                const mainLabel = n.data.label || n.data.ip || n.data.email || n.data.address || n.data.number || n.data.name || n.id;

                html += `
             <div class="entity-card">
               <div class="entity-header">
                 <span class="entity-main">${mainLabel}</span>
                 <span class="entity-type">${typeLabel}</span>
               </div>
               <table class="data-table">
           `;

                Object.entries(n.data).forEach(([key, val]) => {
                    if (['x', 'y', 'id'].includes(key)) return;
                    // Skip main label repetition if key matches common identifiers
                    if ((key === 'ip' || key === 'email' || key === 'name') && val === mainLabel) return;

                    let displayVal = val;
                    if (typeof val === 'object') displayVal = JSON.stringify(val);

                    html += `
               <tr>
                 <td class="data-key">${key.replace(/_/g, ' ')}</td>
                 <td class="data-val">${displayVal}</td>
               </tr>
             `;
                });

                if (n.notes) {
                    html += `
               <tr>
                 <td class="data-key" style="color: #0ea5e9;">NOTAS</td>
                 <td class="data-val" style="font-style: italic;">${n.notes}</td>
               </tr>
             `;
                }

                html += `</table></div>`;
            });

            html += `</div></div>`;
        });

        html += `
      <div class="footer">Generado por Nexus OSINT - ${new Date().getFullYear()}</div>
      <script>window.print();</script>
      </body></html>
    `;

        win.document.write(html);
        win.document.close();

    } catch (err) {
        console.error("Error generating PDF:", err);
        alert("Error al generar el reporte PDF.");
    }
};
