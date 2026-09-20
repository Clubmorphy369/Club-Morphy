/* ============================================================
   ENTRENADOR DE AJEDREZ — Club Morphy (Fase 5)
   Módulo encapsulado. Expone window.Entrenador con la API:
     - render(contenedor, config, contexto)
     - destroy(contenedor)
     - analizarPGN(pgn)
   Cero colisiones con styles.css / script.js de la academia.
   ============================================================ */

(function () {
    'use strict';

    // ============================================================
    // CONSTANTES GLOBALES DEL MÓDULO
    // ============================================================

    // Piezas SVG (una sola vez, compartidas)
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

    // ELO
    const ELO_INICIAL = 1200;
    const ELO_MIN = 100;
    const ELO_MAX = 3000;
    const ELO_STORAGE_KEY = 'entrenadorEloData_v2';

    // Stockfish: ELO aproximado por nivel
    const ELO_BOT = { 1: 800, 2: 1000, 3: 1200, 4: 1400, 5: 1600, 6: 1800, 7: 2100, 8: 2400 };

    // Configuración Stockfish por nivel
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

    // Valores de piezas (fallback minimax)
    const VALORES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

    // PGN de ejemplo
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
    // UTILIDADES GLOBALES
    // ============================================================
    let _contadorInstancias = 0;

    function escapeHtml(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    // ============================================================
    // STOCKFISH GLOBAL (una sola instancia compartida)
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

        enviar(cmd) {
            if (this.worker) this.worker.postMessage(cmd);
        },

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
    // SISTEMA ELO (global, persistido en localStorage)
    // ============================================================
    const ELO = {
        data: null,

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

    // Cargar ELO una sola vez al inicializar el módulo
    ELO.cargar();

    // ============================================================
    // PGN PARSER (funciones puras)
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
                } catch (e) { /* movimiento inválido */ }
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
    // CLASE PRINCIPAL: INSTANCIA DEL TABLERO
    // ============================================================
    class InstanciaTablero {
        constructor(contenedor, config, contexto) {
            this.contenedor = contenedor;
            this.config = config || {};
            this.contexto = contexto || {};
            this.idInstancia = 'cm-' + (++_contadorInstancias);
            this.destroyed = false;

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

            // ID counter para nodos del árbol
            this._idCounter = { v: 0, next() { return ++this.v; } };

            this.init();
        }

        // --------------------------------------------------------
        // INICIALIZACIÓN
        // --------------------------------------------------------
        init() {
            const cfg = this.config;

            // Cargar PGN
            if (cfg.pgn) {
                this.cargarCapitulosDesdePGN(cfg.pgn);
            }

            if (this.capitulos.length === 0) {
                this.contenedor.innerHTML =
                    '<div class="cm-tablero-error-msg">⚠️ No se pudieron cargar capítulos del PGN.</div>';
                return;
            }

            // Construir estructura HTML base
            this.construirEstructuraHTML();

            // Cargar capítulo inicial
            this.cargarCapitulo(0);

            // Cargar Stockfish solo si el modo es ordenador
            if (cfg.modo === 'ordenador') SF.init();
        }

        construirEstructuraHTML() {
            const esAdmin = !!this.contexto.esAdmin;
            const cfg = this.config;

            this.contenedor.innerHTML = `
                <div class="cm-tablero-wrap">
                    <div class="cm-tablero-game">
                        <div>
                            <div class="cm-tablero-board-wrap">
                                <div class="cm-tablero-board" data-rol="board"></div>
                            </div>
                            <div class="cm-tablero-progress-info" data-rol="progressInfo"></div>
                        </div>
                        <div>
                            <div class="cm-tablero-meta" data-rol="meta"></div>

                            <div class="cm-tablero-config-panel cm-tablero-hidden" data-rol="configPanel">
                                <div class="cm-titulo-config">⚙️ Configuración (solo admin)</div>
                                <div class="cm-fila">
                                    <label>Modo:</label>
                                    <select data-rol="configModo">
                                        <option value="ejercicio">🎯 Ejercicio (buscar solución)</option>
                                        <option value="ordenador">🤖 Jugar vs PC</option>
                                    </select>
                                </div>
                                <div class="cm-fila" data-rol="filaColor">
                                    <label>Humano:</label>
                                    <select data-rol="configColor">
                                        <option value="w">♔ Blancas</option>
                                        <option value="b">♚ Negras</option>
                                    </select>
                                </div>
                                <div class="cm-fila" data-rol="filaNivel">
                                    <label>Nivel SF:</label>
                                    <select data-rol="configNivel">
                                        <option value="1">1 - Principiante (800)</option>
                                        <option value="2">2 - Muy fácil (1000)</option>
                                        <option value="3">3 - Fácil (1200)</option>
                                        <option value="4">4 - Normal (1400)</option>
                                        <option value="5" selected>5 - Intermedio (1600)</option>
                                        <option value="6">6 - Difícil (1800)</option>
                                        <option value="7">7 - Muy difícil (2100)</option>
                                        <option value="8">8 - Maestro (2400)</option>
                                    </select>
                                </div>
                                <div class="cm-fila">
                                    <label>Orientación:</label>
                                    <select data-rol="configOrientacion">
                                        <option value="auto">🔄 Auto</option>
                                        <option value="white">♔ Blancas abajo</option>
                                        <option value="black">♚ Negras abajo</option>
                                    </select>
                                </div>
                                <div class="cm-tablero-engine-status" data-rol="engineStatus">⏸️ Motor cargando…</div>
                            </div>

                            ${esAdmin ? `
                            <div class="cm-tablero-variantes-editor" data-rol="variantesEditor">
                                <div class="cm-titulo">
                                    <span>🌿 Variantes guardadas</span>
                                    <span data-rol="variantesCount"></span>
                                </div>
                                <div data-rol="variantesLista"></div>
                            </div>
                            ` : ''}

                            ${esAdmin ? `
                            <div class="cm-tablero-variants-progress cm-tablero-hidden" data-rol="variantsProgress">
                                <div class="cm-titulo">
                                    <span>🌿 Progreso de soluciones</span>
                                    <span data-rol="variantsProgreso">0/0</span>
                                </div>
                                <div class="cm-dots" data-rol="variantsDots"></div>
                            </div>
                            ` : ''}

                            <div class="cm-tablero-status info" data-rol="status">Cargando…</div>

                            <div class="cm-tablero-moves cm-tablero-hidden" data-rol="moves"></div>

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
                        </div>
                    </div>
                </div>
            `;

            // Guardar referencias
            this.$board = this.contenedor.querySelector('[data-rol="board"]');
            this.$progressInfo = this.contenedor.querySelector('[data-rol="progressInfo"]');
            this.$meta = this.contenedor.querySelector('[data-rol="meta"]');
            this.$status = this.contenedor.querySelector('[data-rol="status"]');
            this.$moves = this.contenedor.querySelector('[data-rol="moves"]');
            this.$configPanel = this.contenedor.querySelector('[data-rol="configPanel"]');
            this.$variantesEditor = this.contenedor.querySelector('[data-rol="variantesEditor"]');
            this.$variantsProgress = this.contenedor.querySelector('[data-rol="variantsProgress"]');
            this.$engineStatus = this.contenedor.querySelector('[data-rol="engineStatus"]');

            // Aplicar configuración inicial
            if (this.config.modo) {
                const sel = this.contenedor.querySelector('[data-rol="configModo"]');
                if (sel) sel.value = this.config.modo;
            }
            if (this.config.colorHumano) {
                const sel = this.contenedor.querySelector('[data-rol="configColor"]');
                if (sel) sel.value = this.config.colorHumano;
                this.colorHumano = this.config.colorHumano;
            }
            if (this.config.nivelSF) {
                const sel = this.contenedor.querySelector('[data-rol="configNivel"]');
                if (sel) sel.value = this.config.nivelSF;
            }
            if (this.config.orientacion) {
                const sel = this.contenedor.querySelector('[data-rol="configOrientacion"]');
                if (sel) sel.value = this.config.orientacion;
            }

            // Eventos de botones
            this._on('[data-rol="btnReiniciar"]', 'click', () => this.reiniciar());
            this._on('[data-rol="btnVoltear"]', 'click', () => this.voltear());
            this._on('[data-rol="btnPista"]', 'click', () => this.pista());
            this._on('[data-rol="btnVerSol"]', 'click', () => this.verSolucion());
            this._on('[data-rol="btnPrev"]', 'click', () => this.capituloAnterior());
            this._on('[data-rol="btnNext"]', 'click', () => this.capituloSiguiente());

            // Eventos del config panel (admin)
            if (esAdmin) {
                this._on('[data-rol="configModo"]', 'change', (e) => this.cambiarModo(e.target.value));
                this._on('[data-rol="configColor"]', 'change', (e) => this.cambiarColor(e.target.value));
                this._on('[data-rol="configNivel"]', 'change', (e) => this.cambiarNivel(e.target.value));
                this._on('[data-rol="configOrientacion"]', 'change', (e) => this.cambiarOrientacion(e.target.value));
                this.$configPanel.classList.remove('cm-tablero-hidden');
                if (this.$variantesEditor) this.$variantesEditor.classList.remove('cm-tablero-hidden');
            }

            // Escuchar cuando Stockfish esté listo
            document.addEventListener('cm-tablero-sf-ready', this._sfReadyHandler = () => {
                this.actualizarEstadoMotor();
            });

            this.actualizarEstadoMotor();
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

        // --------------------------------------------------------
        // CARGA DE PGN
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
                orientacionAuto: turnoAuto
            };
        }

        // --------------------------------------------------------
        // CARGA DE CAPÍTULO
        // --------------------------------------------------------
        cargarCapitulo(idx) {
            idx = parseInt(idx, 10);
            if (!this.capitulos[idx]) return;
            this.capituloActual = idx;
            const cap = this.capitulos[idx];

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

            // Meta
            const eloCap = ELO.obtenerCapitulo(cap.estudio, idx);
            this.$meta.innerHTML = `<strong>Capítulo ${idx + 1} de ${this.capitulos.length}</strong> · ${escapeHtml(cap.estudio)} · 🏆 ELO ${eloCap}`;

            // Config panel refleja el estado
            this.sincronizarConfigPanel();

            this.construirTablero();
            this.dibujarPiezas();
            this.actualizarMovimientos();
            this.actualizarBotonesModo();
            this.actualizarProgreso();
            this.actualizarVariantesEditor();
            this.actualizarVariantesProgreso();

            if (modo === 'ordenador') {
                this.iniciarModoOrdenador();
            } else {
                this.setStatus('info', 'Tu turno. Encuentra la mejor jugada.');
            }
        }

        sincronizarConfigPanel() {
            if (!this.$configPanel) return;
            const modo = this.config.modo || 'ejercicio';
            const selModo = this.contenedor.querySelector('[data-rol="configModo"]');
            const selColor = this.contenedor.querySelector('[data-rol="configColor"]');
            const selNivel = this.contenedor.querySelector('[data-rol="configNivel"]');
            const selOrientacion = this.contenedor.querySelector('[data-rol="configOrientacion"]');
            const filaColor = this.contenedor.querySelector('[data-rol="filaColor"]');
            const filaNivel = this.contenedor.querySelector('[data-rol="filaNivel"]');
            if (selModo) selModo.value = modo;
            if (selColor) selColor.value = this.config.colorHumano || 'w';
            if (selNivel) selNivel.value = this.config.nivelSF || 5;
            if (selOrientacion) selOrientacion.value = this.config.orientacion || 'auto';
            if (filaColor) filaColor.style.display = modo === 'ordenador' ? 'flex' : 'none';
            if (filaNivel) filaNivel.style.display = modo === 'ordenador' ? 'flex' : 'none';
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
            // Jaque
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
            // Última jugada
            const hist = this.chess.history({ verbose: true });
            if (hist.length > 0) {
                const u = hist[hist.length - 1];
                const f = this.$board.querySelector(`[data-square="${u.from}"]`);
                const t = this.$board.querySelector(`[data-square="${u.to}"]`);
                if (f) f.classList.add('last-move');
                if (t) t.classList.add('last-move');
            }
            // Selección actual
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
            if (this.destroyed || this.bloqueado || this.esperandoRespuesta) return;
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

            // Modo ejercicio: buscar en el árbol
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
                const cambio = ELO.aplicar(cap.estudio, this.capituloActual, -3, `Error en ${cap.nombre}`);
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
        // COMPLETAR HOJA / VARIANTE
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
                if (!this.eloAplicado) {
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
                    this.actualizarMetaELO();
                }
                // Notificar al padre (para marcar el bloque como "Visto")
                if (this.contexto.onCompletado) {
                    try { this.contexto.onCompletado(); } catch (e) {}
                }
                return;
            }

            // Pasar a la siguiente variante
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
            this.setStatus('ordenador', textoEstado);

            // Cálculo simple del cambio ELO (el análisis profundo queda para Fase 5.6)
            const eloActual = ELO.obtenerCapitulo(cap.estudio, this.capituloActual);
            const cambio = ELO.calcular(eloActual, eloBot, resultado);
            if (cambio !== 0) {
                const cambioReal = ELO.aplicar(
                    cap.estudio, this.capituloActual, cambio,
                    `${resultado === 1 ? 'Victoria' : (resultado === 0 ? 'Derrota' : 'Tablas')} vs Nv${nivel}`
                );
                if (cambioReal !== 0) {
                    const tipo = cambioReal > 0 ? 'elo-up' : 'elo-down';
                    const signo = cambioReal > 0 ? '+' : '';
                    this.mostrarToast(`🏆 ${signo}${cambioReal} ELO`, tipo);
                }
                this.actualizarMetaELO();
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
            if (this.respuestaAutoTimeout) { clearTimeout(this.respuestaAutoTimeout); this.respuestaAutoTimeout = null; }
            this.cargarCapitulo(this.capituloActual);
        }

        voltear() {
            this.orientacion = this.orientacion === 'white' ? 'black' : 'white';
            this.construirTablero();
            this.dibujarPiezas();
        }

        pista() {
            const modo = this.config.modo || 'ejercicio';
            if (modo !== 'ejercicio' || !this.nodoActual || this.nodoActual.children.length === 0) {
                this.mostrarToast('No hay pista disponible', ''); return;
            }
            const child = this.nodoActual.children[0];
            this.pistasUsadas++;
            const cap = this.capitulos[this.capituloActual];
            const cambio = ELO.aplicar(cap.estudio, this.capituloActual, -3, `Pista en ${cap.nombre}`);
            if (cambio !== 0) this.mostrarToast(`💡 Pista · ${cambio} ELO`, 'elo-down');
            this.actualizarMetaELO();
            this.setStatus('info', `💡 Pista: mueve de ${child.move.from} a ${child.move.to}`);
            const fromEl = this.$board.querySelector(`[data-square="${child.move.from}"]`);
            const toEl = this.$board.querySelector(`[data-square="${child.move.to}"]`);
            if (fromEl) fromEl.classList.add('selected');
            if (toEl) toEl.classList.add('legal-capture');
        }

        verSolucion() {
            const modo = this.config.modo || 'ejercicio';
            if (modo !== 'ejercicio') return;
            // Modal de confirmación
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
            const cambio = ELO.aplicar(cap.estudio, this.capituloActual, -8, `Solución vista en ${cap.nombre}`);
            if (cambio !== 0) this.mostrarToast(`❌ Solución vista · ${cambio} ELO`, 'elo-down');
            this.actualizarMetaELO();
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

        capituloAnterior() {
            if (this.capituloActual > 0) this.cargarCapitulo(this.capituloActual - 1);
        }

        capituloSiguiente() {
            if (this.capituloActual < this.capitulos.length - 1) this.cargarCapitulo(this.capituloActual + 1);
        }

        // --------------------------------------------------------
        // CONFIG PANEL (admin)
        // --------------------------------------------------------
        cambiarModo(nuevoModo) {
            this.config.modo = nuevoModo;
            this.sincronizarConfigPanel();
            this.mostrarToast(nuevoModo === 'ordenador' ? '🤖 Modo vs PC' : '🎯 Modo Ejercicio', '');
            this.cargarCapitulo(this.capituloActual);
        }
        cambiarColor(color) {
            this.config.colorHumano = color;
            this.mostrarToast(`Humano: ${color === 'w' ? '♔ Blancas' : '♚ Negras'}`, '');
            this.cargarCapitulo(this.capituloActual);
        }
        cambiarNivel(nivel) {
            this.config.nivelSF = parseInt(nivel, 10);
            this.mostrarToast(`Stockfish: Nv${nivel} (~${ELO_BOT[nivel]} ELO)`, '');
        }
        cambiarOrientacion(valor) {
            this.config.orientacion = valor;
            if (valor === 'auto') this.orientacion = this.orientacionAuto;
            else this.orientacion = valor;
            this.construirTablero();
            this.dibujarPiezas();
        }

        // --------------------------------------------------------
        // ACTUALIZACIONES DE UI
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
            if (btnPrev) btnPrev.disabled = this.capituloActual === 0;
            if (btnNext) btnNext.disabled = this.capituloActual === this.capitulos.length - 1;
        }

        actualizarMetaELO() {
            const cap = this.capitulos[this.capituloActual];
            if (!cap) return;
            const eloCap = ELO.obtenerCapitulo(cap.estudio, this.capituloActual);
            this.$meta.innerHTML = `<strong>Capítulo ${this.capituloActual + 1} de ${this.capitulos.length}</strong> · ${escapeHtml(cap.estudio)} · 🏆 ELO ${eloCap}`;
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
            if (!this.$variantesEditor) return;
            const lineas = obtenerLineasCompletas(this.arbol);
            const countEl = this.contenedor.querySelector('[data-rol="variantesCount"]');
            if (countEl) countEl.textContent = `${lineas.length} línea${lineas.length === 1 ? '' : 's'}`;
            const lista = this.contenedor.querySelector('[data-rol="variantesLista"]');
            if (!lista) return;
            lista.innerHTML = lineas.map((linea, idx) => {
                const texto = linea.map((nodo, j) => {
                    const num = Math.floor(j / 2) + 1;
                    const pre = nodo.move.color === 'w' ? `${num}.` : `${num}…`;
                    return `${pre} ${nodo.move.san}`;
                }).join(' ');
                const esPrincipal = idx === 0;
                const badge = esPrincipal ? '<span class="cm-badge-principal">Principal</span>' : '';
                return `<div class="cm-tablero-variante-item">
                    <div class="cm-texto">${badge} ${escapeHtml(texto)}</div>
                    <button class="cm-btn-del" ${esPrincipal ? 'disabled' : ''} data-variante="${idx}">${esPrincipal ? '—' : '🗑️'}</button>
                </div>`;
            }).join('');
            // Eventos de borrado (Fase 5.8 implementará guardar en Firestore)
            lista.querySelectorAll('[data-variante]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = parseInt(btn.dataset.variante, 10);
                    if (idx > 0) this.eliminarVariante(idx);
                });
            });
        }

        eliminarVariante(indiceLinea) {
            const lineas = obtenerLineasCompletas(this.arbol);
            if (indiceLinea <= 0 || indiceLinea >= lineas.length) {
                this.mostrarToast('No se puede eliminar la principal', ''); return;
            }
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
            this.actualizarVariantesEditor();
            this.actualizarVariantesProgreso();
            this.mostrarToast('🗑️ Variante eliminada', '');
        }

        actualizarVariantesProgreso() {
            if (!this.$variantsProgress) return;
            const dots = this.contenedor.querySelector('[data-rol="variantsDots"]');
            const count = this.contenedor.querySelector('[data-rol="variantsProgreso"]');
            if (!dots || !count) return;
            if (this.hojasTotales.length <= 1) {
                this.$variantsProgress.classList.add('cm-tablero-hidden');
                return;
            }
            this.$variantsProgress.classList.remove('cm-tablero-hidden');
            count.textContent = `${this.hojasCompletadas.size}/${this.hojasTotales.length}`;
            dots.innerHTML = this.hojasTotales.map((h, i) => {
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
        // DESTRUIR
        // --------------------------------------------------------
        destroy() {
            this.destroyed = true;
            if (this.respuestaAutoTimeout) { clearTimeout(this.respuestaAutoTimeout); this.respuestaAutoTimeout = null; }
            if (this._sfReadyHandler) {
                document.removeEventListener('cm-tablero-sf-ready', this._sfReadyHandler);
                this._sfReadyHandler = null;
            }
            this.contenedor.innerHTML = '';
        }
    }

    // ============================================================
    // API PÚBLICA
    // ============================================================
    const instancias = new WeakMap();

    window.Entrenador = {
        /**
         * Renderiza un tablero dentro de un contenedor.
         * @param {HTMLElement} contenedor
         * @param {Object} config - { pgn, modo, colorHumano, nivelSF, orientacion }
         * @param {Object} contexto - { esAdmin, uid, nombreTema, onCompletado }
         */
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

        /**
         * Destruye la instancia del contenedor.
         */
        destroy(contenedor) {
            if (instancias.has(contenedor)) {
                instancias.get(contenedor).destroy();
                instancias.delete(contenedor);
            }
        },

        /**
         * Analiza un PGN y devuelve metadata (capítulos y soluciones).
         * Útil para el editor admin (vista previa).
         */
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

        /**
         * Devuelve el ELO global del alumno.
         */
        obtenerELO() {
            return ELO.data ? ELO.data.total : ELO_INICIAL;
        },

        /**
         * Fuerza la carga de Stockfish (útil para precalentar).
         */
        initStockfish() {
            SF.init();
        },

        /**
         * Reinicia todo el ELO guardado en localStorage.
         * (Solo para desarrollo / admin)
         */
        reiniciarELO() {
            ELO.default();
            ELO.guardar();
        }
    };

    console.log('✅ Entrenador cargado como módulo (Fase 5). API: window.Entrenador');
})();
