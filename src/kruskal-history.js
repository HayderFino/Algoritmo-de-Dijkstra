export function generateKruskalHistoryHTML(kruskalResult, currentStepIndex) {
    if (!kruskalResult || !kruskalResult.history || kruskalResult.history.length === 0) {
        return '<p class="placeholder-text">Presiona "Resolver con Kruskal" para iniciar la evaluación paso a paso.</p>';
    }

    const steps = kruskalResult.history.slice(0, currentStepIndex + 1);
    let html = '';

    for (const step of steps) {
        const e = step.edge;
        const statusClass = step.accepted ? 'step-accepted' : 'step-rejected';
        const badgeColor = step.accepted ? 'var(--ink-green)' : 'var(--ink-red)';
        const badgeText = step.accepted ? '✔ ACEPTADA (Sin ciclo)' : '✖ DESCARTADA (Ciclo detectado)';

        html += `<div class="iteration-block">\n`;
        html += `<h4>Paso ${step.step}: Evaluación de la arista (${e.u}, ${e.v})</h4>\n`;
        html += `<p><strong>Peso de la arista:</strong> w(${e.u}, ${e.v}) = ${e.weight}</p>\n`;

        // KaTeX latex string
        const latex = `\\text{Find}(${e.u}) = ${step.rootU}, \\quad \\text{Find}(${e.v}) = ${step.rootV}`;
        html += `<div class="equation-row">\n`;
        html += `<div class="math-eq" data-latex="${latex}"></div>\n`;
        html += `<ul class="explanation">\n`;
        html += `<li><strong>Representante de ${e.u}:</strong> ${step.rootU}</li>\n`;
        html += `<li><strong>Representante de ${e.v}:</strong> ${step.rootV}</li>\n`;
        
        if (step.accepted) {
            html += `<li><strong style="color: ${badgeColor};">${badgeText}</strong></li>\n`;
            html += `<li>Como ${step.rootU} $\\neq$ ${step.rootV}, los nodos pertenecen a árboles distintos. Se agrega la arista a $T$ y se aplica $\\text{Union}(${e.u}, ${e.v})$.</li>\n`;
            html += `<li><strong>Aristas en el árbol |T|:</strong> ${step.treeEdgesCount} / ${kruskalResult.nodes.length - 1}</li>\n`;
            html += `<li><strong>Peso acumulado del árbol:</strong> ${step.totalWeightSnapshot}</li>\n`;
        } else {
            html += `<li><strong style="color: ${badgeColor};">${badgeText}</strong></li>\n`;
            html += `<li>Como ambos nodos ya tienen el mismo representante (${step.rootU}), agregar (${e.u}, ${e.v}) crearía un <strong>ciclo cerrado</strong>.</li>\n`;
        }
        
        // Componentes actuales
        const compStr = step.componentsSnapshot.map(c => `{${c.join(', ')}}`).join(', ');
        html += `<li><strong>Bosque actual de componentes:</strong> ${compStr}</li>\n`;
        html += `</ul></div>\n`;
        html += `</div>\n`;
    }

    return html;
}

export function generateKruskalTableHTML(kruskalResult, currentStepIndex) {
    if (!kruskalResult || !kruskalResult.history || kruskalResult.history.length === 0) {
        return '';
    }

    const steps = kruskalResult.history.slice(0, currentStepIndex + 1);
    let html = '<table class="dijkstra-table"><thead><tr>';
    html += '<th>Paso</th><th>Arista (u, v)</th><th>Peso</th><th>Find(u)</th><th>Find(v)</th><th>Decisión</th><th>|T|</th><th>Peso Acumulado</th>';
    html += '</tr></thead><tbody>';

    for (const step of steps) {
        const e = step.edge;
        const decClass = step.accepted ? 'permanent' : 'tie-breaker-note';
        const decText = step.accepted ? 'Aceptada' : 'Descartada (Ciclo)';
        html += `<tr>`;
        html += `<td>${step.step}</td>`;
        html += `<td>(${e.u}, ${e.v})</td>`;
        html += `<td>${e.weight}</td>`;
        html += `<td>${step.rootU}</td>`;
        html += `<td>${step.rootV}</td>`;
        html += `<td class="${decClass}">${decText}</td>`;
        html += `<td>${step.treeEdgesCount}</td>`;
        html += `<td>${step.totalWeightSnapshot}</td>`;
        html += `</tr>`;
    }

    html += '</tbody></table>';
    return html;
}

export function generateKruskalResultHTML(kruskalResult) {
    let html = '<div class="result-panel">';
    html += '<h3>Resultado Final del Algoritmo de Kruskal</h3>';

    const targetCount = kruskalResult.nodes.length - 1;
    const isComplete = kruskalResult.isConnected;

    if (isComplete) {
        html += `<p style="color: var(--ink-green); font-size: 1.1rem; font-weight: bold;">`;
        html += `✔ Se construyó exitosamente el Árbol de Expansión Mínima (MST).`;
        html += `</p>`;
        html += `<p><strong>Condición de parada alcanzada:</strong> |T| = |V| - 1 = ${targetCount} aristas.</p>`;
    } else {
        html += `<p style="color: var(--ink-red); font-size: 1.1rem; font-weight: bold;">`;
        html += `⚠ El grafo es desconectado. Se construyó un Bosque de Expansión Mínima con ${kruskalResult.componentsCount} componentes.`;
        html += `</p>`;
        html += `<p><strong>Aristas seleccionadas:</strong> ${kruskalResult.mst.length} de ${targetCount} necesarias para conectar todos los vértices.</p>`;
    }

    html += `<p><strong>Peso total mínimo del árbol:</strong> <span style="font-size: 1.3rem; color: var(--ink-green); font-weight: bold;">${kruskalResult.totalWeight}</span></p>`;

    html += '<div class="optimal-path-box">';
    html += '<h4>Aristas que conforman el Árbol de Expansión Mínima T:</h4>';
    html += '<ul class="explanation">';
    for (const e of kruskalResult.mst) {
        html += `<li>Arista <strong>(${e.u}, ${e.v})</strong> con peso <strong>${e.weight}</strong></li>`;
    }
    html += '</ul>';

    html += '<h5>Componentes Conectadas:</h5>';
    html += '<ul class="explanation">';
    for (const comp of kruskalResult.components) {
        html += `<li>Componente: <strong>{ ${comp.join(', ')} }</strong></li>`;
    }
    html += '</ul>';
    html += '</div>';

    html += '</div>';
    return html;
}
