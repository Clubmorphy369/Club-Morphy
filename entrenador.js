/* ============================================================
   ENTRENADOR DE AJEDREZ — Club Morphy
   Fase 5 + Editor con pestañas + Lista de capítulos + Fix ELO admin
   API pública: window.Entrenador
   ============================================================ */

(function () {
	'use strict';

	// ============================================================
	// CONSTANTES
	// ============================================================
	const PIEZAS = {
    	wp: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg',
    	wn: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg',
    	wb: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg',
    	wr: 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg',
    	wq: 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg',
    	wk: 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg',
    	bp: 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg',
    	bn: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg',
    	bb: 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg',
    	br: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg',
    	bq: 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg',
    	bk: 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg'
	};
	const SIMBOLOS = {
    	wk: '♔', wq: '♕', wr: '♖', wb: '♗', wn: '♘', wp: '♙',
    	bk: '♚', bq: '♛', br: '♜', bb: '♝', bn: '♞', bp: '♟'
	};

	const ELO_INICIAL = 1200;
	const ELO_MIN = 100;
	const ELO_MAX = 3000;
	const ELO_STORAGE_KEY = 'entrenadorEloData_v2';

	const ELO_BOT = { 1: 800, 2: 1000, 3: 1200, 4: 1400, 5: 1600, 6: 1800, 7: 2100, 8: 2400 };

	const NIVELES_SF = {
    	1: { skill: 0, depth: 1, movetime: 50, nombre: 'Principiante' },
    	2: { skill: 2, depth: 1, movetime: 100, nombre: 'Muy fácil' },
    	3: { skill: 4, depth: 2, movetime: 200, nombre: 'Fácil' },
    	4: { skill: 7, depth: 3, movetime: 300, nombre: 'Normal' },
    	5: { skill: 10, depth: 4, movetime: 500, nombre: 'Intermedio' },
    	6: { skill: 13, depth: 6, movetime: 800, nombre: 'Difícil' },
    	7: { skill: 17, depth: 10, movetime: 1500, nombre: 'Muy difícil' },
    	8: { skill: 20, depth: 16, movetime: 3000, nombre: 'Maestro' }
	};

	const VALORES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

	// ============================================================
	// ⭐ ICONOS SVG (estilo Word) — para la barra del editor
	// ============================================================
	const ICONOS_SVG = {
    	// Alineación (líneas horizontales)
    	alignLeft: `<svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="2.5" rx="1"/><rect x="2" y="9.5" width="12" height="2.5" rx="1"/><rect x="2" y="15" width="20" height="2.5" rx="1"/><rect x="2" y="20.5" width="12" height="2.5" rx="1"/></svg>`,
    	alignCenter: `<svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="2.5" rx="1"/><rect x="6" y="9.5" width="12" height="2.5" rx="1"/><rect x="2" y="15" width="20" height="2.5" rx="1"/><rect x="6" y="20.5" width="12" height="2.5" rx="1"/></svg>`,
    	alignRight: `<svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="2.5" rx="1"/><rect x="10" y="9.5" width="12" height="2.5" rx="1"/><rect x="2" y="15" width="20" height="2.5" rx="1"/><rect x="10" y="20.5" width="12" height="2.5" rx="1"/></svg>`,
    	alignJustify: `<svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="2.5" rx="1"/><rect x="2" y="9.5" width="20" height="2.5" rx="1"/><rect x="2" y="15" width="20" height="2.5" rx="1"/><rect x="2" y="20.5" width="20" height="2.5" rx="1"/></svg>`,
    	// Listas
    	listBullet: `<svg viewBox="0 0 24 24"><circle cx="4" cy="6" r="1.8"/><circle cx="4" cy="12" r="1.8"/><circle cx="4" cy="18" r="1.8"/><rect x="8" y="5" width="14" height="2" rx="0.8"/><rect x="8" y="11" width="14" height="2" rx="0.8"/><rect x="8" y="17" width="14" height="2" rx="0.8"/></svg>`,
    	listNumber: `<svg viewBox="0 0 24 24"><text x="2" y="7.5" font-size="6" font-weight="bold" font-family="Arial" fill="currentColor">1</text><text x="2" y="13.5" font-size="6" font-weight="bold" font-family="Arial" fill="currentColor">2</text><text x="2" y="19.5" font-size="6" font-weight="bold" font-family="Arial" fill="currentColor">3</text><rect x="8" y="5" width="14" height="2" rx="0.8"/><rect x="8" y="11" width="14" height="2" rx="0.8"/><rect x="8" y="17" width="14" height="2" rx="0.8"/></svg>`,
    	// Indentación
    	indentMore: `<svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="2" rx="0.8"/><rect x="10" y="9" width="12" height="2" rx="0.8"/><rect x="10" y="14" width="12" height="2" rx="0.8"/><rect x="2" y="19" width="20" height="2" rx="0.8"/><polygon points="2,9 7,11.5 2,14"/></svg>`,
    	indentLess: `<svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="2" rx="0.8"/><rect x="10" y="9" width="12" height="2" rx="0.8"/><rect x="10" y="14" width="12" height="2" rx="0.8"/><rect x="2" y="19" width="20" height="2" rx="0.8"/><polygon points="7,9 2,11.5 7,14"/></svg>`,
    	// Formato
    	bold: `<svg viewBox="0 0 24 24"><path d="M6 4h7a5 5 0 0 1 3.5 8.5A5 5 0 0 1 13 20H6V4zm4 6h3a2 2 0 0 0 0-4h-3v4zm0 8h3.5a2.5 2.5 0 0 0 0-5H10v5z"/></svg>`,
    	italic: `<svg viewBox="0 0 24 24"><path d="M9 4h9v3h-3l-4 12h3v3H5v-3h3l4-12H9V4z"/></svg>`,
    	underline: `<svg viewBox="0 0 24 24"><path d="M6 3v9a6 6 0 0 0 12 0V3h-2.5v9a3.5 3.5 0 0 1-7 0V3H6zM4 20h16v2H4z"/></svg>`,
    	strike: `<svg viewBox="0 0 24 24"><path d="M6 8c0-2 1.5-4 5-4 2 0 3.5.5 5 2l-2 1.5c-.8-.8-1.8-1.3-3-1.3-1.8 0-2.5.8-2.5 1.8 0 .8.5 1.3 2 1.5H21v2h-8.5c-.5.3-1 .8-1 1.5 0 1.2 1 2 2.8 2 1.5 0 2.5-.5 3.5-1.3l2 1.5c-1.3 1.3-3 2-5.5 2-3.5 0-5.5-1.7-5.5-4.2 0-.8.2-1.5.6-2H3v-2h9c-1.5-.5-2-1.3-2-2.3z"/></svg>`,
    	// Deshacer/Rehacer
    	undo: `<svg viewBox="0 0 24 24"><path d="M7.5 8H14a6 6 0 0 1 0 12h-3v-2.5h3a3.5 3.5 0 0 0 0-7H7.5l3.5 3.5-1.8 1.8L3 9.5 9.2 3.3l1.8 1.8L7.5 8z"/></svg>`,
    	redo: `<svg viewBox="0 0 24 24"><path d="M16.5 8H10a6 6 0 0 0 0 12h3v-2.5h-3a3.5 3.5 0 0 1 0-7h6.5l-3.5 3.5 1.8 1.8L21 9.5 14.8 3.3l-1.8 1.8L16.5 8z"/></svg>`,
    	// Línea horizontal
    	lineHorizontal: `<svg viewBox="0 0 24 24"><rect x="2" y="11" width="20" height="2" rx="1"/></svg>`,
    	// Quitar formato
    	clearFormat: `<svg viewBox="0 0 24 24"><path d="M6 4h11l1 6h-2l-0.5-3H11l-1 8h3v3H6v-3h3l1-8H7.5L7 10H5L6 4z"/><path d="M16 14l5 5-1.5 1.5L14 15.5z"/><path d="M21 14l-5 5-1.5-1.5L19.5 12z"/></svg>`
	};

	// PGN de ejemplo (por si se necesita)
	const PGN_EJEMPLO = `[Event "Estudio: Capítulo 1"]
[StudyName "Bloqueo"]
[ChapterName "Capítulo 1"]
[FEN "rq5k/6p1/p4pP1/1p6/8/P2N4/BB4P1/6QK w - - 0 1"]
[SetUp "1"]
[ChapterMode "gamebook"]

1. Be5 Qxe5 2. Nxe5 b4 3. Qh2# *

[Event "Estudio: Capítulo 5"]
[StudyName "Bloqueo"]
[ChapterName "Capítulo 5"]
[FEN "r2q1r1k/2p1b1pp/p1n5/1p1Q1bN1/4n3/1BP1B3/PP3PPP/R4RK1 w - - 0 1"]
[SetUp "1"]
[ChapterMode "gamebook"]

1. Qg8+ Rxg8 2. Nf7# *`;

	// ============================================================
	// UTILIDADES
	// ============================================================
	let _contadorInstancias = 0;

	function escapeHtml(s) {
    	return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
        	'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    	}[c]));
	}

	// ============================================================
	// STOCKFISH GLOBAL
	// ============================================================
	const SF = {
    	worker: null,
    	ready: false,
    	listeners: [],
    	inicializado: false,

    	init() {
        	if (this.worker || this.inicializado) return;
        	this.inicializado = true;
        	const url = window.stockfishWorkerUrl ||
            	'https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/stockfish.js';
        	try {
            	this.worker = new Worker(url);
            	this.worker.addEventListener('message', (e) => {
                	const msg = typeof e.data === 'string' ? e.data : (e.data && e.data.data) || '';
                	this.listeners = this.listeners.filter(l => {
                    	if (l.pattern.test(msg)) { l.resolve(msg); return false; }
                    	return true;
                	});
                	if (/uciok/.test(msg) && !this.ready) {
                    	this.ready = true;
                    	document.dispatchEvent(new CustomEvent('cm-tablero-sf-ready'));
                	}
            	});
            	this.worker.addEventListener('error', (e) => {
                	console.error('[Entrenador] Stockfish error:', e);
            	});
            	this.worker.postMessage('uci');
            	this.worker.postMessage('setoption name Threads value 1');
            	this.worker.postMessage('setoption name Hash value 32');
        	} catch (e) {
            	console.error('[Entrenador] No se pudo inicializar Stockfish:', e);
        	}
    	},

    	enviar(cmd) { if (this.worker) this.worker.postMessage(cmd); },

    	esperar(pattern, timeout = 5000) {
        	return new Promise((resolve, reject) => {
            	const listener = { pattern, resolve };
            	this.listeners.push(listener);
            	setTimeout(() => {
                	const idx = this.listeners.indexOf(listener);
                	if (idx >= 0) { this.listeners.splice(idx, 1); reject(new Error('timeout')); }
            	}, timeout);
        	});
    	},

    	async mejorMovimiento(fen, nivel) {
        	if (!this.worker || !this.ready) return null;
        	const cfg = NIVELES_SF[nivel] || NIVELES_SF[5];
        	this.enviar('stop');
        	this.enviar('setoption name Skill Level value ' + cfg.skill);
        	this.enviar('position fen ' + fen);
        	this.enviar('go depth ' + cfg.depth + ' movetime ' + cfg.movetime);
        	try {
            	const msg = await this.esperar(/^bestmove\s+(\S+)/, 8000);
            	const match = msg.match(/^bestmove\s+(\S+)/);
            	if (match && match[1] && match[1] !== '(none)') return match[1];
        	} catch (e) { /* timeout */ }
        	return null;
    	},

    	evaluarPosicion(fen, depth = 12) {
        	return new Promise((resolve) => {
            	if (!this.worker || !this.ready) {
                	resolve({ cp: 0, mate: null, mejor: null }); return;
            	}
            	this.enviar('stop');
            	this.enviar('setoption name Skill Level value 20');
            	this.enviar('position fen ' + fen);
            	this.enviar('go depth ' + depth);
            	let ultimaEval = { cp: 0, mate: null, mejor: null };
            	const handler = (e) => {
                	const msg = typeof e.data === 'string' ? e.data : (e.data && e.data.data) || '';
                	const cpMatch = msg.match(/\bscore cp (-?\d+)/);
                	const mateMatch = msg.match(/\bscore mate (-?\d+)/);
                	if (cpMatch) { ultimaEval.cp = parseInt(cpMatch[1], 10); ultimaEval.mate = null; }
                	else if (mateMatch) {
                    	const n = parseInt(mateMatch[1], 10);
                    	ultimaEval.mate = n;
                    	ultimaEval.cp = n > 0 ? (10000 - Math.abs(n) * 50) : (-10000 + Math.abs(n) * 50);
                	}
                	const pvMatch = msg.match(/\bpv\s+(\S+)/);
                	if (pvMatch && !ultimaEval.mejor) ultimaEval.mejor = pvMatch[1];
                	if (msg.startsWith('bestmove')) {
                    	const bm = msg.match(/bestmove\s+(\S+)/);
                    	if (bm && bm[1] !== '(none)') ultimaEval.mejor = bm[1];
                    	this.worker.removeEventListener('message', handler);
                    	resolve(ultimaEval);
                	}
            	};
            	this.worker.addEventListener('message', handler);
            	setTimeout(() => {
                	this.worker.removeEventListener('message', handler);
                	resolve(ultimaEval);
            	}, 3000);
        	});
    	}
	};

	// ============================================================
	// SISTEMA ELO (global en localStorage)
	// ⭐ NO se aplica cuando el usuario es admin (modo vista/edición)
	// ============================================================
	const ELO = {
    	data: null,
    	// Si es true, TODOS los cambios de ELO se ignoran (modo admin)
    	bloquearCambios: false,

    	cargar() {
        	try {
            	const raw = localStorage.getItem(ELO_STORAGE_KEY);
            	if (raw) {
                	const parsed = JSON.parse(raw);
                	this.data = { total: ELO_INICIAL, estudios: {}, historial: [], ...parsed };
                	if (!this.data.total) this.data.total = ELO_INICIAL;
            	} else {
                	this.data = { total: ELO_INICIAL, estudios: {}, historial: [] };
            	}
        	} catch (e) {
            	this.data = { total: ELO_INICIAL, estudios: {}, historial: [] };
        	}
    	},

    	guardar() {
        	try { localStorage.setItem(ELO_STORAGE_KEY, JSON.stringify(this.data)); } catch (e) {}
    	},

    	default() {
        	this.data = { total: ELO_INICIAL, estudios: {}, historial: [] };
    	},

    	obtenerCapitulo(estudio, capIdx) {
        	if (!this.data.estudios[estudio]) return ELO_INICIAL;
        	return this.data.estudios[estudio].capitulos[capIdx] || ELO_INICIAL;
    	},

    	/**
     	* Aplica un cambio de ELO.
     	* Si `bloquearCambios` está en true (modo admin), no hace nada.
     	*/
    	aplicar(estudio, capIdx, cambio, razon) {
        	if (cambio === 0) return 0;
        	if (this.bloquearCambios) {
            	console.log(`[Entrenador] ELO bloqueado (modo admin): ${cambio > 0 ? '+' : ''}${cambio} (${razon})`);
            	return 0;
        	}
        	if (!this.data.estudios[estudio]) {
            	this.data.estudios[estudio] = { elo: ELO_INICIAL, capitulos: {} };
        	}
        	const est = this.data.estudios[estudio];
        	if (!est.capitulos[capIdx]) est.capitulos[capIdx] = ELO_INICIAL;
        	const antes = est.capitulos[capIdx];
        	let nuevo = Math.max(ELO_MIN, Math.min(ELO_MAX, antes + cambio));
        	const cambioReal = nuevo - antes;
        	est.capitulos[capIdx] = nuevo;
        	const caps = Object.values(est.capitulos);
        	est.elo = Math.round(caps.reduce((a, b) => a + b, 0) / caps.length);
        	const ests = Object.values(this.data.estudios);
        	this.data.total = Math.round(ests.reduce((a, b) => a + b.elo, 0) / ests.length);
        	this.data.historial.unshift({
            	fecha: new Date().toISOString(),
            	estudio, capitulo: capIdx, cambio: cambioReal,
            	antes, despues: nuevo, razon
        	});
        	this.data.historial = this.data.historial.slice(0, 50);
        	this.guardar();
        	return cambioReal;
    	},

    	calcular(eloActual, eloOponente, resultado) {
        	const K = eloActual < 1400 ? 32 : (eloActual < 2000 ? 24 : 16);
        	const esperado = 1 / (1 + Math.pow(10, (eloOponente - eloActual) / 400));
        	return Math.round(K * (resultado - esperado));
    	},

    	acplToElo(acpl) {
        	if (acpl < 10) return 2700;
        	if (acpl < 15) return 2550;
        	if (acpl < 20) return 2400;
        	if (acpl < 25) return 2250;
        	if (acpl < 30) return 2150;
        	if (acpl < 40) return 1950;
        	if (acpl < 50) return 1800;
        	if (acpl < 60) return 1700;
        	if (acpl < 80) return 1550;
        	if (acpl < 100) return 1430;
        	if (acpl < 130) return 1280;
        	if (acpl < 160) return 1150;
        	if (acpl < 200) return 1000;
        	if (acpl < 250) return 850;
        	if (acpl < 300) return 720;
        	return 600;
    	}
	};

	ELO.cargar();

	// ============================================================
	// PGN PARSER
	// ============================================================
	function tokenizePGN(texto) {
    	const tokens = [];
    	let i = 0;
    	while (i < texto.length) {
        	const c = texto[i];
        	if (c === '{') {
            	const end = texto.indexOf('}', i);
            	i = end >= 0 ? end + 1 : texto.length;
        	} else if (c === ';') {
            	const end = texto.indexOf('\n', i);
            	i = end >= 0 ? end + 1 : texto.length;
        	} else if (c === '(') { tokens.push({ type: 'open' }); i++; }
        	else if (c === ')') { tokens.push({ type: 'close' }); i++; }
        	else if (/\s/.test(c)) { i++; }
        	else {
            	let j = i;
            	while (j < texto.length && !/[\s(){;]/.test(texto[j])) j++;
            	tokens.push({ type: 'text', value: texto.slice(i, j) });
            	i = j;
        	}
    	}
    	return tokens;
	}

	function construirArbolPGN(movText, fenInicial, idCounter) {
    	const tokens = tokenizePGN(movText);
    	const root = { id: idCounter.next(), move: null, fen: fenInicial, children: [], parent: null };
    	let currentNode = root;
    	let currentChess = new Chess(fenInicial);
    	const savedStates = [];
    	for (const tok of tokens) {
        	if (tok.type === 'open') {
            	savedStates.push({ node: currentNode, chess: new Chess(currentChess.fen()) });
            	if (currentNode.parent) {
                	currentNode = currentNode.parent;
                	currentChess = new Chess(currentNode.fen);
            	}
        	} else if (tok.type === 'close') {
            	if (savedStates.length) {
                	const saved = savedStates.pop();
                	currentNode = saved.node;
                	currentChess = saved.chess;
            	}
        	} else if (tok.type === 'text') {
            	if (/^\d+\.+$/.test(tok.value)) continue;
            	if (/^(1-0|0-1|1\/2-1\/2|\*)$/.test(tok.value)) continue;
            	if (/^\$\d+$/.test(tok.value)) continue;
            	const san = tok.value.replace(/[?!]+$/, '');
            	try {
                	const mv = currentChess.move(san);
                	if (!mv) continue;
                	const newNode = {
                    	id: idCounter.next(),
                    	move: { from: mv.from, to: mv.to, promotion: mv.promotion || 'q', san: mv.san, color: mv.color },
                    	fen: currentChess.fen(),
                    	children: [],
                    	parent: currentNode
                	};
                	currentNode.children.push(newNode);
                	currentNode = newNode;
            	} catch (e) { /* ignorar */ }
        	}
    	}
    	return root;
	}

	function recolectarHojas(nodo, hojas = []) {
    	if (!nodo.children || nodo.children.length === 0) {
        	if (nodo.move) hojas.push(nodo);
        	return hojas;
    	}
    	nodo.children.forEach(c => recolectarHojas(c, hojas));
    	return hojas;
	}

	function contarLineas(nodo) {
    	if (!nodo.children || nodo.children.length === 0) return 1;
    	let total = 0;
    	nodo.children.forEach(c => total += contarLineas(c));
    	return total;
	}

	function obtenerLineasCompletas(nodo, camino = [], resultado = []) {
    	const nuevoCamino = nodo.move ? [...camino, nodo] : camino;
    	if (!nodo.children || nodo.children.length === 0) {
        	if (nuevoCamino.length > 0) resultado.push(nuevoCamino);
        	return resultado;
    	}
    	nodo.children.forEach(c => obtenerLineasCompletas(c, nuevoCamino, resultado));
    	return resultado;
	}

	// ============================================================
	// CONVERTIR ÁRBOL A PGN (para guardar variantes)
	// ============================================================
	function arbolAPGN(arbol, headers) {
    	let lineas = [];
    	if (headers) {
        	Object.keys(headers).forEach(k => {
            	lineas.push(`[${k} "${headers[k]}"]`);
        	});
    	}
    	lineas.push('');

    	function escribirDesdeNodo(nodo, profundidad) {
        	if (!nodo) return '';
        	let texto = '';
        	for (let i = 1; i < nodo.children.length; i++) {
            	const alt = nodo.children[i];
            	const num = Math.floor(profundidad / 2) + 1;
            	const pre = alt.move.color === 'w' ? `${num}.` : `${num}...`;
            	texto += `(${pre} ${alt.move.san} `;
            	texto += escribirDesdeNodo(alt, profundidad + 1);
            	texto += ') ';
        	}
        	if (nodo.children.length > 0) {
            	texto += escribirNodo(nodo.children[0], profundidad);
        	}
        	return texto;
    	}

    	function escribirNodo(nodo, profundidad) {
        	if (nodo.children.length === 0) return '';
        	const child = nodo.children[0];
        	const mv = child.move;
        	let texto = '';
        	const num = Math.floor(profundidad / 2) + 1;
        	const pre = mv.color === 'w' ? `${num}.` : `${num}...`;

        	texto += `${pre} ${mv.san} `;

        	for (let i = 1; i < nodo.children.length; i++) {
            	const alt = nodo.children[i];
            	texto += `(${pre} ${alt.move.san} `;
            	texto += escribirDesdeNodo(alt, profundidad + 1);
            	texto += ') ';
        	}

        	texto += escribirNodo(child, profundidad + 1);
        	return texto;
    	}

    	const pgnText = escribirNodo(arbol, 0).trim() + ' *';
    	lineas.push(pgnText);
    	return lineas.join('\n');
	}

	// === FIN DE LA PARTE 1/3 ===
 	// ============================================================
	// CLASE PRINCIPAL: INSTANCIA DEL TABLERO
	// ============================================================
	class InstanciaTablero {
    	constructor(contenedor, config, contexto) {
        	this.contenedor = contenedor;
        	this.config = config || {};
        	this.contexto = contexto || {};
        	this.idInstancia = 'cm-' + (++_contadorInstancias);
        	this.destroyed = false;

        	// ⭐ ¿Es admin? Si sí, bloqueamos cambios de ELO
        	this.esModoAdmin = !!this.contexto.esAdmin;
        	if (this.esModoAdmin) {
            	ELO.bloquearCambios = true;
        	}

        	// Estado del tablero
        	this.chess = null;
        	this.arbol = null;
        	this.nodoActual = null;
        	this.turnoInicial = 'w';
        	this.orientacion = 'white';
        	this.orientacionAuto = 'white';
        	this.esperandoRespuesta = false;
        	this.casillaSeleccionada = null;
        	this.bloqueado = false;
        	this.hojasTotales = [];
        	this.hojasCompletadas = new Set();
        	this.erroresEnCapitulo = 0;
        	this.pistasUsadas = 0;
        	this.solucionVista = false;
        	this.eloAplicado = false;
        	this.respuestaAutoTimeout = null;
        	this.historialPartida = [];

        	// Capítulos
        	this.capitulos = [];
        	this.capituloActual = 0;

        	// Modo ordenador
        	this.colorHumano = 'w';

        	// Auto-avance (solo alumnos)
        	this.autoAvance = false;

        	// Editor de variantes (solo admin)
        	this.modoEdicionVariantes = false;
        	this.historialEdicion = [];

        	// ⭐ Referencia a callbacks externos
        	this.onGuardarPGN = this.contexto.onGuardarPGN || null;
        	this.onEliminarCapitulo = this.contexto.onEliminarCapitulo || null;

        	// ID counter
        	this._idCounter = { v: 0, next() { return ++this.v; } };

        	this.init();
    	}

    	// --------------------------------------------------------
    	// INIT
    	// --------------------------------------------------------
    	init() {
        	const cfg = this.config;
        	if (cfg.pgn) this.cargarCapitulosDesdePGN(cfg.pgn);

        	if (this.capitulos.length === 0) {
            	this.contenedor.innerHTML =
                	'<div class="cm-tablero-error-msg">⚠️ No se pudieron cargar capítulos del PGN.</div>';
            	return;
        	}

        	this.construirEstructuraHTML();
        	this.cargarCapitulo(0);
        	if (cfg.modo === 'ordenador') SF.init();
    	}

    	// --------------------------------------------------------
    	// CONSTRUIR ESTRUCTURA HTML
    	// --------------------------------------------------------
    	construirEstructuraHTML() {
        	const esAdmin = this.esModoAdmin;
        	const cap = this.capitulos[this.capituloActual] || this.capitulos[0];

        	this.contenedor.innerHTML = `
            	<div class="cm-tablero-wrap">
                	<div class="cm-tablero-game">
                    	<div>
                        	<div class="cm-tablero-board-wrap">
                            	<div class="cm-tablero-board" data-rol="board"></div>
                        	</div>
                        	<div class="cm-tablero-progress-info" data-rol="progressInfo"></div>

                        	<!-- ⭐ BARRA DE CAPÍTULOS (visible siempre) -->
                        	<div class="cm-tablero-capitulos-bar" data-rol="capitulosBar">
                            	<div class="cm-tablero-capitulos-titulo">
                                	<span>📚 Capítulos del ejercicio</span>
                                	<span class="cm-progreso-caps" data-rol="capsProgreso">0/0</span>
                            	</div>
                            	<div class="cm-tablero-capitulos-lista" data-rol="capsLista"></div>
                        	</div>
                    	</div>

                    	<div class="cm-tablero-panel">
                        	<div class="cm-tablero-meta" data-rol="meta"></div>

                        	${esAdmin ? `
                        	<!-- Indicador de modo -->
                        	<div class="cm-tablero-modo-indicator normal" data-rol="modoIndicator">
                            	<span style="font-size:1.2rem;">🎯</span>
                            	<span>Modo <strong>NORMAL</strong> — no afecta tu ELO</span>
                        	</div>

                        	<!-- Botón editar variantes -->
                        	<div class="cm-tablero-row" style="margin-bottom:10px;">
                            	<button class="cm-tablero-btn-admin" data-rol="btnEditarVariantes" style="width:100%;">
                                	✏️ Activar modo edición de variantes
                            	</button>
                        	</div>

                        	<!-- Barra de edición de variantes (oculta hasta activar) -->
                        	<div class="cm-tablero-edit-toolbar" data-rol="editToolbar">
                            	<div class="cm-tablero-edit-info" data-rol="editInfo">
                                	✏️ <strong>MODO EDICIÓN ACTIVO</strong> — Arrastra piezas para construir la variante
                            	</div>
                            	<button class="cm-tablero-btn-guardar" data-rol="btnGuardarVariante">
                                	💾 Guardar variante
                            	</button>
                            	<button class="cm-tablero-btn cm-tablero-btn-sec" data-rol="btnDeshacerEdicion">
                                	↩️ Deshacer
                            	</button>
                            	<button class="cm-tablero-btn cm-tablero-btn-peligro" data-rol="btnDescartarEdicion">
                                	🗑️ Descartar
                            	</button>
                        	</div>
                        	` : ''}

                        	<!-- Status -->
                        	<div class="cm-tablero-status info" data-rol="status">Cargando…</div>

                        	<!-- Movimientos -->
                        	<div class="cm-tablero-moves cm-tablero-hidden" data-rol="moves"></div>

                        	<!-- Auto-avance (solo alumno) -->
                        	${!esAdmin ? `
                        	<div class="cm-tablero-auto-avance" data-rol="autoAvancePanel">
                            	<input type="checkbox" id="${this.idInstancia}-autoAvance" data-rol="autoAvanceCheck">
                            	<label for="${this.idInstancia}-autoAvance">Avanzar al siguiente ejercicio automáticamente</label>
                        	</div>
                        	` : ''}

                        	<!-- Botones de juego -->
                        	<div class="cm-tablero-row">
                            	<button class="cm-tablero-btn cm-tablero-btn-sec" data-rol="btnReiniciar">⟲ Reiniciar</button>
                            	<button class="cm-tablero-btn cm-tablero-btn-sec" data-rol="btnVoltear">🔄 Voltear</button>
                            	<button class="cm-tablero-btn cm-tablero-btn-sec" data-rol="btnPista">💡 Pista</button>
                        	</div>
                        	<div class="cm-tablero-row">
                            	<button class="cm-tablero-btn cm-tablero-btn-sec" data-rol="btnVerSol">▶ Ver solución</button>
                        	</div>
                        	<div class="cm-tablero-row">
                            	<button class="cm-tablero-btn cm-tablero-btn-sec" data-rol="btnPrev" style="flex:1;">← Anterior</button>
                            	<button class="cm-tablero-btn cm-tablero-btn-sec" data-rol="btnNext" style="flex:1;">Siguiente →</button>
                        	</div>

                        	${esAdmin ? `
                        	<!-- ⭐ PANEL ADMIN CON PESTAÑAS -->
                        	<div class="cm-tablero-admin-block-panel" data-rol="adminBlockPanel">
                            	<div class="cm-tablero-tabs" data-rol="adminTabs">
                                	<button class="cm-tablero-tab active" data-tab="pgn">📋 PGN & Capítulos</button>
                                	<button class="cm-tablero-tab" data-tab="config">⚙️ Configuración</button>
                                	<button class="cm-tablero-tab" data-tab="variantes">🌿 Variantes</button>
                            	</div>

                            	<!-- Pestaña PGN -->
                            	<div class="cm-tablero-tab-content active" data-tab-content="pgn">
                                	<label class="cm-tablero-admin-field-label">📋 PGN del estudio (con capítulos)</label>
                                	<textarea class="cm-tablero-admin-textarea" data-rol="pgnTextarea" placeholder="Pega aquí el PGN de tu estudio…">${escapeHtml((this.config || {}).pgn || '')}</textarea>

                                	<div class="cm-tablero-admin-actions">
                                    	<label class="cm-tablero-admin-upload-btn">
                                        	📂 Subir archivo .pgn
                                        	<input type="file" accept=".pgn,.txt" style="display:none;" data-rol="inputArchivoPGN">
                                    	</label>
                                    	<button class="cm-tablero-btn-guardar" data-rol="btnGuardarPGN">
                                        	💾 Guardar PGN
                                    	</button>
                                	</div>

                                	<div class="cm-tablero-admin-info-box">
                                    	ℹ️ Los cambios no se guardan automáticamente. Pulsa <strong>💾 Guardar PGN</strong> para aplicar.
                                	</div>

                                	<label class="cm-tablero-admin-field-label" style="margin-top:14px;">
                                    	📚 Capítulos detectados (<span data-rol="numCaps">0</span>):
                                	</label>
                                	<div class="cm-tablero-admin-capitulos-list" data-rol="adminCapsLista">
                                    	<div style="padding:12px; text-align:center; color:var(--cm-texto-suave); font-size:0.8rem;">
                                        	Pega un PGN arriba para ver los capítulos.
                                    	</div>
                                	</div>
                            	</div>

                            	<!-- Pestaña Configuración -->
                            	<div class="cm-tablero-tab-content" data-tab-content="config">
                                	<label class="cm-tablero-admin-field-label">Modo de juego</label>
                                	<select class="cm-tablero-admin-select" data-rol="configModo">
                                    	<option value="ejercicio">🎯 Ejercicio (buscar solución)</option>
                                    	<option value="ordenador">🤖 Jugar vs PC</option>
                                	</select>

                                	<div class="cm-tablero-admin-row" data-rol="filaColor" style="display:none;">
                                    	<div>
                                        	<label class="cm-tablero-admin-field-label">Humano juega</label>
                                        	<select class="cm-tablero-admin-select" data-rol="configColor">
                                            	<option value="w">♔ Blancas</option>
                                            	<option value="b">♚ Negras</option>
                                        	</select>
                                    	</div>
                                    	<div>
                                        	<label class="cm-tablero-admin-field-label">Nivel Stockfish</label>
                                        	<select class="cm-tablero-admin-select" data-rol="configNivel">
                                            	<option value="1">1 — Principiante (800)</option>
                                            	<option value="2">2 — Muy fácil (1000)</option>
                                            	<option value="3">3 — Fácil (1200)</option>
                                            	<option value="4">4 — Normal (1400)</option>
                                            	<option value="5" selected>5 — Intermedio (1600)</option>
                                            	<option value="6">6 — Difícil (1800)</option>
                                            	<option value="7">7 — Muy difícil (2100)</option>
                                            	<option value="8">8 — Maestro (2400)</option>
                                        	</select>
                                    	</div>
                                	</div>

                                	<label class="cm-tablero-admin-field-label">Orientación del tablero</label>
                                	<select class="cm-tablero-admin-select" data-rol="configOrientacion">
                                    	<option value="auto">🔄 Auto (según quién mueve)</option>
                                    	<option value="white">♔ Blancas abajo</option>
                                    	<option value="black">♚ Negras abajo</option>
                                	</select>

                                	<div class="cm-tablero-engine-status" data-rol="engineStatus">⏸️ Motor no inicializado</div>
                            	</div>

                            	<!-- Pestaña Variantes -->
                            	<div class="cm-tablero-tab-content" data-tab-content="variantes">
                                	<div class="cm-tablero-variantes-editor">
                                    	<div class="cm-titulo">
                                        	<span>🌿 Variantes guardadas</span>
                                        	<span data-rol="variantesCount">0</span>
                                    	</div>
                                    	<div data-rol="variantesLista"></div>
                                	</div>

                                	<div class="cm-tablero-variants-progress cm-tablero-hidden" data-rol="variantsProgress">
                                    	<div class="cm-titulo">
                                        	<span>🌿 Progreso de soluciones</span>
                                        	<span data-rol="variantsProgreso">0/0</span>
                                    	</div>
                                    	<div class="cm-dots" data-rol="variantsDots"></div>
                                	</div>
                            	</div>
                        	</div>
                        	` : ''}
                    	</div>
                	</div>
            	</div>
        	`;

        	// === Referencias ===
        	this.$board = this.contenedor.querySelector('[data-rol="board"]');
        	this.$progressInfo = this.contenedor.querySelector('[data-rol="progressInfo"]');
        	this.$meta = this.contenedor.querySelector('[data-rol="meta"]');
        	this.$status = this.contenedor.querySelector('[data-rol="status"]');
        	this.$moves = this.contenedor.querySelector('[data-rol="moves"]');
        	this.$engineStatus = this.contenedor.querySelector('[data-rol="engineStatus"]');
        	this.$modoIndicator = this.contenedor.querySelector('[data-rol="modoIndicator"]');
        	this.$editToolbar = this.contenedor.querySelector('[data-rol="editToolbar"]');
        	this.$editInfo = this.contenedor.querySelector('[data-rol="editInfo"]');
        	this.$capitulosBar = this.contenedor.querySelector('[data-rol="capitulosBar"]');
        	this.$capsLista = this.contenedor.querySelector('[data-rol="capsLista"]');
        	this.$capsProgreso = this.contenedor.querySelector('[data-rol="capsProgreso"]');
        	this.$pgnTextarea = this.contenedor.querySelector('[data-rol="pgnTextarea"]');
        	this.$adminCapsLista = this.contenedor.querySelector('[data-rol="adminCapsLista"]');
        	this.$numCaps = this.contenedor.querySelector('[data-rol="numCaps"]');
        	this.$variantesEditor = this.contenedor.querySelector('[data-rol="variantesEditor"]');
        	this.$variantesLista = this.contenedor.querySelector('[data-rol="variantesLista"]');
        	this.$variantsProgress = this.contenedor.querySelector('[data-rol="variantsProgress"]');
        	this.$variantsDots = this.contenedor.querySelector('[data-rol="variantsDots"]');
        	this.$variantsProgreso = this.contenedor.querySelector('[data-rol="variantsProgreso"]');
        	this.$adminTabs = this.contenedor.querySelectorAll('[data-rol="adminTabs"] .cm-tablero-tab');
        	this.$adminTabContents = this.contenedor.querySelectorAll('[data-tab-content]');

        	// === Config inicial ===
        	const selModo = this.contenedor.querySelector('[data-rol="configModo"]');
        	const selColor = this.contenedor.querySelector('[data-rol="configColor"]');
        	const selNivel = this.contenedor.querySelector('[data-rol="configNivel"]');
        	const selOrient = this.contenedor.querySelector('[data-rol="configOrientacion"]');
        	if (selModo) selModo.value = this.config.modo || 'ejercicio';
        	if (selColor) selColor.value = this.config.colorHumano || 'w';
        	if (selNivel) selNivel.value = this.config.nivelSF || 5;
        	if (selOrient) selOrient.value = this.config.orientacion || 'auto';

        	// === Eventos: botones principales ===
        	this._on('[data-rol="btnReiniciar"]', 'click', () => this.reiniciar());
        	this._on('[data-rol="btnVoltear"]', 'click', () => this.voltear());
        	this._on('[data-rol="btnPista"]', 'click', () => this.pista());
        	this._on('[data-rol="btnVerSol"]', 'click', () => this.verSolucion());
        	this._on('[data-rol="btnPrev"]', 'click', () => this.capituloAnterior());
        	this._on('[data-rol="btnNext"]', 'click', () => this.capituloSiguiente());

        	// === Eventos: auto-avance ===
        	if (!esAdmin) {
            	this._on('[data-rol="autoAvanceCheck"]', 'change', (e) => {
                	this.autoAvance = e.target.checked;
                	this.mostrarToast(e.target.checked ? '✅ Auto-avance activado' : '⏸️ Auto-avance desactivado', '');
            	});
        	}

        	// === Eventos: editor de variantes ===
        	if (esAdmin) {
            	this._on('[data-rol="btnEditarVariantes"]', 'click', () => this.toggleModoEdicion());
            	this._on('[data-rol="btnGuardarVariante"]', 'click', () => this.guardarVarianteEdicion());
            	this._on('[data-rol="btnDeshacerEdicion"]', 'click', () => this.deshacerEdicion());
            	this._on('[data-rol="btnDescartarEdicion"]', 'click', () => this.descartarEdicion());

            	// Pestañas del panel admin
            	this.$adminTabs.forEach(tab => {
                	tab.addEventListener('click', () => {
                    	this.$adminTabs.forEach(t => t.classList.remove('active'));
                    	this.$adminTabContents.forEach(c => c.classList.remove('active'));
                    	tab.classList.add('active');
                    	const target = this.contenedor.querySelector(`[data-tab-content="${tab.dataset.tab}"]`);
                    	if (target) target.classList.add('active');
                    	// Guardar pestaña activa en localStorage
                    	try { localStorage.setItem('cm-tablero-ultima-tab', tab.dataset.tab); } catch (e) {}
                	});
            	});
            	// Restaurar última pestaña activa
            	try {
                	const ultimaTab = localStorage.getItem('cm-tablero-ultima-tab');
                	if (ultimaTab) {
                    	const tabEl = this.contenedor.querySelector(`[data-rol="adminTabs"] .cm-tablero-tab[data-tab="${ultimaTab}"]`);
                    	if (tabEl) tabEl.click();
                	}
            	} catch (e) {}

            	// Botón Guardar PGN
            	this._on('[data-rol="btnGuardarPGN"]', 'click', () => this.guardarPGN());

            	// Input archivo PGN
            	const inputArchivo = this.contenedor.querySelector('[data-rol="inputArchivoPGN"]');
            	if (inputArchivo) {
                	inputArchivo.addEventListener('change', (e) => {
                    	const file = e.target.files && e.target.files[0];
                    	if (!file) return;
                    	const reader = new FileReader();
                    	reader.onload = (ev) => {
                        	if (this.$pgnTextarea) this.$pgnTextarea.value = ev.target.result;
                        	this.actualizarListaAdminCaps();
                        	this.mostrarToast('📂 PGN cargado. Pulsa 💾 Guardar PGN para aplicar.', '');
                    	};
                    	reader.readAsText(file);
                	});
            	}

            	// Config selects (autoguardan)
            	this._on('[data-rol="configModo"]', 'change', (e) => this.cambiarModo(e.target.value));
            	this._on('[data-rol="configColor"]', 'change', (e) => this.cambiarColor(e.target.value));
            	this._on('[data-rol="configNivel"]', 'change', (e) => this.cambiarNivel(e.target.value));
            	this._on('[data-rol="configOrientacion"]', 'change', (e) => this.cambiarOrientacion(e.target.value));

            	// Textarea PGN: actualizar lista de capítulos mientras escribe (debounced)
            	if (this.$pgnTextarea) {
                	let debounceTimer;
                	this.$pgnTextarea.addEventListener('input', () => {
                    	clearTimeout(debounceTimer);
                    	debounceTimer = setTimeout(() => this.actualizarListaAdminCaps(), 400);
                	});
                	// Cargar lista inicial
                	setTimeout(() => this.actualizarListaAdminCaps(), 100);
            	}

            	// Mostrar/ocultar fila Color/Nivel según modo
            	this.sincronizarVisibilidadConfig();
        	}

        	// Stockfish ready
        	document.addEventListener('cm-tablero-sf-ready', this._sfReadyHandler = () => {
            	this.actualizarEstadoMotor();
        	});

        	this.actualizarEstadoMotor();

        	// Renderizar la barra de capítulos
        	this.renderizarBarraCapitulos();
    	}

    	_on(selector, evento, handler) {
        	const el = this.contenedor.querySelector(selector);
        	if (el) el.addEventListener(evento, handler);
    	}

    	actualizarEstadoMotor() {
        	if (!this.$engineStatus) return;
        	if (SF.ready) {
            	this.$engineStatus.textContent = '✅ Stockfish listo';
            	this.$engineStatus.className = 'cm-tablero-engine-status ready';
        	} else if (SF.worker) {
            	this.$engineStatus.textContent = '⏳ Cargando Stockfish…';
            	this.$engineStatus.className = 'cm-tablero-engine-status loading';
        	} else {
            	this.$engineStatus.textContent = '⏸️ Motor no inicializado';
            	this.$engineStatus.className = 'cm-tablero-engine-status';
        	}
    	}

    	sincronizarVisibilidadConfig() {
        	const filaColor = this.contenedor.querySelector('[data-rol="filaColor"]');
        	const modo = this.config.modo || 'ejercicio';
        	if (filaColor) filaColor.style.display = modo === 'ordenador' ? 'grid' : 'none';
    	}

    	// --------------------------------------------------------
    	// CARGAR PGN Y CAPÍTULOS
    	// --------------------------------------------------------
    	cargarCapitulosDesdePGN(pgn) {
        	const bloques = pgn.split(/(?=\[Event\s)/i).filter(b => b.trim());
        	this.capitulos = [];
        	bloques.forEach((bloque, idx) => {
            	try {
                	const cap = this.parsearCapitulo(bloque, idx);
                	if (cap) this.capitulos.push(cap);
            	} catch (e) {}
        	});
    	}

    	parsearCapitulo(texto, idx) {
        	const headers = {};
        	const headerRegex = /\[(\w+)\s+"([^"]*)"\]/g;
        	let m;
        	while ((m = headerRegex.exec(texto)) !== null) headers[m[1]] = m[2];
        	const fen = headers.FEN || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        	const lineas = texto.split('\n').filter(l => !l.trim().startsWith('['));
        	const movText = lineas.join(' ').trim();
        	if (!movText) return null;
        	const arbol = construirArbolPGN(movText, fen, this._idCounter);
        	if (!arbol.children.length) return null;
        	const tempChess = new Chess(fen);
        	const turnoAuto = tempChess.turn() === 'w' ? 'white' : 'black';
        	return {
            	index: idx,
            	nombre: headers.ChapterName || headers.Event || `Capítulo ${idx + 1}`,
            	estudio: headers.StudyName || 'Sin estudio',
            	fen,
            	arbol,
            	numLineas: contarLineas(arbol),
            	completado: false,
            	orientacionAuto: turnoAuto,
            	headersOriginales: headers
        	};
    	}

    	// --------------------------------------------------------
    	// CARGAR CAPÍTULO
    	// --------------------------------------------------------
    	cargarCapitulo(idx) {
        	idx = parseInt(idx, 10);
        	if (!this.capitulos[idx]) return;
        	this.capituloActual = idx;
        	const cap = this.capitulos[idx];

        	if (this.modoEdicionVariantes) this.desactivarModoEdicion(true);

        	this.arbol = cap.arbol;
        	this.nodoActual = this.arbol;
        	this.chess = new Chess(cap.fen);
        	this.turnoInicial = this.chess.turn();
        	this.orientacionAuto = cap.orientacionAuto || 'white';

        	const modo = this.config.modo || 'ejercicio';
        	if (this.config.orientacion === 'auto' || !this.config.orientacion) {
            	this.orientacion = this.orientacionAuto;
        	} else {
            	this.orientacion = this.config.orientacion;
        	}

        	this.hojasTotales = recolectarHojas(this.arbol);
        	this.hojasCompletadas = new Set();
        	this.esperandoRespuesta = false;
        	this.casillaSeleccionada = null;
        	this.bloqueado = false;
        	this.erroresEnCapitulo = 0;
        	this.pistasUsadas = 0;
        	this.solucionVista = false;
        	this.eloAplicado = false;
        	this.historialPartida = [];

        	if (this.respuestaAutoTimeout) { clearTimeout(this.respuestaAutoTimeout); this.respuestaAutoTimeout = null; }

        	this.actualizarMeta();
        	this.construirTablero();
        	this.dibujarPiezas();
        	this.actualizarMovimientos();
        	this.actualizarBotonesModo();
        	this.actualizarProgreso();
        	this.actualizarVariantesEditor();
        	this.actualizarVariantesProgreso();
        	this.renderizarBarraCapitulos();

        	if (modo === 'ordenador') {
            	this.iniciarModoOrdenador();
        	} else {
            	this.setStatus('info', 'Tu turno. Encuentra la mejor jugada.');
        	}
    	}

    	actualizarMeta() {
        	if (!this.$meta) return;
        	const cap = this.capitulos[this.capituloActual];
        	if (!cap) return;
        	const eloCap = ELO.obtenerCapitulo(cap.estudio, this.capituloActual);
        	this.$meta.innerHTML = `<strong>Capítulo ${this.capituloActual + 1} de ${this.capitulos.length}</strong> · ${escapeHtml(cap.estudio)} · 🏆 ELO ${eloCap}`;
    	}

    	// --------------------------------------------------------
    	// BARRA DE CAPÍTULOS (debajo del tablero)
    	// --------------------------------------------------------
    	renderizarBarraCapitulos() {
        	if (!this.$capsLista) return;
        	const esAdmin = this.esModoAdmin;

        	this.$capsLista.innerHTML = this.capitulos.map((cap, idx) => {
            	const activo = idx === this.capituloActual;
            	const completado = cap.completado;
            	const badge = completado ? '<span class="cm-capitulo-check">✓</span>' : '';
            	const delBtn = esAdmin
                	? `<button class="cm-capitulo-del" data-cap-del="${idx}" title="Eliminar capítulo">✕</button>`
                	: '';
            	return `
                	<button class="cm-tablero-capitulo-btn ${activo ? 'active' : ''}" data-cap-idx="${idx}">
                    	<span class="cm-capitulo-num">${idx + 1}.</span>
                    	<span>${escapeHtml(cap.nombre.substring(0, 20))}${cap.nombre.length > 20 ? '…' : ''}</span>
                    	${badge}
                    	${delBtn}
                	</button>
            	`;
        	}).join('');

        	// Eventos: navegar
        	this.$capsLista.querySelectorAll('[data-cap-idx]').forEach(btn => {
            	btn.addEventListener('click', (e) => {
                	if (e.target.closest('[data-cap-del]')) return;
                	const idx = parseInt(btn.dataset.capIdx, 10);
                	if (idx !== this.capituloActual) this.cargarCapitulo(idx);
            	});
        	});

        	// Eventos: eliminar (solo admin)
        	if (esAdmin) {
            	this.$capsLista.querySelectorAll('[data-cap-del]').forEach(btn => {
                	btn.addEventListener('click', (e) => {
                    	e.stopPropagation();
                    	const idx = parseInt(btn.dataset.capDel, 10);
                    	this.eliminarCapitulo(idx);
                	});
            	});
        	}

        	// Progreso
        	if (this.$capsProgreso) {
            	const completados = this.capitulos.filter(c => c.completado).length;
            	this.$capsProgreso.textContent = `${completados}/${this.capitulos.length}`;
        	}
    	}

    	eliminarCapitulo(idx) {
        	if (!this.esModoAdmin) return;
        	if (this.capitulos.length <= 1) {
            	this.mostrarToast('⚠️ No puedes eliminar el único capítulo', '');
            	return;
        	}
        	const cap = this.capitulos[idx];
        	if (!cap) return;

        	this.abrirModalConfirmacion(
            	`🗑️ Eliminar "${cap.nombre}"`,
            	`¿Seguro que quieres eliminar este capítulo? Esta acción no se puede deshacer.`,
            	() => {
                	this.capitulos.splice(idx, 1);
                	// Reajustar índices
                	this.capitulos.forEach((c, i) => c.index = i);

                	// Notificar al padre para guardar el PGN actualizado
                	if (this.contexto.onEliminarCapitulo) {
                    	try {
                        	const pgnNuevo = this._reconstruirPGNCompleto();
                        	this.contexto.onEliminarCapitulo({
                            	pgnNuevo,
                            	numCapitulos: this.capitulos.length
                        	});
                    	} catch (e) {}
                	}

                	// Reajustar capítulo actual
                	if (this.capituloActual >= this.capitulos.length) {
                    	this.capituloActual = this.capitulos.length - 1;
                	}
                	this.cargarCapitulo(this.capituloActual);
                	this.actualizarListaAdminCaps();
                	this.mostrarToast(`🗑️ Capítulo eliminado`, '');
            	}
        	);
    	}

    	_reconstruirPGNCompleto() {
        	// Reconstruye el PGN completo desde this.capitulos
        	return this.capitulos.map(cap => {
            	let headers = '';
            	const h = cap.headersOriginales || {};
            	if (h.Event) headers += `[Event "${h.Event}"]\n`;
            	if (h.StudyName) headers += `[StudyName "${h.StudyName}"]\n`;
            	headers += `[ChapterName "${cap.nombre}"]\n`;
            	if (h.FEN) headers += `[FEN "${h.FEN}"]\n`;
            	if (h.SetUp) headers += `[SetUp "${h.SetUp}"]\n`;
            	if (h.ChapterMode) headers += `[ChapterMode "${h.ChapterMode}"]\n`;

            	let movesText = '';
            	try {
                	movesText = arbolAPGN(cap.arbol, null).split('\n').filter(l => !l.startsWith('[')).join(' ').trim();
            	} catch (e) {
                	movesText = '*';
            	}
            	return headers + '\n' + movesText;
        	}).join('\n\n');
    	}

    	// --------------------------------------------------------
    	// ACTUALIZAR LISTA ADMIN DE CAPÍTULOS (en pestaña PGN)
    	// --------------------------------------------------------
    	actualizarListaAdminCaps() {
        	if (!this.$adminCapsLista) return;
        	const pgnActual = (this.$pgnTextarea && this.$pgnTextarea.value) || '';
        	const bloques = pgnActual.split(/(?=\[Event\s)/i).filter(b => b.trim());

        	if (bloques.length === 0) {
            	this.$adminCapsLista.innerHTML = '<div style="padding:12px; text-align:center; color:var(--cm-texto-suave); font-size:0.8rem;">Pega un PGN arriba para ver los capítulos.</div>';
            	if (this.$numCaps) this.$numCaps.textContent = '0';
            	return;
        	}

        	if (this.$numCaps) this.$numCaps.textContent = bloques.length;

        	this.$adminCapsLista.innerHTML = bloques.map((bloque, idx) => {
            	const headerMatch = bloque.match(/\[ChapterName\s+"([^"]*)"\]/i);
            	const nombre = headerMatch ? headerMatch[1] : `Capítulo ${idx + 1}`;

            	// Contar variantes del bloque
            	const lineas = bloque.split('\n').filter(l => !l.trim().startsWith('['));
            	const movText = lineas.join(' ').trim();
            	let numLineas = 0;
            	try {
                	if (movText) {
                    	const idC = { v: 0, next() { return ++this.v; } };
                    	const fenMatch = bloque.match(/\[FEN\s+"([^"]*)"\]/);
                    	const fen = fenMatch ? fenMatch[1] : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
                    	const a = construirArbolPGN(movText, fen, idC);
                    	numLineas = contarLineas(a);
                	}
            	} catch (e) {}

            	return `
                	<div class="cm-tablero-admin-capitulo-item">
                    	<div class="cm-cap-info">
                        	<strong>${idx + 1}. ${escapeHtml(nombre)}</strong>
                        	<small>${numLineas} solución${numLineas === 1 ? '' : 'es'}</small>
                    	</div>
                    	<button class="cm-cap-del" data-admin-cap-del="${idx}">🗑️</button>
                	</div>
            	`;
        	}).join('');

        	// Eventos: eliminar capítulo del TEXTAREA (sin guardar todavía)
        	this.$adminCapsLista.querySelectorAll('[data-admin-cap-del]').forEach(btn => {
            	btn.addEventListener('click', () => {
                	const idx = parseInt(btn.dataset.adminCapDel, 10);
                	this._eliminarCapDeTextarea(idx);
            	});
        	});
    	}

    	_eliminarCapDeTextarea(idx) {
        	if (!this.$pgnTextarea) return;
        	const pgnActual = this.$pgnTextarea.value;
        	const bloques = pgnActual.split(/(?=\[Event\s)/i).filter(b => b.trim());
        	if (bloques.length <= 1) {
            	this.mostrarToast('⚠️ No puedes eliminar el único capítulo', '');
            	return;
        	}
        	if (idx < 0 || idx >= bloques.length) return;

        	this.abrirModalConfirmacion(
            	`🗑️ Eliminar capítulo ${idx + 1}`,
            	'Se eliminará del área de texto. Pulsa 💾 Guardar PGN para aplicar el cambio.',
            	() => {
                	bloques.splice(idx, 1);
                	this.$pgnTextarea.value = bloques.join('\n\n');
                	this.actualizarListaAdminCaps();
                	this.mostrarToast('🗑️ Capítulo quitado. No olvides guardar.', '');
            	}
        	);
    	}

    	// --------------------------------------------------------
    	// GUARDAR PGN (con modal Reemplazar / Añadir)
    	// --------------------------------------------------------
    	guardarPGN() {
        	if (!this.esModoAdmin || !this.$pgnTextarea) return;
        	const pgnNuevo = this.$pgnTextarea.value.trim();
        	if (!pgnNuevo) {
            	this.mostrarToast('⚠️ El PGN está vacío', 'error');
            	return;
        	}

        	const pgnActual = (this.config || {}).pgn || '';
        	const hayContenidoAnterior = pgnActual.trim().length > 0;

        	if (!hayContenidoAnterior) {
            	// No hay PGN previo: guardar directamente
            	this._aplicarPGN(pgnNuevo);
            	return;
        	}

        	// Preguntar al usuario: Reemplazar / Añadir / Cancelar
        	this.abrirModalOpciones(
            	'💾 Guardar PGN',
            	'¿Qué quieres hacer con el PGN actual?',
            	[
                	{
                    	icon: '🔄',
                    	titulo: 'Reemplazar todo',
                    	desc: 'Descarta el PGN anterior y guarda solo el nuevo.',
                    	action: () => this._aplicarPGN(pgnNuevo)
                	},
                	{
                    	icon: '➕',
                    	titulo: 'Añadir al final',
                    	desc: 'Mantiene el PGN anterior y le añade los nuevos capítulos.',
                    	action: () => this._aplicarPGN(pgnActual + '\n\n' + pgnNuevo)
                	}
            	]
        	);
    	}

    	_aplicarPGN(pgnFinal) {
        	// Actualizar config
        	if (!this.config) this.config = {};
        	this.config.pgn = pgnFinal;

        	// Recargar capítulos
        	this.cargarCapitulosDesdePGN(pgnFinal);

        	if (this.capitulos.length === 0) {
            	this.mostrarToast('⚠️ El PGN no contiene capítulos válidos', 'error');
            	return;
        	}

        	// Resetear capítulo actual
        	this.capituloActual = 0;
        	this.cargarCapitulo(0);
        	this.actualizarListaAdminCaps();

        	// Notificar al padre (script.js) para persistir en Firestore
        	if (this.onGuardarPGN) {
            	try {
                	this.onGuardarPGN({ pgn: pgnFinal });
            	} catch (e) {
                	console.error('[Entrenador] Error al persistir PGN:', e);
            	}
        	}

        	this.mostrarToast(`✅ PGN guardado (${this.capitulos.length} capítulo${this.capitulos.length === 1 ? '' : 's'})`, 'elo-up');
        	this.setStatus('ok', `✅ PGN guardado correctamente.`);
    	}

    	// --------------------------------------------------------
    	// TABLERO
    	// --------------------------------------------------------
    	construirTablero() {
        	const board = this.$board;
        	if (!board) return;
        	board.innerHTML = '';
        	const files = 'abcdefgh';
        	const ranks = this.orientacion === 'white' ? '87654321' : '12345678';
        	const filesOrden = this.orientacion === 'white' ? files : files.split('').reverse().join('');
        	for (let r of ranks) {
            	for (let f of filesOrden) {
                	const sq = f + r;
                	const fileIdx = files.indexOf(f);
                	const rankNum = parseInt(r, 10);
                	const isLight = (fileIdx + rankNum) % 2 === 1;
                	const div = document.createElement('div');
                	div.className = 'cm-tablero-square ' + (isLight ? 'light' : 'dark');
                	div.dataset.square = sq;
                	if (f === filesOrden[0]) {
                    	const s = document.createElement('span');
                    	s.className = 'cm-tablero-coord cm-tablero-coord-rank';
                    	s.textContent = r;
                    	div.appendChild(s);
                	}
                	if (r === ranks[ranks.length - 1]) {
                    	const s = document.createElement('span');
                    	s.className = 'cm-tablero-coord cm-tablero-coord-file';
                    	s.textContent = f;
                    	div.appendChild(s);
                	}
                	div.addEventListener('click', () => this.clickCasilla(sq));
                	board.appendChild(div);
            	}
        	}
    	}

    	dibujarPiezas() {
        	if (!this.$board) return;
        	this.$board.querySelectorAll('.cm-tablero-piece').forEach(p => p.remove());
        	this.$board.querySelectorAll('.selected, .legal-move, .legal-capture, .last-move, .check').forEach(el => {
            	el.classList.remove('selected', 'legal-move', 'legal-capture', 'last-move', 'check');
        	});
        	const boardFen = this.chess.fen().split(' ')[0];
        	const files = 'abcdefgh';
        	const ranks = '87654321';
        	let row = 0, col = 0;
        	for (const ch of boardFen) {
            	if (ch === '/') { row++; col = 0; continue; }
            	if (/[1-8]/.test(ch)) { col += parseInt(ch, 10); continue; }
            	const square = files[col] + ranks[row];
            	const color = ch === ch.toUpperCase() ? 'w' : 'b';
            	const key = color + ch.toLowerCase();
            	const sqEl = this.$board.querySelector(`[data-square="${square}"]`);
            	if (sqEl) {
                	const img = document.createElement('img');
                	img.className = 'cm-tablero-piece';
                	img.src = PIEZAS[key];
                	img.alt = SIMBOLOS[key];
                	img.draggable = false;
                	img.onerror = function () {
                    	this.style.display = 'none';
                    	const span = document.createElement('span');
                    	span.className = 'cm-tablero-piece';
                    	span.textContent = SIMBOLOS[key];
                    	span.style.cssText = 'display:flex;align-items:center;justify-content:center;font-size:2.4rem;line-height:1;color:' +
                        	(color === 'w' ? '#fff' : '#000') + ';text-shadow:' +
                        	(color === 'w' ? '0 0 2px #000,0 0 3px #000' : '0 0 2px #fff,0 0 3px #fff') + ';';
                    	sqEl.appendChild(span);
                	};
                	sqEl.appendChild(img);
            	}
            	col++;
        	}
        	if (this.chess.in_check()) {
            	const turn = this.chess.turn();
            	const boardArr = this.chess.board();
            	for (let r = 0; r < 8; r++) {
                	for (let c = 0; c < 8; c++) {
                    	const cell = boardArr[r][c];
                    	if (cell && cell.type === 'k' && cell.color === turn) {
                        	const el = this.$board.querySelector(`[data-square="${cell.square}"]`);
                        	if (el) el.classList.add('check');
                    	}
                	}
            	}
        	}
        	const hist = this.chess.history({ verbose: true });
        	if (hist.length > 0) {
            	const u = hist[hist.length - 1];
            	const f = this.$board.querySelector(`[data-square="${u.from}"]`);
            	const t = this.$board.querySelector(`[data-square="${u.to}"]`);
            	if (f) f.classList.add('last-move');
            	if (t) t.classList.add('last-move');
        	}
        	if (this.casillaSeleccionada) {
            	const s = this.$board.querySelector(`[data-square="${this.casillaSeleccionada}"]`);
            	if (s) s.classList.add('selected');
            	this.chess.moves({ square: this.casillaSeleccionada, verbose: true }).forEach(m => {
                	const el = this.$board.querySelector(`[data-square="${m.to}"]`);
                	if (el) el.classList.add(m.captured ? 'legal-capture' : 'legal-move');
            	});
        	}
    	}

    	// --------------------------------------------------------
    	// CLICK EN CASILLA
    	// --------------------------------------------------------
    	clickCasilla(sq) {
        	if (this.destroyed || this.bloqueado) return;

        	if (this.modoEdicionVariantes) {
            	this.clickCasillaEdicion(sq);
            	return;
        	}

        	if (this.esperandoRespuesta) return;
        	const modo = this.config.modo || 'ejercicio';

        	if (!this.casillaSeleccionada) {
            	const pieza = this.chess.get(sq);
            	if (!pieza) return;
            	if (pieza.color !== this.chess.turn()) return;
            	if (modo === 'ordenador' && pieza.color !== this.config.colorHumano) return;
            	this.casillaSeleccionada = sq;
            	this.dibujarPiezas();
            	return;
        	}
        	if (this.casillaSeleccionada === sq) {
            	this.casillaSeleccionada = null;
            	this.dibujarPiezas();
            	return;
        	}
        	const piezaDestino = this.chess.get(sq);
        	if (piezaDestino && piezaDestino.color === this.chess.turn()) {
            	this.casillaSeleccionada = sq;
            	this.dibujarPiezas();
            	return;
        	}
        	const movsLegales = this.chess.moves({ square: this.casillaSeleccionada, verbose: true });
        	const esLegal = movsLegales.some(m => m.to === sq);
        	if (!esLegal) {
            	const sqEl = this.$board.querySelector(`[data-square="${sq}"]`);
            	if (sqEl) {
                	sqEl.classList.add('error-shake');
                	setTimeout(() => sqEl.classList.remove('error-shake'), 300);
            	}
            	this.casillaSeleccionada = null;
            	this.dibujarPiezas();
            	return;
        	}

        	if (modo === 'ordenador') {
            	this.ejecutarMovimientoOrdenador(this.casillaSeleccionada, sq);
            	return;
        	}

        	const from = this.casillaSeleccionada;
        	const match = this.nodoActual.children.find(c =>
            	c.move.from === from && c.move.to === sq
        	);
        	if (match) {
            	const esAlt = this.nodoActual.children.indexOf(match) > 0;
            	this.chess.move({ from, to: sq, promotion: match.move.promotion });
            	this.nodoActual = match;
            	this.casillaSeleccionada = null;
            	this.dibujarPiezas();
            	this.setStatus('ok', `✅ ${match.move.san}${esAlt ? ' (alternativa)' : ''}`);
            	this.actualizarMovimientos();
            	if (this.nodoActual.children.length === 0) {
                	this.alCompletarHoja();
                	return;
            	}
            	const sigColor = this.nodoActual.children[0].move.color;
            	if (sigColor !== this.turnoInicial) {
                	this.esperandoRespuesta = true;
                	this.respuestaAutoTimeout = setTimeout(() => this.jugarRespuestaRival(), 500);
            	}
        	} else {
            	this.erroresEnCapitulo++;
            	const mv = this.chess.move({ from, to: sq, promotion: 'q' });
            	const sanRealizado = mv ? mv.san : '';
            	this.casillaSeleccionada = null;
            	this.dibujarPiezas();
            	this.actualizarMovimientos();
            	const sqEl = this.$board.querySelector(`[data-square="${sq}"]`);
            	if (sqEl) {
                	sqEl.classList.add('error-shake');
                	setTimeout(() => sqEl.classList.remove('error-shake'), 300);
            	}
            	this.setStatus('bad', `❌ ${sanRealizado} no es la mejor jugada.`);
            	const cap = this.capitulos[this.capituloActual];
            	const cambio = this.aplicarCambioELOSeguro(cap.estudio, this.capituloActual, -3, `Error en ${cap.nombre}`);
            	if (cambio !== 0) this.mostrarToast(`❌ Error · ${cambio} ELO`, 'elo-down');
            	this.bloqueado = true;
            	setTimeout(() => {
                	if (this.destroyed) return;
                	this.chess.undo();
                	this.casillaSeleccionada = null;
                	this.bloqueado = false;
                	this.dibujarPiezas();
                	this.actualizarMovimientos();
                	this.setStatus('info', 'Tu turno. Intenta otra vez.');
            	}, 1500);
        	}
    	}

    	// ⭐ Aplica ELO respetando el modo admin
    	aplicarCambioELOSeguro(estudio, capIdx, cambio, razon) {
        	if (this.esModoAdmin) {
            	console.log(`[Entrenador] ELO bloqueado (admin): ${cambio > 0 ? '+' : ''}${cambio} - ${razon}`);
            	return 0;
        	}
        	return ELO.aplicar(estudio, capIdx, cambio, razon);
    	}

    	// --------------------------------------------------------
    	// MODO EDICIÓN
    	// --------------------------------------------------------
    	clickCasillaEdicion(sq) {
        	if (!this.casillaSeleccionada) {
            	const pieza = this.chess.get(sq);
            	if (!pieza) return;
            	if (pieza.color !== this.chess.turn()) {
                	this.mostrarToast(`Mueve las ${this.chess.turn() === 'w' ? 'blancas' : 'negras'} primero`, '');
                	return;
            	}
            	this.casillaSeleccionada = sq;
            	this.dibujarPiezas();
            	return;
        	}
        	if (this.casillaSeleccionada === sq) {
            	this.casillaSeleccionada = null;
            	this.dibujarPiezas();
            	return;
        	}
        	const piezaDestino = this.chess.get(sq);
        	if (piezaDestino && piezaDestino.color === this.chess.turn()) {
            	this.casillaSeleccionada = sq;
            	this.dibujarPiezas();
            	return;
        	}
        	const movsLegales = this.chess.moves({ square: this.casillaSeleccionada, verbose: true });
        	const esLegal = movsLegales.some(m => m.to === sq);
        	if (!esLegal) {
            	const sqEl = this.$board.querySelector(`[data-square="${sq}"]`);
            	if (sqEl) {
                	sqEl.classList.add('error-shake');
                	setTimeout(() => sqEl.classList.remove('error-shake'), 300);
            	}
            	this.casillaSeleccionada = null;
            	this.dibujarPiezas();
            	return;
        	}

        	const from = this.casillaSeleccionada;
        	const mv = this.chess.move({ from, to: sq, promotion: 'q' });
        	if (!mv) return;
        	this.casillaSeleccionada = null;
        	this.historialEdicion.push({
            	from, to: sq, promotion: 'q',
            	san: mv.san, color: mv.color
        	});
        	this.dibujarPiezas();
        	this.actualizarMovimientos();
        	this.actualizarEditInfo();

        	if (this.chess.game_over()) {
            	this.setStatus('alt', '🏁 Posición final alcanzada. Puedes guardar o seguir moviendo.');
        	}
    	}

    	actualizarEditInfo() {
        	if (!this.$editInfo) return;
        	const numMov = this.historialEdicion.length;
        	if (numMov === 0) {
            	this.$editInfo.innerHTML = '✏️ <strong>MODO EDICIÓN ACTIVO</strong> — Arrastra piezas para construir la variante';
        	} else {
            	const ultimos = this.historialEdicion.slice(-3).map(h => h.san).join(' ');
            	this.$editInfo.innerHTML = `✏️ <strong>MODO EDICIÓN</strong> · ${numMov} movimiento${numMov === 1 ? '' : 's'} · Últimos: ${escapeHtml(ultimos)}`;
        	}
    	}

    	toggleModoEdicion() {
        	if (this.modoEdicionVariantes) this.desactivarModoEdicion();
        	else this.activarModoEdicion();
    	}

    	activarModoEdicion() {
        	if (!this.esModoAdmin) return;
        	this.modoEdicionVariantes = true;
        	this.historialEdicion = [];

        	const cap = this.capitulos[this.capituloActual];
        	this.chess = new Chess(cap.fen);
        	this.casillaSeleccionada = null;
        	this.dibujarPiezas();
        	this.actualizarMovimientos();

        	const wrap = this.contenedor.querySelector('.cm-tablero-wrap');
        	if (wrap) wrap.classList.add('cm-editando');
        	if (this.$modoIndicator) {
            	this.$modoIndicator.className = 'cm-tablero-modo-indicator editing';
            	this.$modoIndicator.innerHTML = '<span style="font-size:1.2rem;">✏️</span><span><strong>MODO EDICIÓN ACTIVO</strong> — movimientos libres, no afectan ELO</span>';
        	}
        	if (this.$editToolbar) this.$editToolbar.classList.add('active');
        	const btn = this.contenedor.querySelector('[data-rol="btnEditarVariantes"]');
        	if (btn) btn.innerHTML = '🔒 Desactivar modo edición';

        	this._setBotonesEjercicioDisabled(true);
        	this.actualizarEditInfo();
        	this.setStatus('alt', '✏️ Modo edición: mueve piezas libremente para construir la variante.');
    	}

    	desactivarModoEdicion(silencioso = false) {
        	this.modoEdicionVariantes = false;
        	this.historialEdicion = [];

        	const wrap = this.contenedor.querySelector('.cm-tablero-wrap');
        	if (wrap) wrap.classList.remove('cm-editando');
        	if (this.$modoIndicator) {
            	this.$modoIndicator.className = 'cm-tablero-modo-indicator normal';
            	this.$modoIndicator.innerHTML = '<span style="font-size:1.2rem;">🎯</span><span>Modo <strong>NORMAL</strong> — no afecta tu ELO</span>';
        	}
        	if (this.$editToolbar) this.$editToolbar.classList.remove('active');
        	const btn = this.contenedor.querySelector('[data-rol="btnEditarVariantes"]');
        	if (btn) btn.innerHTML = '✏️ Activar modo edición de variantes';

        	this._setBotonesEjercicioDisabled(false);

        	if (!silencioso) {
            	this.cargarCapitulo(this.capituloActual);
            	this.mostrarToast('🔒 Modo edición desactivado', '');
        	}
    	}

    	_setBotonesEjercicioDisabled(disabled) {
        	['btnPista', 'btnVerSol', 'btnPrev', 'btnNext', 'btnReiniciar'].forEach(rol => {
            	const el = this.contenedor.querySelector(`[data-rol="${rol}"]`);
            	if (el) el.disabled = disabled;
        	});
    	}

    	deshacerEdicion() {
        	if (!this.modoEdicionVariantes) return;
        	if (this.historialEdicion.length === 0) {
            	this.mostrarToast('No hay movimientos para deshacer', '');
            	return;
        	}
        	this.chess.undo();
        	this.historialEdicion.pop();
        	this.casillaSeleccionada = null;
        	this.dibujarPiezas();
        	this.actualizarMovimientos();
        	this.actualizarEditInfo();
    	}

    	descartarEdicion() {
        	if (!this.modoEdicionVariantes) return;
        	if (this.historialEdicion.length === 0) {
            	this.mostrarToast('No hay nada que descartar', '');
            	return;
        	}
        	this.abrirModalConfirmacion(
            	'⚠️ ¿Descartar la variante?',
            	'Se perderán todos los movimientos que has hecho en modo edición. ¿Continuar?',
            	() => {
                	const cap = this.capitulos[this.capituloActual];
                	this.chess = new Chess(cap.fen);
                	this.historialEdicion = [];
                	this.casillaSeleccionada = null;
                	this.dibujarPiezas();
                	this.actualizarMovimientos();
                	this.actualizarEditInfo();
                	this.mostrarToast('🗑️ Variante descartada', '');
            	}
        	);
    	}

    	guardarVarianteEdicion() {
        	if (!this.modoEdicionVariantes) return;
        	if (this.historialEdicion.length === 0) {
            	this.mostrarToast('⚠️ No hay movimientos para guardar', '');
            	return;
        	}

        	const cap = this.capitulos[this.capituloActual];
        	const fenInicial = cap.fen;
        	const nuevoCamino = [];
        	let chessTemp = new Chess(fenInicial);

        	for (const h of this.historialEdicion) {
            	const mv = chessTemp.move({ from: h.from, to: h.to, promotion: h.promotion });
            	if (!mv) continue;
            	nuevoCamino.push({
                	move: { from: mv.from, to: mv.to, promotion: mv.promotion || 'q', san: mv.san, color: mv.color },
                	fen: chessTemp.fen()
            	});
        	}

        	if (nuevoCamino.length === 0) {
            	this.mostrarToast('⚠️ No se pudieron procesar los movimientos', '');
            	return;
        	}

        	this._construirNodosDesdeCamino(nuevoCamino, this.arbol);

        	cap.arbol = this.arbol;
        	cap.numLineas = contarLineas(this.arbol);

        	this.hojasTotales = recolectarHojas(this.arbol);
        	this.actualizarVariantesEditor();
        	this.actualizarVariantesProgreso();

        	this.desactivarModoEdicion(true);

        	if (this.contexto.onGuardarVariante) {
            	try {
                	const pgnActualizado = arbolAPGN(this.arbol, cap.headersOriginales);
                	this.contexto.onGuardarVariante({
                    	capituloIdx: this.capituloActual,
                    	pgnCapitulo: pgnActualizado,
                    	nuevoNumLineas: cap.numLineas
                	});
            	} catch (e) {
                	console.error('[Entrenador] Error al notificar variante:', e);
            	}
        	}

        	this.mostrarToast(`✅ Variante guardada (${cap.numLineas} solución${cap.numLineas === 1 ? '' : 'es'})`, 'elo-up');
        	this.setStatus('ok', `✅ Variante guardada.`);
        	this.cargarCapitulo(this.capituloActual);
    	}

    	_construirNodosDesdeCamino(camino, arbolRaiz) {
        	let padre = arbolRaiz;
        	for (const paso of camino) {
            	const nuevoNodo = {
                	id: this._idCounter.next(),
                	move: paso.move,
                	fen: paso.fen,
                	children: [],
                	parent: padre
            	};
            	padre.children.push(nuevoNodo);
            	padre = nuevoNodo;
        	}
    	}

	// === FIN DE LA PARTE 2/3 ===
       	// --------------------------------------------------------
    	// RESPUESTA DEL RIVAL
    	// --------------------------------------------------------
    	jugarRespuestaRival() {
        	if (this.destroyed || !this.nodoActual || this.nodoActual.children.length === 0) return;
        	const child = this.nodoActual.children[0];
        	this.chess.move({ from: child.move.from, to: child.move.to, promotion: child.move.promotion });
        	this.nodoActual = child;
        	this.esperandoRespuesta = false;
        	this.dibujarPiezas();
        	this.actualizarMovimientos();
        	if (this.nodoActual.children.length === 0) { this.alCompletarHoja(); return; }
        	const sigColor = this.nodoActual.children[0].move.color;
        	if (sigColor !== this.turnoInicial) {
            	this.esperandoRespuesta = true;
            	this.respuestaAutoTimeout = setTimeout(() => this.jugarRespuestaRival(), 500);
        	} else {
            	this.setStatus('info', 'Tu turno.');
        	}
    	}

    	// --------------------------------------------------------
    	// COMPLETAR HOJA
    	// --------------------------------------------------------
    	alCompletarHoja() {
        	if (this.destroyed || !this.nodoActual) return;
        	this.hojasCompletadas.add(this.nodoActual.id);
        	this.actualizarVariantesProgreso();
        	const total = this.hojasTotales.length;
        	const completadas = this.hojasCompletadas.size;

        	if (completadas >= total) {
            	this.setStatus('ok', `🎉 ¡Todas las ${total} soluciones completadas!`);
            	this.capitulos[this.capituloActual].completado = true;
            	this.renderizarBarraCapitulos();

            	if (!this.eloAplicado && !this.esModoAdmin) {
                	this.eloAplicado = true;
                	const cap = this.capitulos[this.capituloActual];
                	let cambio = 15;
                	cambio -= Math.min(10, this.erroresEnCapitulo * 2);
                	cambio -= this.pistasUsadas * 3;
                	if (this.solucionVista) cambio -= 8;
                	if (total > 1) cambio += total * 2;
                	cambio = Math.max(2, cambio);
                	const cambioReal = ELO.aplicar(cap.estudio, this.capituloActual, cambio, 'Ejercicio resuelto');
                	if (cambioReal !== 0) {
                    	this.mostrarToast(`🏆 Ejercicio resuelto · +${cambioReal} ELO`, 'elo-up');
                	}
                	this.actualizarMeta();
            	} else if (this.esModoAdmin) {
                	this.mostrarToast(`✅ Ejercicio resuelto (admin · sin cambio ELO)`, '');
            	}

            	if (this.contexto.onCompletado) {
                	try { this.contexto.onCompletado(); } catch (e) {}
            	}

            	// Auto-avance (solo alumno)
            	if (this.autoAvance && !this.esModoAdmin && this.capituloActual < this.capitulos.length - 1) {
                	setTimeout(() => {
                    	if (!this.destroyed) {
                        	this.mostrarToast('⏭️ Avanzando al siguiente…', '');
                        	this.capituloSiguiente();
                    	}
                	}, 2000);
            	} else if (this.autoAvance && !this.esModoAdmin && this.capituloActual >= this.capitulos.length - 1) {
                	this.mostrarToast('🎉 ¡Último ejercicio completado!', 'elo-up');
            	}
            	return;
        	}

        	const siguiente = this.hojasTotales.find(h => !this.hojasCompletadas.has(h.id));
        	const desviacion = this.encontrarPuntoDesviacion(siguiente, this.hojasCompletadas);
        	this.setStatus('alt', `✅ ${completadas}/${total}. Quedan ${total - completadas}.`);
        	this.mostrarToast(`🌿 ¡Encuentra la solución ${completadas + 1}!`, '');
        	setTimeout(() => {
            	if (this.destroyed) return;
            	this.irANodo(desviacion || this.arbol);
            	this.setStatus('info', 'Tu turno.');
        	}, 1600);
    	}

    	encontrarPuntoDesviacion(hojaObjetivo, completadas) {
        	if (!hojaObjetivo) return this.arbol;
        	const camino = [];
        	let n = hojaObjetivo;
        	while (n && n.move) { camino.unshift(n); n = n.parent; }
        	const caminosCompletados = [];
        	this.hojasTotales.forEach(h => {
            	if (completadas.has(h.id)) {
                	const c = [];
                	let m = h;
                	while (m && m.move) { c.unshift(m); m = m.parent; }
                	caminosCompletados.push(c);
            	}
        	});
        	for (let i = 0; i < camino.length; i++) {
            	const nodo = camino[i];
            	if (!caminosCompletados.some(c => c.includes(nodo))) {
                	return nodo.parent || this.arbol;
            	}
        	}
        	return this.arbol;
    	}

    	irANodo(nodo) {
        	if (this.respuestaAutoTimeout) { clearTimeout(this.respuestaAutoTimeout); this.respuestaAutoTimeout = null; }
        	this.nodoActual = nodo;
        	this.chess = new Chess(nodo.fen);
        	this.casillaSeleccionada = null;
        	this.esperandoRespuesta = false;
        	this.dibujarPiezas();
        	this.actualizarMovimientos();
        	if (nodo.children.length > 0) {
            	const sigColor = nodo.children[0].move.color;
            	if (sigColor !== this.turnoInicial) {
                	this.esperandoRespuesta = true;
                	this.respuestaAutoTimeout = setTimeout(() => this.jugarRespuestaRival(), 700);
            	}
        	}
    	}

    	// --------------------------------------------------------
    	// MODO ORDENADOR
    	// --------------------------------------------------------
    	iniciarModoOrdenador() {
        	SF.init();
        	const turno = this.chess.turn();
        	const colorHumano = this.config.colorHumano || 'w';
        	if (turno !== colorHumano) {
            	this.setStatus('ordenador', '🤖 Stockfish piensa…');
            	this.esperandoRespuesta = true;
            	setTimeout(() => this.jugarOrdenador(), 400);
        	} else {
            	const nivel = this.config.nivelSF || 5;
            	const eloCap = ELO.obtenerCapitulo(
                	this.capitulos[this.capituloActual].estudio,
                	this.capituloActual
            	);
            	this.setStatus('ordenador',
                	`🤖 Nv${nivel} (~${ELO_BOT[nivel]} ELO) vs tú (${eloCap} ELO). Tu turno.`);
        	}
    	}

    	async ejecutarMovimientoOrdenador(from, to) {
        	const fenAntes = this.chess.fen();
        	const mv = this.chess.move({ from, to, promotion: 'q' });
        	if (!mv) return;
        	this.historialPartida.push({
            	fen: fenAntes, from, to, promotion: 'q', san: mv.san,
            	color: mv.color, esBot: false
        	});
        	this.casillaSeleccionada = null;
        	this.dibujarPiezas();
        	this.actualizarMovimientos();
        	if (this.chess.game_over()) { this.manejarFinPartida(); return; }
        	this.esperandoRespuesta = true;
        	this.setStatus('ordenador', '🤖 Stockfish piensa…');
        	setTimeout(() => this.jugarOrdenador(), 100);
    	}

    	async jugarOrdenador() {
        	if (this.destroyed) return;
        	if (this.chess.game_over()) {
            	this.esperandoRespuesta = false;
            	this.manejarFinPartida();
            	return;
        	}
        	const nivel = this.config.nivelSF || 5;
        	let movimiento = null;
        	if (SF.ready) {
            	const uci = await SF.mejorMovimiento(this.chess.fen(), nivel);
            	if (uci && uci.length >= 4) {
                	movimiento = { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : 'q' };
            	}
        	}
        	if (!movimiento) {
            	const m = this.mejorMovimientoFallback(this.chess);
            	if (m) movimiento = { from: m.from, to: m.to, promotion: m.promotion || 'q' };
        	}
        	if (!movimiento) {
            	this.esperandoRespuesta = false;
            	this.setStatus('ordenador', '🏁 Sin movimientos.');
            	return;
        	}
        	const fenAntes = this.chess.fen();
        	const mv = this.chess.move(movimiento);
        	if (!mv) { this.esperandoRespuesta = false; return; }
        	this.historialPartida.push({
            	fen: fenAntes, from: movimiento.from, to: movimiento.to,
            	promotion: movimiento.promotion || 'q', san: mv.san,
            	color: mv.color, esBot: true
        	});
        	this.esperandoRespuesta = false;
        	this.dibujarPiezas();
        	this.actualizarMovimientos();
        	if (this.chess.game_over()) { this.manejarFinPartida(); return; }
        	this.setStatus('ordenador', `🤖 Stockfish: ${mv.san}. Tu turno.`);
    	}

    	async manejarFinPartida() {
        	const cap = this.capitulos[this.capituloActual];
        	const nivel = this.config.nivelSF || 5;
        	const eloBot = ELO_BOT[nivel] || 1600;
        	const colorHumano = this.config.colorHumano || 'w';

        	let resultado, textoEstado;
        	if (this.chess.in_checkmate()) {
            	if (this.chess.turn() === colorHumano) {
                	resultado = 0; textoEstado = '😢 Jaque mate. Perdiste.';
            	} else {
                	resultado = 1; textoEstado = '🎉 ¡Jaque mate! Ganaste.';
            	}
        	} else if (this.chess.in_draw() || this.chess.in_stalemate() || this.chess.insufficient_material()) {
            	resultado = 0.5; textoEstado = '🏁 Tablas.';
        	} else {
            	resultado = 0.5; textoEstado = '🏁 Partida terminada.';
        	}

        	cap.completado = true;
        	this.renderizarBarraCapitulos();
        	this.setStatus('ordenador', textoEstado);

        	const eloActual = ELO.obtenerCapitulo(cap.estudio, this.capituloActual);
        	const cambio = ELO.calcular(eloActual, eloBot, resultado);
        	if (cambio !== 0 && !this.esModoAdmin) {
            	const cambioReal = ELO.aplicar(
                	cap.estudio, this.capituloActual, cambio,
                	`${resultado === 1 ? 'Victoria' : (resultado === 0 ? 'Derrota' : 'Tablas')} vs Nv${nivel}`
            	);
            	if (cambioReal !== 0) {
                	const tipo = cambioReal > 0 ? 'elo-up' : 'elo-down';
                	const signo = cambioReal > 0 ? '+' : '';
                	this.mostrarToast(`🏆 ${signo}${cambioReal} ELO`, tipo);
            	}
            	this.actualizarMeta();
        	} else if (this.esModoAdmin) {
            	this.mostrarToast(`${textoEstado} (admin · sin cambio ELO)`, '');
        	}

        	if (this.contexto.onCompletado) {
            	try { this.contexto.onCompletado(); } catch (e) {}
        	}
    	}

    	// --------------------------------------------------------
    	// FALLBACK MINIMAX
    	// --------------------------------------------------------
    	evaluarTablero(c) {
        	if (c.in_checkmate()) return c.turn() === 'w' ? -100000 : 100000;
        	if (c.in_draw() || c.in_stalemate()) return 0;
        	const board = c.board();
        	let score = 0;
        	for (let r = 0; r < 8; r++) {
            	for (let f = 0; f < 8; f++) {
                	const cell = board[r][f];
                	if (!cell) continue;
                	const val = VALORES[cell.type];
                	const centro = (r >= 2 && r <= 5 && f >= 2 && f <= 5) ? 10 : 0;
                	score += (cell.color === 'w' ? 1 : -1) * (val + centro);
            	}
        	}
        	return score;
    	}

    	minimax(c, depth, alpha, beta, max) {
        	if (depth === 0 || c.game_over()) return this.evaluarTablero(c);
        	const moves = c.moves({ verbose: true });
        	moves.sort((a, b) => (b.captured ? 1 : 0) - (a.captured ? 1 : 0));
        	if (max) {
            	let best = -Infinity;
            	for (const m of moves) {
                	c.move({ from: m.from, to: m.to, promotion: m.promotion || 'q' });
                	const val = this.minimax(c, depth - 1, alpha, beta, false);
                	c.undo();
                	if (val > best) best = val;
                	alpha = Math.max(alpha, best);
                	if (beta <= alpha) break;
            	}
            	return best;
        	} else {
            	let best = Infinity;
            	for (const m of moves) {
                	c.move({ from: m.from, to: m.to, promotion: m.promotion || 'q' });
                	const val = this.minimax(c, depth - 1, alpha, beta, true);
                	c.undo();
                	if (val < best) best = val;
                	beta = Math.min(beta, best);
                	if (beta <= alpha) break;
            	}
            	return best;
        	}
    	}

    	mejorMovimientoFallback(c) {
        	const moves = c.moves({ verbose: true });
        	if (!moves.length) return null;
        	const max = c.turn() === 'w';
        	let mejor = moves[0];
        	let mejorVal = max ? -Infinity : Infinity;
        	for (const m of moves) {
            	c.move({ from: m.from, to: m.to, promotion: m.promotion || 'q' });
            	const val = this.minimax(c, 2, -Infinity, Infinity, !max);
            	c.undo();
            	if ((max && val > mejorVal) || (!max && val < mejorVal)) { mejorVal = val; mejor = m; }
        	}
        	return mejor;
    	}

    	// --------------------------------------------------------
    	// ACCIONES UI
    	// --------------------------------------------------------
    	reiniciar() {
        	if (this.modoEdicionVariantes) {
            	this.mostrarToast('Desactiva el modo edición primero', '');
            	return;
        	}
        	if (this.respuestaAutoTimeout) { clearTimeout(this.respuestaAutoTimeout); this.respuestaAutoTimeout = null; }
        	this.cargarCapitulo(this.capituloActual);
    	}

    	voltear() {
        	this.orientacion = this.orientacion === 'white' ? 'black' : 'white';
        	this.construirTablero();
        	this.dibujarPiezas();
    	}

    	pista() {
        	if (this.modoEdicionVariantes) return;
        	const modo = this.config.modo || 'ejercicio';
        	if (modo !== 'ejercicio' || !this.nodoActual || this.nodoActual.children.length === 0) {
            	this.mostrarToast('No hay pista disponible', ''); return;
        	}
        	const child = this.nodoActual.children[0];
        	this.pistasUsadas++;
        	const cap = this.capitulos[this.capituloActual];
        	const cambio = this.aplicarCambioELOSeguro(cap.estudio, this.capituloActual, -3, `Pista en ${cap.nombre}`);
        	if (cambio !== 0) this.mostrarToast(`💡 Pista · ${cambio} ELO`, 'elo-down');
        	this.actualizarMeta();
        	this.setStatus('info', `💡 Pista: mueve de ${child.move.from} a ${child.move.to}`);
        	const fromEl = this.$board.querySelector(`[data-square="${child.move.from}"]`);
        	const toEl = this.$board.querySelector(`[data-square="${child.move.to}"]`);
        	if (fromEl) fromEl.classList.add('selected');
        	if (toEl) toEl.classList.add('legal-capture');
    	}

    	verSolucion() {
        	if (this.modoEdicionVariantes) return;
        	const modo = this.config.modo || 'ejercicio';
        	if (modo !== 'ejercicio') return;
        	this.abrirModalConfirmacion(
            	'⚠️ ¿Ver la solución?',
            	'Si muestras la solución, este ejercicio contará como fallido y tu ELO bajará −8 puntos. ¿Quieres continuar?',
            	() => this.ejecutarVerSolucion()
        	);
    	}

    	ejecutarVerSolucion() {
        	this.solucionVista = true;
        	this.bloqueado = true;
        	const cap = this.capitulos[this.capituloActual];
        	const cambio = this.aplicarCambioELOSeguro(cap.estudio, this.capituloActual, -8, `Solución vista en ${cap.nombre}`);
        	if (cambio !== 0) this.mostrarToast(`❌ Solución vista · ${cambio} ELO`, 'elo-down');
        	this.actualizarMeta();
        	if (this.respuestaAutoTimeout) { clearTimeout(this.respuestaAutoTimeout); this.respuestaAutoTimeout = null; }
        	this.chess = new Chess(this.arbol.fen);
        	this.nodoActual = this.arbol;
        	this.casillaSeleccionada = null;
        	this.dibujarPiezas();
        	this.setStatus('info', '▶ Reproduciendo solución de la variante en proceso…');
        	const auto = setInterval(() => {
            	if (this.destroyed) { clearInterval(auto); return; }
            	if (!this.nodoActual || this.nodoActual.children.length === 0) {
                	clearInterval(auto);
                	this.bloqueado = false;
                	this.setStatus('bad', '❌ Ejercicio fallido. Solución mostrada.');
                	return;
            	}
            	const child = this.nodoActual.children[0];
            	this.chess.move({ from: child.move.from, to: child.move.to, promotion: child.move.promotion });
            	this.nodoActual = child;
            	this.dibujarPiezas();
            	this.actualizarMovimientos();
        	}, 700);
    	}

    	// --------------------------------------------------------
    	// MODALES
    	// --------------------------------------------------------
    	abrirModalConfirmacion(titulo, mensaje, onConfirm) {
        	const overlay = document.createElement('div');
        	overlay.className = 'cm-tablero-modal-overlay';
        	overlay.innerHTML = `
            	<div class="cm-tablero-modal-content">
                	<h3>${escapeHtml(titulo)}</h3>
                	<p>${escapeHtml(mensaje)}</p>
                	<div class="cm-tablero-modal-acciones">
                    	<button class="cm-tablero-btn cm-tablero-btn-sec" data-accion="cancelar">Cancelar</button>
                    	<button class="cm-tablero-btn cm-tablero-btn-peligro" data-accion="confirmar">Sí, continuar</button>
                	</div>
            	</div>
        	`;
        	document.body.appendChild(overlay);
        	overlay.querySelector('[data-accion="cancelar"]').onclick = () => overlay.remove();
        	overlay.querySelector('[data-accion="confirmar"]').onclick = () => {
            	overlay.remove();
            	onConfirm();
        	};
        	overlay.addEventListener('click', (e) => {
            	if (e.target === overlay) overlay.remove();
        	});
    	}

    	// ⭐ NUEVO: modal con opciones (Reemplazar / Añadir)
    	abrirModalOpciones(titulo, mensaje, opciones) {
        	const overlay = document.createElement('div');
        	overlay.className = 'cm-tablero-modal-overlay';
        	const opcionesHTML = opciones.map((op, i) => `
            	<button class="cm-tablero-modal-opcion" data-op-idx="${i}">
                	<span class="cm-op-icon">${op.icon}</span>
                	<span>
                    	<span class="cm-op-titulo">${escapeHtml(op.titulo)}</span>
                    	<span class="cm-op-desc">${escapeHtml(op.desc)}</span>
                	</span>
            	</button>
        	`).join('');
        	overlay.innerHTML = `
            	<div class="cm-tablero-modal-content">
                	<h3 style="color:var(--cm-acento);">${escapeHtml(titulo)}</h3>
                	<p>${escapeHtml(mensaje)}</p>
                	<div class="cm-tablero-modal-opciones">${opcionesHTML}</div>
                	<div class="cm-tablero-modal-acciones">
                    	<button class="cm-tablero-btn cm-tablero-btn-sec" data-accion="cancelar">Cancelar</button>
                	</div>
            	</div>
        	`;
        	document.body.appendChild(overlay);
        	overlay.querySelector('[data-accion="cancelar"]').onclick = () => overlay.remove();
        	overlay.querySelectorAll('[data-op-idx]').forEach(btn => {
            	btn.onclick = () => {
                	const idx = parseInt(btn.dataset.opIdx, 10);
                	overlay.remove();
                	if (opciones[idx] && opciones[idx].action) opciones[idx].action();
            	};
        	});
        	overlay.addEventListener('click', (e) => {
            	if (e.target === overlay) overlay.remove();
        	});
    	}

    	// --------------------------------------------------------
    	// NAVEGACIÓN
    	// --------------------------------------------------------
    	capituloAnterior() {
        	if (this.modoEdicionVariantes) return;
        	if (this.capituloActual > 0) this.cargarCapitulo(this.capituloActual - 1);
    	}

    	capituloSiguiente() {
        	if (this.modoEdicionVariantes) return;
        	if (this.capituloActual < this.capitulos.length - 1) this.cargarCapitulo(this.capituloActual + 1);
    	}

    	// --------------------------------------------------------
    	// CONFIG PANEL
    	// --------------------------------------------------------
    	cambiarModo(nuevoModo) {
        	if (this.modoEdicionVariantes) return;
        	this.config.modo = nuevoModo;
        	this.sincronizarVisibilidadConfig();
        	this.mostrarToast(nuevoModo === 'ordenador' ? '🤖 Modo vs PC' : '🎯 Modo Ejercicio', '');
        	this.cargarCapitulo(this.capituloActual);
    	}
    	cambiarColor(color) {
        	if (this.modoEdicionVariantes) return;
        	this.config.colorHumano = color;
        	this.mostrarToast(`Humano: ${color === 'w' ? '♔ Blancas' : '♚ Negras'}`, '');
        	this.cargarCapitulo(this.capituloActual);
    	}
    	cambiarNivel(nivel) {
        	this.config.nivelSF = parseInt(nivel, 10);
        	this.mostrarToast(`Stockfish: Nv${nivel} (~${ELO_BOT[nivel]} ELO)`, '');
    	}
    	cambiarOrientacion(valor) {
        	if (this.modoEdicionVariantes) return;
        	this.config.orientacion = valor;
        	if (valor === 'auto') this.orientacion = this.orientacionAuto;
        	else this.orientacion = valor;
        	this.construirTablero();
        	this.dibujarPiezas();
    	}

    	// --------------------------------------------------------
    	// ACTUALIZACIONES UI
    	// --------------------------------------------------------
    	setStatus(tipo, texto) {
        	if (!this.$status) return;
        	this.$status.className = 'cm-tablero-status ' + tipo;
        	this.$status.textContent = texto;
    	}

    	actualizarMovimientos() {
        	if (!this.$moves) return;
        	const hist = this.chess.history({ verbose: true });
        	if (!hist.length) {
            	this.$moves.style.display = 'none';
            	this.$moves.innerHTML = '';
            	return;
        	}
        	this.$moves.style.display = 'block';
        	const modo = this.config.modo || 'ejercicio';
        	const colorHumano = this.config.colorHumano || 'w';
        	this.$moves.innerHTML = hist.map((m, i) => {
            	const n = Math.floor(i / 2) + 1;
            	const pre = m.color === 'w' ? `${n}.` : `${n}…`;
            	const esPC = modo === 'ordenador' && m.color !== colorHumano;
            	return `<span class="${esPC ? 'computadora' : 'done'}">${pre} ${m.san}</span>`;
        	}).join(' ');
    	}

    	actualizarProgreso() {
        	if (!this.$progressInfo) return;
        	const completados = this.capitulos.filter(c => c.completado).length;
        	this.$progressInfo.textContent =
            	`Progreso: ${completados} de ${this.capitulos.length} capítulos completados`;
        	const btnPrev = this.contenedor.querySelector('[data-rol="btnPrev"]');
        	const btnNext = this.contenedor.querySelector('[data-rol="btnNext"]');
        	if (btnPrev) btnPrev.disabled = this.capituloActual === 0 || this.modoEdicionVariantes;
        	if (btnNext) btnNext.disabled = this.capituloActual === this.capitulos.length - 1 || this.modoEdicionVariantes;
    	}

    	actualizarBotonesModo() {
        	const modo = this.config.modo || 'ejercicio';
        	const btnPista = this.contenedor.querySelector('[data-rol="btnPista"]');
        	const btnVerSol = this.contenedor.querySelector('[data-rol="btnVerSol"]');
        	const mostrar = modo === 'ejercicio';
        	if (btnPista) btnPista.style.display = mostrar ? '' : 'none';
        	if (btnVerSol) btnVerSol.style.display = mostrar ? '' : 'none';
    	}

    	actualizarVariantesEditor() {
        	if (!this.$variantesLista) return;
        	const lineas = obtenerLineasCompletas(this.arbol);
        	const countEl = this.contenedor.querySelector('[data-rol="variantesCount"]');
        	if (countEl) countEl.textContent = `${lineas.length}`;
        	this.$variantesLista.innerHTML = lineas.map((linea, idx) => {
            	const texto = linea.map((nodo, j) => {
                	const num = Math.floor(j / 2) + 1;
                	const pre = nodo.move.color === 'w' ? `${num}.` : `${num}…`;
                	return `${pre} ${nodo.move.san}`;
            	}).join(' ');
            	const esPrincipal = idx === 0;
            	const badge = esPrincipal ? '<span class="cm-badge-principal">Principal</span>' : '';
            	return `<div class="cm-tablero-variante-item">
                	<div class="cm-texto">${badge} ${escapeHtml(texto)}</div>
                	<button class="cm-btn-del" ${esPrincipal || this.modoEdicionVariantes ? 'disabled' : ''} data-variante="${idx}">${esPrincipal ? '—' : '🗑️'}</button>
            	</div>`;
        	}).join('');
        	this.$variantesLista.querySelectorAll('[data-variante]').forEach(btn => {
            	btn.addEventListener('click', () => {
                	const idx = parseInt(btn.dataset.variante, 10);
                	if (idx > 0) this.eliminarVariante(idx);
            	});
        	});
    	}

    	eliminarVariante(indiceLinea) {
        	if (this.modoEdicionVariantes) return;
        	const lineas = obtenerLineasCompletas(this.arbol);
        	if (indiceLinea <= 0 || indiceLinea >= lineas.length) {
            	this.mostrarToast('No se puede eliminar la principal', ''); return;
        	}
        	this.abrirModalConfirmacion(
            	'🗑️ Eliminar variante',
            	'¿Seguro que quieres eliminar esta variante del ejercicio? Esta acción no se puede deshacer.',
            	() => {
                	const lineaEliminar = lineas[indiceLinea];
                	let nodo = lineaEliminar[lineaEliminar.length - 1];
                	while (nodo && nodo.parent) {
                    	const padre = nodo.parent;
                    	if (padre.children.length > 1) {
                        	padre.children = padre.children.filter(c => c !== nodo);
                        	break;
                    	}
                    	if (padre === this.arbol) break;
                    	const abuelo = padre.parent;
                    	abuelo.children = abuelo.children.filter(c => c !== padre);
                    	nodo = abuelo;
                	}
                	if (this.arbol.children.length === 0) {
                    	this.mostrarToast('⚠️ No puedes eliminar todas las variantes', ''); return;
                	}
                	const cap = this.capitulos[this.capituloActual];
                	cap.arbol = this.arbol;
                	cap.numLineas = contarLineas(this.arbol);
                	this.hojasTotales = recolectarHojas(this.arbol);
                	this.actualizarVariantesEditor();
                	this.actualizarVariantesProgreso();
                	if (this.contexto.onGuardarVariante) {
                    	try {
                        	const pgnActualizado = arbolAPGN(this.arbol, cap.headersOriginales);
                        	this.contexto.onGuardarVariante({
                            	capituloIdx: this.capituloActual,
                            	pgnCapitulo: pgnActualizado,
                            	nuevoNumLineas: cap.numLineas
                        	});
                    	} catch (e) {}
                	}
                	this.mostrarToast('🗑️ Variante eliminada', '');
                	this.cargarCapitulo(this.capituloActual);
            	}
        	);
    	}

    	actualizarVariantesProgreso() {
        	if (!this.$variantsProgress) return;
        	if (!this.$variantsDots || !this.$variantsProgreso) return;
        	if (this.hojasTotales.length <= 1) {
            	this.$variantsProgress.classList.add('cm-tablero-hidden');
            	return;
        	}
        	this.$variantsProgress.classList.remove('cm-tablero-hidden');
        	this.$variantsProgreso.textContent = `${this.hojasCompletadas.size}/${this.hojasTotales.length}`;
        	this.$variantsDots.innerHTML = this.hojasTotales.map((h, i) => {
            	const done = this.hojasCompletadas.has(h.id);
            	const actual = this.nodoActual && this.nodoActual.id === h.id;
            	const clase = done ? 'done' : (actual ? 'current' : '');
            	return `<span class="cm-dot ${clase}">${i + 1}</span>`;
        	}).join('');
    	}

    	mostrarToast(msg, tipo) {
        	const t = document.createElement('div');
        	t.className = 'cm-tablero-toast show' + (tipo === 'elo-up' ? ' elo-up' : (tipo === 'elo-down' ? ' elo-down' : ''));
        	t.textContent = msg;
        	document.body.appendChild(t);
        	setTimeout(() => { t.classList.remove('show'); }, 2500);
        	setTimeout(() => { t.remove(); }, 3000);
    	}

    	// --------------------------------------------------------
    	// DESTROY
    	// --------------------------------------------------------
    	destroy() {
        	this.destroyed = true;
        	if (this.respuestaAutoTimeout) { clearTimeout(this.respuestaAutoTimeout); this.respuestaAutoTimeout = null; }
        	if (this._sfReadyHandler) {
            	document.removeEventListener('cm-tablero-sf-ready', this._sfReadyHandler);
            	this._sfReadyHandler = null;
        	}
        	// Si esta instancia había bloqueado el ELO, lo desbloqueamos
        	if (this.esModoAdmin) {
            	ELO.bloquearCambios = false;
        	}
        	this.contenedor.innerHTML = '';
    	}
	}

	// ============================================================
	// API PÚBLICA
	// ============================================================
	const instancias = new WeakMap();

	window.Entrenador = {
    	render(contenedor, config, contexto) {
        	if (!contenedor || !(contenedor instanceof HTMLElement)) {
            	console.warn('[Entrenador] Contenedor inválido'); return null;
        	}
        	if (instancias.has(contenedor)) {
            	instancias.get(contenedor).destroy();
        	}
        	try {
            	const instancia = new InstanciaTablero(contenedor, config, contexto);
            	instancias.set(contenedor, instancia);
            	return instancia;
        	} catch (e) {
            	console.error('[Entrenador] Error al renderizar:', e);
            	contenedor.innerHTML = '<div class="cm-tablero-error-msg">Error al cargar el tablero.</div>';
            	return null;
        	}
    	},

    	destroy(contenedor) {
        	if (instancias.has(contenedor)) {
            	instancias.get(contenedor).destroy();
            	instancias.delete(contenedor);
        	}
    	},

    	analizarPGN(pgn) {
        	if (!pgn || typeof pgn !== 'string') return { capitulos: 0, lineas: 0, errores: [] };
        	const idCounter = { v: 0, next() { return ++this.v; } };
        	const bloques = pgn.split(/(?=\[Event\s)/i).filter(b => b.trim());
        	let totalLineas = 0;
        	const errores = [];
        	bloques.forEach((bloque, idx) => {
            	try {
                	const headers = {};
                	const headerRegex = /\[(\w+)\s+"([^"]*)"\]/g;
                	let m;
                	while ((m = headerRegex.exec(bloque)) !== null) headers[m[1]] = m[2];
                	const fen = headers.FEN || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
                	const lineas = bloque.split('\n').filter(l => !l.trim().startsWith('['));
                	const movText = lineas.join(' ').trim();
                	if (!movText) { errores.push(idx + 1); return; }
                	const arbol = construirArbolPGN(movText, fen, idCounter);
                	totalLineas += contarLineas(arbol);
            	} catch (e) { errores.push(idx + 1); }
        	});
        	return { capitulos: bloques.length, lineas: totalLineas, errores };
    	},

    	obtenerELO() {
        	return ELO.data ? ELO.data.total : ELO_INICIAL;
    	},

    	initStockfish() {
        	SF.init();
    	},

    	reiniciarELO() {
        	ELO.default();
        	ELO.guardar();
    	},

    	// ⭐ NUEVO: control manual del bloqueo de ELO
    	bloquearELO() { ELO.bloquearCambios = true; },
    	permitirELO() { ELO.bloquearCambios = false; },

    	// ⭐ NUEVO: utilidad para reconstruir PGN
    	arbolAPGN(arbol, headers) { return arbolAPGN(arbol, headers); }
	};

	console.log('✅ Entrenador cargado (Fase 5 + pestañas + lista capítulos + fix ELO admin). API: window.Entrenador');
})();
