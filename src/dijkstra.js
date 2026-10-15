export function runDijkstra(graph, startNode, endNode = null) {
    if (!graph.nodes.has(startNode)) throw new Error("El nodo origen no existe");
    
    const distances = new Map();
    const predecessors = new Map(); 
    const permanent = new Set();
    const history = []; 
    
    const addDist = (a, b) => {
        if (a === Infinity || b === Infinity) return Infinity;
        return Math.round((a + b) * 1e10) / 1e10;
    };
    
    for (const node of graph.nodes) {
        distances.set(node, Infinity);
        predecessors.set(node, []);
    }
    distances.set(startNode, 0);
    
    let iteration = 0;
    
    while (permanent.size < graph.nodes.size) {
        let current = null;
        let minDistance = Infinity;
        let tieBreakerApplied = false;
        
        for (const node of graph.nodes) {
            if (!permanent.has(node) && distances.get(node) <= minDistance) {
                if (distances.get(node) === minDistance && current !== null) {
                    // Criterio de desempate: Orden de creación del nodo
                    if (graph.nodeOrder.get(node) < graph.nodeOrder.get(current)) {
                        current = node;
                        tieBreakerApplied = true;
                    }
                } else {
                    current = node;
                    minDistance = distances.get(node);
                    tieBreakerApplied = false;
                }
            }
        }
        
        if (current === null || minDistance === Infinity) {
            break; 
        }
        
        permanent.add(current);
        iteration++;
        
        let iterationData = {
            k: iteration,
            selectedNode: current,
            permanentDistance: minDistance,
            tieBreakerApplied: tieBreakerApplied,
            tieBreakerReason: tieBreakerApplied ? `Desempate: se priorizó el nodo '${current}' por su orden de creación en la red.` : "",
            evaluations: [],
            distancesSnapshot: new Map(distances),
            permanentSnapshot: new Set(permanent)
        };
        
        const neighbors = graph.getNeighbors(current);
        for (const edge of neighbors) {
            const neighbor = edge.node;
            const weight = edge.weight;
            
            if (permanent.has(neighbor)) {
                iterationData.evaluations.push({
                    neighbor,
                    weight,
                    oldDistance: distances.get(neighbor),
                    newDistance: null,
                    updated: false,
                    reason: "Nodo ya tiene etiqueta permanente"
                });
                continue;
            }
            
            const newDistance = addDist(minDistance, weight);
            const oldDistance = distances.get(neighbor);
            
            let updated = false;
            let reason = "";
            
            if (newDistance < oldDistance) {
                distances.set(neighbor, newDistance);
                predecessors.set(neighbor, [current]);
                updated = true;
                reason = "Se encontró un camino más corto";
            } else if (newDistance === oldDistance && oldDistance !== Infinity) {
                if (!predecessors.get(neighbor).includes(current)) {
                    predecessors.get(neighbor).push(current);
                }
                reason = "Camino alternativo óptimo encontrado (empate)";
            } else {
                reason = "El camino actual es menor o igual";
            }
            
            iterationData.evaluations.push({
                neighbor,
                weight,
                oldDistance,
                newDistance,
                updated,
                reason
            });
        }
        
        iterationData.endDistancesSnapshot = new Map(distances);
        history.push(iterationData);
    }
    
    return {
        distances,
        predecessors,
        history,
        startNode
    };
}
