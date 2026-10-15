import { AppConfig } from './config.js';
import { runDijkstra } from './dijkstra.js';
import { generateHistoryHTML, generateTableHTML } from './history.js';
import { generateResultHTML } from './results.js';
import { runKruskal } from './kruskal.js';
import { generateKruskalHistoryHTML, generateKruskalTableHTML, generateKruskalResultHTML } from './kruskal-history.js';
import { SVGRenderer } from './svg-renderer.js';

let appConfig = new AppConfig();
let dijkstraResult = null;
let kruskalResult = null;
let currentMode = 'dijkstra'; // 'dijkstra' | 'kruskal'
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
    kruskalResult = null;
    currentStep = -1;
    stopAutoplay();
    document.getElementById('step-controls').style.display = 'none';
    resultContainer.style.display = 'none';
    histContainer.innerHTML = currentMode === 'kruskal'
        ? '<p class="placeholder-text">Modelo modificado. Presiona "Resolver con Kruskal".</p>'
        : '<p class="placeholder-text">Modelo modificado. Vuelve a resolver con Dijkstra.</p>';
    tableContainer.innerHTML = '';
    syncUI();
}

function renderAll() {
    if (currentMode === 'kruskal') {
        if (kruskalResult && currentStep >= 0) {
            const stepData = kruskalResult.history[currentStep];
            const nodeRoots = new Map();
            for (const comp of stepData.componentsSnapshot) {
                const root = comp[0];
                for (const node of comp) nodeRoots.set(node, root);
            }
            const allRejected = kruskalResult.history
                .slice(0, currentStep + 1)
                .filter(s => !s.accepted)
                .map(s => s.edge);

            renderer.render(appConfig, {
                algorithm: 'kruskal',
                edge: stepData.edge,
                accepted: stepData.accepted,
                mstSnapshot: stepData.mstSnapshot,
                allRejected,
                nodeRoots
            }, 'kruskal');
        } else {
            renderer.render(appConfig, null, 'kruskal');
        }
    } else {
        if (dijkstraResult && currentStep >= 0) {
            renderer.render(appConfig, dijkstraResult.history[currentStep], 'dijkstra');
        } else {
            renderer.render(appConfig, null, 'dijkstra');
        }
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

const EXERCISES = {
    1: {
        title: "Ejercicio 1: Ejemplo 6.3-1 (Red de Distribución Ponderada)",
        desc: "Determinar la ruta más corta desde el nodo origen <strong>1</strong> hasta el nodo destino <strong>11</strong> a través de la red mixta ponderada, calculando las distancias acumuladas mínimas y el conjunto de predecesores de cada nodo.",
        meta: `
            <span class="meta-pill"><strong>Origen:</strong> Nodo 1</span>
            <span class="meta-pill"><strong>Destino:</strong> Nodo 11</span>
            <span class="meta-pill"><strong>Total Nodos:</strong> 11</span>
            <span class="meta-pill"><strong>Tipo:</strong> Red Mixta Ponderada</span>
        `,
        load: () => {
            appConfig = new AppConfig();
            appConfig.initExample();
        }
    },
    2: {
        title: "Ejercicio 2: Ejemplo 6.3-3 (Acertijo de las tres jarras)",
        desc: "Una jarra de 8 galones está llena de líquido. Dado que hay dos jarras vacías de 5 y 3 galones, divida los 8 galones de líquido en dos partes iguales utilizando sólo las tres jarras. ¿Cuál es el mínimo de transferencias (decantaciones) necesarias para obtener este resultado?",
        meta: `
            <span class="meta-pill"><strong>Estado Inicial:</strong> (8, 0, 0)</span>
            <span class="meta-pill"><strong>Estado Meta:</strong> (4, 4, 0)</span>
            <span class="meta-pill"><strong>Capacidades:</strong> 8, 5 y 3 galones</span>
            <span class="meta-pill"><strong>Costo por Decantación:</strong> d = 1</span>
            <span class="meta-pill"><strong>Solución Mínima:</strong> 7 decantaciones</span>
        `,
        load: () => {
            appConfig = new AppConfig();
            appConfig.initThreeJugsExample();
        }
    }
};

function switchExercise(num) {
    const ex = EXERCISES[num];
    if (!ex) return;
    
    document.querySelectorAll('.exercise-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.ex === String(num));
    });
    
    const titleEl = document.getElementById('ex-title');
    const descEl = document.getElementById('ex-desc');
    const metaEl = document.getElementById('ex-meta');
    if (titleEl) titleEl.innerHTML = ex.title;
    if (descEl) descEl.innerHTML = ex.desc;
    if (metaEl) metaEl.innerHTML = ex.meta;

    ex.load();
    resetAlgorithm();
}

document.getElementById('tab-ex1')?.addEventListener('click', () => switchExercise(1));
document.getElementById('tab-ex2')?.addEventListener('click', () => switchExercise(2));

document.getElementById('btn-example')?.addEventListener('click', () => switchExercise(1));
document.getElementById('btn-example-3jugs')?.addEventListener('click', () => switchExercise(2));

function switchMode(mode) {
    currentMode = mode;
    stopAutoplay();
    
    const isKruskal = (mode === 'kruskal');
    document.getElementById('btn-mode-dijkstra')?.classList.toggle('active', !isKruskal);
    document.getElementById('btn-mode-kruskal')?.classList.toggle('active', isKruskal);

    const titleEl = document.getElementById('app-main-title');
    const subtitleEl = document.getElementById('app-main-subtitle');
    if (titleEl) titleEl.textContent = isKruskal ? "Algoritmo de Kruskal Optimizado" : "Algoritmo de Dijkstra";
    if (subtitleEl) subtitleEl.textContent = isKruskal ? "Árbol de Expansión Mínima (Conjuntos Disjuntos con Compresión y Rango)" : "Cuaderno de Investigación de Operaciones";

    const dijkstraBox = document.getElementById('dijkstra-formula-box');
    const kruskalBox = document.getElementById('kruskal-formula-box');
    if (dijkstraBox) dijkstraBox.style.display = isKruskal ? 'none' : 'block';
    if (kruskalBox) kruskalBox.style.display = isKruskal ? 'block' : 'none';

    const exTabs = document.getElementById('dijkstra-exercise-tabs');
    if (exTabs) exTabs.style.display = isKruskal ? 'none' : 'flex';

    document.querySelectorAll('.btn-dijkstra-only').forEach(el => el.style.display = isKruskal ? 'none' : '');
    document.querySelectorAll('.btn-kruskal-only').forEach(el => el.style.display = isKruskal ? '' : 'none');

    const lblStart = document.getElementById('lbl-start-node');
    const lblEnd = document.getElementById('lbl-end-node');
    if (lblStart) lblStart.style.display = isKruskal ? 'none' : 'block';
    if (lblEnd) lblEnd.style.display = isKruskal ? 'none' : 'block';

    const graphTypeSel = document.getElementById('graph-type');
    if (isKruskal && graphTypeSel) {
        graphTypeSel.value = 'undirected';
        appConfig.setDirected(false);
    }

    const titleBox = document.getElementById('ex-title');
    const descBox = document.getElementById('ex-desc');
    const metaBox = document.getElementById('ex-meta');

    if (isKruskal) {
        if (titleBox) titleBox.innerHTML = "Algoritmo de Kruskal Optimizado (Árbol de Expansión Mínima)";
        if (descBox) descBox.innerHTML = "Construcción del Árbol de Expansión Mínima seleccionando sucesivamente las aristas de menor peso sin formar ciclos, mediante estructura de Conjuntos Disjuntos (Disjoint Set Union con compresión de caminos y unión por rango).";
        if (metaBox) metaBox.innerHTML = `
            <span class="meta-pill"><strong>Criterio:</strong> Menor peso w(e)</span>
            <span class="meta-pill"><strong>Estructura:</strong> DSU (Union-Find)</span>
            <span class="meta-pill"><strong>Detección de Ciclos:</strong> Find(u) == Find(v)</span>
            <span class="meta-pill"><strong>Condición de Parada:</strong> |T| = |V| - 1</span>
        `;
        if (appConfig.nodes.length !== 6 || appConfig.nodes.includes('8,0,0')) {
            appConfig = new AppConfig();
            appConfig.initKruskalExample();
        }
    } else {
        const activeEx = document.querySelector('.exercise-tab.active')?.dataset.ex || '1';
        switchExercise(Number(activeEx));
    }

    renderStaticMath();
    resetAlgorithm();
}

document.getElementById('btn-mode-dijkstra')?.addEventListener('click', () => switchMode('dijkstra'));
document.getElementById('btn-mode-kruskal')?.addEventListener('click', () => switchMode('kruskal'));

document.getElementById('btn-example-kruskal')?.addEventListener('click', () => {
    appConfig = new AppConfig();
    appConfig.initKruskalExample();
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

document.getElementById('btn-start-kruskal')?.addEventListener('click', () => {
    try {
        kruskalResult = runKruskal(appConfig.nodes, appConfig.edges);
        if (!kruskalResult.history || kruskalResult.history.length === 0) {
            throw new Error("No hay aristas válidas para ejecutar Kruskal.");
        }
        currentStep = 0;
        document.getElementById('step-controls').style.display = 'block';
        resultContainer.style.display = 'none';
        updateUI();
    } catch(e) {
        showError(e.message);
    }
});

function getTotalSteps() {
    if (currentMode === 'kruskal') {
        return kruskalResult ? kruskalResult.history.length : 0;
    }
    return dijkstraResult ? dijkstraResult.history.length : 0;
}

function updateUI() {
    renderAll();
    if (currentMode === 'kruskal') {
        if (!kruskalResult) return;
        histContainer.innerHTML = generateKruskalHistoryHTML(kruskalResult, currentStep);
        tableContainer.innerHTML = generateKruskalTableHTML(kruskalResult, currentStep);
    } else {
        if (!dijkstraResult) return;
        const partialResult = { history: dijkstraResult.history.slice(0, currentStep + 1) };
        histContainer.innerHTML = generateHistoryHTML(partialResult);
        tableContainer.innerHTML = generateTableHTML(partialResult, appConfig.nodes);
    }
    
    // Renderizado explícito programático KaTeX
    document.querySelectorAll('.math-eq').forEach(el => {
        const latex = el.getAttribute('data-latex');
        if (latex) {
            if (window.katex) {
                try {
                    katex.render(latex, el, {throwOnError: false});
                } catch(e) {
                    el.textContent = latex.replace(/\\min/g, 'min').replace(/\\infty/g, '∞').replace(/\\cdot/g, '·').replace(/\\text\{([^\}]+)\}/g, '$1');
                }
            } else {
                el.textContent = latex.replace(/\\min/g, 'min').replace(/\\infty/g, '∞').replace(/\\cdot/g, '·').replace(/\\text\{([^\}]+)\}/g, '$1');
            }
        }
    });
}

document.getElementById('btn-next').addEventListener('click', () => {
    stopAutoplay();
    const total = getTotalSteps();
    if (total > 0 && currentStep < total - 1) {
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
            const total = getTotalSteps();
            if (currentStep < total - 1) {
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
    const total = getTotalSteps();
    if (total > 0) {
        currentStep = total - 1;
        updateUI();
        showFinalResult();
    }
});

function showFinalResult() {
    resultContainer.style.display = 'block';
    if (currentMode === 'kruskal') {
        resultContainer.innerHTML = generateKruskalResultHTML(kruskalResult);
    } else {
        resultContainer.innerHTML = generateResultHTML(dijkstraResult, appConfig.target);
    }
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
    switchExercise(1);
} else {
    const isEx2 = appConfig.nodes.includes('8,0,0');
    const ex = isEx2 ? EXERCISES[2] : EXERCISES[1];
    document.querySelectorAll('.exercise-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.ex === (isEx2 ? '2' : '1'));
    });
    const titleEl = document.getElementById('ex-title');
    const descEl = document.getElementById('ex-desc');
    const metaEl = document.getElementById('ex-meta');
    if (titleEl) titleEl.innerHTML = ex.title;
    if (descEl) descEl.innerHTML = ex.desc;
    if (metaEl) metaEl.innerHTML = ex.meta;
    syncUI();
}
