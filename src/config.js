import { Graph } from './graph.js';

export const VIEW_W = 1000;
export const VIEW_H = 650;
export const NODE_R = 16;
const DIRECTIONS = ['forward', 'backward', 'both'];

function validPos(p) {
    return !!p && typeof p === 'object' && typeof p.x === 'number' && typeof p.y === 'number'
        && Number.isFinite(p.x) && Number.isFinite(p.y);
}

export class AppConfig {
    constructor() {
        this.nodes = [];
        this.edges = [];
        this.directed = true; // defecto para NUEVAS aristas
        this.source = '';
        this.target = '';
        this.nextEdgeId = 1;
        this.positions = {}; 
        this.initDefaultNodes(5);
    }

    initDefaultNodes(n) {
        this.nodes = [];
        for (let i = 0; i < n; i++) {
            this.nodes.push(String(i+1));
        }
        this.source = this.nodes[0];
        this.target = this.nodes[this.nodes.length - 1];
    }

    initExample() {
        this.nodes = Array.from({length: 11}, (_, i) => String(i+1));
        this.source = '1';
        this.target = '11';
        this.edges = [];
        this.nextEdgeId = 1;
        
        const add = (u, v, w, dir) => this.addEdge(String(u), String(v), w, dir);
        add(1, 2, 18, 'both');
        add(1, 3, 20, 'both');
        add(1, 4, 25, 'both');
        add(2, 5, 14, 'both');
        add(2, 3, 10, 'both');
        add(3, 5, 17, 'both');
        add(3, 6, 15, 'both');
        add(4, 3, 9, 'forward');
        add(6, 5, 16, 'forward');
        add(6, 4, 16, 'forward');
        add(5, 7, 16, 'both');
        add(5, 8, 21, 'both');
        add(6, 8, 15, 'both');
        add(6, 9, 13, 'both');
        add(7, 8, 8, 'forward');
        add(7, 10, 15, 'both');
        add(8, 10, 16, 'both');
        add(9, 8, 10, 'forward');
        add(9, 10, 22, 'both');
        add(10, 11, 12, 'forward');
        add(9, 11, 24, 'both');
        add(4, 9, 30, 'both');
        
        this.directed = false; 
        
        this.positions = {
            '1': {x: 60, y: 320},
            '2': {x: 195, y: 160},
            '3': {x: 330, y: 320},
            '4': {x: 195, y: 480},
            '5': {x: 465, y: 160},
            '6': {x: 465, y: 400},
            '7': {x: 600, y: 80},
            '8': {x: 600, y: 240},
            '9': {x: 600, y: 560},
            '10': {x: 735, y: 160},
            '11': {x: 870, y: 320}
        };
    }

    initThreeJugsExample() {
        this.nodes = [
            '8,0,0', '3,5,0', '5,0,3', '0,5,3', '3,2,3', '5,3,0',
            '6,2,0', '2,3,3', '6,0,2', '2,5,1', '1,5,2', '7,0,1',
            '1,4,3', '7,1,0', '4,1,3', '4,4,0'
        ];
        this.source = '8,0,0';
        this.target = '4,4,0';
        this.edges = [];
        this.nextEdgeId = 1;
        this.directed = true;

        const add = (u, v) => this.addEdge(u, v, 1, 'forward');
        add('8,0,0', '3,5,0');
        add('8,0,0', '5,0,3');
        add('3,5,0', '0,5,3');
        add('3,5,0', '3,2,3');
        add('5,0,3', '0,5,3');
        add('5,0,3', '5,3,0');
        add('3,2,3', '6,2,0');
        add('5,3,0', '2,3,3');
        add('6,2,0', '6,0,2');
        add('2,3,3', '2,5,1');
        add('6,0,2', '1,5,2');
        add('2,5,1', '7,0,1');
        add('1,5,2', '1,4,3');
        add('7,0,1', '7,1,0');
        add('1,4,3', '4,4,0');
        add('7,1,0', '4,1,3');
        add('4,1,3', '4,4,0');

        this.positions = {
            '8,0,0': { x: 70, y: 325 },
            '3,5,0': { x: 200, y: 170 },
            '5,0,3': { x: 200, y: 480 },
            '0,5,3': { x: 320, y: 325 },
            '3,2,3': { x: 320, y: 170 },
            '5,3,0': { x: 320, y: 480 },
            '6,2,0': { x: 440, y: 170 },
            '2,3,3': { x: 440, y: 480 },
            '6,0,2': { x: 560, y: 170 },
            '2,5,1': { x: 560, y: 480 },
            '1,5,2': { x: 680, y: 170 },
            '7,0,1': { x: 680, y: 480 },
            '1,4,3': { x: 800, y: 170 },
            '7,1,0': { x: 770, y: 450 },
            '4,1,3': { x: 840, y: 520 },
            '4,4,0': { x: 920, y: 325 }
        };
    }

