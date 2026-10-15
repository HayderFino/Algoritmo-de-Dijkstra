import assert from 'assert';
import { Graph } from '../src/graph.js';
import { runDijkstra } from '../src/dijkstra.js';
import { AppConfig } from '../src/config.js';

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

runTest("testManualCalculation", () => {
    const g = new Graph(true);
    g.addEdge('A', 'B', 2);
    g.addEdge('A', 'C', 4);
    g.addEdge('B', 'C', 1);
    g.addEdge('B', 'D', 7);
    g.addEdge('C', 'D', 3);
    const result = runDijkstra(g, 'A');
    assert.strictEqual(result.distances.get('D'), 6);
    assert.deepStrictEqual(result.predecessors.get('D'), ['C']);
    assert.deepStrictEqual(result.predecessors.get('C'), ['B']);
    assert.deepStrictEqual(result.predecessors.get('B'), ['A']);
});

runTest("testDijkstraBasic", () => {
    const g = new Graph(false); // No dirigido
    g.addEdge(1, 2, 10);
    g.addEdge(1, 3, 20);
    g.addEdge(2, 3, 5);
    const result = runDijkstra(g, 1);
    assert.strictEqual(result.distances.get(3), 15);
});

runTest("testUnreachable", () => {
    const g = new Graph(false);
    g.addNode(1);
    g.addNode(2); 
    const result = runDijkstra(g, 1);
    assert.strictEqual(result.distances.get(2), Infinity);
});

runTest("testDirected", () => {
    const g = new Graph(true);
    g.addEdge(1, 2, 5);
    g.addEdge(2, 1, 10);
    const result = runDijkstra(g, 1);
    assert.strictEqual(result.distances.get(2), 5);
    const result2 = runDijkstra(g, 2);
    assert.strictEqual(result2.distances.get(1), 10);
});

runTest("testUndirectedBothWays", () => {
    const g = new Graph(false);
    g.addEdge('X', 'Y', 10);
    const result = runDijkstra(g, 'Y');
    assert.strictEqual(result.distances.get('X'), 10);
});

runTest("testDirectedReverseImpossible", () => {
    const g = new Graph(true);
    g.addEdge('A', 'B', 5);
    const result = runDijkstra(g, 'B');
    assert.strictEqual(result.distances.get('A'), Infinity);
});

runTest("testMultipleRoutesToSameNode", () => {
    const g = new Graph(true);
    g.addEdge(1, 2, 10);
    g.addEdge(1, 3, 5);
    g.addEdge(3, 2, 5);
    const result = runDijkstra(g, 1);
    assert.strictEqual(result.distances.get(2), 10);
    assert.strictEqual(result.predecessors.get(2).length, 2);
});

runTest("testGraphSizes", () => {
    // 2 Nodos
    const g2 = new Graph(false);
    g2.addEdge(1, 2, 5);
    assert.strictEqual(runDijkstra(g2, 1).distances.get(2), 5);

    // 10 Nodos
    const g10 = new Graph(true);
    for(let i=1; i<10; i++) g10.addEdge(i, i+1, 1);
    assert.strictEqual(runDijkstra(g10, 1).distances.get(10), 9);

    // 30 Nodos
    const g30 = new Graph(true);
    for(let i=1; i<30; i++) g30.addEdge(i, i+1, 2);
    assert.strictEqual(runDijkstra(g30, 1).distances.get(30), 58);
});

runTest("testNegativeWeights", () => {
    const g = new Graph(false);
    assert.throws(() => g.addEdge(1, 2, -5), /Pesos negativos no permitidos/);
});

runTest("testZeroWeight", () => {
    const g = new Graph(false);
    g.addEdge(1, 2, 0);
    g.addEdge(2, 3, 5);
    const result = runDijkstra(g, 1);
    assert.strictEqual(result.distances.get(2), 0);
    assert.strictEqual(result.distances.get(3), 5);
});

runTest("testDecimals", () => {
    const g = new Graph(true);
    g.addEdge('A', 'B', 0.1);
    g.addEdge('B', 'C', 0.2);
    g.addEdge('A', 'C', 0.3);
    const result = runDijkstra(g, 'A');
    assert.strictEqual(result.distances.get('C'), 0.3);
    assert.strictEqual(result.predecessors.get('C').length, 2);
});

runTest("testStartEqualsEnd", () => {
    const g = new Graph(false);
    g.addNode('A');
    const result = runDijkstra(g, 'A');
    assert.strictEqual(result.distances.get('A'), 0);
});

runTest("testParallelEdges", () => {
    const g = new Graph(true);
    g.addEdge(1, 2, 10);
    g.addEdge(1, 2, 5); // Paralela más corta
    const result = runDijkstra(g, 1);
    assert.strictEqual(result.distances.get(2), 5);
});

