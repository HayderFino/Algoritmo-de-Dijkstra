// Verificación E2E real en navegador. Requiere servidor en http://localhost:8000
// (python3 -m http.server 8000 desde /Users/hayder/Documents/univer) y `npm i -D puppeteer`.
// Uso: node tests/e2e.browser.test.js
import puppeteer from 'puppeteer';

const URL = process.env.APP_URL || 'http://localhost:8000/dijkstra-web/';
const VB = { w: 1000, h: 650 };
const R = 16;

let totalChecks = 0, totalFails = 0;
const failures = [];
function check(scn, label, ok, detail = '') {
    totalChecks++;
    if (!ok) { totalFails++; failures.push(`[${scn}] ${label} ${detail}`); }
    console.log(`  ${ok ? 'OK  ' : 'FALLA'} ${label}${detail ? ' -> ' + detail : ''}`);
}

// Datos guardados de ejemplo (11 nodos) con posiciones configurables
function savedData(positions, extra = {}) {
    const nodes = Array.from({ length: 11 }, (_, i) => String(i + 1));
    const edges = [];
    let id = 1;
    for (const [u, v, w, d] of [[1,2,18,'both'],[1,3,20,'both'],[2,3,10,'both'],[3,4,9,'forward'],[4,5,5,'both'],[5,6,7,'both'],[6,7,8,'forward'],[7,8,3,'both'],[8,9,4,'both'],[9,10,6,'both'],[10,11,12,'forward']]) {
        edges.push({ id: id++, u: String(u), v: String(v), weight: w, direction: d });
    }
    return { nodes, edges, directed: false, source: '1', target: '11', nextEdgeId: id, positions, ...extra };
}
const nullPos = Object.fromEntries(Array.from({ length: 11 }, (_, i) => [String(i + 1), { x: null, y: null }]));

const SCENARIOS = [
    { name: 'LocalStorage vacío', ls: null },
    { name: 'positions: {1:{x:null,y:null}} (solo nodo 1)', ls: JSON.stringify(savedData({ 1: { x: null, y: null } })) },
    { name: 'positions todas null', ls: JSON.stringify(savedData(nullPos)) },
    { name: 'positions con strings/NaN-like', ls: JSON.stringify(savedData({ 1: { x: 'abc', y: 'def' }, 2: { x: 1e999, y: -1e999 }, 3: {}, 4: 5 })) },
    { name: 'positions ausentes (formato viejo)', ls: JSON.stringify((() => { const d = savedData({}); delete d.positions; return d; })()) },
    { name: 'JSON corrupto', ls: '{esto no es json' },
    { name: 'aristas inválidas (peso NaN / nodo inexistente)', ls: JSON.stringify(savedData({}, { edges: [{ id: 1, u: '1', v: '99', weight: null }] })) },
    { name: 'nodes no es arreglo', ls: JSON.stringify({ nodes: 'x', edges: 5 }) },
];

async function svgChecks(page, scn, tag) {
    const r = await page.evaluate((R) => {
        const svg = document.getElementById('graph-svg');
        const bad = [];
        let attrCount = 0, elCount = 0;
        for (const el of [svg, ...svg.querySelectorAll('*')]) {
            elCount++;
            for (const a of el.attributes) {
                attrCount++;
                if (/NaN|undefined|null|Infinity/.test(a.value)) bad.push(`${el.tagName}.${a.name}="${a.value}"`);
            }
            if (/NaN|undefined/.test(el.textContent || '') && el.children.length === 0) bad.push(`${el.tagName} texto="${el.textContent}"`);
        }
        const circles = [...svg.querySelectorAll('circle')].map(c => {
            const m = /translate\(\s*([-\d.eE+]+)[ ,]+([-\d.eE+]+)\s*\)/.exec(c.parentNode.getAttribute('transform') || '');
            const tx = m ? Number(m[1]) : NaN, ty = m ? Number(m[2]) : NaN;
            return { cx: Number(c.getAttribute('cx')) + tx, cy: Number(c.getAttribute('cy')) + ty, cxAttr: c.getAttribute('cx'), cyAttr: c.getAttribute('cy') };
        });
        return {
            bad, attrCount, elCount, circles,
            lines: svg.querySelectorAll('line').length,
            texts: svg.querySelectorAll('text').length,
            viewBox: svg.getAttribute('viewBox'),
            nodeLabels: [...svg.querySelectorAll('#nodes g > text:not([fill])')].map(t => t.textContent),
            renderCount: window.__renderCount,
        };
    }, R);
    check(scn, `${tag} b) atributos SVG sin NaN/undefined (${r.elCount} elementos, ${r.attrCount} atributos)`, r.bad.length === 0, r.bad.slice(0, 5).join(' | '));
    check(scn, `${tag} c) 11 <circle> (hay ${r.circles.length})`, r.circles.length === 11);
    const finite = r.circles.every(c => Number.isFinite(c.cx) && Number.isFinite(c.cy));
    check(scn, `${tag} c) cx/cy finitos`, finite);
    const inside = r.circles.every(c => c.cx >= R && c.cx <= VB.w - R && c.cy >= R && c.cy <= VB.h - R);
    check(scn, `${tag} c) centros dentro del viewBox`, inside);
    let minD = Infinity;
    for (let i = 0; i < r.circles.length; i++) for (let j = i + 1; j < r.circles.length; j++) {
        minD = Math.min(minD, Math.hypot(r.circles[i].cx - r.circles[j].cx, r.circles[i].cy - r.circles[j].cy));
    }
    check(scn, `${tag} c) distancia mínima entre centros ${minD.toFixed(1)} > ${2 * R}`, minD > 2 * R);
    return r;
}

