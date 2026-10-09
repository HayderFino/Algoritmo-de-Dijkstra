export function generateResultHTML(dijkstraResult, target) {
    let html = '<div class="result-panel"><h3>Resultado Final</h3>';
    
    const targetDist = dijkstraResult.distances.get(target);
    if (targetDist === undefined || targetDist === Infinity) {
        return html + `<p class="tie-breaker-note">El nodo destino <strong>${target}</strong> es inalcanzable desde el origen <strong>${dijkstraResult.startNode}</strong>.</p></div>`;
    }
    
    html += `<p><strong>Distancia mínima total:</strong> ${targetDist}</p>`;
    
    // Reconstruir todas las rutas
    const allPaths = reconstructPaths(dijkstraResult.predecessors, target, dijkstraResult.startNode);
    
    html += `<p><strong>Rutas óptimas encontradas:</strong> ${allPaths.length}</p>`;
    
    allPaths.forEach((path, idx) => {
        html += `<div class="optimal-path-box">`;
        html += `<h4>Ruta Óptima ${allPaths.length > 1 ? idx + 1 : ''}</h4>`;
        html += `<p class="optimal-path-nodes">${path.join(' → ')}</p>`;
        
        // Reconstrucción E(v) - E(u) = d
        html += `<h5>Verificación Matemática: E(v) - E(u) = d(u,v)</h5>`;
        html += `<ul class="explanation">`;
        for (let i = 0; i < path.length - 1; i++) {
            const u = path[i];
            const v = path[i+1];
            const eu = dijkstraResult.distances.get(u);
            const ev = dijkstraResult.distances.get(v);
            const w = ev - eu; // El peso exacto usado en el camino óptimo
            html += `<li>E(${v}) - E(${u}) = ${ev} - ${eu} = <strong>${w}</strong> (Peso de la conexión ${u} → ${v})</li>`;
        }
        html += `</ul></div>`;
    });
    
    html += '</div>';
    return html;
}

function reconstructPaths(predecessors, current, start) {
    if (current === start) return [[start]];
    const preds = predecessors.get(current) || [];
    let paths = [];
    for (const p of preds) {
        const subPaths = reconstructPaths(predecessors, p, start);
        for (const sp of subPaths) {
            paths.push([...sp, current]);
        }
    }
    return paths;
}