runTest("testIsolated", () => {
    const g = new Graph(false);
    g.addNode(1);
    g.addNode(2);
    const result = runDijkstra(g, 1);
    assert.strictEqual(result.distances.get(2), Infinity);
});

runTest("testMultiplePathsTie", () => {
    const g = new Graph(true);
    g.addEdge(1, 2, 10);
    g.addEdge(1, 3, 5);
    g.addEdge(3, 2, 5); // Ruta alterna: 1->3->2 = 10
    const result = runDijkstra(g, 1);
    assert.strictEqual(result.distances.get(2), 10);
    assert.strictEqual(result.predecessors.get(2).length, 2);
    assert.ok(result.predecessors.get(2).includes(1));
    assert.ok(result.predecessors.get(2).includes(3));
});

runTest("testPermanentNotUpdated", () => {
    const g = new Graph(true);
    g.addEdge(1, 2, 5);
    g.addEdge(1, 3, 20);
    g.addEdge(2, 3, 10); // 1->2->3 = 15
    g.addEdge(3, 2, 2); // 3 es permanente antes o después?
    const result = runDijkstra(g, 1);
    const step = result.history.find(h => h.selectedNode === 3);
    const eval2 = step.evaluations.find(e => e.neighbor === 2);
    assert.strictEqual(eval2.reason, "Nodo ya tiene etiqueta permanente");
    assert.strictEqual(eval2.updated, false);
});

runTest("test11NodesGraph", () => {
    const config = new AppConfig();
    config.initExample(); // Carga la red de 11 nodos
    const g = config.buildGraph();
    const result = runDijkstra(g, '1');
    
    // Distancias esperadas: 0, 18, 20, 25, 32, 35, 48, 50, 48, 63, 72
    assert.strictEqual(result.distances.get('1'), 0);
    assert.strictEqual(result.distances.get('2'), 18);
    assert.strictEqual(result.distances.get('3'), 20);
    assert.strictEqual(result.distances.get('4'), 25);
    assert.strictEqual(result.distances.get('5'), 32);
    assert.strictEqual(result.distances.get('6'), 35);
    assert.strictEqual(result.distances.get('7'), 48);
    assert.strictEqual(result.distances.get('8'), 50);
    assert.strictEqual(result.distances.get('9'), 48);
    assert.strictEqual(result.distances.get('10'), 63);
    assert.strictEqual(result.distances.get('11'), 72);
    
    // Camino al 11 = 1->3->6->9->11
    assert.ok(result.predecessors.get('11').includes('9'));
    assert.ok(result.predecessors.get('9').includes('6'));
    assert.ok(result.predecessors.get('6').includes('3'));
    assert.ok(result.predecessors.get('3').includes('1'));
    
    // Empate 7 vs 9 (ambos 48) resuelto por orden de creación (Nodo 7 antes que 9)
    const step = result.history.find(h => h.selectedNode === '7');
    assert.ok(step !== undefined, "Nodo 7 debería ser procesado antes que 9");
});

runTest("testMixedGraphReverseImpossible", () => {
    const config = new AppConfig();
    config.setNodeCount(3);
    config.addEdge('1', '2', 10, 'forward'); // 1 -> 2
    config.addEdge('2', '3', 5, 'both');     // 2 <-> 3
    const g = config.buildGraph();
    
    const res = runDijkstra(g, '3');
    assert.strictEqual(res.distances.get('2'), 5);
    assert.strictEqual(res.distances.get('1'), Infinity); // No puede volver a 1
});

runTest("testThreeJugsPuzzle", () => {
    const config = new AppConfig();
    config.initThreeJugsExample();
    const g = config.buildGraph();
    const result = runDijkstra(g, '8,0,0', '4,4,0');
    
    // Distancia mínima: 7 decantaciones
    assert.strictEqual(result.distances.get('4,4,0'), 7);
    assert.strictEqual(result.startNode, '8,0,0');
    assert.deepStrictEqual(result.predecessors.get('4,4,0'), ['1,4,3']);

    // Reconstrucción del camino óptimo
    let curr = '4,4,0';
    const path = [curr];
    while (curr !== '8,0,0') {
        curr = result.predecessors.get(curr)[0];
        path.unshift(curr);
    }
    const expectedPath = [
        '8,0,0', '3,5,0', '3,2,3', '6,2,0', 
        '6,0,2', '1,5,2', '1,4,3', '4,4,0'
    ];
    assert.deepStrictEqual(path, expectedPath);
});

console.log(`\nResumen total: ${passed} / ${total} pruebas pasaron correctamente.`);
if (passed !== total) process.exit(1);
