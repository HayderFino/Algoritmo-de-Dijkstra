import { AppConfig } from './config.js';
import { runDijkstra } from './dijkstra.js';
import { generateHistoryHTML, generateTableHTML } from './history.js';
import { generateResultHTML } from './results.js';
import { SVGRenderer } from './svg-renderer.js';

let appConfig = new AppConfig();
let dijkstraResult = null;
let currentStep = -1;
let renderer = new SVGRenderer('graph-svg');

const histContainer = document.getElementById('history-container');
const tableContainer = document.getElementById('table-container');
const errorMsg = document.getElementById('error-message');
const resultContainer = document.getElementById('result-container');
let autoplayInterval = null;

window.onerror = function(msg, url, line) {
    const el = document.getElementById('global-error');
    if(el) { el.style.display = 'block'; el.textContent = `Error: ${msg} (${url}:${line})`; }
};
window.addEventListener('unhandledrejection', function(event) {
    const el = document.getElementById('global-error');
    if(el) { el.style.display = 'block'; el.textContent = `Promesa rechazada: ${event.reason}`; }
});

function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.style.display = 'block';
    setTimeout(() => errorMsg.style.display = 'none', 4000);
}

function syncUI() {
    // Sync node count
    document.getElementById('node-count').value = appConfig.nodes.length;
    document.getElementById('graph-type').value = appConfig.directed ? 'directed' : 'undirected';
    
    // Sync selects
    const selects = ['start-node', 'end-node', 'edge-u', 'edge-v'];
    selects.forEach(id => {
        const el = document.getElementById(id);
        const prevVal = el.value;
        el.innerHTML = appConfig.nodes.map(n => `<option value="${n}">${n}</option>`).join('');
        if (appConfig.nodes.includes(prevVal)) el.value = prevVal;
    });
    
    document.getElementById('start-node').value = appConfig.source;
    document.getElementById('end-node').value = appConfig.target;

    // Agregar conexión: Desde/Hasta nunca inician con el mismo nodo (por defecto nodos[0] y nodos[1])
    const eu = document.getElementById('edge-u');
    const ev = document.getElementById('edge-v');
    if (!appConfig.nodes.includes(eu.value)) eu.value = appConfig.nodes[0];
    if (!appConfig.nodes.includes(ev.value) || ev.value === eu.value) {
        ev.value = appConfig.nodes.find(n => n !== eu.value);
    }
    
    // Sync edges table
    const tbody = document.querySelector('#edges-table tbody');
    tbody.innerHTML = appConfig.edges.map(e => `
        <tr>
            <td>${e.u}</td>
            <td>
                <select class="edge-dir-change" data-id="${e.id}">
                    <option value="forward" ${e.direction==='forward'?'selected':''}>→</option>
                    <option value="both" ${e.direction==='both'?'selected':''}>↔</option>
                    <option value="backward" ${e.direction==='backward'?'selected':''}>←</option>
                </select>
            </td>
            <td>${e.v}</td>
            <td>${e.weight}</td>
            <td><button class="btn-remove-edge" data-id="${e.id}">Eliminar</button></td>
        </tr>
    `).join('');
    
    document.querySelectorAll('.edge-dir-change').forEach(sel => {
        sel.addEventListener('change', (ev) => {
            appConfig.updateEdge(Number(ev.target.dataset.id), null, ev.target.value);
            resetAlgorithm();
        });
    });
    
    document.querySelectorAll('.btn-remove-edge').forEach(btn => {
        btn.addEventListener('click', (ev) => {
            appConfig.removeEdge(Number(ev.target.dataset.id));
            resetAlgorithm();
        });
    });

    appConfig.save();
    renderAll();
}

function resetAlgorithm() {
    dijkstraResult = null;
    currentStep = -1;
    stopAutoplay();
    document.getElementById('step-controls').style.display = 'none';
    resultContainer.style.display = 'none';
    histContainer.innerHTML = '<p class="placeholder-text">Modelo modificado. Vuelve a resolver.</p>';
    tableContainer.innerHTML = '';
    syncUI();
}

function renderAll() {
    if (dijkstraResult && currentStep >= 0) {
        renderer.render(appConfig, dijkstraResult.history[currentStep]);
    } else {
        renderer.render(appConfig);
    }
}

// Event Listeners for Config
document.getElementById('node-count').addEventListener('change', (e) => {
    try { appConfig.setNodeCount(e.target.value); resetAlgorithm(); } 
    catch(err) { showError(err.message); e.target.value = appConfig.nodes.length; }
});

document.getElementById('graph-type').addEventListener('change', (e) => {
    appConfig.setDirected(e.target.value === 'directed');
    resetAlgorithm();
});

document.getElementById('start-node').addEventListener('change', (e) => {
    appConfig.setSource(e.target.value); resetAlgorithm();
});