async function run() {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    let lastShot = null;

    for (const scn of SCENARIOS) {
        console.log(`\n=== ESCENARIO: ${scn.name} ===`);
        const page = await browser.newPage();
        await page.setViewport({ width: 1512, height: 861 });
        const events = [];
        page.on('console', m => { if (['error', 'warning'].includes(m.type())) events.push(`console.${m.type()}: ${m.text()}`); });
        page.on('pageerror', e => events.push(`pageerror: ${e.message}`));
        page.on('response', r => { if (r.status() >= 400) events.push(`HTTP ${r.status()}: ${r.url()}`); });
        page.on('requestfailed', r => events.push(`requestfailed: ${r.url()} (${r.failure()?.errorText})`));
        // Los recursos externos (Google Fonts) no son parte del código del proyecto: si no hay red,
        // se contabilizan igual; se reportan tal cual.
        if (scn.ls !== null) {
            await page.evaluateOnNewDocument((ls) => {
                if (!sessionStorage.getItem('__seeded')) { localStorage.setItem('dijkstra_config_v2', ls); sessionStorage.setItem('__seeded', '1'); }
            }, scn.ls);
        }
        await page.goto(URL, { waitUntil: 'networkidle0' });
        await new Promise(r => setTimeout(r, 500));

        const noEvents = () => check(scn.name, `a) 0 eventos console error/warning, pageerror, requestfailed (hay ${events.length})`, events.length === 0, events.slice(0, 5).join(' | '));
        await svgChecks(page, scn.name, '[inicial]');
        noEvents();

        const katexInfo = await page.evaluate(() => ({
            errors: document.querySelectorAll('.katex-error').length,
            inBox: document.querySelectorAll('.formula-box .katex').length,
            raw: /\\\[|\\\]/.test(document.querySelector('.formula-box').textContent.replace(/\u200b/g, '')) ,
        }));
        check(scn.name, `d) .katex-error = 0 (hay ${katexInfo.errors})`, katexInfo.errors === 0);
        check(scn.name, `d) .katex presente en recuadro de fórmula (hay ${katexInfo.inBox})`, katexInfo.inBox > 0);

        const sel = await page.evaluate(() => ({ u: document.getElementById('edge-u').value, v: document.getElementById('edge-v').value }));
        check(scn.name, `4) Agregar conexión: Desde=${sel.u}, Hasta=${sel.v} distintos`, sel.u !== sel.v);

        const renders0 = await page.evaluate(() => window.__renderCount);
        await page.click('#btn-start');
        for (let k = 1; k <= 5; k++) {
            await page.click('#btn-next');
            await svgChecks(page, scn.name, `[Siguiente ${k}]`);
            noEvents();
            const kx = await page.evaluate(() => document.querySelectorAll('.katex-error').length);
            check(scn.name, `[Siguiente ${k}] d) .katex-error = 0`, kx === 0);
        }

        // f) arrastrar nodo 1 hacia el centro y otro fuera del lienzo (debe quedar limitado)
        const box = await page.evaluate(() => {
            const g = document.querySelector('#nodes g');
            const r = g.getBoundingClientRect(); const s = document.getElementById('graph-svg').getBoundingClientRect();
            return { x: r.x + r.width / 2, y: r.y + r.height / 2 + 8, sx: s.x, sy: s.y, sw: s.width, sh: s.height };
        });
        await page.mouse.move(box.x, box.y);
        await page.mouse.down();
        await page.mouse.move(box.sx + box.sw / 2, box.sy + box.sh / 2, { steps: 8 });
        await svgChecks(page, scn.name, '[arrastre al centro]');
        await page.mouse.move(box.sx + box.sw + 400, box.sy - 300, { steps: 5 }); // fuera del SVG
        await page.mouse.up();
        const after = await svgChecks(page, scn.name, '[arrastre fuera del lienzo]');
        noEvents();
        const saved = await page.evaluate(() => localStorage.getItem('dijkstra_config_v2'));
        check(scn.name, 'LocalStorage guardado sin NaN/null en posiciones', saved && !/NaN|null/.test(JSON.stringify(JSON.parse(saved).positions)));

        const renders1 = await page.evaluate(() => window.__renderCount);
        console.log(`  INFO renders totales en la prueba: ${renders1} (antes de resolver: ${renders0})`);
        check(scn.name, 'sin bucle de renderizado (renders < 300)', renders1 < 300, String(renders1));

        if (scn.name === SCENARIOS[0].name) {
            await page.reload({ waitUntil: 'networkidle0' });
            await new Promise(r => setTimeout(r, 300));
            lastShot = '/Users/hayder/Documents/univer/dijkstra-web/tests/e2e-screenshot.png';
            await page.click('#btn-start'); await page.click('#btn-next'); await page.click('#btn-next');
            await page.screenshot({ path: lastShot });
            await (await page.$('#graph-svg')).screenshot({ path: lastShot.replace('.png', '-svg.png') });
        }
        await page.close();
    }

    await browser.close();
    console.log(`\n=== RESUMEN: ${totalChecks} comprobaciones, ${totalFails} fallos ===`);
    failures.forEach(f => console.log('FALLO ' + f));
    process.exit(totalFails ? 1 : 0);
}
run().catch(e => { console.error('ERROR del script', e); process.exit(2); });
