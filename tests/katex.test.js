import assert from 'assert';
import katex from 'katex';
import { AppConfig } from '../src/config.js';
import { runDijkstra } from '../src/dijkstra.js';
import { generateHistoryHTML } from '../src/history.js';

let passed = 0;
let total = 0;

function runTest(name, fn) {
    total++;
    try {
        fn();
        console.log(`✔ ${name} superado`);
        passed++;
    } catch (e) {
        console.error(`✖ ${name} falló:`, e.message);
        throw e;
    }
}

runTest("testKatexRenderingAllEquations", () => {
    const config = new AppConfig();
    config.initExample(); // Grafo de 11 nodos
    const g = config.buildGraph();
    const result = runDijkstra(g, '1');
    const html = generateHistoryHTML(result);
    
    const regex = /data-latex="([^"]+)"/g;
    let match;
    let eqs = 0;
    while ((match = regex.exec(html)) !== null) {
        eqs++;
        const latex = match[1];
        try {
            katex.renderToString(latex, { throwOnError: true });
        } catch (e) {
            assert.fail(`KaTeX falló renderizando "${latex}": ${e.message}`);
        }
    }
    assert.ok(eqs > 0, "Deberían haberse generado ecuaciones para renderizar");
});

console.log(`\nResumen total: ${passed} / ${total} pruebas KaTeX pasaron correctamente.`);
if (passed !== total) process.exit(1);
