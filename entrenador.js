/* ============================================================
   ENTRENADOR DE AJEDREZ — Club Morphy
   Fase 5 + Editor con pestañas + Lista de capítulos + Fix ELO admin
   + Autoguardado de variantes + Menú contextual + Importar Lichess
   + Reset ELO + Badge en header

   ⭐ v9 — Cambios:
     - Progreso por variante (persistido en Firestore)
     - Modo edición persistente para admin
     - Renombrar capítulos
     - Conversión automática de URLs de Google Drive
     - Comentarios en jugadas (clic derecho, estilo Lichess)

   ⭐ v12 — Cambios:
     - Reloj de partida (5 min / 10 min / sin límite)
     - Botón Deshacer en modo ordenador
     - Botón Compartir (exporta PGN de la partida)
     - Análisis post-partida tipo Lichess (brillante, error, imprecisión…)
     - Modo "Sala libre" para jugar partidas sueltas vs IA

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

    // ⭐ Clave para persistir el modo edición del admin
    const MODO_EDICION_KEY = 'cm-tablero-modo-edicion-persistente';

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

    // ⭐ v12: Opciones de tiempo de partida
    const TIEMPOS_PARTIDA = {
        'libre': { segundos: 0, incremento: 0, nombre: 'Sin límite' },
        '3+0': { segundos: 180, incremento: 0, nombre: '3 min' },
        '5+0': { segundos: 300, incremento: 0, nombre: '5 min' },
        '10+0': { segundos: 600, incremento: 0, nombre: '10 min' },
        '15+10': { segundos: 900, incremento: 10, nombre: '15 min + 10s' }
    };

    // ⭐ v12: Clasificaciones de jugadas para análisis post-partida
    const CLASIFICACION_JUGADAS = {
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
    const ICONOS_SVG = {
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

    function convertirUrlImagen(url) {
        if (!url || typeof url !== 'string') return url;
        const u = url.trim();

        let m = u.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (m) return `https://lh3.googleusercontent.com/d/${m[1]}`;

        m = u.match(/drive\.google\.com\/(?:open|uc)\?(?:[^&]*&)*id=([a-zA-Z0-9_-]+)/);
        if (m) return `https://lh3.googleusercontent.com/d/${m[1]}`;

        m = u.match(/drive\.google\.com\/thumbnail\?id=([a-zA-Z0-9_-]+)/);
        if (m) return `https://lh3.googleusercontent.com/d/${m[1]}`;

        return u;
    }

    function hashVariante(camino) {
        if (!Array.isArray(camino) || camino.length === 0) return '';
        return camino
            .filter(n => n && n.move && n.move.san)
            .map(n => n.move.san)
            .join(' ');
    }

    // ⭐ v12: Formatea segundos en MM:SS
    function formatearTiempo(segundos) {
        if (segundos < 0) segundos = 0;
        const m = Math.floor(segundos / 60);
        const s = Math.floor(segundos % 60);
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    // ⭐ v12: Clasifica una jugada según su pérdida en centipeones
    // Contexto: 0 = posición normal, 1 = ya estaba ganando, 2 = ya estaba perdiendo
    function clasificarPorCPL(cpl, yaEstabaGanando, yaEstabaPerdiendo) {
        // Si ya estaba ganando o perdiendo por mucho, la clasificación es más indulgente
        const factor = (yaEstabaGanando || yaEstabaPerdiendo) ? 1.5 : 1;

        if (cpl < 10) return 'brillante';
        if (cpl < 25 / factor) return 'excelente';
        if (cpl < 50 / factor) return 'buena';
        if (cpl < 100 / factor) return 'imprecision';
        if (cpl < 250 / factor) return 'error';
        return 'blunder';
    }

    // ⭐ v12: Convierte evaluación de Stockfish (cp) a string legible
    function formatearEvaluacion(cp) {
        if (Math.abs(cp) >= 10000) {
            const mate = Math.round((10000 - Math.abs(cp)) / 50);
            return cp > 0 ? `#${mate}` : `-#${mate}`;
        }
        const peones = cp / 100;
        if (Math.abs(peones) < 0.05) return '0.00';
        return (peones > 0 ? '+' : '') + peones.toFixed(2);
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
    // SISTEMA ELO (bloqueo en modo admin + evento global)
    // ============================================================
    const ELO = {
        data: null,
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

    ELO.cargar();

    // === FIN DE LA PARTE 1/4 ===
     // ============================================================
    // PGN PARSER (con soporte de comentarios { texto })
    // ============================================================
    function tokenizePGN(texto) {
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
    }

    function construirArbolPGN(movText, fenInicial, idCounter) {
        const tokens = tokenizePGN(movText);
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
    }

    function limpiarArbolDuplicados(nodo) {
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
        nodo.children.forEach(limpiarArbolDuplicados);
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

    function contarComentarios(nodo) {
        if (!nodo) return 0;
        let total = nodo.comentario ? 1 : 0;
        if (nodo.children) {
            nodo.children.forEach(c => { total += contarComentarios(c); });
        }
        return total;
    }

    function encontrarNodoPorCamino(arbol, caminoSans) {
        if (!arbol || !Array.isArray(caminoSans) || caminoSans.length === 0) return arbol;
        let actual = arbol;
        for (const san of caminoSans) {
            if (!actual.children) return null;
            const siguiente = actual.children.find(c => c.move && c.move.san === san);
            if (!siguiente) return null;
            actual = siguiente;
        }
        return actual;
    }

    // ============================================================
    // ÁRBOL A PGN (incluye comentarios al exportar)
    // ============================================================
    function arbolAPGN(arbol, headers) {
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
    }

    // ============================================================
    // ⭐ v12: UTILIDADES PARA ANÁLISIS POST-PARTIDA
    // ============================================================

    // Extrae la lista lineal de jugadas (movimientos de la partida en orden)
    // desde un árbol PGN (rama principal). Devuelve [{ san, fen, nodo }]
    function extraerJugadasLineales(arbol) {
        const jugadas = [];
        let actual = arbol;
        while (actual && actual.children && actual.children.length > 0) {
            const hijo = actual.children[0]; // rama principal
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
    }

    // Convierte un FEN con contador de jugada ajustado para evaluación
    function fenConFullmove(fen, fullmoveNumber, colorTurno = null) {
        const partes = fen.split(' ');
        if (partes.length >= 6) {
            partes[5] = String(fullmoveNumber);
            if (colorTurno) partes[1] = colorTurno;
        }
        return partes.join(' ');
    }

    // Añade una jugada clasificada a un nodo del árbol
    // (para guardarla en el análisis temporal)
    function marcarJugadaConClasificacion(nodo, clasificacion, cpl, evalAntes, evalDespues) {
        if (!nodo) return;
        nodo._analisis = {
            clasificacion: clasificacion,
            cpl: cpl,
            evalAntes: evalAntes,
            evalDespues: evalDespues
        };
    }

    // Devuelve el símbolo SAN con el icono de clasificación (para mostrar en PGN)
    function sanConClasificacion(san, clasificacion) {
        const info = CLASIFICACION_JUGADAS[clasificacion];
        if (!info) return san;
        return san + info.icono;
    }

    // Cuenta las clasificaciones de un análisis (para el resumen final)
    function contarClasificaciones(jugadasAnalizadas) {
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
    }

    // Calcula el ACPL (Average Centipawn Loss) de un jugador
    function calcularACPL(jugadasAnalizadas, color) {
        let sumaCPL = 0;
        let total = 0;
        jugadasAnalizadas.forEach(j => {
            if (j.color === color && j.cpl !== undefined && j.cpl !== null) {
                sumaCPL += Math.min(j.cpl, 500); // cap a 500 para no distorsionar
                total++;
            }
        });
        return total > 0 ? Math.round(sumaCPL / total) : 0;
    }

    // ============================================================
    // ⭐ v12: RELOJ DE PARTIDA
    // ============================================================
    class RelojPartida {
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

            // Para el incremento de tiempo
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
            if (this.sinLimite || !this.activo) {
                this.turno = colorQueAcabaDeMover === 'w' ? 'b' : 'w';
                return;
            }

            // Aplicar incremento al jugador que acaba de mover
            if (this.incremento > 0) {
                if (colorQueAcabaDeMover === 'w') {
                    this.tiempoBlancas += this.incremento;
                } else {
                    this.tiempoNegras += this.incremento;
                }
            }

            this.turno = colorQueAcabaDeMover === 'w' ? 'b' : 'w';
            this._ultimoTick = performance.now();
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
            return formatearTiempo(Math.ceil(t));
        }
    }

    // === FIN DE LA PARTE 2/4 ===
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

            // Auto-avance (alumnos)
            this.autoAvance = false;

            // Editor de variantes (admin)
            this.modoEdicionVariantes = false;
            this.historialEdicion = [];

            // Modo edición persistente
            this.modoEdicionPersistente = false;
            try {
                this.modoEdicionPersistente =
                    localStorage.getItem(MODO_EDICION_KEY) === 'true';
            } catch (e) { /* ignorar */ }

            // Progreso por variante
            this.progresoVariantes = new Set();
            this.claseIdContexto = this.contexto.claseId || null;
            this.temaIdContexto = this.contexto.temaId || null;
            this.bloqueIdContexto = this.contexto.bloqueId || null;

            // ⭐ v12: Sala libre (jugar vs IA sin PGN de estudio)
            this.esSalaLibre = !!this.config.esSalaLibre;

            // ⭐ v12: Reloj de partida
            this.tiempoConfig = this.config.tiempo || 'libre';
            this.reloj = null;

            // ⭐ v12: Historial de la partida vs PC para análisis
            this.historialCompletoPartida = [];
            // Formato: [{ san, from, to, fenAntes, fenDespues, color, esHumano }]

            // ⭐ v12: Estado del análisis post-partida
            this.analisis = null; // { jugadas: [], acplHumano, acplPC, conteoHumano, conteoPC, precision }
            this.analizando = false;

            // Callbacks externos
            this.onGuardarPGN = this.contexto.onGuardarPGN || null;
            this.onEliminarCapitulo = this.contexto.onEliminarCapitulo || null;
            this.onGuardarVariante = this.contexto.onGuardarVariante || null;
            this.onGuardarProgresoVariante = this.contexto.onGuardarProgresoVariante || null;
            this.onGuardarProgresoCapCompleto = this.contexto.onGuardarProgresoCapCompleto || null;
            this.onRenombrarCapitulo = this.contexto.onRenombrarCapitulo || null;
            // ⭐ v12: Callback cuando termina una partida en sala libre
            this.onFinPartida = this.contexto.onFinPartida || null;

            // ID counter
            this._idCounter = { v: 0, next() { return ++this.v; } };

            this.init();
        }

        // --------------------------------------------------------
        // INIT
        // --------------------------------------------------------
        init() {
            const cfg = this.config;

            // ⭐ v12: Si es sala libre, no cargamos capítulos de PGN,
            // creamos una partida desde el inicio estándar
            if (this.esSalaLibre) {
                this._initSalaLibre();
                return;
            }

            if (cfg.pgn) this.cargarCapitulosDesdePGN(cfg.pgn);

            if (this.capitulos.length === 0) {
                this.contenedor.innerHTML =
                    '<div class="cm-tablero-error-msg">⚠️ No se pudieron cargar capítulos del PGN.</div>';
                return;
            }

            this.construirEstructuraHTML();
            this.cargarCapitulo(0);
            if (cfg.modo === 'ordenador') SF.init();

            // Activar modo edición persistente si aplica
            if (this.esModoAdmin && this.modoEdicionPersistente) {
                setTimeout(() => {
                    if (!this.destroyed && !this.modoEdicionVariantes) {
                        this.activarModoEdicion();
                        this.mostrarToast('✏️ Modo edición persistente activado', '');
                    }
                }, 300);
            }
        }

        // ⭐ v12: Inicialización especial para sala libre (jugar vs IA)
        _initSalaLibre() {
            this.modoSalaLibre = true;

            // Crear tablero inicial
            this.chess = new Chess();

            // Inicializar reloj
            const cfgTiempo = TIEMPOS_PARTIDA[this.tiempoConfig] || TIEMPOS_PARTIDA['libre'];
            this.reloj = new RelojPartida(
                cfgTiempo.segundos,
                cfgTiempo.incremento,
                (color) => this._onTimeoutReloj(color)
            );

            this.historialCompletoPartida = [];
            this.capitulos = [{
                index: 0,
                nombre: 'Partida libre',
                estudio: 'vs IA',
                fen: this.chess.fen(),
                arbol: null,
                numLineas: 1,
                completado: false,
                orientacionAuto: 'white',
                headersOriginales: {}
            }];
            this.capituloActual = 0;

            this.construirEstructuraHTML();
            this.construirTablero();
            this.dibujarPiezas();
            this.actualizarMovimientosSalaLibre();
            this.actualizarRelojUI();
            this.actualizarBotonesModo();

            // Inicializar Stockfish
            SF.init();

            // Determinar quién empieza
            const colorHumano = this.config.colorHumano || 'w';
            this.colorHumano = colorHumano;
            this.orientacion = colorHumano === 'w' ? 'white' : 'black';

           // ⭐ v13: Iniciar el reloj SIEMPRE (independientemente de quién empiece)
if (this.reloj && !this.reloj.sinLimite) {
    setTimeout(() => {
        if (!this.destroyed && this.reloj) this.reloj.iniciar();
    }, 100);
}

if (this.chess.turn() !== colorHumano) {
    // Empieza la PC
    this.setStatus('ordenador', '🤖 Stockfish piensa…');
    this.esperandoRespuesta = true;
    setTimeout(() => this.jugarOrdenador(), 600);
} else {
    const nivel = this.config.nivelSF || 5;
    const eloHumano = ELO.data ? ELO.data.total : ELO_INICIAL;
    this.setStatus('ordenador',
        `🤖 Nv${nivel} (~${ELO_BOT[nivel]} ELO) vs tú (${eloHumano} ELO). Tu turno.`);
}
        }

        // --------------------------------------------------------
        // CONSTRUIR ESTRUCTURA HTML
        // --------------------------------------------------------
        construirEstructuraHTML() {
            const esAdmin = this.esModoAdmin;
            const esSalaLibre = this.esSalaLibre;

            // En sala libre, no mostramos editor de bloques ni capítulos
            const headerExtra = esSalaLibre ? this._htmlHeaderSalaLibre() : '';

            this.contenedor.innerHTML = `
                <div class="cm-tablero-wrap ${esSalaLibre ? 'cm-sala-libre' : ''}">
                    <div class="cm-tablero-game">
                        <div>
                            ${headerExtra}
                            <div class="cm-tablero-board-wrap">
                                <div class="cm-tablero-board" data-rol="board"></div>
                            </div>
                            <div class="cm-tablero-progress-info" data-rol="progressInfo"></div>

                            ${!esSalaLibre ? `
                            <div class="cm-tablero-capitulos-bar" data-rol="capitulosBar">
                                <div class="cm-tablero-capitulos-titulo">
                                    <span>📚 Capítulos del ejercicio</span>
                                    <span class="cm-progreso-caps" data-rol="capsProgreso">0/0</span>
                                </div>
                                <div class="cm-tablero-capitulos-lista" data-rol="capsLista"></div>
                            </div>
                            ` : ''}
                        </div>

                        <div class="cm-tablero-panel">
                            <div class="cm-tablero-meta" data-rol="meta"></div>

                            ${esSalaLibre ? this._htmlPanelSalaLibre() : `
                            ${esAdmin ? `
                            <div class="cm-tablero-modo-indicator normal" data-rol="modoIndicator">
                                <span style="font-size:1.2rem;">🎯</span>
                                <span>Modo <strong>NORMAL</strong> — no afecta tu ELO</span>
                            </div>

                            <div class="cm-tablero-row" style="margin-bottom:10px;">
                                <button class="cm-tablero-btn-admin" data-rol="btnEditarVariantes" style="width:100%;">
                                    ✏️ Activar modo edición de variantes
                                </button>
                            </div>

                            <div class="cm-tablero-persist-check" data-rol="persistCheckWrap">
                                <input type="checkbox" id="${this.idInstancia}-persist" data-rol="persistCheck">
                                <label for="${this.idInstancia}-persist">
                                    🔒 Mantener modo edición siempre activo
                                </label>
                            </div>

                            <div class="cm-tablero-edit-toolbar" data-rol="editToolbar">
                                <div class="cm-tablero-edit-info" data-rol="editInfo">
                                    ✏️ <strong>MODO EDICIÓN ACTIVO</strong> — Los movimientos se guardan automáticamente
                                </div>
                                <button class="cm-tablero-btn cm-tablero-btn-sec" data-rol="btnDeshacerEdicion">
                                    ↩️ Deshacer
                                </button>
                                <button class="cm-tablero-btn cm-tablero-btn-peligro" data-rol="btnDescartarEdicion">
                                    🗑️ Descartar y salir
                                </button>
                            </div>
                            ` : ''}

                            <div class="cm-tablero-status info" data-rol="status">Cargando…</div>

                            <div class="cm-tablero-moves cm-tablero-hidden" data-rol="moves"></div>

                            ${!esAdmin ? `
                            <div class="cm-tablero-auto-avance" data-rol="autoAvancePanel">
                                <input type="checkbox" id="${this.idInstancia}-autoAvance" data-rol="autoAvanceCheck">
                                <label for="${this.idInstancia}-autoAvance">Avanzar al siguiente ejercicio automáticamente</label>
                            </div>
                            ` : ''}

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
                            <div class="cm-tablero-admin-block-panel" data-rol="adminBlockPanel">
                                <div class="cm-tablero-tabs" data-rol="adminTabs">
                                    <button class="cm-tablero-tab active" data-tab="pgn">📋 PGN & Capítulos</button>
                                    <button class="cm-tablero-tab" data-tab="config">⚙️ Configuración</button>
                                    <button class="cm-tablero-tab" data-tab="variantes">🌿 Variantes</button>
                                </div>

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

                                    <label class="cm-tablero-admin-field-label" style="margin-top:14px;">🔗 Importar desde Lichess</label>
                                    <div style="display:flex; gap:6px; flex-wrap:wrap;">
                                        <input type="url" placeholder="https://lichess.org/study/..." data-rol="inputLichessURL" class="cm-tablero-admin-input" style="flex:1; min-width:200px;">
                                        <button class="cm-tablero-admin-upload-btn" data-rol="btnImportarLichess">
                                            📥 Importar
                                        </button>
                                    </div>

                                    <label class="cm-tablero-admin-field-label" style="margin-top:14px;">🗑️ Gestión de ELO</label>
                                    <button class="cm-tablero-admin-upload-btn" data-rol="btnResetELO" style="border-color:#dc2626; color:#dc2626;">
                                        🔄 Resetear ELO de este dispositivo
                                    </button>

                                    <label class="cm-tablero-admin-field-label" style="margin-top:14px;">
                                        📚 Capítulos detectados (<span data-rol="numCaps">0</span>):
                                    </label>
                                    <div class="cm-tablero-admin-capitulos-list" data-rol="adminCapsLista">
                                        <div style="padding:12px; text-align:center; color:var(--cm-texto-suave); font-size:0.8rem;">
                                            Pega un PGN arriba para ver los capítulos.
                                        </div>
                                    </div>
                                </div>

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
                            `}
                        </div>
                    </div>
                </div>
            `;

            this._guardarReferenciasDOM();
            this._configurarSelectsIniciales();
            this._configurarEventos();

            this.actualizarEstadoMotor();
            if (!esSalaLibre) this.renderizarBarraCapitulos();
        }

        // ⭐ v12: HTML del header para sala libre (reloj arriba del tablero)
        _htmlHeaderSalaLibre() {
            return `
            <div class="cm-sala-libre-header">
                <div class="cm-reloj cm-reloj-pc" data-rol="relojPC">
                    <span class="cm-reloj-icono">🤖</span>
                    <span class="cm-reloj-label" data-rol="relojLabelPC">IA</span>
                    <span class="cm-reloj-tiempo" data-rol="relojTiempoPC">--:--</span>
                </div>
                <div class="cm-reloj cm-reloj-tu" data-rol="relojHumano">
                    <span class="cm-reloj-icono">👤</span>
                    <span class="cm-reloj-label" data-rol="relojLabelHumano">Tú</span>
                    <span class="cm-reloj-tiempo" data-rol="relojTiempoHumano">--:--</span>
                </div>
            </div>`;
        }

        // ⭐ v12: HTML del panel para sala libre
        _htmlPanelSalaLibre() {
            const nivel = this.config.nivelSF || 5;
            const eloBot = ELO_BOT[nivel] || 1600;
            const eloHumano = ELO.data ? ELO.data.total : ELO_INICIAL;
            return `
            <div class="cm-tablero-modo-indicator normal cm-sala-libre-indicator" data-rol="modoIndicator">
                <span style="font-size:1.2rem;">🎮</span>
                <span>Partida vs <strong>IA Nv${nivel}</strong> (~${eloBot} ELO) · Tú: ${eloHumano} ELO</span>
            </div>

            <div class="cm-tablero-status info" data-rol="status">Preparando partida…</div>

            <div class="cm-sala-libre-movs-wrap">
                <div class="cm-tablero-moves cm-sala-libre-movs" data-rol="moves"></div>
            </div>

            <div class="cm-tablero-row cm-sala-libre-botones">
                <button class="cm-tablero-btn cm-tablero-btn-sec" data-rol="btnDeshacerPartida" title="Retroceder una jugada">
                    ↩️ Deshacer
                </button>
                <button class="cm-tablero-btn cm-tablero-btn-sec" data-rol="btnVoltear" title="Girar tablero">
                    🔄 Voltear
                </button>
            </div>
            <div class="cm-tablero-row cm-sala-libre-botones">
                <button class="cm-tablero-btn cm-tablero-btn-sec" data-rol="btnReiniciar" title="Nueva partida">
                    ⟲ Nueva partida
                </button>
                <button class="cm-tablero-btn cm-tablero-btn-sec" data-rol="btnCompartir" title="Copiar PGN de la partida">
                    📋 Compartir
                </button>
            </div>
            <div class="cm-tablero-row cm-sala-libre-botones">
                <button class="cm-tablero-btn cm-tablero-btn-peligro" data-rol="btnSalirSalaLibre" style="width:100%;">
                    ✕ Salir de la sala
                </button>
            </div>

            <div class="cm-sala-libre-analisis cm-tablero-hidden" data-rol="panelAnalisis">
                <!-- Se llena tras terminar la partida -->
            </div>`;
        }

        // --------------------------------------------------------
        // Referencias DOM (agrupadas)
        // --------------------------------------------------------
        _guardarReferenciasDOM() {
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
            this.$variantesLista = this.contenedor.querySelector('[data-rol="variantesLista"]');
            this.$variantsProgress = this.contenedor.querySelector('[data-rol="variantsProgress"]');
            this.$variantsDots = this.contenedor.querySelector('[data-rol="variantsDots"]');
            this.$variantsProgreso = this.contenedor.querySelector('[data-rol="variantsProgreso"]');
            this.$adminTabs = this.contenedor.querySelectorAll('[data-rol="adminTabs"] .cm-tablero-tab');
            this.$adminTabContents = this.contenedor.querySelectorAll('[data-tab-content]');
            this.$persistCheck = this.contenedor.querySelector('[data-rol="persistCheck"]');

            // ⭐ v12: Referencias de sala libre
            this.$relojPC = this.contenedor.querySelector('[data-rol="relojPC"]');
            this.$relojHumano = this.contenedor.querySelector('[data-rol="relojHumano"]');
            this.$relojTiempoPC = this.contenedor.querySelector('[data-rol="relojTiempoPC"]');
            this.$relojTiempoHumano = this.contenedor.querySelector('[data-rol="relojTiempoHumano"]');
            this.$panelAnalisis = this.contenedor.querySelector('[data-rol="panelAnalisis"]');
        }

        _configurarSelectsIniciales() {
            const selModo = this.contenedor.querySelector('[data-rol="configModo"]');
            const selColor = this.contenedor.querySelector('[data-rol="configColor"]');
            const selNivel = this.contenedor.querySelector('[data-rol="configNivel"]');
            const selOrient = this.contenedor.querySelector('[data-rol="configOrientacion"]');
            if (selModo) selModo.value = this.config.modo || 'ejercicio';
            if (selColor) selColor.value = this.config.colorHumano || 'w';
            if (selNivel) selNivel.value = this.config.nivelSF || 5;
            if (selOrient) selOrient.value = this.config.orientacion || 'auto';
        }

        _configurarEventos() {
            const esAdmin = this.esModoAdmin;
            const esSalaLibre = this.esSalaLibre;

            // Botones comunes
            this._on('[data-rol="btnVoltear"]', 'click', () => this.voltear());

            // ⭐ v12: Sala libre tiene botones propios
            if (esSalaLibre) {
                this._on('[data-rol="btnDeshacerPartida"]', 'click', () => this.deshacerPartida());
                this._on('[data-rol="btnReiniciar"]', 'click', () => this.reiniciarPartidaLibre());
                this._on('[data-rol="btnCompartir"]', 'click', () => this.compartirPartidaPGN());
                this._on('[data-rol="btnSalirSalaLibre"]', 'click', () => this._salirSalaLibre());
                return;
            }

            // Botones clásicos (modo estudio)
            this._on('[data-rol="btnReiniciar"]', 'click', () => this.reiniciar());
            this._on('[data-rol="btnPista"]', 'click', () => this.pista());
            this._on('[data-rol="btnVerSol"]', 'click', () => this.verSolucion());
            this._on('[data-rol="btnPrev"]', 'click', () => this.capituloAnterior());
            this._on('[data-rol="btnNext"]', 'click', () => this.capituloSiguiente());

            if (!esAdmin) {
                this._on('[data-rol="autoAvanceCheck"]', 'change', (e) => {
                    this.autoAvance = e.target.checked;
                    this.mostrarToast(e.target.checked ? '✅ Auto-avance activado' : '⏸️ Auto-avance desactivado', '');
                });
            }

            if (esAdmin) {
                if (this.$persistCheck) {
                    this.$persistCheck.checked = this.modoEdicionPersistente;
                    this.$persistCheck.addEventListener('change', (e) => {
                        this.modoEdicionPersistente = e.target.checked;
                        try {
                            localStorage.setItem(MODO_EDICION_KEY, e.target.checked ? 'true' : 'false');
                        } catch (err) { /* ignorar */ }
                        this.mostrarToast(
                            e.target.checked
                                ? '🔒 Modo edición persistente activado'
                                : '🔓 Modo edición persistente desactivado',
                            ''
                        );
                    });
                }

                this._on('[data-rol="btnEditarVariantes"]', 'click', () => this.toggleModoEdicion());
                this._on('[data-rol="btnDeshacerEdicion"]', 'click', () => this.deshacerEdicion());
                this._on('[data-rol="btnDescartarEdicion"]', 'click', () => this.descartarEdicion());

                this.$adminTabs.forEach(tab => {
                    tab.addEventListener('click', () => {
                        this.$adminTabs.forEach(t => t.classList.remove('active'));
                        this.$adminTabContents.forEach(c => c.classList.remove('active'));
                        tab.classList.add('active');
                        const target = this.contenedor.querySelector(`[data-tab-content="${tab.dataset.tab}"]`);
                        if (target) target.classList.add('active');
                        try { localStorage.setItem('cm-tablero-ultima-tab', tab.dataset.tab); } catch (e) {}
                    });
                });
                try {
                    const ultimaTab = localStorage.getItem('cm-tablero-ultima-tab');
                    if (ultimaTab) {
                        const tabEl = this.contenedor.querySelector(`[data-rol="adminTabs"] .cm-tablero-tab[data-tab="${ultimaTab}"]`);
                        if (tabEl) tabEl.click();
                    }
                } catch (e) {}

                this._on('[data-rol="btnGuardarPGN"]', 'click', () => this.guardarPGN());

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

                this._on('[data-rol="btnImportarLichess"]', 'click', () => this.importarDesdeLichess());
                this._on('[data-rol="btnResetELO"]', 'click', () => this.resetearELO());
                this._on('[data-rol="configModo"]', 'change', (e) => this.cambiarModo(e.target.value));
                this._on('[data-rol="configColor"]', 'change', (e) => this.cambiarColor(e.target.value));
                this._on('[data-rol="configNivel"]', 'change', (e) => this.cambiarNivel(e.target.value));
                this._on('[data-rol="configOrientacion"]', 'change', (e) => this.cambiarOrientacion(e.target.value));

                if (this.$pgnTextarea) {
                    let debounceTimer;
                    this.$pgnTextarea.addEventListener('input', () => {
                        clearTimeout(debounceTimer);
                        debounceTimer = setTimeout(() => this.actualizarListaAdminCaps(), 400);
                    });
                    setTimeout(() => this.actualizarListaAdminCaps(), 100);
                }

                this.sincronizarVisibilidadConfig();
            }

            document.addEventListener('cm-tablero-sf-ready', this._sfReadyHandler = () => {
                this.actualizarEstadoMotor();
            });
        }

        _on(selector, evento, handler) {
            const el = this.contenedor.querySelector(selector);
            if (el) el.addEventListener(evento, handler);
        }

        // --------------------------------------------------------
        // UTILIDADES UI
        // --------------------------------------------------------
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

        // === FIN DE LA PARTE 3A/4 ===
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
                } catch (e) { /* ignorar */ }
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
            limpiarArbolDuplicados(arbol);
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
        // CARGAR CAPÍTULO (con restauración de progreso)
        // --------------------------------------------------------
        cargarCapitulo(idx) {
            idx = parseInt(idx, 10);
            if (!this.capitulos[idx]) return;
            this.capituloActual = idx;
            const cap = this.capitulos[idx];

            if (this.modoEdicionVariantes && !this.modoEdicionPersistente) {
                this.desactivarModoEdicion(true);
            }

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
            this._restaurarProgresoDeCapitulo();

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
                if (this.hojasCompletadas.size >= this.hojasTotales.length && this.hojasTotales.length > 0) {
                    this.setStatus('ok', '🎉 Este capítulo ya estaba completado.');
                } else if (this.hojasCompletadas.size > 0) {
                    this.setStatus('info', `Retomando: ${this.hojasCompletadas.size}/${this.hojasTotales.length} soluciones ya resueltas.`);
                } else {
                    this.setStatus('info', 'Tu turno. Encuentra la mejor jugada.');
                }
            }
        }

        _restaurarProgresoDeCapitulo() {
            this.hojasCompletadas = new Set();
            if (!this.progresoVariantes || this.progresoVariantes.size === 0) return;

            const cap = this.capitulos[this.capituloActual];
            if (!cap) return;

            const lineas = obtenerLineasCompletas(this.arbol);
            const prefijo = `cap${this.capituloActual}_`;

            lineas.forEach(linea => {
                const hash = hashVariante(linea);
                const clave = prefijo + hash;
                if (this.progresoVariantes.has(clave)) {
                    const hoja = linea[linea.length - 1];
                    if (hoja) this.hojasCompletadas.add(hoja.id);
                }
            });

            if (this.hojasTotales.length > 0 && this.hojasCompletadas.size >= this.hojasTotales.length) {
                cap.completado = true;
            }
        }

        actualizarMeta() {
            if (!this.$meta) return;
            if (this.esSalaLibre) {
                const nivel = this.config.nivelSF || 5;
                const eloBot = ELO_BOT[nivel] || 1600;
                const eloHumano = ELO.data ? ELO.data.total : ELO_INICIAL;
                this.$meta.innerHTML = `<strong>♟️ Partida libre</strong> · IA Nv${nivel} (~${eloBot}) vs Tú (${eloHumano})`;
                return;
            }
            const cap = this.capitulos[this.capituloActual];
            if (!cap) return;
            const eloCap = ELO.obtenerCapitulo(cap.estudio, this.capituloActual);
            const numComentarios = contarComentarios(cap.arbol || {});
            const badgeComentarios = numComentarios > 0 ? ` · 💬 ${numComentarios}` : '';
            this.$meta.innerHTML = `<strong>Capítulo ${this.capituloActual + 1} de ${this.capitulos.length}</strong> · ${escapeHtml(cap.estudio)} · 🏆 ELO ${eloCap}${badgeComentarios}`;
        }

        // --------------------------------------------------------
        // BARRA DE CAPÍTULOS
        // --------------------------------------------------------
        renderizarBarraCapitulos() {
            if (!this.$capsLista) return;
            const esAdmin = this.esModoAdmin;

            this.$capsLista.innerHTML = this.capitulos.map((cap, idx) => {
                const activo = idx === this.capituloActual;
                const completado = cap.completado;
                const badge = completado ? '<span class="cm-capitulo-check">✓</span>' : '';
                const renameBtn = esAdmin
                    ? `<button class="cm-capitulo-rename" data-cap-rename="${idx}" title="Renombrar capítulo">✏️</button>`
                    : '';
                const delBtn = esAdmin
                    ? `<button class="cm-capitulo-del" data-cap-del="${idx}" title="Eliminar capítulo">✕</button>`
                    : '';
                return `
                    <button class="cm-tablero-capitulo-btn ${activo ? 'active' : ''}" data-cap-idx="${idx}">
                        <span class="cm-capitulo-num">${idx + 1}.</span>
                        <span>${escapeHtml(cap.nombre.substring(0, 20))}${cap.nombre.length > 20 ? '…' : ''}</span>
                        ${badge}
                        ${renameBtn}
                        ${delBtn}
                    </button>
                `;
            }).join('');

            this.$capsLista.querySelectorAll('[data-cap-idx]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    if (e.target.closest('[data-cap-del]')) return;
                    if (e.target.closest('[data-cap-rename]')) return;
                    const idx = parseInt(btn.dataset.capIdx, 10);
                    if (idx !== this.capituloActual) this.cargarCapitulo(idx);
                });
            });

            if (esAdmin) {
                this.$capsLista.querySelectorAll('[data-cap-del]').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const idx = parseInt(btn.dataset.capDel, 10);
                        this.eliminarCapitulo(idx);
                    });
                });

                this.$capsLista.querySelectorAll('[data-cap-rename]').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const idx = parseInt(btn.dataset.capRename, 10);
                        this._abrirModalRenombrarCapitulo(idx);
                    });
                });
            }

            if (this.$capsProgreso) {
                const completados = this.capitulos.filter(c => c.completado).length;
                this.$capsProgreso.textContent = `${completados}/${this.capitulos.length}`;
            }
        }

        _abrirModalRenombrarCapitulo(idx) {
            const cap = this.capitulos[idx];
            if (!cap) return;

            const overlay = document.createElement('div');
            overlay.className = 'cm-tablero-modal-overlay';
            overlay.innerHTML = `
                <div class="cm-tablero-modal-content">
                    <h3 style="color:var(--cm-acento);">✏️ Renombrar capítulo</h3>
                    <p style="margin-bottom:12px;">Escribe el nuevo nombre para el capítulo ${idx + 1}:</p>
                    <input type="text" class="cm-tablero-admin-input" data-rol="input-nombre-cap"
                           value="${escapeHtml(cap.nombre)}" maxlength="120"
                           style="width:100%; padding:10px 12px; font-size:1rem; margin-bottom:16px;">
                    <div class="cm-tablero-modal-acciones">
                        <button class="cm-tablero-btn cm-tablero-btn-sec" data-accion="cancelar">Cancelar</button>
                        <button class="cm-tablero-btn" data-accion="guardar">💾 Guardar</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            const input = overlay.querySelector('[data-rol="input-nombre-cap"]');
            setTimeout(() => { input.focus(); input.select(); }, 100);

            const cerrar = () => overlay.remove();
            overlay.querySelector('[data-accion="cancelar"]').onclick = cerrar;
            overlay.querySelector('[data-accion="guardar"]').onclick = () => {
                const nuevoNombre = input.value.trim();
                if (!nuevoNombre) {
                    this.mostrarToast('⚠️ El nombre no puede estar vacío', 'error');
                    return;
                }
                this.renombrarCapitulo(idx, nuevoNombre);
                cerrar();
            };
            overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(); });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); overlay.querySelector('[data-accion="guardar"]').click(); }
            });
        }

        renombrarCapitulo(idx, nuevoNombre) {
            if (!this.esModoAdmin) return;
            const cap = this.capitulos[idx];
            if (!cap) return;
            if (!nuevoNombre || !nuevoNombre.trim()) return;

            const nombreLimpio = nuevoNombre.trim();
            cap.nombre = nombreLimpio;

            if (!cap.headersOriginales) cap.headersOriginales = {};
            cap.headersOriginales.ChapterName = nombreLimpio;

            try {
                const pgnNuevo = this._reconstruirPGNCompleto();
                this.config.pgn = pgnNuevo;

                if (this.contexto.onRenombrarCapitulo) {
                    this.contexto.onRenombrarCapitulo({
                        capituloIdx: idx,
                        nuevoNombre: nombreLimpio,
                        pgnNuevo
                    });
                } else if (this.onGuardarPGN) {
                    this.onGuardarPGN({ pgn: pgnNuevo });
                }
            } catch (e) {
                console.error('[Entrenador] Error al renombrar:', e);
            }

            this.renderizarBarraCapitulos();
            this.actualizarListaAdminCaps();
            this.actualizarMeta();
            if (this.$pgnTextarea) this.$pgnTextarea.value = this.config.pgn || '';
            this.mostrarToast(`✏️ Capítulo renombrado: "${nombreLimpio}"`, '');
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
                    this.capitulos.forEach((c, i) => c.index = i);

                    if (this.contexto.onEliminarCapitulo) {
                        try {
                            const pgnNuevo = this._reconstruirPGNCompleto();
                            this.contexto.onEliminarCapitulo({ pgnNuevo, numCapitulos: this.capitulos.length });
                        } catch (e) {}
                    }

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
        // LISTA ADMIN DE CAPÍTULOS
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

                const lineas = bloque.split('\n').filter(l => !l.trim().startsWith('['));
                const movText = lineas.join(' ').trim();
                let numLineas = 0;
                try {
                    if (movText) {
                        const idC = { v: 0, next() { return ++this.v; } };
                        const fenMatch = bloque.match(/\[FEN\s+"([^"]*)"\]/);
                        const fen = fenMatch ? fenMatch[1] : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
                        const a = construirArbolPGN(movText, fen, idC);
                        limpiarArbolDuplicados(a);
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
        // GUARDAR PGN
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
                this._aplicarPGN(pgnNuevo);
                return;
            }

            this.abrirModalOpciones(
                '💾 Guardar PGN',
                '¿Qué quieres hacer con el PGN actual?',
                [
                    { icon: '🔄', titulo: 'Reemplazar todo', desc: 'Descarta el PGN anterior y guarda solo el nuevo.', action: () => this._aplicarPGN(pgnNuevo) },
                    { icon: '➕', titulo: 'Añadir al final', desc: 'Mantiene el PGN anterior y le añade los nuevos capítulos.', action: () => this._aplicarPGN(pgnActual + '\n\n' + pgnNuevo) }
                ]
            );
        }

        _aplicarPGN(pgnFinal) {
            if (!this.config) this.config = {};
            this.config.pgn = pgnFinal;

            this.cargarCapitulosDesdePGN(pgnFinal);

            if (this.capitulos.length === 0) {
                this.mostrarToast('⚠️ El PGN no contiene capítulos válidos', 'error');
                return;
            }

            this.capituloActual = 0;
            this.cargarCapitulo(0);
            this.actualizarListaAdminCaps();

            if (this.onGuardarPGN) {
                try { this.onGuardarPGN({ pgn: pgnFinal }); } catch (e) {
                    console.error('[Entrenador] Error al persistir PGN:', e);
                }
            }

            this.mostrarToast(`✅ PGN guardado (${this.capitulos.length} capítulo${this.capitulos.length === 1 ? '' : 's'})`, 'elo-up');
            this.setStatus('ok', `✅ PGN guardado correctamente.`);
        }

        // --------------------------------------------------------
        // IMPORTAR DESDE LICHESS
        // --------------------------------------------------------
        async importarDesdeLichess() {
            const input = this.contenedor.querySelector('[data-rol="inputLichessURL"]');
            if (!input) return;
            const url = input.value.trim();
            if (!url) { this.mostrarToast('⚠️ Pega una URL de Lichess', ''); return; }

            const match = url.match(/lichess\.org\/study\/([a-zA-Z0-9]{8})/);
            if (!match) { this.mostrarToast('⚠️ URL de estudio no válida', 'error'); return; }
            const studyId = match[1];

            this.mostrarToast('⏳ Importando desde Lichess…', '');

            try {
                const resp = await fetch(`https://lichess.org/api/study/${studyId}.pgn`, {
                    headers: { 'Accept': 'application/x-chess-pgn' }
                });
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                const pgn = await resp.text();
                if (this.$pgnTextarea) this.$pgnTextarea.value = pgn;
                this.actualizarListaAdminCaps();
                this.mostrarToast('✅ PGN importado. Revisa y pulsa 💾 Guardar PGN.', 'elo-up');
            } catch (err) {
                console.error('[Entrenador] Error al importar:', err);
                this.mostrarToast('❌ No se pudo importar. Verifica la URL y que el estudio sea público.', 'error');
            }
        }

        resetearELO() {
            this.abrirModalConfirmacion(
                '🔄 Resetear ELO',
                '¿Seguro que quieres resetear todo el ELO guardado en este dispositivo? Esta acción no se puede deshacer.',
                () => {
                    ELO.default();
                    ELO.guardar();
                    this.actualizarMeta();
                    document.dispatchEvent(new CustomEvent('cm-tablero-elo-changed', {
                        detail: { total: ELO.data.total, cambio: 0 }
                    }));
                    this.mostrarToast('🔄 ELO reseteado a 1200', 'elo-up');
                }
            );
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

            // ⭐ v12: Sala libre
            if (this.esSalaLibre) {
                this._clickCasillaSalaLibre(sq);
                return;
            }

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

                const comentario = match.comentario ? ` 💬 ${match.comentario}` : '';
                this.setStatus('ok', `✅ ${match.move.san}${esAlt ? ' (alternativa)' : ''}${comentario}`);
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

        // ⭐ v12: Click en casilla para sala libre
        _clickCasillaSalaLibre(sq) {
            if (this.esperandoRespuesta) return;
            if (this.chess.turn() !== this.colorHumano) return;

            if (!this.casillaSeleccionada) {
                const pieza = this.chess.get(sq);
                if (!pieza) return;
                if (pieza.color !== this.colorHumano) return;
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
            if (piezaDestino && piezaDestino.color === this.colorHumano) {
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

            // Ejecutar movimiento del humano
            const fenAntes = this.chess.fen();
            const mv = this.chess.move({ from: this.casillaSeleccionada, to: sq, promotion: 'q' });
            if (!mv) return;

            this.historialCompletoPartida.push({
                san: mv.san,
                from: mv.from,
                to: mv.to,
                promotion: mv.promotion || 'q',
                color: mv.color,
                fenAntes,
                fenDespues: this.chess.fen(),
                esHumano: true
            });

            this.casillaSeleccionada = null;
            this.dibujarPiezas();
            this.actualizarMovimientosSalaLibre();

            // Cambiar turno en el reloj
            if (this.reloj) {
                this.reloj.cambiarTurno(mv.color);
                this.actualizarRelojUI();
            }

            if (this.chess.game_over()) {
                this.manejarFinPartida();
                return;
            }

            // Ahora le toca a la PC
            this.esperandoRespuesta = true;
            this.setStatus('ordenador', '🤖 Stockfish piensa…');
            setTimeout(() => this.jugarOrdenador(), 200);
        }

        aplicarCambioELOSeguro(estudio, capIdx, cambio, razon) {
            if (this.esModoAdmin) return 0;
            return ELO.aplicar(estudio, capIdx, cambio, razon);
        }

        // === FIN DE LA PARTE 3B/4 (continúa en 3C) ===
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
            this.historialEdicion.push({ from, to: sq, promotion: 'q', san: mv.san, color: mv.color });
            this.dibujarPiezas();
            this.actualizarMovimientos();
            this.actualizarEditInfo();

            this._autoguardarVariante();

            if (this.chess.game_over()) {
                this.setStatus('alt', '🏁 Posición final alcanzada. La variante se guardó automáticamente.');
            }
        }

        actualizarEditInfo() {
            if (!this.$editInfo) return;
            const numMov = this.historialEdicion.length;
            if (numMov === 0) {
                this.$editInfo.innerHTML = '✏️ <strong>MODO EDICIÓN ACTIVO</strong> — Los movimientos se guardan automáticamente';
            } else {
                const ultimos = this.historialEdicion.slice(-3).map(h => h.san).join(' ');
                this.$editInfo.innerHTML = `✏️ <strong>MODO EDICIÓN</strong> · ${numMov} movimiento${numMov === 1 ? '' : 's'} · Últimos: ${escapeHtml(ultimos)}`;
            }
        }

        _autoguardarVariante() {
            if (!this.modoEdicionVariantes) return;
            if (this.historialEdicion.length === 0) return;

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
            if (nuevoCamino.length === 0) return;

            this._insertarVarianteEnArbol(nuevoCamino);
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
                } catch (e) {
                    console.error('[Entrenador] Error al autoguardar:', e);
                }
            }
        }

        _insertarVarianteEnArbol(camino) {
            let padre = this.arbol;
            for (const paso of camino) {
                const existente = padre.children.find(c =>
                    c.move && c.move.from === paso.move.from &&
                    c.move.to === paso.move.to &&
                    (c.move.promotion || 'q') === (paso.move.promotion || 'q')
                );
                if (existente) {
                    padre = existente;
                } else {
                    const nuevoNodo = {
                        id: this._idCounter.next(),
                        move: paso.move,
                        fen: paso.fen,
                        children: [],
                        parent: padre,
                        comentario: ''
                    };
                    padre.children.push(nuevoNodo);
                    padre = nuevoNodo;
                }
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
                this.$modoIndicator.innerHTML = '<span style="font-size:1.2rem;">✏️</span><span><strong>MODO EDICIÓN ACTIVO</strong> — movimientos libres, se guardan automáticamente</span>';
            }
            if (this.$editToolbar) this.$editToolbar.classList.add('active');
            const btn = this.contenedor.querySelector('[data-rol="btnEditarVariantes"]');
            if (btn) btn.innerHTML = '🔒 Desactivar modo edición';

            this._setBotonesEjercicioDisabled(true);
            this.actualizarEditInfo();
            this.setStatus('alt', '✏️ Modo edición: mueve piezas libremente. La variante se guarda automáticamente.');
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
            this.abrirModalConfirmacion(
                '⚠️ ¿Salir del modo edición?',
                'Se quitarán todos los movimientos que has hecho en esta sesión de edición. Las variantes ya guardadas permanecen. ¿Continuar?',
                () => {
                    const cap = this.capitulos[this.capituloActual];
                    this.chess = new Chess(cap.fen);
                    this.historialEdicion = [];
                    this.casillaSeleccionada = null;
                    this.dibujarPiezas();
                    this.actualizarMovimientos();
                    this.actualizarEditInfo();
                    this.desactivarModoEdicion();
                    this.mostrarToast('🗑️ Sesión de edición descartada', '');
                }
            );
        }

        // --------------------------------------------------------
        // RESPUESTA DEL RIVAL (modo estudio)
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
            this._guardarProgresoVarianteActual();
            this.actualizarVariantesProgreso();
            const total = this.hojasTotales.length;
            const completadas = this.hojasCompletadas.size;

            if (completadas >= total) {
                this.setStatus('ok', `🎉 ¡Todas las ${total} soluciones completadas!`);
                this.capitulos[this.capituloActual].completado = true;
                this._guardarProgresoCapCompleto();
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
                    if (cambioReal !== 0) this.mostrarToast(`🏆 Ejercicio resuelto · +${cambioReal} ELO`, 'elo-up');
                    this.actualizarMeta();
                } else if (this.esModoAdmin) {
                    this.mostrarToast(`✅ Ejercicio resuelto (admin · sin cambio ELO)`, '');
                }

                if (this.contexto.onCompletado) {
                    try { this.contexto.onCompletado(); } catch (e) {}
                }

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

        _guardarProgresoVarianteActual() {
            if (this.esModoAdmin) return;
            if (!this.onGuardarProgresoVariante) return;
            if (!this.claseIdContexto || !this.temaIdContexto || !this.bloqueIdContexto) return;

            const camino = [];
            let n = this.nodoActual;
            while (n && n.move) { camino.unshift(n); n = n.parent; }
            if (camino.length === 0) return;

            const hash = hashVariante(camino);
            if (!hash) return;

            const clave = `cap${this.capituloActual}_${hash}`;
            this.progresoVariantes.add(clave);

            try {
                this.onGuardarProgresoVariante({
                    claseId: this.claseIdContexto,
                    temaId: this.temaIdContexto,
                    bloqueId: this.bloqueIdContexto,
                    capituloIdx: this.capituloActual,
                    clave: clave,
                    hash: hash
                });
            } catch (e) {
                console.error('[Entrenador] Error al guardar progreso de variante:', e);
            }
        }

        _guardarProgresoCapCompleto() {
            if (this.esModoAdmin) return;
            if (!this.onGuardarProgresoCapCompleto) return;
            if (!this.claseIdContexto || !this.temaIdContexto || !this.bloqueIdContexto) return;

            try {
                this.onGuardarProgresoCapCompleto({
                    claseId: this.claseIdContexto,
                    temaId: this.temaIdContexto,
                    bloqueId: this.bloqueIdContexto,
                    capituloIdx: this.capituloActual
                });
            } catch (e) {
                console.error('[Entrenador] Error al guardar progreso de capítulo:', e);
            }
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
        // MODO ORDENADOR (estudio + sala libre)
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
            this.historialPartida.push({ fen: fenAntes, from, to, promotion: 'q', san: mv.san, color: mv.color, esBot: false });
            this.historialCompletoPartida.push({
                san: mv.san, from: mv.from, to: mv.to,
                promotion: mv.promotion || 'q', color: mv.color,
                fenAntes, fenDespues: this.chess.fen(), esHumano: true
            });
            this.casillaSeleccionada = null;
            this.dibujarPiezas();
            this.actualizarMovimientos();

            if (this.reloj) {
                this.reloj.cambiarTurno(mv.color);
                this.actualizarRelojUI();
            }

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
            this.historialPartida.push({ fen: fenAntes, from: movimiento.from, to: movimiento.to, promotion: movimiento.promotion || 'q', san: mv.san, color: mv.color, esBot: true });
            this.historialCompletoPartida.push({
                san: mv.san, from: mv.from, to: mv.to,
                promotion: mv.promotion || 'q', color: mv.color,
                fenAntes, fenDespues: this.chess.fen(), esHumano: false
            });
            this.esperandoRespuesta = false;
            this.dibujarPiezas();
            this.actualizarMovimientos();

            if (this.reloj) {
                this.reloj.cambiarTurno(mv.color);
                this.actualizarRelojUI();
            }

            if (this.chess.game_over()) { this.manejarFinPartida(); return; }

            if (this.esSalaLibre) {
                this.setStatus('ordenador', `🤖 Stockfish jugó ${mv.san}. Tu turno.`);
                this.actualizarMovimientosSalaLibre();
            } else {
                this.setStatus('ordenador', `🤖 Stockfish: ${mv.san}. Tu turno.`);
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
        // FIN DE PARTIDA + ANÁLISIS POST-PARTIDA
        // --------------------------------------------------------
        async manejarFinPartida() {
            if (this.reloj) {
                this.reloj.detener();
            }

            const nivel = this.config.nivelSF || 5;
            const eloBot = ELO_BOT[nivel] || 1600;
            const colorHumano = this.colorHumano || 'w';

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

            this.setStatus('ordenador', textoEstado);

            // ⭐ v12: Aplicar ELO en sala libre
            if (this.esSalaLibre && !this.esModoAdmin) {
                const eloActual = ELO.data ? ELO.data.total : ELO_INICIAL;
                const cambio = ELO.calcular(eloActual, eloBot, resultado);
                if (cambio !== 0) {
                    const cambioReal = ELO.aplicar('Sala libre', nivel, cambio,
                        `${resultado === 1 ? 'Victoria' : (resultado === 0 ? 'Derrota' : 'Tablas')} vs Nv${nivel}`);
                    if (cambioReal !== 0) {
                        const tipo = cambioReal > 0 ? 'elo-up' : 'elo-down';
                        const signo = cambioReal > 0 ? '+' : '';
                        this.mostrarToast(`🏆 ${signo}${cambioReal} ELO`, tipo);
                    }
                    this.actualizarMeta();
                }
            } else if (!this.esSalaLibre) {
                // Modo estudio original
                const cap = this.capitulos[this.capituloActual];
                cap.completado = true;
                this.renderizarBarraCapitulos();

                const eloActual = ELO.obtenerCapitulo(cap.estudio, this.capituloActual);
                const cambio = ELO.calcular(eloActual, eloBot, resultado);
                if (cambio !== 0 && !this.esModoAdmin) {
                    const cambioReal = ELO.aplicar(cap.estudio, this.capituloActual, cambio,
                        `${resultado === 1 ? 'Victoria' : (resultado === 0 ? 'Derrota' : 'Tablas')} vs Nv${nivel}`);
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

            // ⭐ v12: Avisar a script.js (por si quiere reaccionar)
            if (this.onFinPartida) {
                try {
                    this.onFinPartida({
                        resultado,
                        pgn: this._generarPGNPartida(),
                        historial: this.historialCompletoPartida
                    });
                } catch (e) {
                    console.error('[v12] Error en onFinPartida:', e);
                }
            }

            // ⭐ v12: Análisis post-partida (solo en sala libre)
            if (this.esSalaLibre) {
                await this.analizarPartida();
            }
        }

        // --------------------------------------------------------
        // ⭐ v12: GENERA EL PGN DE LA PARTIDA LIBRE
        // --------------------------------------------------------
        _generarPGNPartida() {
            if (!this.historialCompletoPartida.length) return '';
            const fecha = new Date();
            const fechaStr = fecha.toISOString().split('T')[0].replace(/-/g, '.');

            let headers = `[Event "Partida libre vs IA"]\n`;
            headers += `[Site "Club Morphy"]\n`;
            headers += `[Date "${fechaStr}"]\n`;
            headers += `[White "${this.colorHumano === 'w' ? 'Alumno' : 'Stockfish Nv' + (this.config.nivelSF || 5)}"]\n`;
            headers += `[Black "${this.colorHumano === 'b' ? 'Alumno' : 'Stockfish Nv' + (this.config.nivelSF || 5)}"]\n`;

            // Resultado
            let resultadoPGN = '*';
            if (this.chess.in_checkmate()) {
                resultadoPGN = this.chess.turn() === 'w' ? '0-1' : '1-0';
            } else if (this.chess.in_draw() || this.chess.in_stalemate()) {
                resultadoPGN = '1/2-1/2';
            }
            headers += `[Result "${resultadoPGN}"]\n\n`;

            // Movimientos
            let textoMovs = '';
            let numeroJugada = 1;
            this.historialCompletoPartida.forEach((j, i) => {
                if (j.color === 'w') {
                    textoMovs += `${numeroJugada}. ${j.san} `;
                } else {
                    textoMovs += `${j.san} `;
                    numeroJugada++;
                }
            });
            textoMovs += resultadoPGN;

            return headers + textoMovs;
        }

        // --------------------------------------------------------
        // ⭐ v12: ANÁLISIS POST-PARTIDA (tipo Lichess)
        // --------------------------------------------------------
        async analizarPartida() {
            if (this.analizando) return;
            if (!SF.ready) {
                this.analizando = false;
                this.mostrarToast('⚠️ Stockfish no está listo para analizar', '');
                return;
            }
            if (this.historialCompletoPartida.length === 0) return;

            this.analizando = true;
            this.setStatus('ordenador', '🔍 Analizando la partida…');

            const jugadasAnalizadas = [];

            try {
                for (let i = 0; i < this.historialCompletoPartida.length; i++) {
                    const j = this.historialCompletoPartida[i];

                    // Evaluar posición ANTES de la jugada (mejor movimiento)
                    const evalAntes = await SF.evaluarPosicion(j.fenAntes, 10);

                    // Evaluar posición DESPUÉS
                    const evalDespues = await SF.evaluarPosicion(j.fenDespues, 10);

                    // Calcular CPL (centipawn loss) desde la perspectiva del jugador que movió
                    let cpl;
                    if (j.color === 'w') {
                        cpl = evalAntes.cp - evalDespues.cp;
                    } else {
                        cpl = evalDespues.cp - evalAntes.cp;
                    }
                    // CPL siempre positivo (pérdida)
                    cpl = Math.max(0, cpl);

                    // Detectar si ya estaba ganando/perdiendo por mucho
                    const cpAntesDesdeHumano = j.color === 'w' ? evalAntes.cp : -evalAntes.cp;
                    const yaEstabaGanando = cpAntesDesdeHumano > 500;
                    const yaEstabaPerdiendo = cpAntesDesdeHumano < -500;

                    // Clasificar
                    let clasificacion;
                    // Si el movimiento fue el mejor (según Stockfish), es excelente automáticamente
                    if (evalAntes.mejor && evalAntes.mejor === j.from + j.to + (j.promotion || '')) {
                        clasificacion = 'excelente';
                    } else {
                        clasificacion = clasificarPorCPL(cpl, yaEstabaGanando, yaEstabaPerdiendo);
                    }

                    jugadasAnalizadas.push({
                        ...j,
                        evalAntes,
                        evalDespues,
                        cpl,
                        clasificacion
                    });

                    // Actualizar progreso
                    if (i % 5 === 0) {
                        this.setStatus('ordenador', `🔍 Analizando… ${i + 1}/${this.historialCompletoPartida.length}`);
                    }
                }

                // Calcular estadísticas
                const acplHumano = calcularACPL(jugadasAnalizadas.filter(j => j.esHumano), this.colorHumano);
                const acplPC = calcularACPL(jugadasAnalizadas.filter(j => !j.esHumano), this.colorHumano === 'w' ? 'b' : 'w');
                const conteoHumano = contarClasificaciones(jugadasAnalizadas.filter(j => j.esHumano));
                const conteoPC = contarClasificaciones(jugadasAnalizadas.filter(j => !j.esHumano));

                // Precisión estimada (fórmula simple basada en ACPL)
                const precisionHumano = Math.max(0, Math.min(100, Math.round(100 - acplHumano / 3)));

                this.analisis = {
                    jugadas: jugadasAnalizadas,
                    acplHumano,
                    acplPC,
                    conteoHumano,
                    conteoPC,
                    precisionHumano
                };

                this.setStatus('ordenador', '✅ Análisis completado.');
                this.renderizarAnalisis();

            } catch (err) {
                console.error('[v12] Error al analizar:', err);
                this.setStatus('ordenador', '⚠️ No se pudo completar el análisis.');
            } finally {
                this.analizando = false;
            }
        }

        // --------------------------------------------------------
        // ⭐ v12: RENDERIZAR EL ANÁLISIS POST-PARTIDA
        // --------------------------------------------------------
        renderizarAnalisis() {
            if (!this.$panelAnalisis || !this.analisis) return;

            const a = this.analisis;
            const simbolos = {
                brillante: '!!', excelente: '!', buena: '✓',
                imprecision: '?!', error: '?', blunder: '??',
                libro: '📖', forzada: '→'
            };

            const filaConteo = (icono, nombre, cant, color) => {
                if (cant === 0) return '';
                return `<span class="cm-analisis-chip" style="border-color:${color}; color:${color};">${icono} ${cant}</span>`;
            };

            const filaJugadas = a.jugadas.map((j, i) => {
                const c = CLASIFICACION_JUGADAS[j.clasificacion] || CLASIFICACION_JUGADAS.buena;
                const numJugada = Math.floor(i / 2) + 1;
                const pre = j.color === 'w' ? `${numJugada}.` : `${numJugada}…`;
                const icono = j.esHumano ? '' : '🤖 ';
                return `
                    <div class="cm-analisis-jugada" style="border-left-color:${c.color};" title="${escapeHtml(c.nombre)}">
                        <span class="cm-analisis-num">${pre}</span>
                        <span class="cm-analisis-san">${icono}${escapeHtml(j.san)}</span>
                        <span class="cm-analisis-icono" style="color:${c.color};">${c.icono}</span>
                        <span class="cm-analisis-eval">${formatearEvaluacion(j.evalDespues.cp)}</span>
                    </div>`;
            }).join('');

            this.$panelAnalisis.innerHTML = `
                <div class="cm-analisis-header">
                    <span style="font-size:1.1rem;">📊</span>
                    <strong>Análisis de la partida</strong>
                </div>

                <div class="cm-analisis-stats">
                    <div class="cm-analisis-stat-card">
                        <span class="cm-analisis-stat-label">Tu precisión</span>
                        <span class="cm-analisis-stat-valor">${a.precisionHumano}%</span>
                    </div>
                    <div class="cm-analisis-stat-card">
                        <span class="cm-analisis-stat-label">ACPL</span>
                        <span class="cm-analisis-stat-valor">${a.acplHumano}</span>
                    </div>
                </div>

                <div class="cm-analisis-conteo">
                    ${filaConteo('!!', 'Brillante', a.conteoHumano.brillante, CLASIFICACION_JUGADAS.brillante.color)}
                    ${filaConteo('!', 'Excelente', a.conteoHumano.excelente, CLASIFICACION_JUGADAS.excelente.color)}
                    ${filaConteo('✓', 'Buena', a.conteoHumano.buena, CLASIFICACION_JUGADAS.buena.color)}
                    ${filaConteo('?!', 'Imprecisión', a.conteoHumano.imprecision, CLASIFICACION_JUGADAS.imprecision.color)}
                    ${filaConteo('?', 'Error', a.conteoHumano.error, CLASIFICACION_JUGADAS.error.color)}
                    ${filaConteo('??', 'Error grave', a.conteoHumano.blunder, CLASIFICACION_JUGADAS.blunder.color)}
                </div>

                <div class="cm-analisis-lista-wrap">
                    <details class="cm-analisis-details">
                        <summary>Ver jugada por jugada</summary>
                        <div class="cm-analisis-lista">
                            ${filaJugadas}
                        </div>
                    </details>
                </div>
            `;

            this.$panelAnalisis.classList.remove('cm-tablero-hidden');
        }

        // --------------------------------------------------------
        // ⭐ v12: RELOJ — Actualiza UI y maneja timeout
        // --------------------------------------------------------
        actualizarRelojUI() {
            if (!this.reloj || !this.$relojTiempoPC || !this.$relojTiempoHumano) return;

            const colorPC = this.colorHumano === 'w' ? 'b' : 'w';
            const tiempoPC = this.reloj.obtenerTiempoFormateado(colorPC);
            const tiempoHumano = this.reloj.obtenerTiempoFormateado(this.colorHumano);

            this.$relojTiempoPC.textContent = tiempoPC;
            this.$relojTiempoHumano.textContent = tiempoHumano;

            // Destacar reloj del jugador activo
            const turno = this.chess.turn();
            if (this.$relojPC) this.$relojPC.classList.toggle('activo', turno === colorPC);
            if (this.$relojHumano) this.$relojHumano.classList.toggle('activo', turno === this.colorHumano);

            // Alerta si queda poco tiempo
            const segundosHumano = this.reloj.obtenerTiempo(this.colorHumano);
            const segundosPC = this.reloj.obtenerTiempo(colorPC);
            if (this.$relojHumano) this.$relojHumano.classList.toggle('alerta', segundosHumano > 0 && segundosHumano < 30);
            if (this.$relojPC) this.$relojPC.classList.toggle('alerta', segundosPC > 0 && segundosPC < 30);

            // Programar siguiente actualización
            if (!this.sinLimite && this.reloj.activo && !this.destroyed) {
                if (this._relojUiTimer) clearTimeout(this._relojUiTimer);
                this._relojUiTimer = setTimeout(() => this.actualizarRelojUI(), 500);
            }
        }

        _onTimeoutReloj(color) {
            if (this.destroyed) return;
            const esHumano = color === this.colorHumano;
            const texto = esHumano ? '⏱️ ¡Se te acabó el tiempo!' : '🎉 ¡La IA se quedó sin tiempo!';
            this.setStatus('ordenador', texto);
            this.mostrarToast(texto, esHumano ? 'elo-down' : 'elo-up');

            // Aplicar ELO
            if (!this.esModoAdmin && this.esSalaLibre) {
                const nivel = this.config.nivelSF || 5;
                const eloBot = ELO_BOT[nivel] || 1600;
                const eloActual = ELO.data ? ELO.data.total : ELO_INICIAL;
                const resultado = esHumano ? 0 : 1;
                const cambio = ELO.calcular(eloActual, eloBot, resultado);
                if (cambio !== 0) {
                    const cambioReal = ELO.aplicar('Sala libre', nivel, cambio, esHumano ? 'Timeout' : 'Timeout IA');
                    if (cambioReal !== 0) {
                        const signo = cambioReal > 0 ? '+' : '';
                        this.mostrarToast(`🏆 ${signo}${cambioReal} ELO`, cambioReal > 0 ? 'elo-up' : 'elo-down');
                    }
                    this.actualizarMeta();
                }
            }

            this.bloqueado = true;
            setTimeout(() => this.analizarPartida(), 800);
        }

        // --------------------------------------------------------
        // ⭐ v12: DESHACER PARTIDA (en sala libre)
        // --------------------------------------------------------
        deshacerPartida() {
            if (!this.esSalaLibre) return;
            if (this.historialCompletoPartida.length < 2) {
                this.mostrarToast('No hay jugadas para deshacer', '');
                return;
            }
            if (this.esperandoRespuesta) {
                this.mostrarToast('Espera a que la IA termine su jugada', '');
                return;
            }

            // Deshacer las últimas 2 jugadas (tuya + de la IA)
            // para que vuelva a ser tu turno
            this.chess.undo(); // IA
            this.chess.undo(); // Tú
            this.historialCompletoPartida.pop();
            this.historialCompletoPartida.pop();

            this.dibujarPiezas();
            this.actualizarMovimientosSalaLibre();
            this.casillaSeleccionada = null;
            this.setStatus('ordenador', '↩️ Jugada deshecha. Tu turno.');
            this.mostrarToast('↩️ Jugada deshecha', '');
        }

        // --------------------------------------------------------
        // ⭐ v12: REINICIAR PARTIDA LIBRE
        // --------------------------------------------------------
        reiniciarPartidaLibre() {
            this.abrirModalConfirmacion(
                '⟲ Nueva partida',
                'Se reiniciará la partida actual con la misma configuración. ¿Continuar?',
                () => {
                    if (this.reloj) this.reloj.detener();
                    this.chess = new Chess();
                    this.historialCompletoPartida = [];
                    this.casillaSeleccionada = null;
                    this.esperandoRespuesta = false;
                    this.bloqueado = false;
                    this.analisis = null;
                    this.analizando = false;

                    if (this.$panelAnalisis) {
                        this.$panelAnalisis.classList.add('cm-tablero-hidden');
                        this.$panelAnalisis.innerHTML = '';
                    }

                    const cfgTiempo = TIEMPOS_PARTIDA[this.tiempoConfig] || TIEMPOS_PARTIDA['libre'];
                    this.reloj = new RelojPartida(
                        cfgTiempo.segundos,
                        cfgTiempo.incremento,
                        (color) => this._onTimeoutReloj(color)
                    );

                    this.dibujarPiezas();
                    this.actualizarMovimientosSalaLibre();
                    this.actualizarRelojUI();

                    // Determinar quién empieza
                    if (this.chess.turn() !== this.colorHumano) {
                        this.setStatus('ordenador', '🤖 Stockfish piensa…');
                        this.esperandoRespuesta = true;
                        setTimeout(() => this.jugarOrdenador(), 600);
                    } else {
                        this.setStatus('ordenador', '🎮 Nueva partida. Tu turno.');
                        setTimeout(() => { if (!this.destroyed && this.reloj) this.reloj.iniciar(); }, 100);
                    }
                }
            );
        }

        // --------------------------------------------------------
        // ⭐ v12: COMPARTIR PARTIDA (PGN al portapapeles)
        // --------------------------------------------------------
        async compartirPartidaPGN() {
            if (!this.historialCompletoPartida.length) {
                this.mostrarToast('Aún no hay jugadas para compartir', '');
                return;
            }
            const pgn = this._generarPGNPartida();
            try {
                await navigator.clipboard.writeText(pgn);
                this.mostrarToast('📋 PGN copiado al portapapeles', 'elo-up');
            } catch (err) {
                // Fallback
                try {
                    const ta = document.createElement('textarea');
                    ta.value = pgn;
                    ta.style.position = 'fixed';
                    ta.style.opacity = '0';
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                    this.mostrarToast('📋 PGN copiado al portapapeles', 'elo-up');
                } catch (e) {
                    this.mostrarToast('No se pudo copiar. Selecciona manualmente.', 'error');
                }
            }
        }

        // --------------------------------------------------------
        // ⭐ v12: SALIR DE LA SALA LIBRE
        // --------------------------------------------------------
        _salirSalaLibre() {
            const tieneJugadas = this.historialCompletoPartida.length > 0;
            const mensaje = tieneJugadas
                ? '¿Seguro que quieres salir? Perderás la partida actual.'
                : '¿Seguro que quieres salir de la sala?';

            this.abrirModalConfirmacion(
                '✕ Salir de la sala',
                mensaje,
                () => {
                    if (this.reloj) this.reloj.detener();
                    if (this.contexto.onSalirSalaLibre) {
                        try { this.contexto.onSalirSalaLibre(); } catch (e) {}
                    }
                }
            );
        }

        // --------------------------------------------------------
        // ACTUALIZAR MOVIMIENTOS (estudio)
        // --------------------------------------------------------
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
            const nodosCamino = this._obtenerNodosDelCaminoActual();

            this.$moves.innerHTML = hist.map((m, i) => {
                const n = Math.floor(i / 2) + 1;
                const pre = m.color === 'w' ? `${n}.` : `${n}…`;
                const esPC = modo === 'ordenador' && m.color !== colorHumano;
                const nodo = nodosCamino[i];
                const tieneComentario = nodo && nodo.comentario;
                const comentarioAttr = tieneComentario ? `title="${escapeHtml(nodo.comentario)}"` : '';
                const icono = tieneComentario ? ' <span class="cm-mov-comentario-icon">💬</span>' : '';
                const claseExtra = tieneComentario ? ' con-comentario' : '';
                const idxNodo = nodo ? nodo.id : '';
                return `<span class="cm-mov ${esPC ? 'computadora' : 'done'}${claseExtra}"
                              data-mov-idx="${i}"
                              data-nodo-id="${idxNodo}"
                              ${comentarioAttr}>${pre} ${m.san}${icono}</span>`;
            }).join(' ');

            if (this.esModoAdmin) {
                this.$moves.querySelectorAll('.cm-mov').forEach(el => {
                    el.style.cursor = 'context-menu';
                    el.addEventListener('contextmenu', (e) => {
                        e.preventDefault();
                        const nodoId = el.dataset.nodoId;
                        if (nodoId) this._mostrarMenuContextoComentario(parseInt(nodoId, 10), e.clientX, e.clientY);
                    });
                });
            }
        }

        // ⭐ v12: Lista de movimientos para sala libre
        actualizarMovimientosSalaLibre() {
            if (!this.$moves) return;
            const hist = this.historialCompletoPartida;
            if (!hist.length) {
                this.$moves.innerHTML = '<span style="color:var(--cm-texto-suave); font-size:0.85rem;">Aún no hay jugadas.</span>';
                return;
            }
            this.$moves.innerHTML = hist.map((m, i) => {
                const n = Math.floor(i / 2) + 1;
                const pre = m.color === 'w' ? `${n}.` : `${n}…`;
                const esPC = !m.esHumano;
                return `<span class="cm-mov ${esPC ? 'computadora' : 'done'}">${pre} ${m.san}</span>`;
            }).join(' ');
        }

        _obtenerNodosDelCaminoActual() {
            const camino = [];
            let n = this.nodoActual;
            while (n && n.move) {
                camino.unshift(n);
                n = n.parent;
            }
            return camino;
        }

        // --------------------------------------------------------
        // MENÚ CONTEXTUAL COMENTARIOS
        // --------------------------------------------------------
        _mostrarMenuContextoComentario(nodoId, x, y) {
            document.querySelectorAll('.cm-tablero-context-menu').forEach(m => m.remove());
            const nodo = this._encontrarNodoPorId(this.arbol, nodoId);
            if (!nodo) return;

            const tieneComentario = !!nodo.comentario;
            const menu = document.createElement('div');
            menu.className = 'cm-tablero-context-menu';
            menu.style.cssText = `position:fixed; top:${y}px; left:${x}px; background:white; border:1px solid #cbd5e1; border-radius:8px; box-shadow:0 4px 20px rgba(0,0,0,0.15); z-index:10000; padding:4px; min-width:200px;`;

            const opciones = [
                { icon: tieneComentario ? '✏️' : '💬', label: tieneComentario ? 'Editar comentario' : 'Añadir comentario', action: () => this._mostrarModalComentario(nodoId) }
            ];
            if (tieneComentario) {
                opciones.push({ icon: '🗑️', label: 'Eliminar comentario', action: () => this._eliminarComentarioNodo(nodoId), danger: true });
            }

            menu.innerHTML = opciones.map((op, i) =>
                `<button class="cm-tablero-context-item" data-op-idx="${i}"
                         style="display:flex; align-items:center; gap:8px; width:100%; padding:8px 12px; background:none; border:none; text-align:left; cursor:pointer; border-radius:6px; font-size:0.85rem; color:${op.danger ? '#dc2626' : '#1e293b'}; font-family:inherit;">
                    ${op.icon} ${op.label}
                </button>`
            ).join('');

            document.body.appendChild(menu);

            menu.querySelectorAll('[data-op-idx]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const i = parseInt(btn.dataset.opIdx, 10);
                    opciones[i].action();
                    menu.remove();
                });
                btn.addEventListener('mouseenter', () => { btn.style.background = '#f1f5f9'; });
                btn.addEventListener('mouseleave', () => { btn.style.background = 'none'; });
            });

            setTimeout(() => {
                const cerrar = (ev) => {
                    if (!menu.contains(ev.target)) {
                        menu.remove();
                        document.removeEventListener('click', cerrar);
                        document.removeEventListener('contextmenu', cerrar);
                    }
                };
                document.addEventListener('click', cerrar);
                document.addEventListener('contextmenu', cerrar);
            }, 100);
        }

        _encontrarNodoPorId(nodo, id) {
            if (!nodo) return null;
            if (nodo.id === id) return nodo;
            if (nodo.children) {
                for (const hijo of nodo.children) {
                    const found = this._encontrarNodoPorId(hijo, id);
                    if (found) return found;
                }
            }
            return null;
        }

        _mostrarModalComentario(nodoId) {
            const nodo = this._encontrarNodoPorId(this.arbol, nodoId);
            if (!nodo) return;

            const sanMov = nodo.move ? nodo.move.san : '(inicio)';
            const textoActual = nodo.comentario || '';

            const overlay = document.createElement('div');
            overlay.className = 'cm-tablero-modal-overlay';
            overlay.innerHTML = `
                <div class="cm-tablero-modal-content">
                    <h3 style="color:var(--cm-acento);">💬 Comentario de la jugada</h3>
                    <p style="margin-bottom:8px; font-size:0.85rem;">
                        Jugada: <strong style="color:var(--cm-texto); font-family:'Courier New',monospace;">${escapeHtml(sanMov)}</strong>
                    </p>
                    <textarea class="cm-tablero-admin-textarea" data-rol="input-comentario"
                              placeholder="Escribe tu comentario aquí (ej: esta jugada controla el centro)…"
                              maxlength="500"
                              style="width:100%; min-height:100px; padding:10px; font-size:0.9rem; margin-bottom:6px; font-family:'Lato',sans-serif; resize:vertical;">${escapeHtml(textoActual)}</textarea>
                    <div style="font-size:0.72rem; color:var(--cm-texto-suave); text-align:right; margin-bottom:14px;">
                        Máx. 500 caracteres
                    </div>
                    <div class="cm-tablero-modal-acciones">
                        <button class="cm-tablero-btn cm-tablero-btn-sec" data-accion="cancelar">Cancelar</button>
                        <button class="cm-tablero-btn" data-accion="guardar">💾 Guardar</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            const textarea = overlay.querySelector('[data-rol="input-comentario"]');
            setTimeout(() => { textarea.focus(); textarea.select(); }, 100);

            const cerrar = () => overlay.remove();
            overlay.querySelector('[data-accion="cancelar"]').onclick = cerrar;
            overlay.querySelector('[data-accion="guardar"]').onclick = () => {
                this._guardarComentarioEnNodo(nodoId, textarea.value.trim());
                cerrar();
            };
            overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(); });
            textarea.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    overlay.querySelector('[data-accion="guardar"]').click();
                }
            });
        }

        _guardarComentarioEnNodo(nodoId, comentario) {
            const nodo = this._encontrarNodoPorId(this.arbol, nodoId);
            if (!nodo) return;

            nodo.comentario = comentario || '';
            const cap = this.capitulos[this.capituloActual];
            cap.arbol = this.arbol;

            if (this.contexto.onGuardarVariante) {
                try {
                    const pgnActualizado = arbolAPGN(this.arbol, cap.headersOriginales);
                    this.contexto.onGuardarVariante({
                        capituloIdx: this.capituloActual,
                        pgnCapitulo: pgnActualizado,
                        nuevoNumLineas: cap.numLineas
                    });
                } catch (e) {
                    console.error('[Entrenador] Error al guardar comentario:', e);
                }
            }

            this.actualizarMovimientos();
            this.actualizarMeta();
            this.mostrarToast(comentario ? '💬 Comentario guardado' : '🗑️ Comentario eliminado', comentario ? 'elo-up' : '');
        }

        _eliminarComentarioNodo(nodoId) {
            const nodo = this._encontrarNodoPorId(this.arbol, nodoId);
            if (!nodo || !nodo.comentario) return;

            this.abrirModalConfirmacion(
                '🗑️ Eliminar comentario',
                `¿Eliminar el comentario de la jugada ${nodo.move ? nodo.move.san : ''}?`,
                () => this._guardarComentarioEnNodo(nodoId, '')
            );
        }

        // --------------------------------------------------------
        // MODALES GENÉRICOS
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
            overlay.querySelector('[data-accion="confirmar"]').onclick = () => { overlay.remove(); onConfirm(); };
            overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
        }

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
            overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
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
        // UI HELPERS
        // --------------------------------------------------------
        setStatus(tipo, texto) {
            if (!this.$status) return;
            this.$status.className = 'cm-tablero-status ' + tipo;
            this.$status.textContent = texto;
        }

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

            if (this.esModoAdmin) {
                this.mostrarToast('👁️ Solución mostrada (admin) — no afecta ELO', '');
                this.ejecutarVerSolucion();
                return;
            }

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
            this.setStatus('info', '▶ Reproduciendo solución…');
            const auto = setInterval(() => {
                if (this.destroyed) { clearInterval(auto); return; }
                if (!this.nodoActual || this.nodoActual.children.length === 0) {
                    clearInterval(auto);
                    this.bloqueado = false;
                    if (this.esModoAdmin) {
                        this.setStatus('info', '✅ Solución mostrada (admin).');
                    } else {
                        this.setStatus('bad', '❌ Ejercicio fallido. Solución mostrada.');
                    }
                    return;
                }
                const child = this.nodoActual.children[0];
                this.chess.move({ from: child.move.from, to: child.move.to, promotion: child.move.promotion });
                this.nodoActual = child;
                this.dibujarPiezas();
                this.actualizarMovimientos();
            }, 700);
        }

        actualizarProgreso() {
            if (!this.$progressInfo) return;
            const completados = this.capitulos.filter(c => c.completado).length;
            this.$progressInfo.textContent = `Progreso: ${completados} de ${this.capitulos.length} capítulos completados`;
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

        // --------------------------------------------------------
        // VARIANTES EDITOR
        // --------------------------------------------------------
        actualizarVariantesEditor() {
            if (!this.$variantesLista) return;
            const lineas = obtenerLineasCompletas(this.arbol);
            const countEl = this.contenedor.querySelector('[data-rol="variantesCount"]');
            if (countEl) countEl.textContent = `${lineas.length}`;
            this.$variantesLista.innerHTML = lineas.map((linea, idx) => {
                const texto = linea.map((nodo, j) => {
                    const num = Math.floor(j / 2) + 1;
                    const pre = nodo.move.color === 'w' ? `${num}.` : `${num}…`;
                    const comentarioIcon = nodo.comentario ? ' 💬' : '';
                    return `${pre} ${nodo.move.san}${comentarioIcon}`;
                }).join(' ');
                const esPrincipal = idx === 0;
                const badge = esPrincipal ? '<span class="cm-badge-principal">Principal</span>' : '';
                return `<div class="cm-tablero-variante-item" data-variante-idx="${idx}">
                    <div class="cm-texto">${badge} ${escapeHtml(texto)}</div>
                    <button class="cm-btn-del" ${esPrincipal ? 'disabled' : ''} data-variante="${idx}">${esPrincipal ? '—' : '🗑️'}</button>
                </div>`;
            }).join('');

            this.$variantesLista.querySelectorAll('[data-variante]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const idx = parseInt(btn.dataset.variante, 10);
                    if (idx > 0) this.eliminarVariante(idx);
                });
            });

            this.$variantesLista.querySelectorAll('[data-variante-idx]').forEach(item => {
                item.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    const idx = parseInt(item.dataset.varianteIdx, 10);
                    this.mostrarMenuContextoVariante(idx, e.clientX, e.clientY);
                });
            });
        }

        mostrarMenuContextoVariante(idx, x, y) {
            document.querySelectorAll('.cm-tablero-context-menu').forEach(m => m.remove());
            const esPrincipal = idx === 0;
            const menu = document.createElement('div');
            menu.className = 'cm-tablero-context-menu';
            menu.style.cssText = `position:fixed; top:${y}px; left:${x}px; background:white; border:1px solid #cbd5e1; border-radius:8px; box-shadow:0 4px 20px rgba(0,0,0,0.15); z-index:10000; padding:4px; min-width:180px;`;

            const opciones = [];
            if (!esPrincipal) {
                opciones.push({ icon: '⭐', label: 'Convertir en principal', action: () => this.convertirVarianteEnPrincipal(idx) });
                opciones.push({ icon: '🗑️', label: 'Eliminar variante', action: () => this.eliminarVariante(idx), danger: true });
            } else {
                opciones.push({ icon: 'ℹ️', label: 'Es la variante principal', action: () => {}, disabled: true });
            }

            menu.innerHTML = opciones.map((op, i) =>
                `<button class="cm-tablero-context-item" data-op-idx="${i}" ${op.disabled ? 'disabled' : ''} style="display:flex; align-items:center; gap:8px; width:100%; padding:8px 12px; background:none; border:none; text-align:left; cursor:${op.disabled ? 'not-allowed' : 'pointer'}; border-radius:6px; font-size:0.85rem; color:${op.danger ? '#dc2626' : (op.disabled ? '#94a3b8' : '#1e293b')}; font-family:inherit;">${op.icon} ${op.label}</button>`
            ).join('');

            document.body.appendChild(menu);

            menu.querySelectorAll('[data-op-idx]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const i = parseInt(btn.dataset.opIdx, 10);
                    if (!opciones[i].disabled) {
                        opciones[i].action();
                        menu.remove();
                    }
                });
                btn.addEventListener('mouseenter', () => {
                    if (!opciones[parseInt(btn.dataset.opIdx, 10)].disabled) btn.style.background = '#f1f5f9';
                });
                btn.addEventListener('mouseleave', () => { btn.style.background = 'none'; });
            });

            setTimeout(() => {
                const cerrar = (ev) => {
                    if (!menu.contains(ev.target)) {
                        menu.remove();
                        document.removeEventListener('click', cerrar);
                        document.removeEventListener('contextmenu', cerrar);
                    }
                };
                document.addEventListener('click', cerrar);
                document.addEventListener('contextmenu', cerrar);
            }, 100);
        }

        convertirVarianteEnPrincipal(idx) {
            if (idx <= 0) return;
            const lineas = obtenerLineasCompletas(this.arbol);
            const lineaObjetivo = lineas[idx];
            if (!lineaObjetivo || lineaObjetivo.length === 0) return;
            const primerNodo = lineaObjetivo[0];
            const padre = primerNodo.parent;
            if (!padre) return;
            const posicionActual = padre.children.indexOf(primerNodo);
            if (posicionActual <= 0) return;

            padre.children.splice(posicionActual, 1);
            padre.children.unshift(primerNodo);

            const cap = this.capitulos[this.capituloActual];
            cap.arbol = this.arbol;
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
            this.mostrarToast('⭐ Variante convertida en principal', 'elo-up');
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

        // --------------------------------------------------------
        // TOAST
        // --------------------------------------------------------
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
            if (this.reloj) this.reloj.detener();
            if (this._relojUiTimer) clearTimeout(this._relojUiTimer);
            if (this._sfReadyHandler) {
                document.removeEventListener('cm-tablero-sf-ready', this._sfReadyHandler);
                this._sfReadyHandler = null;
            }
            if (this.esModoAdmin) {
                ELO.bloquearCambios = false;
            }
            this.contenedor.innerHTML = '';
        }
    }

    // === FIN DE LA PARTE 3C/4 ===
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
                    limpiarArbolDuplicados(arbol);
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

        bloquearELO() { ELO.bloquearCambios = true; },
        permitirELO() { ELO.bloquearCambios = false; },

        arbolAPGN(arbol, headers) { return arbolAPGN(arbol, headers); },

        // ⭐ v9: utilidades expuestas
        convertirUrlImagen(url) { return convertirUrlImagen(url); },

        getModoEdicionPersistente() {
            try {
                return localStorage.getItem(MODO_EDICION_KEY) === 'true';
            } catch (e) { return false; }
        },

        setModoEdicionPersistente(activo) {
            try {
                localStorage.setItem(MODO_EDICION_KEY, activo ? 'true' : 'false');
                return true;
            } catch (e) { return false; }
        },

        // ⭐ v12: NUEVOS MÉTODOS PARA SALA LIBRE
        // Abre una partida libre vs Stockfish en el contenedor especificado
        // config: { nivelSF, colorHumano, tiempo }
        // contexto: { onSalirSalaLibre, onFinPartida, esAdmin, uid }
        abrirSalaLibre(contenedor, config, contexto) {
            if (!contenedor || !(contenedor instanceof HTMLElement)) {
                console.warn('[Entrenador] Contenedor inválido para sala libre');
                return null;
            }

            const configSalaLibre = {
                esSalaLibre: true,
                nivelSF: config.nivelSF || 5,
                colorHumano: config.colorHumano || 'w',
                tiempo: config.tiempo || 'libre',
                modo: 'ordenador',
                orientacion: 'auto'
            };

            const contextoSalaLibre = Object.assign({}, contexto, {
                esSalaLibre: true
            });

            return this.render(contenedor, configSalaLibre, contextoSalaLibre);
        },

        // Devuelve las opciones de tiempo disponibles (para los selectores)
        obtenerTiemposPartida() {
            return Object.entries(TIEMPOS_PARTIDA).map(([clave, cfg]) => ({
                id: clave,
                nombre: cfg.nombre,
                segundos: cfg.segundos,
                incremento: cfg.incremento
            }));
        },

        // Devuelve los niveles de Stockfish disponibles
        obtenerNiveles() {
            return Object.entries(NIVELES_SF).map(([nivel, cfg]) => ({
                nivel: parseInt(nivel, 10),
                nombre: cfg.nombre,
                eloBot: ELO_BOT[nivel] || 1600
            }));
        },

        // ⭐ v12: Precalienta Stockfish (útil para que esté listo antes de la partida)
        precargarStockfish() {
            SF.init();
            return new Promise((resolve) => {
                if (SF.ready) return resolve(true);
                const handler = () => {
                    document.removeEventListener('cm-tablero-sf-ready', handler);
                    resolve(true);
                };
                document.addEventListener('cm-tablero-sf-ready', handler);
                // Timeout de 8 segundos
                setTimeout(() => {
                    document.removeEventListener('cm-tablero-sf-ready', handler);
                    resolve(SF.ready);
                }, 8000);
            });
        },

        // ⭐ v12: Estado del motor (útil para mostrar en UI)
        estadoStockfish() {
            if (SF.ready) return 'listo';
            if (SF.worker) return 'cargando';
            return 'inactivo';
        }
    };

    console.log('✅ Entrenador cargado (v12: sala libre + reloj + deshacer + análisis + compartir). API: window.Entrenador');
})();
