import { toPng } from 'html-to-image';
import { ENTITY_CONFIG } from '../constants/entities';
import logoReport from '../assets/logo_report.png';

export const generatePDFReport = async (
  workspaceRef: React.RefObject<HTMLDivElement>,
  nodes: any[],
  caseName: string
) => {
  if (!workspaceRef.current) return;

  try {
    // Capturar imagen del grafo con fondo TRANSPARENTE
    const dataUrl = await toPng(workspaceRef.current, { backgroundColor: 'transparent', pixelRatio: 2 });

    // Convertir el logo a Base64 para asegurar que se vea en la ventana de impresión (evita problemas de rutas)
    const logoResponse = await fetch(logoReport);
    const logoBlob = await logoResponse.blob();
    const logoBase64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(logoBlob);
    });

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

    // ESTILOS PROFESIONALES (Corporate White)
    const styles = `
      /* Ocultar encabezados/pies de página del navegador (about:blank) al eliminar márgenes de página */
      @page { margin: 0; size: A4; }
      
      body { 
        font-family: 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif; 
        background: #ffffff; 
        color: #1f2937; 
        line-height: 1.5;
        margin: 0;
        padding: 0;
        -webkit-print-color-adjust: exact; 
      }
      
      /* Wrapper para simular márgenes y contener el contenido */
      .content-wrapper {
        padding: 2.5cm;
        width: 100%;
        box-sizing: border-box;
      }
      
      /* COVER PAGE */
      .cover {
        height: 100vh; /* Full height */
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
        page-break-after: always;
        border-bottom: 1px solid #e5e7eb;
        padding: 0 2.5cm; /* Márgenes laterales */
        position: relative;
      }
      .brand { font-size: 12px; letter-spacing: 2px; color: #6b7280; text-transform: uppercase; margin-bottom: 40px; font-weight: 600; }
      .title { font-size: 36px; color: #111827; font-weight: 800; margin-bottom: 10px; text-transform: uppercase; letter-spacing: -0.5px; }
      .subtitle { font-size: 18px; color: #4b5563; margin-bottom: 60px; font-weight: 400; }
      
      .meta-table { margin-top: 40px; border-collapse: collapse; margin: 0 auto; min-width: 300px; }
      .meta-table td { padding: 12px 24px; border-bottom: 1px solid #f3f4f6; text-align: left; }
      .meta-label { font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; }
      .meta-value { font-size: 14px; font-weight: 600; color: #374151; }

      /* CONTENT PAGES */
      .page { 
        page-break-after: always; 
        padding: 2.5cm; /* Margen simulado */
        position: relative;
        min-height: 100vh;
        box-sizing: border-box;
      }
      
      .header { 
        border-bottom: 2px solid #000; 
        padding-bottom: 10px; 
        margin-bottom: 40px; 
        display: flex; 
        justify-content: space-between; 
        align-items: flex-end; 
      }
      .header-title { font-size: 14px; color: #6b7280; font-weight: 600; text-transform: uppercase; }
      
      h2 { 
        color: #111827; 
        font-size: 22px; 
        font-weight: 700; 
        border-left: 4px solid #111827;
        padding-left: 15px;
        margin-top: 40px;
        margin-bottom: 20px;
      }
      
      .section-summary { 
        background: #f9fafb; 
        padding: 20px; 
        border: 1px solid #e5e7eb;
        border-radius: 4px;
        margin-bottom: 30px; 
        font-size: 13px; 
        color: #4b5563; 
      }

      /* GRAPH */
      .graph-container { 
        margin: 20px 0; 
        border: 1px solid #e5e7eb; 
        border-radius: 4px; 
        overflow: hidden; 
        background: #f9fafb; 
        padding: 20px;
      }
      .graph-img { width: 100%; display: block; mix-blend-mode: multiply; }

      /* TABLES / ENTITIES */
      .entity-group { margin-bottom: 40px; }
      .entity-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 25px; border: 1px solid #e5e7eb; }
      .entity-table th { background: #f3f4f6; text-align: left; padding: 10px 15px; font-weight: 700; color: #374151; border-bottom: 1px solid #e5e7eb; }
      .entity-table td { padding: 10px 15px; border-bottom: 1px solid #f3f4f6; color: #4b5563; vertical-align: top; }
      .entity-table tr:last-child td { border-bottom: none; }
      
      .label-cell { width: 30%; font-weight: 600; color: #1f2937; }
      
      .badge { 
        display: inline-block; 
        padding: 2px 8px; 
        border-radius: 99px; 
        font-size: 10px; 
        font-weight: 700; 
        background: #e5e7eb; 
        color: #374151; 
        text-transform: uppercase;
      }

      .footer { 
        position: fixed; 
        bottom: 1.5cm; /* Subimos el footer para que esté dentro del área imprimible */
        left: 0; 
        right: 0; 
        text-align: center; 
        font-size: 9px; 
        color: #9ca3af; 
        border-top: 1px solid #e5e7eb; 
        padding-top: 10px;
        background: #fff;
        width: 100%;
        z-index: 10;
      }
    `;

    let html = `
      <html>
      <head>
        <title>Report - ${caseName}</title>
        <style>${styles}</style>
      </head>
      <body>
        <!-- COVER -->
        <div class="cover">
            <div style="margin-bottom: 40px;">
              <img src="${logoBase64}" style="width: 280px; height: auto;" />
            </div>
            <div class="title">Informe de Investigación</div>
            <div class="subtitle">${caseName}</div>
            
            <table class="meta-table">
              <tr>
                <td><span class="meta-label">Fecha de Emisión</span></td>
                <td><span class="meta-value">${dateStr}</span></td>
              </tr>
              <tr>
                <td><span class="meta-label">Referencia</span></td>
                <td><span class="meta-value">ZAH-${Math.floor(Math.random() * 10000)}</span></td>
              </tr>
              <tr>
                <td><span class="meta-label">Analista</span></td>
                <td><span class="meta-value">Operador Zahori</span></td>
              </tr>
               <tr>
                <td><span class="meta-label">Alcance</span></td>
                <td><span class="meta-value">${nodes.length} Entidades Identificadas</span></td>
              </tr>
            </table>

            <div style="margin-top: 100px; font-size: 10px; color: #9ca3af;">
              CONFIDENCIAL // SOLO PARA USO AUTORIZADO
            </div>
        </div>

        <!-- PAGE 1: OVERVIEW -->
        <div class="page">
          <div class="header">
            <div class="header-title">Resumen Ejecutivo</div>
            <div class="header-title">01</div>
          </div>
          
          <h2>Mapa de Relaciones</h2>
          <div class="section-summary">
            El presente gráfico ilustra la topología de la red investigada. Se han detectado <strong>${nodes.length} nodos activos</strong>.
            La visualización destaca las conexiones directas e indirectas entre los objetivos principales.
          </div>
          
          <div class="graph-container">
            <img src="${dataUrl}" class="graph-img" />
          </div>
        </div>
    `;

    // PAGES FOR ENTITIES
    html += `<div class="page">`;
    html += `
          <div class="header">
            <div class="header-title">Detalle de Entidades</div>
            <div class="header-title">02</div>
          </div>
        `;

    sortedTypes.forEach(type => {
      const groupNodes = grouped[type];
      const config = ENTITY_CONFIG[type] || ENTITY_CONFIG.target;
      const typeLabel = config.label || type.toUpperCase();

      html += `
          <div class="entity-group">
           <h2>${typeLabel}s <span style="font-size: 14px; color: #6b7280; font-weight: normal; margin-left: 10px;">(${groupNodes.length})</span></h2>
        `;

      groupNodes.forEach(n => {
        const mainLabel = n.data.label || n.data.ip || n.data.domain || n.data.email || n.data.name || n.id;

        html += `
            <table class="entity-table">
               <thead>
                 <tr>
                   <th colspan="2" style="display: flex; align-items: center; justify-content: space-between;">
                     <span>${mainLabel}</span>
                     <span class="badge">${typeLabel}</span>
                   </th>
                 </tr>
               </thead>
               <tbody>
           `;

        // Data Rows
        Object.entries(n.data).forEach(([key, val]) => {
          if (['x', 'y', 'id', 'label'].includes(key)) return;
          if (typeof val === 'object') return; // Skip complex objects for simple table

          html += `
               <tr>
                 <td class="label-cell">${key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}</td>
                 <td>${val}</td>
               </tr>
             `;
        });

        // Notes
        if (n.notes) {
          html += `
               <tr>
                 <td class="label-cell" style="color: #059669;">Observaciones</td>
                 <td style="font-style: italic; background: #ecfdf5; color: #065f46;">${n.notes}</td>
               </tr>
             `;
        }

        html += `</tbody></table>`;
      });
      html += `</div>`;
    });

    html += `</div>`; // End Page

    html += `
      <div class="footer">
        Generado automáticamente por Zahori OSINT Suite &bull; ${new Date().getFullYear()} &bull; Documento Confidencial
      </div>
      <script>
        // Esperar a que todo cargue (imágenes) antes de imprimir
        window.onload = function() {
           setTimeout(function() {
             window.print();
           }, 500); // Pequeño delay extra de seguridad
        };
      </script>
      </body></html>
    `;

    win.document.write(html);
    win.document.close();

  } catch (err) {
    console.error("Error generating PDF:", err);
    alert("Error al generar el reporte PDF.");
  }
};
