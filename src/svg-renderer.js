import { VIEW_W, VIEW_H } from './config.js';

export class SVGRenderer {
    constructor(svgId) {
        this.svg = document.getElementById(svgId);
        if(!this.svg) return;
        // Lienzo fijo: no depende de medidas del DOM (clientWidth puede ser 0 antes del layout)
        this.svg.setAttribute('viewBox', `0 0 ${VIEW_W} ${VIEW_H}`);
        this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        this.setupSVG();
        this.draggedNode = null;
        this.svg.addEventListener('mousemove', (e) => this.drag(e));
        this.svg.addEventListener('mouseup', () => this.endDrag());
        this.svg.addEventListener('mouseleave', () => this.endDrag());
    }

    setupSVG() {
        this.svg.innerHTML = `
            <defs>
                <marker id="arrow" markerWidth="6" markerHeight="6" refX="28" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L6,3 z" fill="var(--ink-dark)"/>
                </marker>
                <marker id="arrow-lg" markerWidth="6" markerHeight="6" refX="35" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L6,3 z" fill="var(--ink-dark)"/>
                </marker>
                <marker id="arrow-green" markerWidth="6" markerHeight="6" refX="28" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L6,3 z" fill="var(--ink-green)"/>
                </marker>
            </defs>
            <g id="edges"></g>
            <g id="nodes"></g>
        `;
    }

