/* ============================================================
   ENTRENADOR API — Club Morphy
   
   Contiene: API pública window.Entrenador.
   Depende de: entrenador-core.js + entrenador-tablero.js
   Expone: window.Entrenador
   ============================================================ */

(function () {
    'use strict';

    const Core = window.CMEntrenadorCore;
    const Tablero = window.CMEntrenador;

    if (!Core) {
        console.error('[Entrenador] CMEntrenadorCore no está cargado. Asegúrate de cargar entrenador-core.js primero.');
        return;
    }
    if (!Tablero || !Tablero.InstanciaTablero) {
        console.error('[Entrenador] CMEntrenadorTablero no está cargado. Asegúrate de cargar entrenador-tablero.js primero.');
        return;
    }

    const { InstanciaTablero } = Tablero;
    const { SF, ELO, TIEMPOS_PARTIDA, NIVELES_SF, ELO_BOT, ELO_INICIAL, MODO_EDICION_KEY } = Core;
    const { convertirUrlImagen, arbolAPGN, construirArbolPGN, limpiarArbolDuplicados, contarLineas } = Core;

    // ⭐ Instancias activas por contenedor
    const instancias = new WeakMap();

    // ============================================================
    // API PÚBLICA
    // ============================================================
    window.Entrenador = {
        // --------------------------------------------------------
        // RENDER
        // --------------------------------------------------------
        render(contenedor, config, contexto) {
            if (!contenedor || !(contenedor instanceof HTMLElement)) {
                console.warn('[Entrenador] Contenedor inválido');
                return null;
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

        // --------------------------------------------------------
        // ANÁLISIS DE PGN
        // --------------------------------------------------------
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

        // --------------------------------------------------------
        // ELO
        // --------------------------------------------------------
        obtenerELO() {
            return ELO.data ? ELO.data.total : ELO_INICIAL;
        },

        reiniciarELO() {
            ELO.default();
            ELO.guardar();
        },

        bloquearELO() { ELO.bloquearCambios = true; },
        permitirELO() { ELO.bloquearCambios = false; },

        // --------------------------------------------------------
        // STOCKFISH
        // --------------------------------------------------------
        initStockfish() {
            SF.init();
        },

        precargarStockfish() {
            SF.init();
            return new Promise((resolve) => {
                if (SF.ready) return resolve(true);
                const handler = () => {
                    document.removeEventListener('cm-tablero-sf-ready', handler);
                    resolve(true);
                };
                document.addEventListener('cm-tablero-sf-ready', handler);
                setTimeout(() => {
                    document.removeEventListener('cm-tablero-sf-ready', handler);
                    resolve(SF.ready);
                }, 8000);
            });
        },

        estadoStockfish() {
            if (SF.ready) return 'listo';
            if (SF.worker) return 'cargando';
            return 'inactivo';
        },

        // --------------------------------------------------------
        // UTILIDADES
        // --------------------------------------------------------
        arbolAPGN(arbol, headers) {
            return arbolAPGN(arbol, headers);
        },

        convertirUrlImagen(url) {
            return convertirUrlImagen(url);
        },

        // --------------------------------------------------------
        // MODO EDICIÓN PERSISTENTE
        // --------------------------------------------------------
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

        // --------------------------------------------------------
        // SALA LIBRE (jugar vs IA)
        // --------------------------------------------------------
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

        // --------------------------------------------------------
        // UTILIDADES PARA SELECTORES
        // --------------------------------------------------------
        obtenerTiemposPartida() {
            return Object.entries(TIEMPOS_PARTIDA).map(([clave, cfg]) => ({
                id: clave,
                nombre: cfg.nombre,
                segundos: cfg.segundos,
                incremento: cfg.incremento
            }));
        },

        obtenerNiveles() {
            return Object.entries(NIVELES_SF).map(([nivel, cfg]) => ({
                nivel: parseInt(nivel, 10),
                nombre: cfg.nombre,
                eloBot: ELO_BOT[nivel] || 1600
            }));
        }
    };

    console.log('✅ CMEntrenadorAPI cargado — window.Entrenador listo');

})();