    initKruskalExample() {
        this.nodes = ['1', '2', '3', '4', '5', '6'];
        this.source = '1';
        this.target = '6';
        this.edges = [];
        this.nextEdgeId = 1;
        this.directed = false;

        const add = (u, v, w) => this.addEdge(u, v, w, 'both');
        add('1', '2', 1);
        add('1', '3', 5);
        add('2', '3', 4);
        add('2', '4', 3);
        add('3', '4', 2);
        add('3', '5', 6);
        add('4', '5', 7);
        add('4', '6', 8);
        add('5', '6', 9);

        this.positions = {
            '1': { x: 150, y: 325 },
            '2': { x: 380, y: 180 },
            '3': { x: 380, y: 470 },
            '4': { x: 620, y: 180 },
            '5': { x: 620, y: 470 },
            '6': { x: 850, y: 325 }
        };
    }

    setNodeCount(n) {
        const count = Number(n);
        if (isNaN(count) || count < 2 || count > 30) {
            throw new Error("La cantidad de nodos debe estar entre 2 y 30.");
        }
        
        if (count > this.nodes.length) {
            let i = this.nodes.length;
            while(this.nodes.length < count) {
                const newName = String(i+1);
                if (!this.nodes.includes(newName)) {
                    this.nodes.push(newName);
                }
                i++;
            }
        } else if (count < this.nodes.length) {
            const removedNodes = new Set(this.nodes.slice(count));
            this.nodes = this.nodes.slice(0, count);
            this.edges = this.edges.filter(e => !removedNodes.has(e.u) && !removedNodes.has(e.v));
            if (removedNodes.has(this.source)) this.source = this.nodes[0];
            if (removedNodes.has(this.target)) this.target = this.nodes[this.nodes.length - 1];
        }
    }

    clampPosition(x, y) {
        return {
            x: Math.min(VIEW_W - NODE_R, Math.max(NODE_R, x)),
            y: Math.min(VIEW_H - NODE_R, Math.max(NODE_R, y))
        };
    }

    // Única fuente de posiciones: si la guardada no tiene x e y finitos, calcula
    // una circular por defecto (según el índice del nodo) y la guarda.
    getNodePosition(node) {
        if (!this.positions || typeof this.positions !== 'object') this.positions = {};
        const p = this.positions[node];
        if (validPos(p)) return p;
        const idx = Math.max(0, this.nodes.indexOf(node));
        const n = Math.max(1, this.nodes.length);
        const angle = (idx / n) * 2 * Math.PI - Math.PI / 2;
        const rx = VIEW_W / 2 - 80, ry = VIEW_H / 2 - 60;
        const pos = this.clampPosition(VIEW_W / 2 + rx * Math.cos(angle), VIEW_H / 2 + ry * Math.sin(angle));
        this.positions[node] = pos;
        return pos;
    }

    setNodePosition(node, x, y) {
        if (!this.nodes.includes(node) || !Number.isFinite(x) || !Number.isFinite(y)) return false;
        this.positions[node] = this.clampPosition(x, y);
        return true;
    }

    renameNode(oldName, newName) {
        if (!newName || newName.trim() === '') throw new Error("El nombre no puede estar vacío.");
        if (this.nodes.includes(newName)) throw new Error("El nombre de nodo ya existe.");
        const index = this.nodes.indexOf(oldName);
        if (index === -1) throw new Error("El nodo a renombrar no existe.");
        
        this.nodes[index] = newName;
        if (this.source === oldName) this.source = newName;
        if (this.target === oldName) this.target = newName;
        
        for (let e of this.edges) {
            if (e.u === oldName) e.u = newName;
            if (e.v === oldName) e.v = newName;
        }
        if (this.positions[oldName]) {
            this.positions[newName] = this.positions[oldName];
            delete this.positions[oldName];
        }
    }