    render(config, state = null, mode = 'dijkstra') {
        const edgesGroup = this.svg.querySelector('#edges');
        const nodesGroup = this.svg.querySelector('#nodes');
        edgesGroup.innerHTML = '';
        nodesGroup.innerHTML = '';

        window.__renderCount = (window.__renderCount || 0) + 1;

        const isKruskal = mode === 'kruskal' || (state && state.algorithm === 'kruskal');

        let inMst = new Set();
        let rejectedEdges = new Set();
        let currentEdgeKey = null;

        if (isKruskal && state) {
            if (state.mstSnapshot) {
                for (const e of state.mstSnapshot) {
                    inMst.add(`${e.u}--${e.v}`);
                    inMst.add(`${e.v}--${e.u}`);
                }
            }
            if (state.allRejected) {
                for (const e of state.allRejected) {
                    rejectedEdges.add(`${e.u}--${e.v}`);
                    rejectedEdges.add(`${e.v}--${e.u}`);
                }
            }
            if (state.edge) {
                currentEdgeKey = `${state.edge.u}--${state.edge.v}`;
            }
        }

        for (const edge of config.edges) {
            if (!config.nodes.includes(edge.u) || !config.nodes.includes(edge.v)) continue;
            const p1 = config.getNodePosition(edge.u);
            const p2 = config.getNodePosition(edge.v);
            
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", p1.x);
            line.setAttribute("y1", p1.y);
            line.setAttribute("x2", p2.x);
            line.setAttribute("y2", p2.y);
            
            const edgeKey1 = `${edge.u}--${edge.v}`;
            const edgeKey2 = `${edge.v}--${edge.u}`;

            if (isKruskal && state) {
                const isCurrent = (currentEdgeKey === edgeKey1 || currentEdgeKey === edgeKey2);
                const isInTree = (inMst.has(edgeKey1) || inMst.has(edgeKey2));
                const isRejected = (rejectedEdges.has(edgeKey1) || rejectedEdges.has(edgeKey2));

                if (isInTree) {
                    line.setAttribute("stroke", "var(--ink-green)");
                    line.setAttribute("stroke-width", "5");
                } else if (isCurrent && !state.accepted) {
                    line.setAttribute("stroke", "var(--ink-red)");
                    line.setAttribute("stroke-width", "4");
                    line.setAttribute("stroke-dasharray", "6,4");
                } else if (isRejected) {
                    line.setAttribute("stroke", "rgba(179, 38, 30, 0.35)");
                    line.setAttribute("stroke-width", "2");
                    line.setAttribute("stroke-dasharray", "4,4");
                } else {
                    line.setAttribute("stroke", "rgba(31, 46, 90, 0.35)");
                    line.setAttribute("stroke-width", "2");
                }
            } else {
                line.setAttribute("stroke", "var(--ink-dark)");
                line.setAttribute("stroke-width", "2");
                
                const markerEnd = edge.v.length > 3 ? "url(#arrow-lg)" : "url(#arrow)";
                const markerStart = edge.u.length > 3 ? "url(#arrow-lg)" : "url(#arrow)";

                if (edge.direction === 'forward') {
                    line.setAttribute("marker-end", markerEnd);
                } else if (edge.direction === 'backward') {
                    line.setAttribute("x1", p2.x); line.setAttribute("y1", p2.y);
                    line.setAttribute("x2", p1.x); line.setAttribute("y2", p1.y);
                    line.setAttribute("marker-end", markerStart);
                }
            }

            edgesGroup.appendChild(line);

            const mx = (p1.x + p2.x) / 2;
            const my = (p1.y + p2.y) / 2 - 12;

            const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            bg.setAttribute("x", mx - 12);
            bg.setAttribute("y", my - 12);
            bg.setAttribute("width", 24);
            bg.setAttribute("height", 16);
            bg.setAttribute("fill", "var(--bg-paper)");
            edgesGroup.appendChild(bg);

            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", mx);
            text.setAttribute("y", my);
            text.setAttribute("fill", "var(--ink-red)");
            text.setAttribute("font-family", "var(--font-mono)");
            text.setAttribute("font-size", "14px");
            text.setAttribute("text-anchor", "middle");
            text.textContent = edge.weight;
            edgesGroup.appendChild(text);
        }

        for (const node of config.nodes) {
            const pos = config.getNodePosition(node);
            
            let isPerm = false;
            let distText = "";
            let isHighlighted = false;

            if (isKruskal && state) {
                if (state.nodeRoots && state.nodeRoots.has(node)) {
                    distText = `r=${state.nodeRoots.get(node)}`;
                }
                if (state.edge && (state.edge.u === node || state.edge.v === node)) {
                    isHighlighted = true;
                }
            } else if (state && state.permanentSnapshot) {
                isPerm = state.permanentSnapshot.has(node);
                const d = state.endDistancesSnapshot.get(node);
                distText = `d=${d === Infinity ? "∞" : d}`;
                if (state.selectedNode === node) {
                    isHighlighted = true;
                }
            }

            const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            g.setAttribute("transform", `translate(${pos.x}, ${pos.y})`);
            g.style.cursor = "pointer";
            g.addEventListener('mousedown', (e) => { this.draggedNode = node; });

            const r = node.length > 3 ? 24 : 16;
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", "0");
            circle.setAttribute("cy", "0");
            circle.setAttribute("r", String(r));
            circle.setAttribute("fill", "var(--bg-paper)");
            circle.setAttribute("stroke", isPerm ? "var(--ink-green)" : (isHighlighted ? "var(--ink-red)" : "var(--ink-dark)"));
            circle.setAttribute("stroke-width", (isPerm || isHighlighted) ? "4" : "2");

            const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
            label.setAttribute("y", node.length > 3 ? "4" : "5");
            label.setAttribute("text-anchor", "middle");
            label.setAttribute("font-family", node.length > 3 ? "var(--font-mono)" : "var(--font-serif)");
            label.setAttribute("font-weight", "bold");
            label.setAttribute("font-size", node.length > 3 ? "11px" : "14px");
            label.textContent = node;

            g.appendChild(circle);

            if (distText) {
                const distLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
                distLabel.setAttribute("y", String(-r - 6));
                distLabel.setAttribute("text-anchor", "middle");
                distLabel.setAttribute("font-family", "var(--font-hand)");
                distLabel.setAttribute("font-size", "1.1rem");
                distLabel.setAttribute("fill", isPerm ? "var(--ink-green)" : "var(--ink-ochre)");
                distLabel.textContent = distText;

                const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                bgRect.setAttribute("x", String(-r - 4));
                bgRect.setAttribute("y", String(-r - 19));
                bgRect.setAttribute("width", String((r + 4) * 2));
                bgRect.setAttribute("height", "15");
                bgRect.setAttribute("fill", "var(--bg-paper)");
                
                g.appendChild(bgRect);
                g.appendChild(distLabel);
            }

            g.appendChild(label);
            nodesGroup.appendChild(g);
        }
    }

    drag(e) {
        if (!this.draggedNode) return;
        // Pantalla -> coordenadas del viewBox
        const ctm = this.svg.getScreenCTM();
        if (!ctm) return;
        const pt = this.svg.createSVGPoint();
        pt.x = e.clientX; pt.y = e.clientY;
        const p = pt.matrixTransform(ctm.inverse());
        if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
        this.svg.dispatchEvent(new CustomEvent('graph-moved', {
            detail: { node: this.draggedNode, x: p.x, y: p.y }
        }));
    }

    endDrag() {
        this.draggedNode = null;
    }
}
