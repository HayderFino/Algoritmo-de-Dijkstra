export function generateHistoryHTML(dijkstraResult) {
    let html = '';
    for (const step of dijkstraResult.history) {
        html += `<div class="iteration-block">\n`;
        html += `<h4>Iteración k = ${step.k}</h4>\n`;
        html += `<p>Última etiqueta permanente: E(${step.selectedNode}) = ${step.permanentDistance}.</p>\n`;
        html += `<p>Nodo seleccionado: j = ${step.selectedNode}.</p>\n`;
        
        if (step.tieBreakerApplied) {
            html += `<p class="tie-breaker-note">${step.tieBreakerReason}</p>\n`;
        }
        
        if (step.evaluations.length === 0) {
            html += `<p class="explanation">El nodo ${step.selectedNode} no tiene conexiones salientes válidas hacia nodos provisionales.</p>\n`;
        } else {
            for (const ev of step.evaluations) {
                if (ev.reason === "Nodo ya tiene etiqueta permanente") {
                    html += `<div class="equation-row">\n`;
                    html += `<p class="explanation">Vecino ${ev.neighbor}: ya tiene etiqueta permanente. No se actualiza ni evalúa.</p>\n`;
                    html += `</div>\n`;
                    continue;
                }
                
                let oldDistStr = ev.oldDistance === Infinity ? '\\infty' : ev.oldDistance;
                let sumDist = step.permanentDistance + ev.weight;
                let finalVal = ev.updated ? sumDist : ev.oldDistance;
                
                // KaTeX fallback y guardado en data-latex
                let latex = `e(${ev.neighbor}) = \\min(${oldDistStr}, ${step.permanentDistance} + ${ev.weight}) = ${finalVal}`;
                
                html += `<div class="equation-row">\n`;
                html += `<div class="math-eq" data-latex="${latex}"></div>\n`;
                html += `<ul class="explanation">\n`;
                html += `<li>${ev.oldDistance === Infinity ? 'La distancia provisional anterior era infinita.' : ev.oldDistance + ' es la distancia provisional que ya conocíamos para llegar al nodo ' + ev.neighbor + '.'}</li>\n`;
                html += `<li>${step.permanentDistance} es la distancia permanente del nodo ${step.selectedNode}.</li>\n`;
                html += `<li>${ev.weight} es el peso de la conexión entre los nodos ${step.selectedNode} y ${ev.neighbor}.</li>\n`;
                
                if (ev.updated) {
                    html += `<li><strong>Decisión:</strong> Se actualiza la distancia a ${finalVal} (${ev.reason}).</li>\n`;
                } else if (ev.reason.includes("empate")) {
                    html += `<li><strong>Decisión:</strong> Empate. Se registra como ruta alternativa óptima.</li>\n`;
                } else {
                    let oldD = ev.oldDistance === Infinity ? 'infinita' : ev.oldDistance;
                    html += `<li><strong>Decisión:</strong> Se conserva la distancia anterior de ${oldD}.</li>\n`;
                }
                html += `</ul></div>\n`;
            }
        }
        html += `</div>\n`;
    }
    return html;
}

export function generateTableHTML(dijkstraResult, nodesArray) {
    let html = '<table class="dijkstra-table"><thead><tr>';
    html += '<th>k</th><th>Nodo j</th><th>E(j)</th>';
    for (const n of nodesArray) {
        html += `<th>e(${n})</th>`;
    }
    html += '</tr></thead><tbody>';
    
    for (const step of dijkstraResult.history) {
        html += `<tr>`;
        html += `<td>${step.k}</td>`;
        html += `<td>${step.selectedNode}</td>`;
        html += `<td>${step.permanentDistance}</td>`;
        for (const n of nodesArray) {
            const isPerm = step.permanentSnapshot.has(n);
            const dist = step.endDistancesSnapshot.get(n);
            const distStr = dist === Infinity ? '∞' : dist;
            const styleClass = isPerm ? 'permanent' : 'provisional';
            html += `<td class="${styleClass}">${distStr}</td>`;
        }
        html += `</tr>`;
    }
    
    html += '</tbody></table>';
    return html;
}
