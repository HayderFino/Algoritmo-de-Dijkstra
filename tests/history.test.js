import assert from 'assert';
import { Graph } from '../src/graph.js';
import { runDijkstra } from '../src/dijkstra.js';
import { generateHistoryHTML, generateTableHTML } from '../src/history.js';

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

runTest("testHistoryGeneratorExactFormatsAnd5Nodes", () => {
    // Grafo de 5 nodos, a mano
    const g = new Graph(true);
    g.addEdge(1, 2, 10);
    g.addEdge(1, 3, 20);
    g.addEdge(2, 3, 5);
    g.addEdge(2, 4, 15);
    g.addEdge(3, 5, 10);
    g.addEdge(4, 5, 2);
    
    // Conexión inversa para forzar "nodo permanente"
    g.addEdge(5, 1, 100); 

    // Añadir nodo alcanzable sin ninguna salida para probar evaluaciones vacías
    g.addEdge(5, 6, 1);
    
    const result = runDijkstra(g, 1);
    const htmlHistory = generateHistoryHTML(result);
    const htmlTable = generateTableHTML(result, [1,2,3,4,5,6]);
    
    console.log("\n================ HISTORIAL IMPRESO PARA REVISIÓN ================\n");
    console.log(htmlHistory);
    console.log(htmlTable);
    console.log("\n=================================================================\n");

    // Validar nodo sin salida
    assert.ok(htmlHistory.includes('El nodo 6 no tiene conexiones salientes válidas hacia nodos provisionales.'));
    
    // Validar nodo ya permanente (cuando 5 evalúa 1)
    assert.ok(htmlHistory.includes('ya tiene etiqueta permanente. No se actualiza ni evalúa.'));
    
    // Validar número exacto del snapshot
    assert.ok(htmlHistory.includes('e(4) = \\min(\\infty, 10 + 15) = 25'));
});

console.log(`\nResumen total: ${passed} / ${total} pruebas de historial pasaron correctamente.`);
if (passed !== total) process.exit(1);
