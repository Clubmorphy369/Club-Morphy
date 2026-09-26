/* ============================================================
   ENTRENADOR CORE — Club Morphy
   
   Contiene:
   - Constantes (PIEZAS, SIMBOLOS, ELO_*, TIEMPOS_PARTIDA, etc.)
   - Utilidades (escapeHtml, convertirUrlImagen, formatearTiempo, ...)
   - Stockfish (SF)
   - Sistema ELO
   - Parser PGN (tokenizePGN, construirArbolPGN, arbolAPGN, ...)
   - Utilidades de análisis (extraerJugadasLineales, calcularACPL, ...)
   - Clase RelojPartida
   
   Expone: window.CMEntrenadorCore
   Cargado ANTES de entrenador-tablero.js
   ============================================================ */

(function () {
    'use strict';

    const Core = window.CMEntrenadorCore = window.CMEntrenadorCore || {};

    // ⭐ Contador de instancias de tablero (estado mutable compartido)
    Core.state = { contadorInstancias: 0 };
    Core.siguienteInstanciaId = function () {
        return 'cm-' + (++Core.state.contadorInstancias);
    };

    // ============================================================
    // CONSTANTES
    // ============================================================
    Core.PIEZAS = {
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

    Core.SIMBOLOS = {
        wk: '♔', wq: '♕', wr: '♖', wb: '♗', wn: '♘', wp: '♙',
        bk: '♚', bq: '♛', br: '♜', bb: '♝', bn: '♞', bp: '♟'
    };

    Core.ELO_INICIAL = 1200;
    Core.ELO_MIN = 100;
    Core.ELO_MAX = 3000;
    Core.ELO_STORAGE_KEY = 'entrenadorEloData_v2';

    Core.MODO_EDICION_KEY = 'cm-tablero-modo-edicion-persistente';

    Core.ELO_BOT = { 1: 800, 2: 1000, 3: 1200, 4: 1400, 5: 1600, 6: 1800, 7: 2100, 8: 2400 };

    Core.NIVELES_SF = {
        1: { skill: 0, depth: 1, movetime: 50, nombre: 'Principiante' },
        2: { skill: 2, depth: 1, movetime: 100, nombre: 'Muy fácil' },
        3: { skill: 4, depth: 2, movetime: 200, nombre: 'Fácil' },
        4: { skill: 7, depth: 3, movetime: 300, nombre: 'Normal' },
        5: { skill: 10, depth: 4, movetime: 500, nombre: 'Intermedio' },
        6: { skill: 13, depth: 6, movetime: 800, nombre: 'Difícil' },
        7: { skill: 17, depth: 10, movetime: 1500, nombre: 'Muy difícil' },
        8: { skill: 20, depth: 16, movetime: 3000, nombre: 'Maestro' }
    };

    Core.VALORES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

    Core.TIEMPOS_PARTIDA = {
        'libre': { segundos: 0, incremento: 0, nombre: 'Sin límite' },
        '3+0': { segundos: 180, incremento: 0, nombre: '3 min' },
        '5+0': { segundos: 300, incremento: 0, nombre: '5 min' },
        '10+0': { segundos: 600, incremento: 0, nombre: '10 min' },
        '15+10': { segundos: 900, incremento: 10, nombre: '15 min + 10s' }
    };

    Core.CLASIFICACION_JUGADAS = {
        brillante:   { icono: '!!', color: '#22d3ee', nombre: 'Brillante',  label: 'Brillante'  },
        excelente:   { icono: '!',  color: '#16a34a', nombre: 'Excelente',  label: 'Excelente'  },
        buena:       { icono: '✓',  color: '#65a30d', nombre: 'Buena',      label: 'Buena'      },
        imprecision: { icono: '?!', color: '#f59e0b', nombre: 'Imprecisión', label: 'Imprecisión' },
        error:       { icono: '?',  color: '#ef4444', nombre: 'Error',      label: 'Error'      },
        blunder:     { icono: '??', color: '#b91c1c', nombre: 'Error grave', label: 'Error grave' },
        libro:       { icono: '📖', color: '#8b5cf6', nombre: 'Libro',      label: 'Libro'      },
        forzada:     { icono: '→',  color: '#64748b', nombre: 'Forzada',    label: 'Forzada'    }
    };

    // ============================================================
    // ICONOS SVG (estilo Word)
    // ============================================================
    Core.ICONOS_SVG = {
        alignLeft: `<svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="2.5" rx="1"/><rect x="2" y="9.5" width="12" height="2.5" rx="1"/><rect x="2" y="15" width="20" height="2.5" rx="1"/><rect x="2" y="20.5" width="12" height="2.5" rx="1"/></svg>`,
        alignCenter: `<svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="2.5" rx="1"/><rect x="6" y="9.5" width="12" height="2.5" rx="1"/><rect x="2" y="15" width="20" height="2.5" rx="1"/><rect x="6" y="20.5" width="12" height="2.5" rx="1"/></svg>`,
        alignRight: `<svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="2.5" rx="1"/><rect x="10" y="9.5" width="12" height="2.5" rx="1"/><rect x="2" y="15" width="20" height="2.5" rx="1"/><rect x="10" y="20.5" width="12" height="2.5" rx="1"/></svg>`,
        alignJustify: `<svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="2.5" rx="1"/><rect x="2" y="9.5" width="20" height="2.5" rx="1"/><rect x="2" y="15" width="20" height="2.5" rx="1"/><rect x="2" y="20.5" width="20" height="2.5" rx="1"/></svg>`,
        listBullet: `<svg viewBox="0 0 24 24"><circle cx="4" cy="6" r="1.8"/><circle cx="4" cy="12" r="1.8"/><circle cx="4" cy="18" r="1.8"/><rect x="8" y="5" width="14" height="2" rx="0.8"/><rect x="8" y="11" width="14" height="2" rx="0.8"/><rect x="8" y="17" width="14" height="2" rx="0.8"/></svg>`,
        listNumber: `<svg viewBox="0 0 24 24"><text x="2" y="7.5" font-size="6" font-weight="bold" font-family="Arial" fill="currentColor">1</text><text x="2" y="13.5" font-size="6" font-weight="bold" font-family="Arial" fill="currentColor">2</text><text x="2" y="19.5" font-size="6" font-weight="bold" font-family="Arial" fill="currentColor">3</text><rect x="8" y="5" width="14" height="2" rx="0.8"/><rect x="8" y="11" width="14" height="2" rx="0.8"/><rect x="8" y="17" width="14" height="2" rx="0.8"/></svg>`,
        indentMore: `<svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="2" rx="0.8"/><rect x="10" y="9" width="12" height="2" rx="0.8"/><rect x="10" y="14" width="12" height="2" rx="0.8"/><rect x="2" y="19" width="20" height="2" rx="0.8"/><polygon points="2,9 7,11.5 2,14"/></svg>`,
        indentLess: `<svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="2" rx="0.8"/><rect x="10" y="9" width="12" height="2" rx="0.8"/><rect x="10" y="14" width="12" height="2" rx="0.8"/><rect x="2" y="19" width="20" height="2" rx="0.8"/><polygon points="7,9 2,11.5 7,14"/></svg>`,
        bold: `<svg viewBox="0 0 24 24"><path d="M6 4h7a5 5 0 0 1 3.5 8.5A5 5 0 0 1 13 20H6V4zm4 6h3a2 2 0 0 0 0-4h-3v4zm0 8h3.5a2.5 2.5 0 0 0 0-5H10v5z"/></svg>`,
        italic: `<svg viewBox="0 0 24 24"><path d="M9 4h9v3h-3l-4 12h3v3H5v-3h3l4-12H9V4z"/></svg>`,
        underline: `<svg viewBox="0 0 24 24"><path d="M6 3v9a6 6 0 0 0 12 0V3h-2.5v9a3.5 3.5 0 0 1-7 0V3H6zM4 20h16v2H4z"/></svg>`,
        strike: `<svg viewBox="0 0 24 24"><path d="M6 8c0-2 1.5-4 5-4 2 0 3.5.5 5 2l-2 1.5c-.8-.8-1.8-1.3-3-1.3-1.8 0-2.5.8-2.5 1.8 0 .8.5 1.3 2 1.5H21v2h-8.5c-.5.3-1 .8-1 1.5 0 1.2 1 2 2.8 2 1.5 0 2.5-.5 3.5-1.3l2 1.5c-1.3 1.3-3 2-5.5 2-3.5 0-5.5-1.7-5.5-4.2 0-.8.2-1.5.6-2H3v-2h9c-1.5-.5-2-1.3-2-2.3z"/></svg>`,
        undo: `<svg viewBox="0 0 24 24"><path d="M7.5 8H14a6 6 0 0 1 0 12h-3v-2.5h3a3.5 3.5 0 0 0 0-7H7.5l3.5 3.5-1.8 1.8L3 9.5 9.2 3.3l1.8 1.8L7.5 8z"/></svg>`,
        redo: `<svg viewBox="0 0 24 24"><path d="M16.5 8H10a6 6 0 0 0 0 12h3v-2.5h-3a3.5 3.5 0 0 1 0-7h6.5l-3.5 3.5 1.8 1.8L21 9.5 14.8 3.3l-1.8 1.8L16.5 8z"/></svg>`,
        lineHorizontal: `<svg viewBox="0 0 24 24"><rect x="2" y="11" width="20" height="2" rx="1"/></svg>`,
        clearFormat: `<svg viewBox="0 0 24 24"><path d="M6 4h11l1 6h-2l-0.5-3H11l-1 8h3v3H6v-3h3l1-8H7.5L7 10H5L6 4z"/><path d="M16 14l5 5-1.5 1.5L14 15.5z"/><path d="M21 14l-5 5-1.5-1.5L19.5 12z"/></svg>`
    };

    Core.PGN_EJEMPLO = `[Event "Estudio: Capítulo 1"]
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
    Core.escapeHtml = function (s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    };

    Core.convertirUrlImagen = function (url) {
        if (!url || typeof url !== 'string') return url;
        const u = url.trim();

        let m = u.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (m) return `https://lh3.googleusercontent.com/d/${m[1]}`;

        m = u.match(/drive\.google\.com\/(?:open|uc)\?(?:[^&]*&)*id=([a-zA-Z0-9_-]+)/);
        if (m) return `https://lh3.googleusercontent.com/d/${m[1]}`;

        m = u.match(/drive\.google\.com\/thumbnail\?id=([a-zA-Z0-9_-]+)/);
        if (m) return `https://lh3.googleusercontent.com/d/${m[1]}`;

        return u;
    };

    Core.hashVariante = function (camino) {
        if (!Array.isArray(camino) || camino.length === 0) return '';
        return camino
            .filter(n => n && n.move && n.move.san)
            .map(n => n.move.san)
            .join(' ');
    };

    Core.formatearTiempo = function (segundos) {
        if (segundos < 0) segundos = 0;
        const m = Math.floor(segundos / 60);
        const s = Math.floor(segundos % 60);
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    Core.clasificarPorCPL = function (cpl, yaEstabaGanando, yaEstabaPerdiendo) {
        const factor = (yaEstabaGanando || yaEstabaPerdiendo) ? 1.5 : 1;
        if (cpl < 10) return 'brillante';
        if (cpl < 25 / factor) return 'excelente';
        if (cpl < 50 / factor) return 'buena';
        if (cpl < 100 / factor) return 'imprecision';
        if (cpl < 250 / factor) return 'error';
        return 'blunder';
    };

    Core.formatearEvaluacion = function (cp) {
        if (Math.abs(cp) >= 10000) {
            const mate = Math.round((10000 - Math.abs(cp)) / 50);
            return cp > 0 ? `#${mate}` : `-#${mate}`;
        }
        const peones = cp / 100;
        if (Math.abs(peones) < 0.05) return '0.00';
        return (peones > 0 ? '+' : '') + peones.toFixed(2);
    };

       // ============================================================
    // MOTOR DE AJEDREZ — Lozza (reemplaza a Stockfish)
    // ⚠️ Fase 3: antes era Stockfish, ahora Lozza (JS puro, ~2340 ELO)
    // Se mantiene el nombre Core.SF por compatibilidad con
    // entrenador-tablero.js (que sigue llamando a Core.SF.*).
    // ============================================================
    Core.SF = {
        worker: null,
        ready: false,
        listeners: [],
        inicializado: false,

        init() {
            if (this.worker || this.inicializado) return;
            this.inicializado = true;

            // Ruta local del motor Lozza (servido desde nuestro dominio)
            const url = window.lozzaWorkerUrl || 'assets/lozza/lozza.js';

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
                    console.error('[Entrenador] Lozza error:', e);
                });
                this.worker.postMessage('uci');
                this.worker.postMessage('setoption name Hash value 32');
            } catch (e) {
                console.error('[Entrenador] No se pudo inicializar Lozza:', e);
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
            const cfg = Core.NIVELES_SF[nivel] || Core.NIVELES_SF[5];

            this.enviar('stop');
            // Lozza usa "strength" (0-100) en lugar de "Skill Level" (0-20 de Stockfish).
            // Convertimos el skill 0-20 a strength 0-100.
            const strength = Math.round((cfg.skill / 20) * 100);
            this.enviar('setoption name strength value ' + strength);
            this.enviar('ucinewgame');
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
                this.enviar('setoption name strength value 100'); // máxima fuerza para análisis
                this.enviar('ucinewgame');
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
    // SISTEMA ELO
    // ============================================================
    Core.ELO = {
        data: null,
        bloquearCambios: false,

        cargar() {
            try {
                const raw = localStorage.getItem(Core.ELO_STORAGE_KEY);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    this.data = { total: Core.ELO_INICIAL, estudios: {}, historial: [], ...parsed };
                    if (!this.data.total) this.data.total = Core.ELO_INICIAL;
                } else {
                    this.data = { total: Core.ELO_INICIAL, estudios: {}, historial: [] };
                }
            } catch (e) {
                this.data = { total: Core.ELO_INICIAL, estudios: {}, historial: [] };
            }
        },

        guardar() {
            try { localStorage.setItem(Core.ELO_STORAGE_KEY, JSON.stringify(this.data)); } catch (e) {}
        },

        default() {
            this.data = { total: Core.ELO_INICIAL, estudios: {}, historial: [] };
        },

        obtenerCapitulo(estudio, capIdx) {
            if (!this.data.estudios[estudio]) return Core.ELO_INICIAL;
            return this.data.estudios[estudio].capitulos[capIdx] || Core.ELO_INICIAL;
        },

        aplicar(estudio, capIdx, cambio, razon) {
            if (cambio === 0) return 0;
            if (this.bloquearCambios) {
                console.log(`[Entrenador] ELO bloqueado (admin): ${cambio > 0 ? '+' : ''}${cambio} (${razon})`);
                return 0;
            }
            if (!this.data.estudios[estudio]) {
                this.data.estudios[estudio] = { elo: Core.ELO_INICIAL, capitulos: {} };
            }
            const est = this.data.estudios[estudio];
            if (!est.capitulos[capIdx]) est.capitulos[capIdx] = Core.ELO_INICIAL;
            const antes = est.capitulos[capIdx];
            let nuevo = Math.max(Core.ELO_MIN, Math.min(Core.ELO_MAX, antes + cambio));
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

            try {
                document.dispatchEvent(new CustomEvent('cm-tablero-elo-changed', {
                    detail: { total: this.data.total, cambio: cambioReal }
                }));
            } catch (e) {}

            return cambioReal;
        },

        calcular(eloActual, eloOponente, resultado) {
            const K = eloActual < 1400 ? 32 : (eloActual < 2000 ? 24 : 16);
            const esperado = 1 / (1 + Math.pow(10, (eloOponente - eloActual) / 400));
            return Math.round(K * (resultado - esperado));
        }
    };

    // ⭐ Cargar ELO al inicializar Core
    Core.ELO.cargar();

// === FIN DE LA PARTE 1/2 de entrenador-core.js ===
     // ============================================================
    // PGN PARSER
    // ============================================================
    Core.tokenizePGN = function (texto) {
        const tokens = [];
        let i = 0;
        while (i < texto.length) {
            const c = texto[i];
            if (c === '{') {
                const end = texto.indexOf('}', i);
                if (end >= 0) {
                    const contenido = texto.slice(i + 1, end).trim();
                    if (contenido) tokens.push({ type: 'comment', value: contenido });
                    i = end + 1;
                } else {
                    i = texto.length;
                }
            } else if (c === ';') {
                const end = texto.indexOf('\n', i);
                let contenido;
                if (end >= 0) {
                    contenido = texto.slice(i + 1, end).trim();
                    i = end + 1;
                } else {
                    contenido = texto.slice(i + 1).trim();
                    i = texto.length;
                }
                if (contenido) tokens.push({ type: 'comment', value: contenido });
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
    };

    Core.construirArbolPGN = function (movText, fenInicial, idCounter) {
        const tokens = Core.tokenizePGN(movText);
        const root = {
            id: idCounter.next(),
            move: null,
            fen: fenInicial,
            children: [],
            parent: null,
            comentario: ''
        };
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
            } else if (tok.type === 'comment') {
                if (currentNode && currentNode.move) {
                    if (currentNode.comentario) {
                        currentNode.comentario += ' ' + tok.value;
                    } else {
                        currentNode.comentario = tok.value;
                    }
                }
            } else if (tok.type === 'text') {
                if (/^\d+\.+$/.test(tok.value)) continue;
                if (/^(1-0|0-1|1\/2-1\/2|\*)$/.test(tok.value)) continue;
                if (/^\$\d+$/.test(tok.value)) continue;
                const san = tok.value.replace(/[?!]+$/, '');
                try {
                    const mv = currentChess.move(san);
                    if (!mv) continue;

                    const yaExiste = currentNode.children.find(c =>
                        c.move &&
                        c.move.from === mv.from &&
                        c.move.to === mv.to &&
                        (c.move.promotion || 'q') === (mv.promotion || 'q')
                    );

                    if (yaExiste) {
                        currentNode = yaExiste;
                    } else {
                        const newNode = {
                            id: idCounter.next(),
                            move: { from: mv.from, to: mv.to, promotion: mv.promotion || 'q', san: mv.san, color: mv.color },
                            fen: currentChess.fen(),
                            children: [],
                            parent: currentNode,
                            comentario: ''
                        };
                        currentNode.children.push(newNode);
                        currentNode = newNode;
                    }
                } catch (e) { /* ignorar */ }
            }
        }
        return root;
    };

    Core.limpiarArbolDuplicados = function (nodo) {
        if (!nodo.children || nodo.children.length === 0) return;
        const hijosUnicos = [];
        const vistos = new Set();
        for (const hijo of nodo.children) {
            if (!hijo.move) continue;
            const clave = `${hijo.move.from}-${hijo.move.to}-${hijo.move.promotion || 'q'}`;
            if (!vistos.has(clave)) {
                vistos.add(clave);
                hijosUnicos.push(hijo);
            }
        }
        nodo.children = hijosUnicos;
        nodo.children.forEach(Core.limpiarArbolDuplicados);
    };

    Core.recolectarHojas = function (nodo, hojas = []) {
        if (!nodo.children || nodo.children.length === 0) {
            if (nodo.move) hojas.push(nodo);
            return hojas;
        }
        nodo.children.forEach(c => Core.recolectarHojas(c, hojas));
        return hojas;
    };

    Core.contarLineas = function (nodo) {
        if (!nodo.children || nodo.children.length === 0) return 1;
        let total = 0;
        nodo.children.forEach(c => total += Core.contarLineas(c));
        return total;
    };

    Core.obtenerLineasCompletas = function (nodo, camino = [], resultado = []) {
        const nuevoCamino = nodo.move ? [...camino, nodo] : camino;
        if (!nodo.children || nodo.children.length === 0) {
            if (nuevoCamino.length > 0) resultado.push(nuevoCamino);
            return resultado;
        }
        nodo.children.forEach(c => Core.obtenerLineasCompletas(c, nuevoCamino, resultado));
        return resultado;
    };

    Core.contarComentarios = function (nodo) {
        if (!nodo) return 0;
        let total = nodo.comentario ? 1 : 0;
        if (nodo.children) {
            nodo.children.forEach(c => { total += Core.contarComentarios(c); });
        }
        return total;
    };

    Core.encontrarNodoPorCamino = function (arbol, caminoSans) {
        if (!arbol || !Array.isArray(caminoSans) || caminoSans.length === 0) return arbol;
        let actual = arbol;
        for (const san of caminoSans) {
            if (!actual.children) return null;
            const siguiente = actual.children.find(c => c.move && c.move.san === san);
            if (!siguiente) return null;
            actual = siguiente;
        }
        return actual;
    };

    // ============================================================
    // ÁRBOL A PGN
    // ============================================================
    Core.arbolAPGN = function (arbol, headers) {
        let lineas = [];
        if (headers) {
            Object.keys(headers).forEach(k => {
                lineas.push(`[${k} "${headers[k]}"]`);
            });
        }
        lineas.push('');

        function comentarioDeNodo(nodo) {
            if (!nodo || !nodo.comentario) return '';
            return `{ ${nodo.comentario} } `;
        }

        function escribirDesdeNodo(nodo, profundidad) {
            if (!nodo) return '';
            let texto = '';
            for (let i = 1; i < nodo.children.length; i++) {
                const alt = nodo.children[i];
                const num = Math.floor(profundidad / 2) + 1;
                const pre = alt.move.color === 'w' ? `${num}.` : `${num}...`;
                texto += `(${pre} ${alt.move.san} `;
                texto += comentarioDeNodo(alt);
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
            texto += comentarioDeNodo(child);

            for (let i = 1; i < nodo.children.length; i++) {
                const alt = nodo.children[i];
                texto += `(${pre} ${alt.move.san} `;
                texto += comentarioDeNodo(alt);
                texto += escribirDesdeNodo(alt, profundidad + 1);
                texto += ') ';
            }

            texto += escribirNodo(child, profundidad + 1);
            return texto;
        }

        const pgnText = escribirNodo(arbol, 0).trim() + ' *';
        lineas.push(pgnText);
        return lineas.join('\n');
    };

    // ============================================================
    // UTILIDADES DE ANÁLISIS
    // ============================================================
    Core.extraerJugadasLineales = function (arbol) {
        const jugadas = [];
        let actual = arbol;
        while (actual && actual.children && actual.children.length > 0) {
            const hijo = actual.children[0];
            jugadas.push({
                san: hijo.move.san,
                from: hijo.move.from,
                to: hijo.move.to,
                color: hijo.move.color,
                fen: hijo.fen,
                nodo: hijo
            });
            actual = hijo;
        }
        return jugadas;
    };

    Core.fenConFullmove = function (fen, fullmoveNumber, colorTurno = null) {
        const partes = fen.split(' ');
        if (partes.length >= 6) {
            partes[5] = String(fullmoveNumber);
            if (colorTurno) partes[1] = colorTurno;
        }
        return partes.join(' ');
    };

    Core.marcarJugadaConClasificacion = function (nodo, clasificacion, cpl, evalAntes, evalDespues) {
        if (!nodo) return;
        nodo._analisis = {
            clasificacion: clasificacion,
            cpl: cpl,
            evalAntes: evalAntes,
            evalDespues: evalDespues
        };
    };

    Core.sanConClasificacion = function (san, clasificacion) {
        const info = Core.CLASIFICACION_JUGADAS[clasificacion];
        if (!info) return san;
        return san + info.icono;
    };

    Core.contarClasificaciones = function (jugadasAnalizadas) {
        const conteo = {
            brillante: 0, excelente: 0, buena: 0,
            imprecision: 0, error: 0, blunder: 0,
            libro: 0, forzada: 0
        };
        jugadasAnalizadas.forEach(j => {
            if (j.clasificacion && conteo[j.clasificacion] !== undefined) {
                conteo[j.clasificacion]++;
            }
        });
        return conteo;
    };

    Core.calcularACPL = function (jugadasAnalizadas, color) {
        let sumaCPL = 0;
        let total = 0;
        jugadasAnalizadas.forEach(j => {
            if (j.color === color && j.cpl !== undefined && j.cpl !== null) {
                sumaCPL += Math.min(j.cpl, 500);
                total++;
            }
        });
        return total > 0 ? Math.round(sumaCPL / total) : 0;
    };

    // ============================================================
    // RELOJ DE PARTIDA
    // ============================================================
    Core.RelojPartida = class RelojPartida {
        constructor(segundosIniciales, incremento, onTimeout) {
            this.tiempoBlancas = segundosIniciales;
            this.tiempoNegras = segundosIniciales;
            this.incremento = incremento || 0;
            this.sinLimite = segundosIniciales === 0;
            this.onTimeout = onTimeout || null;
            this.turno = 'w';
            this.activo = false;
            this._intervalId = null;
            this._ultimoTick = 0;
            this.tiempoIncrementoPendiente = 0;
        }

        iniciar() {
            if (this.sinLimite) return;
            this.activo = true;
            this._ultimoTick = performance.now();
            this._intervalId = setInterval(() => this._tick(), 250);
        }

        detener() {
            this.activo = false;
            if (this._intervalId) {
                clearInterval(this._intervalId);
                this._intervalId = null;
            }
        }

        cambiarTurno(colorQueAcabaDeMover) {
            if (this.sinLimite) {
                this.turno = colorQueAcabaDeMover === 'w' ? 'b' : 'w';
                return;
            }

            if (this.incremento > 0) {
                if (colorQueAcabaDeMover === 'w') {
                    this.tiempoBlancas += this.incremento;
                } else {
                    this.tiempoNegras += this.incremento;
                }
            }

            this.turno = colorQueAcabaDeMover === 'w' ? 'b' : 'w';
            this._ultimoTick = performance.now();

            if (!this.activo) {
                this.activo = true;
                if (this._intervalId) clearInterval(this._intervalId);
                this._intervalId = setInterval(() => this._tick(), 250);
            }
        }

        _tick() {
            if (!this.activo || this.sinLimite) return;
            const ahora = performance.now();
            const delta = (ahora - this._ultimoTick) / 1000;
            this._ultimoTick = ahora;

            if (this.turno === 'w') {
                this.tiempoBlancas -= delta;
                if (this.tiempoBlancas <= 0) {
                    this.tiempoBlancas = 0;
                    this.detener();
                    if (this.onTimeout) this.onTimeout('w');
                }
            } else {
                this.tiempoNegras -= delta;
                if (this.tiempoNegras <= 0) {
                    this.tiempoNegras = 0;
                    this.detener();
                    if (this.onTimeout) this.onTimeout('b');
                }
            }
        }

        obtenerTiempo(color) {
            return color === 'w' ? this.tiempoBlancas : this.tiempoNegras;
        }

        obtenerTiempoFormateado(color) {
            if (this.sinLimite) return '∞';
            const t = this.obtenerTiempo(color);
            return Core.formatearTiempo(Math.ceil(t));
        }
    };

    console.log('✅ CMEntrenadorCore cargado (constantes + utilidades + SF + ELO + PGN + RelojPartida)');
})();