    addEdge(u, v, weight, dir = null) {
        if (!this.nodes.includes(u)) throw new Error(`El nodo de origen '${u}' no existe.`);
        if (!this.nodes.includes(v)) throw new Error(`El nodo de destino '${v}' no existe.`);
        if (weight === '' || isNaN(weight)) throw new Error("El peso debe ser un número válido.");
        const w = Number(weight);
        if (w < 0) throw new Error("Pesos negativos no permitidos.");
        
        const direction = dir ? dir : (this.directed ? 'forward' : 'both');
        const id = this.nextEdgeId++;
        this.edges.push({ id, u, v, weight: w, direction });
        return id;
    }

    updateEdge(id, weight, direction) {
        const w = Number(weight);
        if (w < 0) throw new Error("Pesos negativos no permitidos.");
        const edge = this.edges.find(e => e.id === id);
        if (!edge) throw new Error("La conexión no existe.");
        if(weight !== null) edge.weight = w;
        if(direction) edge.direction = direction;
    }

    removeEdge(id) {
        this.edges = this.edges.filter(e => e.id !== id);
    }

    setDirected(bool) {
        this.directed = Boolean(bool);
    }

    setSource(u) {
        if (!this.nodes.includes(u)) throw new Error("El nodo origen no existe.");
        this.source = u;
    }

    setTarget(v) {
        if (!this.nodes.includes(v)) throw new Error("El nodo destino no existe.");
        this.target = v;
    }

    buildGraph() {
        const g = new Graph(true); // Siempre true internamente, expandimos aristas aquí
        for (const n of this.nodes) g.addNode(n);
        for (const e of this.edges) {
            if (e.direction === 'forward' || e.direction === 'both') {
                g.addEdge(e.u, e.v, e.weight);
            }
            if (e.direction === 'backward' || e.direction === 'both') {
                g.addEdge(e.v, e.u, e.weight);
            }
        }
        return g;
    }

    save() {
        if (typeof localStorage === 'undefined') return;
        const data = {
            nodes: this.nodes,
            edges: this.edges,
            directed: this.directed,
            source: this.source,
            target: this.target,
            nextEdgeId: this.nextEdgeId,
            positions: Object.fromEntries(this.nodes.map(n => [n, this.getNodePosition(n)]))
        };
        localStorage.setItem('dijkstra_config_v2', JSON.stringify(data));
    }

    load() {
        if (typeof localStorage === 'undefined') return false;
        let json;
        try { json = localStorage.getItem('dijkstra_config_v2'); } catch (e) { return false; }
        if (!json) return false;
        try {
            const data = JSON.parse(json);
            if (!data || typeof data !== 'object') return false;
            if (!Array.isArray(data.nodes) || data.nodes.length < 2 || data.nodes.length > 30) return false;
            if (!data.nodes.every(n => typeof n === 'string' && n.trim() !== '')) return false;
            if (new Set(data.nodes).size !== data.nodes.length) return false;
            if (!Array.isArray(data.edges)) return false;
            const nodes = data.nodes.slice();
            const edges = [];
            for (const e of data.edges) {
                if (!e || !nodes.includes(e.u) || !nodes.includes(e.v)) return false;
                if (typeof e.weight !== 'number' || !Number.isFinite(e.weight) || e.weight < 0) return false;
                const direction = e.direction || (data.directed ? 'forward' : 'both'); // migración
                if (!DIRECTIONS.includes(direction)) return false;
                if (!Number.isInteger(e.id)) return false;
                edges.push({ id: e.id, u: e.u, v: e.v, weight: e.weight, direction });
            }
            if (!nodes.includes(data.source) || !nodes.includes(data.target)) return false;
            const maxId = edges.reduce((m, e) => Math.max(m, e.id), 0);
            this.nodes = nodes;
            this.edges = edges;
            this.directed = !!data.directed;
            this.source = data.source;
            this.target = data.target;
            this.nextEdgeId = Number.isInteger(data.nextEdgeId) && data.nextEdgeId > maxId ? data.nextEdgeId : maxId + 1;
            // Posiciones: las inválidas se descartan (se regeneran con getNodePosition)
            this.positions = {};
            const sp = data.positions && typeof data.positions === 'object' ? data.positions : {};
            for (const n of nodes) {
                if (validPos(sp[n])) this.positions[n] = this.clampPosition(sp[n].x, sp[n].y);
            }
            return true;
        } catch(e) {
            return false;
        }
    }
}
