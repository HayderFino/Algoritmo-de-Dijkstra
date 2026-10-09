import assert from 'assert';
import { AppConfig } from '../src/config.js';
import { runDijkstra } from '../src/dijkstra.js';

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

runTest("testConfigModelLogic", () => {
    const config = new AppConfig();
    config.setNodeCount(5); // Nodos: 1, 2, 3, 4, 5
    
    // Agregar 6 aristas
    config.addEdge('1', '2', 10);
    config.addEdge('1', '3', 5);
    config.addEdge('2', '3', 2);
    config.addEdge('2', '4', 1);
    config.addEdge('3', '5', 20);
    config.addEdge('4', '5', 4);
    
    // Intentar un peso negativo (debe fallar)
    assert.throws(() => config.addEdge('1', '4', -5), /Pesos negativos no permitidos/);
    
    // Eliminar un nodo con aristas (reducimos a 4 nodos, lo que borra 5 y sus aristas)
    config.setNodeCount(4); 
    
    // Verificamos que las aristas hacia 5 fueron purgadas (3->5 y 4->5 desaparecen)
    assert.strictEqual(config.edges.length, 4); // 1->2, 1->3, 2->3, 2->4
    
    // Ejecutamos Dijkstra sobre el resultado
    const g = config.buildGraph();
    const result = runDijkstra(g, '1');
    
    // Verificamos las distancias a mano (4 debe ser 11: 1->2 es 10, 2->4 es 1, total 11)
    assert.strictEqual(result.distances.get('4'), 11);
});

console.log(`\nResumen total: ${passed} / ${total} pruebas del modelo pasaron correctamente.`);
if (passed !== total) process.exit(1);
