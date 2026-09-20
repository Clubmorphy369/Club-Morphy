/* ============================================================
   ENTRENADOR DE AJEDREZ — Club Morphy (Fase 5 + editor variantes)
   Prefijo .cm-tablero- para evitar colisiones con styles.css
   ============================================================ */

.cm-tablero-wrap {
    --cm-acento: #0ea5e9;
    --cm-acento-oscuro: #0284c7;
    --cm-bg: #ffffff;
    --cm-surface: #f1f5f9;
    --cm-surface2: #e2e8f0;
    --cm-texto: #1e293b;
    --cm-texto-suave: #64748b;
    --cm-borde: #cbd5e1;
    --cm-exito: #16a34a;
    --cm-peligro: #dc2626;
    --cm-warning: #f59e0b;
    --cm-alternativa: #8b5cf6;
    --cm-ordenador: #f59e0b;
    --cm-elo: #d97706;
    --cm-elo-subida: #16a34a;
    --cm-elo-bajada: #dc2626;
    --cm-edicion: #f97316;

    font-family: 'Lato', 'Segoe UI', system-ui, sans-serif;
    color: var(--cm-texto);
    line-height: 1.6;
    box-sizing: border-box;
}

.cm-tablero-wrap *,
.cm-tablero-wrap *::before,
.cm-tablero-wrap *::after {
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent;
}

/* ============================================================
   CONTENEDORES GENERALES
   ============================================================ */