document.getElementById('end-node').addEventListener('change', (e) => {
    appConfig.setTarget(e.target.value); resetAlgorithm();
});

document.getElementById('btn-add-edge').addEventListener('click', () => {
    try {
        const u = document.getElementById('edge-u').value;
        const v = document.getElementById('edge-v').value;
        const w = document.getElementById('edge-w').value;
        const dir = document.getElementById('edge-dir').value;
        appConfig.addEdge(u, v, w, dir);
        document.getElementById('edge-w').value = '';
        resetAlgorithm();
    } catch(err) {
        showError(err.message);
    }
});

document.getElementById('btn-example').addEventListener('click', () => {
    appConfig = new AppConfig();
    appConfig.initExample();
    resetAlgorithm();
});

document.getElementById('btn-clear').addEventListener('click', () => {
    const n = appConfig.nodes.length;
    appConfig = new AppConfig();
    appConfig.setNodeCount(n); // Keep node count but clear edges
    appConfig.edges = [];
    resetAlgorithm();
});

document.getElementById('btn-start').addEventListener('click', () => {
    try {
        const graph = appConfig.buildGraph();
        dijkstraResult = runDijkstra(graph, appConfig.source, appConfig.target);
        currentStep = 0;
        document.getElementById('step-controls').style.display = 'block';
        resultContainer.style.display = 'none';
        updateUI();
    } catch(e) {
        showError(e.message);
    }
});

function updateUI() {
    renderAll();
    const partialResult = { history: dijkstraResult.history.slice(0, currentStep + 1) };
    histContainer.innerHTML = generateHistoryHTML(partialResult);
    tableContainer.innerHTML = generateTableHTML(partialResult, appConfig.nodes);
    
    // Renderizado explícito programático KaTeX
    document.querySelectorAll('.math-eq').forEach(el => {
        const latex = el.getAttribute('data-latex');
        if (latex) {
            if (window.katex) {
                try {
                    katex.render(latex, el, {throwOnError: false});
                } catch(e) {
                    el.textContent = latex.replace(/\\min/g, 'min').replace(/\\infty/g, '∞').replace(/\\cdot/g, '·');
                }
            } else {
                el.textContent = latex.replace(/\\min/g, 'min').replace(/\\infty/g, '∞').replace(/\\cdot/g, '·');
            }
        }
    });
}

document.getElementById('btn-next').addEventListener('click', () => {
    stopAutoplay();
    if (dijkstraResult && currentStep < dijkstraResult.history.length - 1) {
        currentStep++; updateUI();
    }
});

document.getElementById('btn-prev').addEventListener('click', () => {
    stopAutoplay();
    if (currentStep > 0) { currentStep--; updateUI(); }
});

function stopAutoplay() {
    if (autoplayInterval) {
        clearInterval(autoplayInterval);
        autoplayInterval = null;
        document.getElementById('btn-auto').textContent = "Autoplay";
    }
}

document.getElementById('btn-auto').addEventListener('click', () => {
    if (autoplayInterval) {
        stopAutoplay();
    } else {
        document.getElementById('btn-auto').textContent = "Pausar";
        autoplayInterval = setInterval(() => {
            if (currentStep < dijkstraResult.history.length - 1) {
                currentStep++;
                updateUI();
            } else {
                stopAutoplay();
                showFinalResult();
            }
        }, 1500);
    }
});

document.getElementById('btn-finish').addEventListener('click', () => {
    stopAutoplay();
    currentStep = dijkstraResult.history.length - 1;
    updateUI();
    showFinalResult();
});

function showFinalResult() {
    resultContainer.style.display = 'block';
    resultContainer.innerHTML = generateResultHTML(dijkstraResult, appConfig.target);
}

document.getElementById('graph-svg').addEventListener('graph-moved', (ev) => {
    const { node, x, y } = ev.detail;
    if (appConfig.setNodePosition(node, x, y)) {
        renderAll();
    }
});
document.getElementById('graph-svg').addEventListener('mouseup', () => appConfig.save());

// Inicialización de KaTeX en la fórmula estática (idempotente)
function renderStaticMath() {
    document.querySelectorAll('.formula-box .math-eq').forEach(el => {
        if (!el.dataset.latex) {
            // Quitar los delimitadores \[ y \] antes de katex.render()
            el.dataset.latex = el.textContent.replace(/\\\[/g, '').replace(/\\\]/g, '').trim();
        }
        const latex = el.dataset.latex;
        if (window.katex) {
            try {
                katex.render(latex, el, {throwOnError: false, displayMode: true});
            } catch(e) {
                el.textContent = latex;
            }
        } else {
            el.textContent = latex;
        }
    });
}
renderStaticMath();
window.addEventListener('load', renderStaticMath);

// Inicialización
if (!appConfig.load()) {
    // Si no había en localStorage, cargar ejemplo por defecto
    document.getElementById('btn-example').click();
} else {
    syncUI();
}
