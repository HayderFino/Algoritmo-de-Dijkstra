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
                <marker id="arrow-green" markerWidth="6" markerHeight="6" refX="28" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L6,3 z" fill="var(--ink-green)"/>
                </marker>
            </defs>
            <g id="edges"></g>
            <g id="nodes"></g>
        `;
    }

    render(config, state = null) {
        const edgesGroup = this.svg.querySelector('#edges');
        const nodesGroup = this.svg.querySelector('#nodes');
        edgesGroup.innerHTML = '';
        nodesGroup.innerHTML = '';

        window.__renderCount = (window.__renderCount || 0) + 1;

        for (const edge of config.edges) {
            if (!config.nodes.includes(edge.u) || !config.nodes.includes(edge.v)) continue;
            const p1 = config.getNodePosition(edge.u);
            const p2 = config.getNodePosition(edge.v);
            
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", p1.x);
            line.setAttribute("y1", p1.y);
            line.setAttribute("x2", p2.x);
            line.setAttribute("y2", p2.y);
            line.setAttribute("stroke", "var(--ink-dark)");
            line.setAttribute("stroke-width", "2");
            
            if (edge.direction === 'forward') {
                line.setAttribute("marker-end", "url(#arrow)");
            } else if (edge.direction === 'backward') {
                line.setAttribute("marker-start", "url(#arrow)");
                // SVG marker-start is tricky with orientation, but we'll swap coordinates visually
                line.setAttribute("x1", p2.x); line.setAttribute("y1", p2.y);
                line.setAttribute("x2", p1.x); line.setAttribute("y2", p1.y);
                line.setAttribute("marker-end", "url(#arrow)");
                line.removeAttribute("marker-start");
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
            let dist = "∞";
            if (state) {
                isPerm = state.permanentSnapshot.has(node);
                const d = state.endDistancesSnapshot.get(node);
                dist = d === Infinity ? "∞" : d;
            }

            const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            g.setAttribute("transform", `translate(${pos.x}, ${pos.y})`);
            g.style.cursor = "pointer";
            g.addEventListener('mousedown', (e) => { this.draggedNode = node; });

            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", "0");
            circle.setAttribute("cy", "0");
            circle.setAttribute("r", "16");
            circle.setAttribute("fill", "var(--bg-paper)");
            circle.setAttribute("stroke", isPerm ? "var(--ink-green)" : "var(--ink-dark)");
            circle.setAttribute("stroke-width", isPerm ? "4" : "2");
            
            if (state && state.selectedNode === node) {
                circle.setAttribute("stroke", "var(--ink-red)"); 
            }

            const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
            label.setAttribute("y", "5");
            label.setAttribute("text-anchor", "middle");
            label.setAttribute("font-family", "var(--font-serif)");
            label.setAttribute("font-weight", "bold");
            label.textContent = node;

            const distLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
            distLabel.setAttribute("y", "-22");
            distLabel.setAttribute("text-anchor", "middle");
            distLabel.setAttribute("font-family", "var(--font-hand)");
            distLabel.setAttribute("font-size", "1.1rem");
            distLabel.setAttribute("fill", isPerm ? "var(--ink-green)" : "var(--ink-ochre)");
            distLabel.textContent = `d=${dist}`;

            const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            bgRect.setAttribute("x", "-20");
            bgRect.setAttribute("y", "-35");
            bgRect.setAttribute("width", "40");
            bgRect.setAttribute("height", "15");
            bgRect.setAttribute("fill", "var(--bg-paper)");
            
            g.appendChild(circle);
            g.appendChild(bgRect);
            g.appendChild(label);
            g.appendChild(distLabel);
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
