import assert from 'assert';
import { DisjointSet, runKruskal } from '../src/kruskal.js';
import { generateKruskalHistoryHTML, generateKruskalTableHTML, generateKruskalResultHTML } from '../src/kruskal-history.js';
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

runTest("testDisjointSetBasics", () => {
    const dsu = new DisjointSet(['A', 'B', 'C', 'D']);
    assert.strictEqual(dsu.find('A'), 'A');
    assert.strictEqual(dsu.find('B'), 'B');
    
    // Union A y B
    assert.strictEqual(dsu.union('A', 'B'), true);
    assert.strictEqual(dsu.find('A'), dsu.find('B'));
    
    // Intentar unir A y B de nuevo (ciclo)
    assert.strictEqual(dsu.union('A', 'B'), false);

    // Union C y D
    assert.strictEqual(dsu.union('C', 'D'), true);
    assert.notStrictEqual(dsu.find('A'), dsu.find('C'));

    // Union B y C
    assert.strictEqual(dsu.union('B', 'C'), true);
    assert.strictEqual(dsu.find('A'), dsu.find('D'));
});

runTest("testKruskal6NodesExample", () => {
    const config = new AppConfig();
    config.initKruskalExample();
    const result = runKruskal(config.nodes, config.edges);

    // Con 6 nodos, el MST debe tener 5 aristas
    assert.strictEqual(result.mst.length, 5);
    assert.strictEqual(result.isConnected, true);
    
    // Aristas esperadas ordenadas por peso:
    // (1,2: 1), (3,4: 2), (2,4: 3), (2,3: 4 - ciclo!), (1,3: 5 - ciclo!), (3,5: 6), (4,5: 7 - ciclo!), (4,6: 8)
    // Peso total = 1 + 2 + 3 + 6 + 8 = 20
    assert.strictEqual(result.totalWeight, 20);

    const historyHTML = generateKruskalHistoryHTML(result, result.history.length - 1);
    assert.ok(historyHTML.includes("Paso 1"));
    assert.ok(historyHTML.includes("ACEPTADA"));
    assert.ok(historyHTML.includes("DESCARTADA"));

    const tableHTML = generateKruskalTableHTML(result, result.history.length - 1);
    assert.ok(tableHTML.includes("<table"));
    assert.ok(tableHTML.includes("Descartada (Ciclo)"));

    const resultHTML = generateKruskalResultHTML(result);
    assert.ok(resultHTML.includes("Árbol de Expansión Mínima"));
    assert.ok(resultHTML.includes("20"));
});

runTest("testKruskalDisconnectedGraph", () => {
    const nodes = ['1', '2', '3', '4'];
    const edges = [
        { id: 1, u: '1', v: '2', weight: 10 },
        { id: 2, u: '3', v: '4', weight: 5 }
    ];
    const result = runKruskal(nodes, edges);
    assert.strictEqual(result.isConnected, false);
    assert.strictEqual(result.componentsCount, 2);
    assert.strictEqual(result.mst.length, 2);
    assert.strictEqual(result.totalWeight, 15);

    const resultHTML = generateKruskalResultHTML(result);
    assert.ok(resultHTML.includes("desconectado"));
});

console.log(`\nResumen total Kruskal: ${passed} / ${total} pruebas pasaron correctamente.`);
