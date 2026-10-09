export class Graph {
    constructor(directed = false) {
        this.directed = directed;
        this.nodes = new Set();
        this.edges = [];
        this.adjList = new Map();
        this.nodeOrder = new Map(); // Rastrea orden de creación para desempates deterministas
        this.orderCounter = 0;
    }
    
    addNode(id) {
        if (!this.nodes.has(id)) {
            this.nodes.add(id);
            this.nodeOrder.set(id, this.orderCounter++);
        }
        if (!this.adjList.has(id)) {
            this.adjList.set(id, []);
        }
    }
    
    addEdge(u, v, weight) {
        if (weight < 0) throw new Error("Pesos negativos no permitidos");
        this.addNode(u);
        this.addNode(v);
        this.edges.push({u, v, weight});
        this.adjList.get(u).push({node: v, weight});
        if (!this.directed) {
            this.adjList.get(v).push({node: u, weight});
        }
    }
    
    getNeighbors(u) {
        return this.adjList.get(u) || [];
    }
}