.cm-tablero-card { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.cm-tablero-titulo { font-size: 1.1rem; color: var(--cm-acento); margin-bottom: 12px; font-weight: 700; }
.cm-tablero-meta { color: var(--cm-texto-suave); font-size: 0.85rem; margin-bottom: 10px; }

/* ============================================================
   BOTONES
   ============================================================ */
.cm-tablero-btn {
    background: var(--cm-acento); color: #fff; border: none;
    padding: 10px 16px; border-radius: 8px; font-weight: 600;
    cursor: pointer; font-size: 0.9rem; min-height: 42px;
    font-family: inherit; transition: opacity 0.2s, transform 0.1s;
}
.cm-tablero-btn:hover { opacity: 0.9; }
.cm-tablero-btn:active { transform: scale(0.97); }
.cm-tablero-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.cm-tablero-btn-sec { background: var(--cm-surface2); color: var(--cm-texto); }
.cm-tablero-btn-peligro { background: var(--cm-peligro); color: #fff; }
.cm-tablero-btn-alternativa { background: var(--cm-alternativa); color: #fff; font-size: 0.82rem; padding: 6px 10px; min-height: 34px; }
.cm-tablero-btn-ordenador { background: var(--cm-ordenador); color: #1e293b; }
.cm-tablero-btn-elo { background: var(--cm-elo); color: #fff; font-size: 0.85rem; }
.cm-tablero-btn-admin {
    background: linear-gradient(135deg, #f97316, #fb923c);
    color: white; border: none;
    padding: 10px 16px; border-radius: 8px;
    font-weight: 700; cursor: pointer; font-size: 0.85rem;
    min-height: 40px; font-family: inherit;
    display: inline-flex; align-items: center; gap: 6px;
    box-shadow: 0 2px 8px rgba(249, 115, 22, 0.3);
}
.cm-tablero-btn-admin:hover { box-shadow: 0 4px 16px rgba(249, 115, 22, 0.5); transform: translateY(-1px); }
.cm-tablero-btn-guardar {
    background: linear-gradient(135deg, #16a34a, #22c55e);
    color: white; border: none;
    padding: 10px 18px; border-radius: 8px;
    font-weight: 700; cursor: pointer; font-size: 0.88rem;
    min-height: 42px; font-family: inherit;
    display: inline-flex; align-items: center; gap: 6px;
    box-shadow: 0 2px 8px rgba(22, 163, 74, 0.35);
}
.cm-tablero-btn-guardar:hover { box-shadow: 0 4px 16px rgba(22, 163, 74, 0.55); transform: translateY(-1px); }

/* ============================================================
   INPUTS Y SELECTS
   ============================================================ */
.cm-tablero-select {
    padding: 8px 12px; border: 1px solid var(--cm-borde);
    border-radius: 8px; font-size: 0.9rem;
    background: #fff; min-height: 38px;
    font-family: inherit; color: var(--cm-texto);
}
.cm-tablero-textarea {
    width: 100%; min-height: 130px; padding: 10px;
    border: 1px solid var(--cm-borde); border-radius: 8px;
    font-family: 'Courier New', monospace; font-size: 0.8rem;
    resize: vertical; color: var(--cm-texto);
}
.cm-tablero-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-top: 10px; }

/* ============================================================
   MODALES (agregados a <body>, requieren variables propias)
   ============================================================ */
.cm-tablero-modal-overlay {
    --cm-acento: #0ea5e9;
    --cm-acento-oscuro: #0284c7;
    --cm-bg: #ffffff;
    --cm-surface: #f1f5f9;
    --cm-surface2: #e2e8f0;
    --cm-texto: #1e293b;
    --cm-texto-suave: #64748b;
    --cm-borde: #cbd5e1;
    --cm-exito: #16a34a;
    --cm-peligro: #dc2626;
    --cm-warning: #f59e0b;

    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    overflow-y: auto;
    font-family: 'Lato', 'Segoe UI', system-ui, sans-serif;
    color: var(--cm-texto);
}
.cm-tablero-modal-overlay *,
.cm-tablero-modal-overlay *::before,
.cm-tablero-modal-overlay *::after {
    box-sizing: border-box;
}
.cm-tablero-modal-content {
    background: #fff; border-radius: 16px; padding: 24px;
    max-width: 520px; width: 100%; margin: auto;
    color: var(--cm-texto);
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}
.cm-tablero-modal-content h3 { margin-bottom: 12px; font-size: 1.15rem; color: var(--cm-peligro); }
.cm-tablero-modal-content p { color: var(--cm-texto-suave); font-size: 0.9rem; margin-bottom: 16px; line-height: 1.6; }
.cm-tablero-modal-acciones { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; }
.cm-tablero-modal-acciones .cm-tablero-btn { padding: 10px 18px; font-size: 0.88rem; }

/* ============================================================
   INDICADOR DE MODO (siempre visible para admin)
   ============================================================ */
.cm-tablero-modo-indicator {
    padding: 12px 16px;
    border-radius: 10px;
    font-size: 0.88rem;
    font-weight: 600;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 10px;
    transition: all 0.3s;
    border: 2px solid transparent;
}
.cm-tablero-modo-indicator.normal {
    background: linear-gradient(135deg, #e0f2fe, #bae6fd);
    border-color: #0ea5e9;
    color: #075985;
}
.cm-tablero-modo-indicator.editing {
    background: linear-gradient(135deg, #fed7aa, #fdba74);
    border-color: var(--cm-edicion);
    color: #7c2d12;
    animation: cm-tablero-pulse-edit 1.5s infinite;
    box-shadow: 0 0 20px rgba(249, 115, 22, 0.4);
}
.cm-tablero-modo-indicator.editing strong {
    font-size: 1rem;
    letter-spacing: 0.5px;
}
@keyframes cm-tablero-pulse-edit {
    0%, 100% { box-shadow: 0 0 20px rgba(249, 115, 22, 0.4); }
    50% { box-shadow: 0 0 30px rgba(249, 115, 22, 0.7); }
}

/* Cuando el bloque entero está en modo edición */
.cm-tablero-wrap.cm-editando .cm-tablero-board-wrap {
    outline: 3px solid var(--cm-edicion);
    outline-offset: 3px;
    box-shadow: 0 0 30px rgba(249, 115, 22, 0.5);
}
.cm-tablero-wrap.cm-editando .cm-tablero-board {
    cursor: crosshair;
}
.cm-tablero-wrap.cm-editando .cm-tablero-square {
    cursor: crosshair;
}

/* ============================================================
   BARRA DE EDICIÓN DE VARIANTES
   ============================================================ */
.cm-tablero-edit-toolbar {
    background: linear-gradient(135deg, #fff7ed, #ffedd5);
    border: 2px dashed var(--cm-edicion);
    border-radius: 10px;
    padding: 12px;
    margin-bottom: 12px;
    display: none;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
}
.cm-tablero-edit-toolbar.active {
    display: flex;
}
.cm-tablero-edit-info {
    width: 100%;
    text-align: center;
    font-size: 0.82rem;
    color: #7c2d12;
    font-weight: 700;
    margin-bottom: 6px;
    letter-spacing: 0.3px;
}

/* ============================================================
   SELECTOR DE VISTA
   ============================================================ */
.cm-tablero-vista-selector {
    display: flex; gap: 6px; background: #fff; border-radius: 30px;
    padding: 5px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    margin-bottom: 14px; max-width: 500px;
}
.cm-tablero-vista-selector button {
    flex: 1; background: transparent; color: var(--cm-texto-suave);
    padding: 10px; border-radius: 30px; border: none;
    font-size: 0.85rem; font-weight: 600;
    min-height: 38px; cursor: pointer; font-family: inherit;
}
.cm-tablero-vista-selector button.active {
    background: var(--cm-acento); color: #fff;
    box-shadow: 0 2px 8px rgba(14, 165, 233, 0.3);
}

/* ============================================================
   ELO
   ============================================================ */
.cm-tablero-elo-header {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    border: 2px solid var(--cm-elo); border-radius: 12px;
    padding: 12px 16px; margin-bottom: 14px; cursor: pointer;
    transition: all 0.2s;
}
.cm-tablero-elo-header:hover { box-shadow: 0 4px 16px rgba(217, 119, 6, 0.3); transform: translateY(-1px); }
.cm-tablero-elo-header .cm-icono { font-size: 2rem; }
.cm-tablero-elo-header .cm-datos { flex: 1; }
.cm-tablero-elo-header .cm-label {
    font-size: 0.7rem; font-weight: 700; color: #92400e;
    text-transform: uppercase; letter-spacing: 1px;
}
.cm-tablero-elo-header .cm-numero {
    font-size: 1.8rem; font-weight: 800; color: var(--cm-elo);
    font-variant-numeric: tabular-nums; line-height: 1;
}
.cm-tablero-elo-header .cm-cambio {
    font-size: 0.85rem; font-weight: 700;
    padding: 4px 10px; border-radius: 20px;
    font-variant-numeric: tabular-nums;
}
.cm-tablero-elo-header .cm-cambio.subida { background: #dcfce7; color: var(--cm-elo-subida); }
.cm-tablero-elo-header .cm-cambio.bajada { background: #fee2e2; color: var(--cm-elo-bajada); }
.cm-tablero-elo-header .cm-cambio.neutral { background: var(--cm-surface2); color: var(--cm-texto-suave); }

.cm-tablero-elo-panel {
    background: #fff; border-radius: 12px; padding: 16px;
    margin-bottom: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
.cm-tablero-elo-panel.cm-hidden { display: none; }
.cm-tablero-elo-panel h3 {
    font-size: 1rem; color: var(--cm-elo); margin-bottom: 12px;
    display: flex; align-items: center; justify-content: space-between;
}
.cm-tablero-elo-panel h3 button {
    background: transparent; color: var(--cm-texto-suave);
    border: 1px solid var(--cm-borde); padding: 4px 10px;
    font-size: 0.75rem; min-height: auto; font-weight: 600;
    border-radius: 6px; cursor: pointer; font-family: inherit;
}
.cm-tablero-estudio-item {
    background: var(--cm-surface); border-radius: 10px; padding: 12px;
    margin-bottom: 10px; border-left: 4px solid var(--cm-acento);
}
.cm-tablero-estudio-item .cm-nombre {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 8px; font-weight: 700; font-size: 0.9rem;
}
.cm-tablero-estudio-item .cm-elo-numero {
    font-size: 1.1rem; color: var(--cm-elo);
    font-variant-numeric: tabular-nums;
}
.cm-tablero-barra-elo {
    height: 8px; background: var(--cm-surface2); border-radius: 10px;
    overflow: hidden; position: relative;
}
.cm-tablero-barra-elo .cm-relleno {
    height: 100%;
    background: linear-gradient(90deg, #fbbf24, #f59e0b, #d97706);
    border-radius: 10px; transition: width 0.5s ease;
}
.cm-tablero-estudio-meta {
    display: flex; justify-content: space-between;
    font-size: 0.75rem; color: var(--cm-texto-suave); margin-top: 4px;
}
.cm-tablero-historial-item {
    display: flex; justify-content: space-between; align-items: center;
    padding: 8px 10px; border-bottom: 1px solid var(--cm-borde);
    font-size: 0.82rem;
}
.cm-tablero-historial-item:last-child { border-bottom: none; }
.cm-tablero-historial-item .cm-razon { color: var(--cm-texto-suave); font-size: 0.75rem; margin-top: 2px; }
.cm-tablero-historial-item .cm-delta { font-weight: 800; font-variant-numeric: tabular-nums; font-size: 0.95rem; }
.cm-tablero-historial-item .cm-delta.positivo { color: var(--cm-elo-subida); }
.cm-tablero-historial-item .cm-delta.negativo { color: var(--cm-elo-bajada); }

/* ============================================================
   LAYOUT
   ============================================================ */
.cm-tablero-game {
    display: grid;
    grid-template-columns: minmax(280px, 500px) 1fr;
    gap: 20px; align-items: start;
}
@media (max-width: 800px) { .cm-tablero-game { grid-template-columns: 1fr; } }

/* ============================================================
   TABLERO
   ============================================================ */
.cm-tablero-board-wrap {
    position: relative; width: 100%; padding-bottom: 100%;
    border-radius: 8px; overflow: hidden;
    box-shadow: 0 4px 16px rgba(0,0,0,0.15); touch-action: none;
}
.cm-tablero-board {
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    grid-template-rows: repeat(8, 1fr);
    background: #b58863; touch-action: none;
}
.cm-tablero-square {
    position: relative; display: flex; align-items: center; justify-content: center;
    width: 100%; height: 100%; cursor: pointer;
    touch-action: none; overflow: hidden;
}
.cm-tablero-square.light { background: #f0d9b5; }
.cm-tablero-square.dark { background: #b58863; }
.cm-tablero-square.selected { background: #7fc97f !important; }
.cm-tablero-square.legal-move::after {
    content: ''; position: absolute; width: 28%; height: 28%;
    background: rgba(0,0,0,0.25); border-radius: 50%;
    pointer-events: none; z-index: 3;
}
.cm-tablero-square.legal-capture::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
    box-shadow: inset 0 0 0 4px rgba(0,0,0,0.4);
    pointer-events: none; z-index: 3;
}
.cm-tablero-square.check {
    background: radial-gradient(circle, #ff0000 0%, #ff6666 50%, transparent 70%) !important;
}
.cm-tablero-square.last-move { background: #ffff99 !important; }
.cm-tablero-square.error-shake { animation: cm-tablero-shake 0.3s ease; }
@keyframes cm-tablero-shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
}
.cm-tablero-piece {
    position: absolute; top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 88%; height: 88%; object-fit: contain;
    pointer-events: none; z-index: 2; display: block;
}
.cm-tablero-coord {
    position: absolute; font-size: 10px; font-weight: 700;
    pointer-events: none; z-index: 1; opacity: 0.75;
}
.cm-tablero-coord-file { bottom: 2px; right: 4px; }
.cm-tablero-coord-rank { top: 2px; left: 4px; }
.cm-tablero-square.light .cm-tablero-coord { color: #b58863; }
.cm-tablero-square.dark .cm-tablero-coord { color: #f0d9b5; }

/* ============================================================
   STATUS
   ============================================================ */
.cm-tablero-status {
    font-size: 0.95rem; font-weight: 600;
    padding: 10px 14px; border-radius: 8px;
    background: var(--cm-surface); margin-bottom: 10px;
    min-height: 42px; display: flex; align-items: center;
}
.cm-tablero-status.ok { background: #dcfce7; color: var(--cm-exito); }
.cm-tablero-status.bad { background: #fee2e2; color: var(--cm-peligro); }
.cm-tablero-status.info { background: #dbeafe; color: #1e40af; }
.cm-tablero-status.alt { background: #ede9fe; color: var(--cm-alternativa); }
.cm-tablero-status.ordenador { background: #fef3c7; color: #92400e; }
.cm-tablero-status.elo { background: #fef3c7; color: var(--cm-elo); font-weight: 800; }

/* ============================================================
   CONFIG PANEL (admin)
   ============================================================ */
.cm-tablero-config-panel {
    background: #fff7ed; border: 1px solid #fdba74;
    border-radius: 8px; padding: 12px;
    margin-bottom: 12px; font-size: 0.88rem;
}
.cm-tablero-config-panel.cm-hidden { display: none; }
.cm-tablero-config-panel .cm-titulo-config {
    color: #c2410c; font-weight: 700;
    margin-bottom: 10px; font-size: 0.8rem; text-transform: uppercase;
}
.cm-tablero-config-panel .cm-fila {
    display: flex; gap: 8px; align-items: center;
    flex-wrap: wrap; margin-bottom: 10px;
}
.cm-tablero-config-panel label {
    font-weight: 600; font-size: 0.85rem;
    color: var(--cm-texto); min-width: 110px;
}
.cm-tablero-config-panel select { flex: 1; min-width: 130px; }
.cm-tablero-engine-status {
    font-size: 0.75rem; color: var(--cm-texto-suave);
    text-align: right; margin-top: 4px;
}
.cm-tablero-engine-status.ready { color: var(--cm-exito); }
.cm-tablero-engine-status.loading { color: var(--cm-ordenador); }

/* ============================================================
   VARIANTES (lista del admin)
   ============================================================ */
.cm-tablero-variantes-editor {
    background: #f5f3ff; border: 1px solid #c4b5fd;
    border-radius: 8px; padding: 12px; margin-bottom: 12px;
}
.cm-tablero-variantes-editor.cm-hidden { display: none; }
.cm-tablero-variantes-editor .cm-titulo {
    color: var(--cm-alternativa); font-weight: 700;
    font-size: 0.8rem; text-transform: uppercase; margin-bottom: 10px;
    display: flex; justify-content: space-between; align-items: center;
}
.cm-tablero-variante-item {
    display: flex; justify-content: space-between; align-items: center;
    gap: 8px; padding: 8px 10px; background: #fff;
    border-radius: 6px; margin-bottom: 6px;
    font-family: 'Courier New', monospace; font-size: 0.82rem;
}
.cm-tablero-variante-item .cm-texto { flex: 1; word-break: break-word; line-height: 1.5; }
.cm-tablero-variante-item .cm-btn-del {
    background: #fee2e2; color: var(--cm-peligro);
    border: 1px solid #fca5a5; padding: 4px 10px;
    border-radius: 5px; cursor: pointer;
    font-size: 0.85rem; font-weight: 700;
    min-height: 30px; font-family: inherit;
}
.cm-tablero-variante-item .cm-btn-del:hover { background: var(--cm-peligro); color: #fff; }
.cm-tablero-variante-item .cm-badge-principal {
    background: var(--cm-alternativa); color: #fff;
    font-size: 0.65rem; padding: 2px 6px;
    border-radius: 8px; font-weight: 700;
}

/* ============================================================
   PROGRESO VARIANTES
   ============================================================ */
.cm-tablero-variants-progress {
    background: #f5f3ff; border: 1px solid #c4b5fd;
    border-radius: 8px; padding: 10px 12px;
    margin-bottom: 10px; font-size: 0.85rem;
}
.cm-tablero-variants-progress.cm-hidden { display: none; }
.cm-tablero-variants-progress .cm-titulo {
    color: var(--cm-alternativa); font-weight: 700;
    margin-bottom: 8px; font-size: 0.78rem; text-transform: uppercase;
    display: flex; justify-content: space-between;
}
.cm-tablero-variants-progress .cm-dots { display: flex; gap: 4px; flex-wrap: wrap; }
.cm-tablero-variants-progress .cm-dot {
    width: 22px; height: 22px; border-radius: 50%;
    background: #fff; border: 2px solid #c4b5fd;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.7rem; color: var(--cm-alternativa); font-weight: 700;
}
.cm-tablero-variants-progress .cm-dot.done {
    background: var(--cm-exito); border-color: var(--cm-exito); color: #fff;
}
.cm-tablero-variants-progress .cm-dot.current {
    border-color: var(--cm-alternativa);
    background: var(--cm-alternativa); color: #fff;
    animation: cm-tablero-pulse 1.5s infinite;
}
@keyframes cm-tablero-pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.15); }
}

/* ============================================================
   AUTO-AVANCE
   ============================================================ */
.cm-tablero-auto-avance {
    background: #ecfdf5; border: 1px solid #a7f3d0;
    border-radius: 8px; padding: 10px 12px;
    margin-bottom: 10px;
    display: flex; align-items: center; gap: 10px;
}
.cm-tablero-auto-avance.cm-hidden { display: none; }
.cm-tablero-auto-avance input[type="checkbox"] {
    width: 20px; height: 20px; cursor: pointer;
    accent-color: var(--cm-exito); flex-shrink: 0;
}
.cm-tablero-auto-avance label {
    font-weight: 600; font-size: 0.9rem;
    color: var(--cm-texto); cursor: pointer; flex: 1;
}

/* ============================================================
   MOVIMIENTOS
   ============================================================ */
.cm-tablero-moves {
    background: var(--cm-surface); padding: 10px 12px;
    border-radius: 8px; font-family: 'Courier New', monospace;
    font-size: 0.85rem; min-height: 60px;
    word-break: break-all; line-height: 1.8;
    margin-bottom: 10px; color: var(--cm-texto);
}
.cm-tablero-moves .done { color: var(--cm-exito); font-weight: 700; }
.cm-tablero-moves .computadora { color: var(--cm-ordenador); font-weight: 700; }

/* ============================================================
   LISTA DE CAPÍTULOS
   ============================================================ */
.cm-tablero-chapter-list {
    max-height: 380px; overflow-y: auto;
    border: 1px solid var(--cm-borde);
    border-radius: 8px; background: #fff;
}
.cm-tablero-chapter-item {
    padding: 10px 14px; border-bottom: 1px solid var(--cm-borde);
    cursor: pointer; font-size: 0.88rem;
    display: flex; justify-content: space-between; align-items: center; gap: 8px;
}
.cm-tablero-chapter-item:last-child { border-bottom: none; }
.cm-tablero-chapter-item:hover { background: var(--cm-surface); }
.cm-tablero-chapter-item.active { background: #dbeafe; font-weight: 600; color: #1e40af; }
.cm-tablero-chapter-item.done::after {
    content: '✓'; color: var(--cm-exito);
    font-weight: bold; font-size: 1.1rem; flex-shrink: 0;
}
.cm-tablero-chapter-item .cm-badges { display: flex; gap: 4px; align-items: center; flex-shrink: 0; }
.cm-tablero-chapter-item .cm-badge {
    font-size: 0.68rem; font-weight: 700;
    padding: 2px 7px; border-radius: 10px; white-space: nowrap;
}
.cm-tablero-chapter-item .cm-badge.alt { color: var(--cm-alternativa); background: #ede9fe; }
.cm-tablero-chapter-item .cm-badge.ejercicio { color: var(--cm-acento); background: #dbeafe; }
.cm-tablero-chapter-item .cm-badge.ordenador { color: #92400e; background: #fef3c7; }
.cm-tablero-chapter-item .cm-badge.elo { color: var(--cm-elo); background: #fef3c7; }

/* ============================================================
   UTILIDADES
   ============================================================ */
.cm-tablero-hidden { display: none !important; }
.cm-tablero-progress-info { font-size: 0.85rem; color: var(--cm-texto-suave); margin-top: 8px; text-align: center; }
.cm-tablero-error-msg {
    color: var(--cm-peligro); font-size: 0.85rem;
    padding: 8px; background: #fee2e2;
    border-radius: 6px; margin-top: 8px;
}

/* ============================================================
   TOAST
   ============================================================ */
.cm-tablero-toast {
    position: fixed; bottom: 20px; left: 50%;
    transform: translateX(-50%) translateY(120%);
    background: #1e293b; color: #fff;
    padding: 12px 22px; border-radius: 30px;
    font-size: 0.9rem; z-index: 9999;
    opacity: 0; transition: opacity 0.3s, transform 0.3s;
    pointer-events: none; max-width: 90%;
    text-align: center;
    font-family: 'Lato', 'Segoe UI', sans-serif;
}
.cm-tablero-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
.cm-tablero-toast.elo-up { background: linear-gradient(135deg, #16a34a, #22c55e); }
.cm-tablero-toast.elo-down { background: linear-gradient(135deg, #dc2626, #ef4444); }

/* ============================================================
   RESPONSIVE
   ============================================================ */
@media (max-width: 600px) {
    .cm-tablero-elo-header .cm-numero { font-size: 1.4rem; }
    .cm-tablero-elo-header .cm-icono { font-size: 1.5rem; }
    .cm-tablero-chapter-list { max-height: 300px; }
    .cm-tablero-modal-content { padding: 18px; }
    .cm-tablero-variante-item { font-size: 0.75rem; }
    .cm-tablero-moves { font-size: 0.78rem; }
}
/* ============================================================
   ENTRENADOR DE AJEDREZ — Club Morphy (Fase 5 + editor variantes)
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
    // SISTEMA ELO
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
    // CONVERTIR ÁRBOL A PGN (para guardar variantes)
    // ============================================================
    function arbolAPGN(arbol, headers) {
        // Convierte el árbol de nodos a texto PGN con variantes anidadas
        let lineas = [];
        if (headers) {
            Object.keys(headers).forEach(k => {
                lineas.push(`[${k} "${headers[k]}"]`);
            });
        }
        lineas.push('');

        function escribirNodo(nodo, profundidad) {
            if (nodo.children.length === 0) return '';
            const child = nodo.children[0];
            const mv = child.move;
            let texto = '';
            const num = Math.floor(profundidad / 2) + 1;
            const pre = mv.color === 'w' ? `${num}.` : `${num}...`;

            // Escribir el nodo principal
            texto += `${pre} ${mv.san} `;

            // Variantes alternativas del padre (children[1..])
            for (let i = 1; i < nodo.children.length; i++) {
                const alt = nodo.children[i];
                texto += `(${pre} ${alt.move.san} `;
                texto += escribirDesdeNodo(alt, profundidad + 1);
                texto += ') ';
            }

            texto += escribirNodo(child, profundidad + 1);
            return texto;
        }

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

            // ⭐ EDITOR DE VARIANTES (solo admin)
            this.modoEdicionVariantes = false;
            this.nodoEdicionActual = null;  // Nodo desde el que se está editando
            this.historialEdicion = [];     // Historial de movimientos hechos en modo edición
            this.arbolEdicionTemporal = null; // Árbol temporal que se va construyendo

            // ID counter para nodos del árbol
            this._idCounter = { v: 0, next() { return ++this.v; } };

            this.init();
        }

        // --------------------------------------------------------
        // INICIALIZACIÓN
        // --------------------------------------------------------
        init() {
            const cfg = this.config;

            if (cfg.pgn) {
                this.cargarCapitulosDesdePGN(cfg.pgn);
            }

            if (this.capitulos.length === 0) {
                this.contenedor.innerHTML =
                    '<div class="cm-tablero-error-msg">⚠️ No se pudieron cargar capítulos del PGN.</div>';
                return;
            }

            this.construirEstructuraHTML();
            this.cargarCapitulo(0);

            if (cfg.modo === 'ordenador') SF.init();
        }

        construirEstructuraHTML() {
            const esAdmin = !!this.contexto.esAdmin;

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

                            ${esAdmin ? `
                            <div class="cm-tablero-modo-indicator normal" data-rol="modoIndicator">
                                <span style="font-size:1.2rem;">🎯</span>
                                <span>Modo <strong>NORMAL</strong> — el alumno resuelve el ejercicio</span>
                            </div>
                            ` : ''}

                            ${esAdmin ? `
                            <div class="cm-tablero-row" style="margin-bottom:12px;">
                                <button class="cm-tablero-btn-admin" data-rol="btnEditarVariantes">
                                    ✏️ Activar modo edición de variantes
                                </button>
                            </div>
                            ` : ''}

                            ${esAdmin ? `
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

                            ${!esAdmin ? `
                            <div class="cm-tablero-auto-avance" data-rol="autoAvancePanel">
                                <input type="checkbox" id="${this.idInstancia}-autoAvance" data-rol="autoAvanceCheck">
                                <label for="${this.idInstancia}-autoAvance">Avanzar al siguiente ejercicio automáticamente</label>
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

            // Referencias
            this.$board = this.contenedor.querySelector('[data-rol="board"]');
            this.$progressInfo = this.contenedor.querySelector('[data-rol="progressInfo"]');
            this.$meta = this.contenedor.querySelector('[data-rol="meta"]');
            this.$status = this.contenedor.querySelector('[data-rol="status"]');
            this.$moves = this.contenedor.querySelector('[data-rol="moves"]');
            this.$configPanel = this.contenedor.querySelector('[data-rol="configPanel"]');
            this.$variantesEditor = this.contenedor.querySelector('[data-rol="variantesEditor"]');
            this.$variantsProgress = this.contenedor.querySelector('[data-rol="variantsProgress"]');
            this.$engineStatus = this.contenedor.querySelector('[data-rol="engineStatus"]');
            this.$modoIndicator = this.contenedor.querySelector('[data-rol="modoIndicator"]');
            this.$editToolbar = this.contenedor.querySelector('[data-rol="editToolbar"]');
            this.$editInfo = this.contenedor.querySelector('[data-rol="editInfo"]');

            // Aplicar config
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

            // Eventos botones generales
            this._on('[data-rol="btnReiniciar"]', 'click', () => this.reiniciar());
            this._on('[data-rol="btnVoltear"]', 'click', () => this.voltear());
            this._on('[data-rol="btnPista"]', 'click', () => this.pista());
            this._on('[data-rol="btnVerSol"]', 'click', () => this.verSolucion());
            this._on('[data-rol="btnPrev"]', 'click', () => this.capituloAnterior());
            this._on('[data-rol="btnNext"]', 'click', () => this.capituloSiguiente());

            // Config panel (admin)
            if (esAdmin) {
                this._on('[data-rol="configModo"]', 'change', (e) => this.cambiarModo(e.target.value));
                this._on('[data-rol="configColor"]', 'change', (e) => this.cambiarColor(e.target.value));
                this._on('[data-rol="configNivel"]', 'change', (e) => this.cambiarNivel(e.target.value));
                this._on('[data-rol="configOrientacion"]', 'change', (e) => this.cambiarOrientacion(e.target.value));
                if (this.$configPanel) this.$configPanel.classList.remove('cm-tablero-hidden');
                if (this.$variantesEditor) this.$variantesEditor.classList.remove('cm-tablero-hidden');
            }

            // ⭐ Eventos del editor de variantes (solo admin)
            if (esAdmin) {
                this._on('[data-rol="btnEditarVariantes"]', 'click', () => this.toggleModoEdicion());
                this._on('[data-rol="btnGuardarVariante"]', 'click', () => this.guardarVarianteEdicion());
                this._on('[data-rol="btnDeshacerEdicion"]', 'click', () => this.deshacerEdicion());
                this._on('[data-rol="btnDescartarEdicion"]', 'click', () => this.descartarEdicion());
            }

            // ⭐ Auto-avance (solo alumnos)
            if (!esAdmin) {
                this._on('[data-rol="autoAvanceCheck"]', 'change', (e) => {
                    this.autoAvance = e.target.checked;
                    this.mostrarToast(
                        e.target.checked ? '✅ Auto-avance activado' : '⏸️ Auto-avance desactivado',
                        ''
                    );
                });
            }

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
                orientacionAuto: turnoAuto,
                headersOriginales: headers
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

            // Salir de modo edición si estaba activo
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

        actualizarMeta() {
            if (!this.$meta) return;
            const cap = this.capitulos[this.capituloActual];
            if (!cap) return;
            const eloCap = ELO.obtenerCapitulo(cap.estudio, this.capituloActual);
            this.$meta.innerHTML = `<strong>Capítulo ${this.capituloActual + 1} de ${this.capitulos.length}</strong> · ${escapeHtml(cap.estudio)} · 🏆 ELO ${eloCap}`;
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
        // CLICK EN CASILLA (con lógica dual: normal vs edición)
        // --------------------------------------------------------
        clickCasilla(sq) {
            if (this.destroyed || this.bloqueado) return;

            // ⭐ MODO EDICIÓN: sin restricciones de turno ni validación
            if (this.modoEdicionVariantes) {
                this.clickCasillaEdicion(sq);
                return;
            }

            // Modo normal (alumno resolviendo)
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
        // MODO EDICIÓN: click libre sin validación
        // --------------------------------------------------------
        clickCasillaEdicion(sq) {
            if (!this.casillaSeleccionada) {
                const pieza = this.chess.get(sq);
                if (!pieza) return;
                if (pieza.color !== this.chess.turn()) {
                    // Permitir seleccionar la pieza del otro color sólo si es para cambiarla
                    // En modo edición dejamos mover SÓLO la pieza del turno actual
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

            // Ejecutar el movimiento en modo edición
            const from = this.casillaSeleccionada;
            const mv = this.chess.move({ from, to: sq, promotion: 'q' });
            if (!mv) return;
            this.casillaSeleccionada = null;
            this.historialEdicion.push({
                from, to: sq, promotion: 'q',
                san: mv.san, color: mv.color,
                fenAntes: this.chess.history({ verbose: true }).slice(-1)[0] ? null : null
            });
            this.dibujarPiezas();
            this.actualizarMovimientos();
            this.actualizarEditInfo();

            // Si es jaque mate, sugerimos guardar
            if (this.chess.game_over()) {
                this.setStatus('alt', '🏁 Posición final alcanzada. Puedes guardar la variante o seguir.');
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

        // --------------------------------------------------------
        // ACTIVAR/DESACTIVAR MODO EDICIÓN
        // --------------------------------------------------------
        toggleModoEdicion() {
            if (this.modoEdicionVariantes) {
                this.desactivarModoEdicion();
            } else {
                this.activarModoEdicion();
            }
        }

        activarModoEdicion() {
            if (!this.contexto.esAdmin) return;
            this.modoEdicionVariantes = true;
            this.historialEdicion = [];

            // Reset del tablero a la posición inicial del capítulo
            const cap = this.capitulos[this.capituloActual];
            this.chess = new Chess(cap.fen);
            this.casillaSeleccionada = null;
            this.dibujarPiezas();
            this.actualizarMovimientos();

            // Actualizar UI
            const wrap = this.contenedor.querySelector('.cm-tablero-wrap');
            if (wrap) wrap.classList.add('cm-editando');
            if (this.$modoIndicator) {
                this.$modoIndicator.className = 'cm-tablero-modo-indicator editing';
                this.$modoIndicator.innerHTML = '<span style="font-size:1.2rem;">✏️</span><span><strong>MODO EDICIÓN ACTIVO</strong> — movimientos libres, no cuentan para el alumno</span>';
            }
            if (this.$editToolbar) this.$editToolbar.classList.add('active');
            const btn = this.contenedor.querySelector('[data-rol="btnEditarVariantes"]');
            if (btn) btn.innerHTML = '🔒 Desactivar modo edición';

            // Deshabilitar botones de ejercicio durante la edición
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
                this.$modoIndicator.innerHTML = '<span style="font-size:1.2rem;">🎯</span><span>Modo <strong>NORMAL</strong> — el alumno resuelve el ejercicio</span>';
            }
            if (this.$editToolbar) this.$editToolbar.classList.remove('active');
            const btn = this.contenedor.querySelector('[data-rol="btnEditarVariantes"]');
            if (btn) btn.innerHTML = '✏️ Activar modo edición de variantes';

            this._setBotonesEjercicioDisabled(false);

            if (!silencioso) {
                // Recargar el capítulo para volver a la posición inicial
                this.cargarCapitulo(this.capituloActual);
                this.mostrarToast('🔒 Modo edición desactivado', '');
            }
        }

        _setBotonesEjercicioDisabled(disabled) {
            const ids = ['btnPista', 'btnVerSol', 'btnPrev', 'btnNext', 'btnReiniciar'];
            ids.forEach(rol => {
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

        // --------------------------------------------------------
        // GUARDAR VARIANTE
        // --------------------------------------------------------
        guardarVarianteEdicion() {
            if (!this.modoEdicionVariantes) return;
            if (this.historialEdicion.length === 0) {
                this.mostrarToast('⚠️ No hay movimientos para guardar', '');
                return;
            }

            // Construir el nuevo camino de nodos desde el inicio
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

            // Añadir la nueva variante al árbol
            const nuevaVariante = this._construirNodosDesdeCamino(nuevoCamino, this.arbol);
            this.arbol.children.push(nuevaVariante);

            // Actualizar el capítulo
            cap.arbol = this.arbol;
            cap.numLineas = contarLineas(this.arbol);

            // Recolectar hojas y refrescar UI
            this.hojasTotales = recolectarHojas(this.arbol);
            this.actualizarVariantesEditor();
            this.actualizarVariantesProgreso();

            // Salir de modo edición
            this.desactivarModoEdicion(true);

            // Notificar al padre para guardar en Firestore
            if (this.contexto.onGuardarVariante) {
                try {
                    const pgnActualizado = arbolAPGN(this.arbol, cap.headersOriginales);
                    this.contexto.onGuardarVariante({
                        capituloIdx: this.capituloActual,
                        pgnCapitulo: pgnActualizado,
                        nuevoNumLineas: cap.numLineas
                    });
                } catch (e) {
                    console.error('[Entrenador] Error al guardar variante:', e);
                }
            }

            this.mostrarToast(`✅ Variante guardada (${cap.numLineas} solución${cap.numLineas === 1 ? '' : 'es'})`, 'elo-up');
            this.setStatus('ok', `✅ Variante guardada. Ahora hay ${cap.numLineas} solución${cap.numLineas === 1 ? '' : 'es'}.`);
            this.cargarCapitulo(this.capituloActual);
        }

        _construirNodosDesdeCamino(camino, arbolRaiz) {
            // Crea una rama nueva de nodos a partir del camino
            let padre = arbolRaiz;
            let ultimoNodo = null;
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
                ultimoNodo = nuevoNodo;
            }
            return arbolRaiz.children[arbolRaiz.children.length - 1];
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
                    this.actualizarMeta();
                }
                if (this.contexto.onCompletado) {
                    try { this.contexto.onCompletado(); } catch (e) {}
                }

                // ⭐ Auto-avance al siguiente capítulo
                if (this.autoAvance && this.capituloActual < this.capitulos.length - 1) {
                    setTimeout(() => {
                        if (!this.destroyed) {
                            this.mostrarToast('⏭️ Avanzando al siguiente…', '');
                            this.capituloSiguiente();
                        }
                    }, 2000);
                } else if (this.autoAvance && this.capituloActual >= this.capitulos.length - 1) {
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
            this.setStatus('ordenador', textoEstado);

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
                this.actualizarMeta();
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
            const cambio = ELO.aplicar(cap.estudio, this.capituloActual, -3, `Pista en ${cap.nombre}`);
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
            const cambio = ELO.aplicar(cap.estudio, this.capituloActual, -8, `Solución vista en ${cap.nombre}`);
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
            if (this.modoEdicionVariantes) return;
            if (this.capituloActual > 0) this.cargarCapitulo(this.capituloActual - 1);
        }

        capituloSiguiente() {
            if (this.modoEdicionVariantes) return;
            if (this.capituloActual < this.capitulos.length - 1) this.cargarCapitulo(this.capituloActual + 1);
        }

        // --------------------------------------------------------
        // CONFIG PANEL (admin)
        // --------------------------------------------------------
        cambiarModo(nuevoModo) {
            if (this.modoEdicionVariantes) return;
            this.config.modo = nuevoModo;
            this.sincronizarConfigPanel();
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
                    <button class="cm-btn-del" ${esPrincipal || this.modoEdicionVariantes ? 'disabled' : ''} data-variante="${idx}">${esPrincipal ? '—' : '🗑️'}</button>
                </div>`;
            }).join('');
            lista.querySelectorAll('[data-variante]').forEach(btn => {
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

                    // Notificar al padre para guardar
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
        }
    };

    console.log('✅ Entrenador cargado como módulo (Fase 5 + editor variantes). API: window.Entrenador');
})();
