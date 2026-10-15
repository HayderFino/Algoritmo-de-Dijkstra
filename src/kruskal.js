export class DisjointSet {
    constructor(elements) {
        this.parent = new Map();
        this.rank = new Map();
        for (const el of elements) {
            this.parent.set(el, el);
            this.rank.set(el, 0);
        }
    }

    find(i) {
        if (!this.parent.has(i)) {
            this.parent.set(i, i);
            this.rank.set(i, 0);
            return i;
        }
        if (this.parent.get(i) === i) {
            return i;
        }
        // Compresión de caminos (Path Compression)
        const root = this.find(this.parent.get(i));
        this.parent.set(i, root);
        return root;
    }

    union(i, j) {
        const rootI = this.find(i);
        const rootJ = this.find(j);
        if (rootI === rootJ) return false;

        // Unión por rango (Union by Rank)
        const rankI = this.rank.get(rootI) || 0;
        const rankJ = this.rank.get(rootJ) || 0;
        if (rankI < rankJ) {
            this.parent.set(rootI, rootJ);
        } else if (rankI > rankJ) {
            this.parent.set(rootJ, rootI);
        } else {
            this.parent.set(rootJ, rootI);
            this.rank.set(rootI, rankI + 1);
        }
        return true;
    }

    getComponents(elements) {
        const groups = new Map();
        for (const el of elements) {
            const root = this.find(el);
            if (!groups.has(root)) groups.set(root, []);
            groups.get(root).push(el);
        }
        return Array.from(groups.values());
    }
}

export function runKruskal(nodes, rawEdges) {
    if (!Array.isArray(nodes) || nodes.length < 2) {
        throw new Error("Se requieren al menos 2 nodos para Kruskal.");
    }

    // Normalizar aristas no dirigidas y eliminar duplicados manteniendo el menor peso
    const edgeMap = new Map();
    for (const e of rawEdges) {
        if (!nodes.includes(e.u) || !nodes.includes(e.v)) continue;
        if (e.u === e.v) continue; // Lazos no forman parte de un árbol
        
        // Identificador no dirigido u <-> v
        const key = e.u < e.v ? `${e.u}--${e.v}` : `${e.v}--${e.u}`;
        const u = e.u < e.v ? e.u : e.v;
        const v = e.u < e.v ? e.v : e.u;
        const w = Number(e.weight);
        if (isNaN(w) || w < 0) continue;

        if (!edgeMap.has(key) || edgeMap.get(key).weight > w) {
            edgeMap.set(key, { id: e.id, u, v, weight: w });
        }
    }

    const uniqueEdges = Array.from(edgeMap.values());

    // 1. Ordenar aristas E por peso ascendente
    uniqueEdges.sort((a, b) => {
        if (a.weight !== b.weight) return a.weight - b.weight;
        // Criterio de desempate determinista
        const keyA = `${a.u}-${a.v}`;
        const keyB = `${b.u}-${b.v}`;
        return keyA.localeCompare(keyB);
    });

    // 2. Inicializar bosque de conjuntos disjuntos
    const dsu = new DisjointSet(nodes);
    const mst = [];
    const history = [];
    let totalWeight = 0;
    const targetEdgesCount = nodes.length - 1;

    let edgeIndex = 0;
    while (edgeIndex < uniqueEdges.length && mst.length < targetEdgesCount) {
        const edge = uniqueEdges[edgeIndex];
        edgeIndex++;

        // Buscar representante de u y v con Find + compresión de caminos
        const rootU = dsu.find(edge.u);
        const rootV = dsu.find(edge.v);

        let accepted = false;
        let reason = "";

        if (rootU !== rootV) {
            // Representantes diferentes: agregar al árbol T y unir conjuntos
            dsu.union(edge.u, edge.v);
            mst.push(edge);
            totalWeight = Math.round((totalWeight + edge.weight) * 1e10) / 1e10;
            accepted = true;
            reason = `Representantes diferentes (Find(${edge.u})=${rootU} ≠ Find(${edge.v})=${rootV}). Se agrega al árbol y se unen los conjuntos.`;
        } else {
            // Representantes iguales: descartar porque formaría ciclo
            accepted = false;
            reason = `Representantes iguales (Find(${edge.u})=${rootU} = Find(${edge.v})=${rootV}). Se descarta porque formaría un ciclo.`;
        }

        history.push({
            step: history.length + 1,
            edge: { ...edge },
            rootU,
            rootV,
            accepted,
            reason,
            mstSnapshot: [...mst],
            totalWeightSnapshot: totalWeight,
            treeEdgesCount: mst.length,
            componentsSnapshot: dsu.getComponents(nodes).map(g => [...g])
        });
    }

    const isConnected = (mst.length === targetEdgesCount);
    const components = dsu.getComponents(nodes);

    return {
        nodes: [...nodes],
        sortedEdges: uniqueEdges,
        history,
        mst,
        totalWeight,
        isConnected,
        componentsCount: components.length,
        components
    };
}
