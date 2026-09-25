/* ============================================================
   SCRIPT RENDER — Club Morphy
   
   Contiene:
   - renderizarSidebar, filtrarClases, seleccionarClase
   - Lógica de acceso a clases (esClaseDesbloqueada, tieneAccesoEspecial)
   - gestionarAccesosClase
   - renderizarTemaRecursivo (el más grande)
   - actualizarUI, renderizarContenido
   - agregarTema
   - Edición inline (long press)
   - Inicializar tableros del entrenador (⭐ Fix F integrado)
   - Guardar variante/PGN/capítulos
   - Badge ELO
   - Modal de juego vs IA
   
   Depende de: script-core.js + script-curso.js + entrenador-*.js
   Expone: window.CMRender
   ============================================================ */

(function () {
    'use strict';

    const Core = window.CMScriptCore;
    const Curso = window.CMCurso;

    if (!Core) {
        console.error('[CMRender] CMScriptCore no está cargado.');
        return;
    }
    if (!Curso) {
        console.error('[CMRender] CMCurso no está cargado.');
        return;
    }

    const {
        escapeHtml, escapeAttr, escapeOnclick, esUrlSegura, sanitizeHtml,
        convertirUrlImagen, generarId, extraerYouTubeID,
        mostrarToast, mostrarConfirmacion,
        guardarEstadoNavegacion, getInicial,
        ADMIN_UID, db, dom
    } = Core;

    const Render = window.CMRender = window.CMRender || {};

    // ============================================================
    // SIDEBAR
    // ============================================================
    Render.renderizarSidebar = function () {
        const lista = document.getElementById('lista-clases');
        if (!lista) return;
        if (!Core.state.currentUser) { lista.innerHTML = ''; return; }
        const esAdmin = Core.state.currentUser.esAdmin;

        const clasesVisibles = esAdmin
            ? Core.state.curso.clases
            : Core.state.curso.clases.filter(c => c.publicada === true);

        lista.innerHTML = clasesVisibles.map(c => {
            const desbloqueada = Render.esClaseDesbloqueada(c);
            return `
            <div class="clase-item ${c.id === Core.state.claseActivaId ? 'active' : ''} ${desbloqueada ? '' : 'bloqueada'}"
                 data-id="${c.id}">
                <span class="titulo-editable" data-accion="renombrarClase" data-id="${c.id}">
                    <span class="clase-num">${c.numero}.</span> ${escapeHtml(c.titulo)}
                </span>
                ${!desbloqueada ? '<span>🔒</span>' : ''}
                ${esAdmin ? `
                    <div style="display:flex; align-items:center; gap:4px; flex-wrap:wrap;">
                        <button class="btn-reorder" onclick="event.stopPropagation(); moverClaseArriba('${c.id}')" title="Subir clase">↑</button>
                        <button class="btn-reorder" onclick="event.stopPropagation(); moverClaseAbajo('${c.id}')" title="Bajar clase">↓</button>
                        <button class="btn btn-small ${c.publicada ? 'btn-exito' : 'btn-warning'}"
                                onclick="event.stopPropagation(); togglePublicarClase('${c.id}')"
                                title="${c.publicada ? 'Visible para alumnos' : 'Oculta para alumnos'}">
                            ${c.publicada ? '👁️' : '🙈'}
                        </button>
                        <button class="btn btn-peligro btn-small btn-eliminar-clase" data-id="${c.id}">🗑️</button>
                        <button class="btn btn-azul btn-small" onclick="event.stopPropagation(); gestionarAccesosClase('${c.id}')" title="Gestionar accesos especiales">👥</button>
                    </div>` : ''}
            </div>`;
        }).join('');

        document.querySelectorAll('.btn-eliminar-clase').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                mostrarConfirmacion('Eliminar clase', '¿Seguro que deseas eliminar esta clase y todos sus temas?', () => Curso.eliminarClase(id));
            });
        });

        document.querySelectorAll('.clase-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('button')) return;
                const id = item.dataset.id;
                const clase = Core.state.curso.clases.find(c => c.id === id);
                if (clase) Render.seleccionarClase(id);
            });
        });

        if (Core.state.terminoBusqueda) {
            setTimeout(() => Render.filtrarClases(), 0);
        }
    };

    Render.filtrarClases = function () {
        const lista = document.getElementById('lista-clases');
        if (!lista) return;
        const items = lista.querySelectorAll('.clase-item');
        const term = Core.state.terminoBusqueda.toLowerCase().trim();
        items.forEach(item => {
            const titulo = item.querySelector('.titulo-editable')?.textContent.toLowerCase() || '';
            item.style.display = (!term || titulo.includes(term)) ? '' : 'none';
        });
    };

    Render.seleccionarClase = function (id) {
        Core.state.claseActivaId = id;
        Core.state.temaAbiertoGlobal = null;
        Render.actualizarUI();
        guardarEstadoNavegacion();
        if (window.innerWidth <= 768 && dom.sidebar && dom.sidebarOverlay) {
            dom.sidebar.classList.remove('open');
            dom.sidebarOverlay.classList.remove('active');
        }
    };

    // ============================================================
    // ACCESO A CLASES
    // ============================================================
    Render.esClaseDesbloqueada = function (clase) {
        if (!Core.state.currentUser) return false;
        if (Core.state.currentUser.esAdmin) return true;
        if (clase.numero === 1) return true;
        if (Render.tieneAccesoEspecial(clase.id, Core.state.currentUser.uid)) return true;
        return false;
    };

    Render.tieneAccesoEspecial = function (claseId, uid) {
        if (!uid) return false;
        const uids = Core.state.accesosEspeciales[claseId] || [];
        return uids.includes(uid);
    };

    Render.gestionarAccesosClase = async function (claseId) {
        if (!Core.state.currentUser?.esAdmin) return;
        const clase = Core.state.curso.clases.find(c => c.id === claseId);
        if (!clase) return;
        Core.state.claseActualGestion = claseId;
        document.getElementById('accesos-title').innerHTML = `🔐 Accesos especiales: ${escapeHtml(clase.titulo)}`;
        const listaDiv = document.getElementById('accesos-lista');
        listaDiv.innerHTML = '<div class="loader" style="margin:20px auto;"></div>';
        const usuarios = await window.obtenerListaUsuarios();
        const uidsAutorizados = Core.state.accesosEspeciales[claseId] || [];
        if (usuarios.length === 0) {
            listaDiv.innerHTML = `<div class="no-users-msg">📭 No se encontraron usuarios registrados.</div>`;
        } else {
            listaDiv.innerHTML = usuarios.map(user => {
                const checked = uidsAutorizados.includes(user.uid);
                const displayName = user.nombre ? `${user.nombre} ${user.apellidos}` : user.email;
                return `
                    <div class="user-access-item">
                        <span class="user-email">${escapeHtml(displayName)}</span>
                        <label class="toggle-switch">
                            <input type="checkbox" data-uid="${user.uid}" ${checked ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>`;
            }).join('');
            listaDiv.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                cb.addEventListener('change', async (e) => {
                    const uid = cb.dataset.uid;
                    let uidsActual = [...(Core.state.accesosEspeciales[claseId] || [])];
                    if (cb.checked) { if (!uidsActual.includes(uid)) uidsActual.push(uid); }
                    else { uidsActual = uidsActual.filter(id => id !== uid); }
                    await db.collection('accesosEspeciales').doc(claseId).set({ uids: uidsActual }, { merge: true });
                    Core.state.accesosEspeciales[claseId] = uidsActual;
                    Render.actualizarUI();
                });
            });
        }
        dom.modalAccesos.classList.add('active');
    };

    Render.cerrarModalAccesos = function () {
        if (!dom.modalAccesos) return;
        dom.modalAccesos.classList.remove('active');
        Core.state.claseActualGestion = null;
    };

    // ============================================================
    // RENDERIZADO RECURSIVO DE TEMAS
    // ============================================================
    Render.renderizarTemaRecursivo = function (tema, claseId, nivel = 0) {
        const accesible = Curso.temaAccesible(tema, Core.state.currentUser);
        const completado = Curso.estaCompletado(claseId, tema.id);
        const esAdmin = Core.state.currentUser?.esAdmin;
       
        // ⭐ v27: Detectar si el tema tiene bloques de tablero con PGN
        const tieneTableros = Array.isArray(tema.bloques) &&
                              tema.bloques.some(b => b.tipo === 'tablero' && (b.config || {}).pgn && b.config.pgn.trim());

        let contenidoHTML = '';
        if (accesible) {
            if (Array.isArray(tema.bloques) && tema.bloques.length > 0) {
                contenidoHTML = tema.bloques.map(bloque => {
                    let html = '';
                    switch (bloque.tipo) {
                        case 'video': {
                            const vid = extraerYouTubeID(bloque.contenido);
                            if (!bloque.contenido || !bloque.contenido.trim()) return '';
                            if (vid) {
                                html = `<div class="video-wrapper"><iframe src="https://www.youtube.com/embed/${vid}?rel=0" allowfullscreen></iframe></div>`;
                            } else if (/<iframe/i.test(bloque.contenido)) {
                                html = `<div class="video-wrapper">${bloque.contenido}</div>`;
                            }
                            break;
                        }
                        case 'iframe':
                            if (!bloque.contenido) return '';
                            html = `<div class="iframe-wrapper">${bloque.contenido}</div>`;
                            break;
                        case 'texto': {
                            if (!bloque.contenido) return '';
                            const esHtml = /<[a-z][\s\S]*>/i.test(bloque.contenido);
                            if (esHtml) {
                                html = `<div class="bloque-texto">${sanitizeHtml(bloque.contenido)}</div>`;
                            } else {
                                const textoSanitizado = escapeHtml(bloque.contenido).replace(/\n/g, '<br>');
                                const est = bloque.estilo || {};
                                html = `<div class="bloque-texto" style="font-size:${escapeHtml(est.fontSize)||'inherit'}; color:${escapeHtml(est.color)||'inherit'}; text-align:${escapeHtml(est.textAlign)||'left'};">${textoSanitizado}</div>`;
                            }
                            break;
                        }
                        case 'imagen': {
                            if (!bloque.contenido) return '';
                            if (!esUrlSegura(bloque.contenido)) {
                                html = `<p style="color:var(--peligro); font-style:italic;">⚠️ Imagen no segura (URL no permitida)</p>`;
                            } else {
                                const urlFinal = convertirUrlImagen(bloque.contenido);
                                const src = encodeURI(urlFinal);
                                html = `<img src="${escapeAttr(src)}" class="imagen-bloque" alt="Imagen" loading="lazy">`;
                            }
                            break;
                        }
                        case 'enlace': {
                            if (!bloque.label || !bloque.url) return '';
                            const urlLimpia = bloque.url.trim();
                            const esSegura = esUrlSegura(urlLimpia);
                            const href = esSegura ? urlLimpia : '#';
                            const estilosAdicionales = esSegura ? '' : 'pointer-events:none; color:var(--peligro); text-decoration:line-through;';
                            html = `<a href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer" style="${estilosAdicionales}">${escapeHtml(bloque.label)}</a>`;
                            break;
                        }
                        case 'tablero': {
                            if (!bloque.config || !bloque.config.pgn || !bloque.config.pgn.trim()) return '';
                            const cfg = bloque.config || {};
                            html = `<div class="cm-tablero-bloque-alumno" data-bloque-id="${bloque.id}" data-clase="${claseId}" data-tema="${tema.id}" data-pgn="${encodeURIComponent(cfg.pgn || '')}" data-modo="${escapeAttr(cfg.modo || 'ejercicio')}" data-color="${escapeAttr(cfg.colorHumano || 'w')}" data-nivel="${cfg.nivelSF || 5}" data-orientacion="${escapeAttr(cfg.orientacion || 'auto')}"></div>`;
                            break;
                        }
                        case 'consejo': {
                            const tieneImagen = bloque.imagenURL && bloque.imagenURL.trim();
                            const tieneTexto = bloque.texto && bloque.texto.trim();
                            if (!tieneImagen && !tieneTexto) return '';
                            let htmlConsejo = '<div class="bloque-consejo">';
                            if (tieneImagen) {
                                const urlFinal = convertirUrlImagen(bloque.imagenURL.trim());
                                htmlConsejo += `<img src="${escapeAttr(urlFinal)}" class="consejo-imagen" alt="Consejo" loading="lazy" onerror="this.style.display='none'">`;
                            }
                            if (tieneTexto) {
                                htmlConsejo += `<div class="consejo-texto"><strong>💡 Consejo</strong>${escapeHtml(bloque.texto.trim())}</div>`;
                            }
                            htmlConsejo += '</div>';
                            html = htmlConsejo;
                            break;
                        }
                    }
                    if (bloque.nota) html += `<div class="nota-debajo">${escapeHtml(bloque.nota)}</div>`;
                    return html;
                }).filter(Boolean).join('');
            }

            if (tema.subtemas && tema.subtemas.length > 0) {
                contenidoHTML += `<div class="subtemas-container">`;
                tema.subtemas.forEach(st => {
                    contenidoHTML += Render.renderizarTemaRecursivo(st, claseId, nivel + 1);
                });
                contenidoHTML += `</div>`;
            }
        } else {
            const yaSolicitada = Core.state.misSolicitudes.some(s => s.temaId === tema.id && s.estado === 'pendiente');
            contenidoHTML = `
                <div style="color:var(--texto-suave); padding:10px; border:1px dashed var(--borde); border-radius:8px; margin:8px 0;">
                    <p>🔒 Este tema está bloqueado. Solicita acceso al administrador.</p>
                    <button class="btn btn-azul" onclick="solicitarAccesoTema('${claseId}','${tema.id}')" ${yaSolicitada ? 'disabled' : ''}>
                        ${yaSolicitada ? '⏳ Solicitud enviada' : '📩 Solicitar acceso'}
                    </button>
                </div>
            `;
        }

        const TIPOS_BLOQUE = {
            video:   { icon: '🎥', label: 'Video'   },
            texto:   { icon: '📝', label: 'Texto'   },
            iframe:  { icon: '🔗', label: 'Iframe'  },
            imagen:  { icon: '🖼️', label: 'Imagen'  },
            enlace:  { icon: '🔗', label: 'Enlace'  },
            tablero: { icon: '🎯', label: 'Tablero' },
            consejo: { icon: '💡', label: 'Consejo' }
        };

        const adminEditorHTML = (esAdmin && accesible) ? `
        <div class="solo-admin" style="margin-top:15px; padding-top:15px; border-top:1px solid var(--borde);">
            <p style="color:var(--acento-claro); font-weight:bold;">
                🛠️ Editor de bloques
                <span style="color:var(--texto-suave); font-weight:400; font-size:0.85rem;">
                    (${(tema.bloques || []).length} bloque${(tema.bloques || []).length === 1 ? '' : 's'})
                </span>
            </p>
            <div id="bloques-editor-${tema.id}">
                ${(tema.bloques || []).map((bloque, idx) => {
                    const esc = escapeHtml;
                    const info = TIPOS_BLOQUE[bloque.tipo] || TIPOS_BLOQUE.texto;
                    let previewRaw = '';
                    if (bloque.tipo === 'enlace') previewRaw = bloque.label || '(sin etiqueta)';
                    else if (bloque.tipo === 'tablero') {
                        const cfg = bloque.config || {};
                        const caps = cfg.pgn ? (cfg.pgn.match(/\[Event\s/g) || []).length : 0;
                        previewRaw = caps > 0 ? `${caps} capítulo${caps === 1 ? '' : 's'} PGN` : '(sin PGN)';
                    } else if (bloque.tipo === 'consejo') {
                        previewRaw = bloque.texto ? String(bloque.texto).substring(0, 50) : (bloque.imagenURL ? 'Imagen cargada' : '(vacío)');
                    } else {
                        previewRaw = bloque.contenido ? String(bloque.contenido).replace(/<[^>]+>/g, '').substring(0, 50) : '(vacío)';
                    }
                    const preview = esc(String(previewRaw).substring(0, 50));

                    return `
                    <div class="bloque-editor" data-bloque-id="${bloque.id}" data-tipo="${bloque.tipo}">
                        <div class="bloque-header">
                            <span class="bloque-icono">${info.icon}</span>
                            <span class="bloque-tipo">${info.label}</span>
                            <span class="bloque-numero">#${idx + 1}</span>
                            <span class="bloque-preview" title="${preview}">${preview}</span>
                        </div>
                        <div class="bloque-body">
                            <div class="bloque-campos">
                                <select onchange="cambiarTipoBloque('${claseId}','${tema.id}','${bloque.id}', this.value)">
                                    <option value="video" ${bloque.tipo==='video'?'selected':''}>🎥 Video</option>
                                    <option value="texto" ${bloque.tipo==='texto'?'selected':''}>📝 Texto</option>
                                    <option value="iframe" ${bloque.tipo==='iframe'?'selected':''}>🔗 Iframe</option>
                                    <option value="imagen" ${bloque.tipo==='imagen'?'selected':''}>🖼️ Imagen</option>
                                    <option value="enlace" ${bloque.tipo==='enlace'?'selected':''}>🔗 Enlace</option>
                                    <option value="tablero" ${bloque.tipo==='tablero'?'selected':''}>🎯 Tablero</option>
                                    <option value="consejo" ${bloque.tipo==='consejo'?'selected':''}>💡 Consejo</option>
                                </select>
                                <button class="btn-reorder" onclick="moverBloqueArriba('${claseId}','${tema.id}','${bloque.id}')" title="Subir bloque">↑</button>
                                <button class="btn-reorder" onclick="moverBloqueAbajo('${claseId}','${tema.id}','${bloque.id}')" title="Bajar bloque">↓</button>
                                <button class="btn btn-peligro btn-small" onclick="eliminarBloque('${claseId}','${tema.id}','${bloque.id}')" title="Eliminar bloque">🗑️</button>
                            </div>

                            ${bloque.tipo === 'texto' ? `
                                ${window.buildTextEditorToolbar(bloque.id)}
                                <div class="bloque-texto-editor"
                                     contenteditable="true" spellcheck="true"
                                     data-placeholder="Escribe el texto aquí…"
                                     data-clase="${claseId}" data-tema="${tema.id}" data-bloque="${bloque.id}"
                                     oninput="textEditorSave()">${bloque.contenido || ''}</div>
                            ` : bloque.tipo === 'enlace' ? `
                                <input placeholder="Etiqueta" value="${esc(bloque.label||'')}" onchange="actualizarBloqueEnlace('${claseId}','${tema.id}','${bloque.id}', this.value, this.nextElementSibling.value)">
                                <input placeholder="URL" value="${esc(bloque.url||'')}" onchange="actualizarBloqueEnlace('${claseId}','${tema.id}','${bloque.id}', this.previousElementSibling.value, this.value)">
                            ` : bloque.tipo === 'tablero' ? `
                                <div class="bloque-tablero-config" style="background:#fff7ed; border:1px dashed #fdba74; border-radius:8px; padding:10px; margin-top:6px;">
                                    <p style="font-size:0.78rem; color:#c2410c; font-weight:700; text-transform:uppercase; margin-bottom:8px;">🎯 Configuración del Tablero</p>
                                    <label style="display:block; font-size:0.75rem; color:#92400e; font-weight:700; text-transform:uppercase; margin-bottom:3px;">📋 PGN del estudio</label>
                                    <textarea placeholder="Pega aquí el PGN de tu estudio…" onchange="actualizarBloqueTablero('${claseId}','${tema.id}','${bloque.id}', 'pgn', this.value)" style="width:100%; min-height:90px; font-family:'Courier New',monospace; font-size:0.78rem; padding:8px; border:1px solid #fdba74; border-radius:6px; resize:vertical; background:white;">${esc((bloque.config||{}).pgn || '')}</textarea>
                                    <div style="display:flex; gap:6px; margin-top:6px; flex-wrap:wrap;">
                                        <label style="background:white; border:1px solid #f59e0b; color:#92400e; padding:6px 12px; border-radius:6px; font-weight:700; font-size:0.78rem; cursor:pointer; display:inline-flex; align-items:center; gap:5px;">
                                            📂 Subir archivo .pgn
                                            <input type="file" accept=".pgn,.txt" style="display:none;" onchange="cargarPGNArchivoEnBloque('${claseId}','${tema.id}','${bloque.id}', event)">
                                        </label>
                                    </div>
                                    <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:8px; margin-top:10px;">
                                        <div>
                                            <label style="display:block; font-size:0.72rem; color:#92400e; font-weight:700; text-transform:uppercase; margin-bottom:3px;">Modo</label>
                                            <select onchange="actualizarBloqueTablero('${claseId}','${tema.id}','${bloque.id}', 'modo', this.value)" style="width:100%; padding:6px; border:1px solid #fdba74; border-radius:6px; font-size:0.82rem; background:white;">
                                                <option value="ejercicio" ${((bloque.config||{}).modo||'ejercicio')==='ejercicio'?'selected':''}>🎯 Ejercicio</option>
                                                <option value="ordenador" ${((bloque.config||{}).modo)==='ordenador'?'selected':''}>🤖 Jugar vs PC</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style="display:block; font-size:0.72rem; color:#92400e; font-weight:700; text-transform:uppercase; margin-bottom:3px;">Humano juega</label>
                                            <select onchange="actualizarBloqueTablero('${claseId}','${tema.id}','${bloque.id}', 'colorHumano', this.value)" style="width:100%; padding:6px; border:1px solid #fdba74; border-radius:6px; font-size:0.82rem; background:white;">
                                                <option value="w" ${((bloque.config||{}).colorHumano||'w')==='w'?'selected':''}>♔ Blancas</option>
                                                <option value="b" ${((bloque.config||{}).colorHumano)==='b'?'selected':''}>♚ Negras</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style="display:block; font-size:0.72rem; color:#92400e; font-weight:700; text-transform:uppercase; margin-bottom:3px;">Nivel Stockfish</label>
                                            <select onchange="actualizarBloqueTablero('${claseId}','${tema.id}','${bloque.id}', 'nivelSF', parseInt(this.value,10))" style="width:100%; padding:6px; border:1px solid #fdba74; border-radius:6px; font-size:0.82rem; background:white;">
                                                <option value="1" ${((bloque.config||{}).nivelSF)==1?'selected':''}>1 — Principiante</option>
                                                <option value="2" ${((bloque.config||{}).nivelSF)==2?'selected':''}>2 — Muy fácil</option>
                                                <option value="3" ${((bloque.config||{}).nivelSF)==3?'selected':''}>3 — Fácil</option>
                                                <option value="4" ${((bloque.config||{}).nivelSF)==4?'selected':''}>4 — Normal</option>
                                                <option value="5" ${((bloque.config||{}).nivelSF||5)==5?'selected':''}>5 — Intermedio</option>
                                                <option value="6" ${((bloque.config||{}).nivelSF)==6?'selected':''}>6 — Difícil</option>
                                                <option value="7" ${((bloque.config||{}).nivelSF)==7?'selected':''}>7 — Muy difícil</option>
                                                <option value="8" ${((bloque.config||{}).nivelSF)==8?'selected':''}>8 — Maestro</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style="display:block; font-size:0.72rem; color:#92400e; font-weight:700; text-transform:uppercase; margin-bottom:3px;">Orientación</label>
                                            <select onchange="actualizarBloqueTablero('${claseId}','${tema.id}','${bloque.id}', 'orientacion', this.value)" style="width:100%; padding:6px; border:1px solid #fdba74; border-radius:6px; font-size:0.82rem; background:white;">
                                                <option value="auto" ${((bloque.config||{}).orientacion||'auto')==='auto'?'selected':''}>🔄 Auto</option>
                                                <option value="white" ${((bloque.config||{}).orientacion)==='white'?'selected':''}>♔ Blancas abajo</option>
                                                <option value="black" ${((bloque.config||{}).orientacion)==='black'?'selected':''}>♚ Negras abajo</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            ` : bloque.tipo === 'consejo' ? `
                                <div class="bloque-consejo-config" style="background:#fffbeb; border:1px dashed #f59e0b; border-radius:8px; padding:10px; margin-top:6px;">
                                    <p style="font-size:0.78rem; color:#92400e; font-weight:700; text-transform:uppercase; margin-bottom:8px;">💡 Configuración del Consejo</p>
                                    <label style="display:block; font-size:0.75rem; color:#92400e; font-weight:700; text-transform:uppercase; margin-bottom:3px;">🖼️ URL de imagen (opcional)</label>
                                    <input type="url" placeholder="https://…/imagen.png o URL de Google Drive" value="${esc(bloque.imagenURL||'')}" onchange="actualizarBloqueConsejo('${claseId}','${tema.id}','${bloque.id}', 'imagenURL', this.value)" style="width:100%; padding:8px; border:1px solid #f59e0b; border-radius:6px; font-size:0.82rem; background:white; margin-bottom:8px;">
                                    <label style="display:block; font-size:0.75rem; color:#92400e; font-weight:700; text-transform:uppercase; margin-bottom:3px;">📝 Texto del consejo (opcional)</label>
                                    <input type="text" placeholder="Ej: Controla el centro del tablero…" value="${esc(bloque.texto||'')}" onchange="actualizarBloqueConsejo('${claseId}','${tema.id}','${bloque.id}', 'texto', this.value)" style="width:100%; padding:8px; border:1px solid #f59e0b; border-radius:6px; font-size:0.82rem; background:white;">
                                    <p style="font-size:0.72rem; color:#92400e; margin-top:6px; font-style:italic;">ℹ️ Si es una URL de Drive, se convierte automáticamente para que se vea.</p>
                                </div>
                            ` : `
                                <input placeholder="Contenido" value="${esc(bloque.contenido||'')}" onchange="actualizarBloqueContenido('${claseId}','${tema.id}','${bloque.id}', this.value)">
                            `}
                            <input placeholder="Nota al pie (opcional)" value="${esc(bloque.nota||'')}" onchange="actualizarBloqueNota('${claseId}','${tema.id}','${bloque.id}', this.value)" style="margin-top:10px;">
                        </div>
                    </div>`;
                }).join('')}
            </div>
            <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:8px;">
                <button class="btn btn-azul btn-small" onclick="agregarBloque('${claseId}','${tema.id}','texto')">➕ Texto</button>
                <button class="btn btn-azul btn-small" onclick="agregarBloque('${claseId}','${tema.id}','video')">➕ Video</button>
                <button class="btn btn-azul btn-small" onclick="agregarBloque('${claseId}','${tema.id}','iframe')">➕ Iframe</button>
                <button class="btn btn-azul btn-small" onclick="agregarBloque('${claseId}','${tema.id}','imagen')">➕ Imagen</button>
                <button class="btn btn-azul btn-small" onclick="agregarBloque('${claseId}','${tema.id}','enlace')">➕ Enlace</button>
                <button class="btn btn-azul btn-small" onclick="agregarBloque('${claseId}','${tema.id}','tablero')" style="background:linear-gradient(135deg,#0284c7,#0ea5e9);color:white;border-color:#0ea5e9;">➕ 🎯 Tablero</button>
                <button class="btn btn-azul btn-small" onclick="agregarBloque('${claseId}','${tema.id}','consejo')" style="background:linear-gradient(135deg,#d97706,#f59e0b);color:white;border-color:#f59e0b;">➕ 💡 Consejo</button>
            </div>
        </div>` : '';

        const nivelBadgeHTML = nivel > 0 ? `<span class="nivel-badge">Nivel ${nivel}</span>` : '';

        const html = `
        <div class="tema ${completado ? 'abierto' : ''} ${!accesible ? 'bloqueado' : ''}"
             data-tema-id="${tema.id}"
             data-nivel="${Math.min(nivel, 4)}">
            <div class="tema-header" data-accion="toggle-tema" data-tema-id="${tema.id}">
                <span class="titulo-editable" data-accion="renombrarTema" data-clase="${claseId}" data-tema="${tema.id}">${tema.numero}. ${escapeHtml(tema.titulo)}</span>
                ${nivelBadgeHTML}
                ${!accesible ? '<span>🔒</span>' : ''}
                ${completado ? '<span class="badge">✓</span>' : ''}
                <span style="flex:1;"></span>
                ${accesible && !tieneTableros ? `<button class="btn btn-exito btn-small" onclick="event.stopPropagation(); marcarVisto('${claseId}','${tema.id}')">${completado ? '✓ Completado' : '👁️ Visto'}</button>` : ''}
                ${accesible && tieneTableros && completado ? '<span class="badge">✓ Completado</span>' : ''}                ${esAdmin ? `
                    <button class="btn-reorder" onclick="event.stopPropagation(); moverTemaArriba('${claseId}','${tema.id}')" title="Subir tema">↑</button>
                    <button class="btn-reorder" onclick="event.stopPropagation(); moverTemaAbajo('${claseId}','${tema.id}')" title="Bajar tema">↓</button>
                    <button class="btn btn-small ${tema.bloqueado ? 'btn-warning' : 'btn-exito'}" onclick="event.stopPropagation(); toggleBloqueoTema('${claseId}','${tema.id}')">${tema.bloqueado ? '🔒' : '🔓'}</button>
                    <button class="btn btn-azul btn-small" onclick="event.stopPropagation(); gestionarAccesosTema('${claseId}','${tema.id}')">👥</button>
                    <button class="btn btn-azul btn-small" onclick="event.stopPropagation(); agregarSubtema('${claseId}','${tema.id}')">➕</button>
                    <button class="btn btn-peligro btn-small" onclick="event.stopPropagation(); eliminarTema('${claseId}','${tema.id}')">🗑️</button>
                ` : ''}
            </div>
            <div class="tema-body">
                ${contenidoHTML}
                ${adminEditorHTML}
            </div>
        </div>`;
        return html;
    };

// === FIN DE LA PARTE 1/4 ===
     // ============================================================
    // ACTUALIZAR UI COMPLETA
    // ============================================================
    Render.actualizarUI = function () {
        const contentDiv = document.getElementById('main-content');
        if (!contentDiv) return;

        // Mostrar/ocultar botón Jugar vs IA según sesión
        const btnJugarIA = document.getElementById('btn-jugar-ia');
        if (btnJugarIA) {
            btnJugarIA.style.display = Core.state.currentUser ? 'inline-flex' : 'none';
        }

        if (!Core.state.currentUser) {
            contentDiv.innerHTML = `
                <div style="text-align:center; margin-top:40px; color:var(--texto-suave);">
                    <p style="font-size:1.2rem;">♞ Bienvenido al curso de ajedrez del Club Morphy</p>
                    <p style="margin-top:12px; font-size:0.95rem;">Inicia sesión o regístrate para acceder a las clases, videos y ejercicios interactivos.</p>
                </div>`;
            Render.renderizarSidebar();
            const searchInput = document.getElementById('search-input');
            if (searchInput) searchInput.style.display = 'none';
            const btnProgreso = document.getElementById('btn-progreso');
            if (btnProgreso) btnProgreso.style.display = 'none';
            return;
        }
        Render.renderizarSidebar();

        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.style.display = 'block';
            if (Core.state.terminoBusqueda) searchInput.value = Core.state.terminoBusqueda;
        }
        const btnProgreso = document.getElementById('btn-progreso');
        if (btnProgreso) btnProgreso.style.display = 'inline-flex';

        if (Core.state.claseActivaId) {
            const clase = Core.state.curso.clases.find(c => c.id === Core.state.claseActivaId);
            if (clase && Render.esClaseDesbloqueada(clase)) {
                Render.renderizarContenido(clase);
            } else if (clase && !Render.esClaseDesbloqueada(clase)) {
                const yaSolicitada = Core.state.misSolicitudes.some(s => s.claseId === clase.id && s.estado === 'pendiente');
                contentDiv.innerHTML = `
                    <div style="text-align:center; margin-top:40px;">
                        <p style="color:var(--warning); font-size:1.1rem;">🔒 Esta clase está bloqueada.</p>
                        <p style="color:var(--texto-suave); margin:10px 0;">Completa los temas anteriores o solicita acceso especial al administrador.</p>
                        <button class="btn btn-solicitar" id="btn-solicitar-acceso"
                            ${yaSolicitada ? 'disabled' : ''}
                            onclick="solicitarAcceso('${clase.id}')">
                            ${yaSolicitada ? '⏳ Solicitud enviada' : '📩 Solicitar acceso'}
                        </button>
                    </div>`;
            } else {
                contentDiv.innerHTML = `<div style="text-align:center; margin-top:40px; color:var(--texto-suave);"><p>Selecciona una clase del menú lateral.</p></div>`;
            }
        } else if (Core.state.curso.clases.length > 0) {
            const primeraDesbloqueada = Core.state.curso.clases.find(c => Render.esClaseDesbloqueada(c));
            if (primeraDesbloqueada) {
                Core.state.claseActivaId = primeraDesbloqueada.id;
                Render.renderizarContenido(primeraDesbloqueada);
            } else {
                contentDiv.innerHTML = `<div style="text-align:center; margin-top:40px; color:var(--texto-suave);"><p>No hay clases disponibles o todas están bloqueadas.</p></div>`;
            }
        } else {
            contentDiv.innerHTML = `<div style="text-align:center; margin-top:40px; color:var(--texto-suave);"><p>📚 El curso aún no tiene contenido. Si eres administrador, agrega clases desde el menú.</p></div>`;
        }
        Render.habilitarEdicionPorLongPress();

        const idNuevoTema = window.__nuevoTemaId;
        if (idNuevoTema) window.__nuevoTemaId = null;
        const idParaAbrir = idNuevoTema || Core.state.temaAbiertoGlobal;

        if (idParaAbrir) {
            setTimeout(() => {
                const tema = contentDiv.querySelector(`.tema[data-tema-id="${idParaAbrir}"]`);
                if (tema) {
                    if (!tema.classList.contains('abierto')) tema.classList.add('abierto');
                    tema.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 50);
        }

        setTimeout(() => Render.inicializarTablerosEntrenador(), 100);
        guardarEstadoNavegacion();
    };

    Render.renderizarContenido = function (clase) {
        const temasHTML = clase.temas.map(t => Render.renderizarTemaRecursivo(t, clase.id, 0)).join('');

        document.getElementById('main-content').innerHTML = `
            <div class="flex-between" style="margin-bottom:20px;">
                <h2><span class="titulo-editable" data-accion="renombrarClase" data-id="${clase.id}">${clase.numero}. ${escapeHtml(clase.titulo)}</span></h2>
                <div class="solo-admin">
                    <button class="btn btn-azul btn-small" onclick="agregarTema('${clase.id}')">➕ Agregar tema</button>
                </div>
            </div>
            <div id="temas-container">${temasHTML}</div>`;

        document.querySelectorAll('[data-accion="toggle-tema"]').forEach(header => {
            header.addEventListener('click', (e) => {
                if (e.target.closest('button') || e.target.closest('[data-accion="renombrarTema"]')) return;
                const temaId = header.dataset.temaId;
                const temaDiv = document.querySelector(`.tema[data-tema-id="${temaId}"]`);
                if (!temaDiv) return;

                document.querySelectorAll('.tema.abierto').forEach(otro => {
                    if (otro !== temaDiv) otro.classList.remove('abierto');
                });

                temaDiv.classList.toggle('abierto');
                Core.state.temaAbiertoGlobal = temaDiv.classList.contains('abierto') ? temaId : null;
                guardarEstadoNavegacion();

                if (temaDiv.classList.contains('abierto')) {
                    setTimeout(() => Render.inicializarTablerosEntrenador(), 100);
                }
            });
        });

        setTimeout(() => Render.inicializarTablerosEntrenador(), 100);
    };

    Render.agregarTema = async function (claseId) {
        if (!Core.state.currentUser?.esAdmin) return;
        const clase = Core.state.curso.clases.find(c => c.id === claseId);
        if (!clase) return;
        const nuevoNum = clase.temas.length + 1;
        const nuevoTema = {
            id: generarId(),
            numero: nuevoNum,
            titulo: `Tema ${nuevoNum}`,
            bloqueado: false,
            accesos: [],
            accesosTemaId: null,
            subtemas: [],
            bloques: []
        };
        clase.temas.push(nuevoTema);
        window.__nuevoTemaId = nuevoTema.id;
        Render.actualizarUI();
        try {
            await Curso.guardarCurso();
            mostrarToast('Tema agregado', 'success');
        } catch (err) {
            clase.temas.pop();
            Render.actualizarUI();
            mostrarToast('Error al agregar tema', 'error');
        }
    };

    // ============================================================
    // EDICIÓN POR LONG PRESS
    // ============================================================
    Render.habilitarEdicionPorLongPress = function () {
        document.querySelectorAll('.titulo-editable').forEach(span => {
            if (span.dataset.longPressEnabled === 'true') return;
            span.dataset.longPressEnabled = 'true';
            let timer;
            let longPressed = false;
            const start = (e) => { longPressed = false; timer = setTimeout(() => { longPressed = true; Render.activarEdicion(span); }, 600); };
            const cancel = () => { clearTimeout(timer); };
            const cancelOnMove = (e) => { if (e.cancelable) clearTimeout(timer); };
            const clickHandler = (e) => { if (longPressed) { e.stopPropagation(); e.preventDefault(); longPressed = false; } };
            span.addEventListener('mousedown', start);
            span.addEventListener('touchstart', start, { passive: true });
            span.addEventListener('touchmove', cancelOnMove, { passive: true });
            span.addEventListener('mouseup', cancel);
            span.addEventListener('mouseleave', cancel);
            span.addEventListener('touchend', cancel);
            span.addEventListener('touchcancel', cancel);
            span.addEventListener('click', clickHandler);
        });
    };

    Render.activarEdicion = function (span) {
        const textoActual = span.textContent.trim();
        const input = document.createElement('input');
        input.type = 'text';
        input.value = textoActual;
        input.className = 'input-edicion-inline';
        input.style.cssText = 'font-size: inherit; font-weight: inherit; color: inherit; background: var(--bg); border: 2px solid var(--acento); padding: 4px 8px; border-radius: 6px; width: 100%; box-sizing: border-box; max-width: 100%;';
        for (let attr of span.attributes) { if (attr.name.startsWith('data-')) input.setAttribute(attr.name, attr.value); }
        span.replaceWith(input);
        input.focus();
        input.select();
        input.addEventListener('contextmenu', (e) => e.preventDefault());
        const guardar = async () => {
            const nuevo = input.value.trim();
            if (nuevo && nuevo !== textoActual) {
                const tipo = input.dataset.accion;
                if (tipo === 'renombrarClase') { await Curso.renombrarClase(input.dataset.id, nuevo); }
                else if (tipo === 'renombrarTema') { await Curso.renombrarTema(input.dataset.clase, input.dataset.tema, nuevo); }
            }
            const nuevoSpan = document.createElement('span');
            nuevoSpan.className = span.className;
            for (let attr of span.attributes) { if (attr.name.startsWith('data-')) nuevoSpan.setAttribute(attr.name, attr.value); }
            nuevoSpan.textContent = nuevo || textoActual;
            input.replaceWith(nuevoSpan);
            Render.habilitarEdicionPorLongPress();
        };
        input.addEventListener('blur', guardar);
        input.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); input.blur(); } });
    };

        // ============================================================
    // INICIALIZAR TABLEROS DEL ENTRENADOR
    // ============================================================
    // ⭐ FIX F: se pasa `progresoTableros` al contexto para que el
    // entrenador restaure el progreso previo del alumno.
    //
    // ⭐ v22 Fix A: se registran las instancias activas para poder
    // actualizar su progreso cuando llegue el snapshot de Firestore.
    // ============================================================

    // ⭐ v22: Registro de instancias activas de tablero
    Render.instanciasTablero = [];

    Render.inicializarTablerosEntrenador = function () {
        if (!window.Entrenador) {
            console.warn('[Fase 5] Entrenador no está cargado');
            return;
        }
        const bloques = document.querySelectorAll('.cm-tablero-bloque-alumno');
        bloques.forEach(bloqueEl => {
            if (bloqueEl.dataset.inicializado === 'true') return;
            try {
                const config = {
                    pgn: decodeURIComponent(bloqueEl.dataset.pgn || ''),
                    modo: bloqueEl.dataset.modo || 'ejercicio',
                    colorHumano: bloqueEl.dataset.color || 'w',
                    nivelSF: parseInt(bloqueEl.dataset.nivel || '5', 10),
                    orientacion: bloqueEl.dataset.orientacion || 'auto'
                };
                if (!config.pgn || !config.pgn.trim()) return;

                const claseId = bloqueEl.dataset.clase;
                const temaId = bloqueEl.dataset.tema;
                const bloqueId = bloqueEl.dataset.bloqueId;

                const contexto = {
                    esAdmin: !!(Core.state.currentUser && Core.state.currentUser.esAdmin),
                    uid: Core.state.currentUser ? Core.state.currentUser.uid : null,
                    nombreTema: bloqueEl.closest('.tema')?.querySelector('.titulo-editable')?.textContent || '',
                    claseId: claseId,
                    temaId: temaId,
                    bloqueId: bloqueId,

                    // ⭐ FIX F: pasar el progreso global al entrenador
                    progresoTableros: Core.state.progresoTableros,

                    // ⭐ v27: callback cuando TODOS los capítulos de este tablero estén resueltos
                    onTableroCompletado: (data) => {
                        setTimeout(() => {
                            Render.verificarTemaCompleto(data.claseId, data.temaId);
                        }, 200);
                    },
                    onCompletado: () => {
                        console.log('[v22] Tablero completado');
                    },
                    onGuardarVariante: (data) => Render.guardarVarianteEnFirestore(claseId, temaId, bloqueId, data),
                    onGuardarPGN: (data) => Render.guardarPGNEnFirestore(claseId, temaId, bloqueId, data.pgn),
                    onEliminarCapitulo: (data) => Render.eliminarCapituloDeFirestore(claseId, temaId, bloqueId, data.pgnNuevo),
                    onGuardarProgresoVariante: (data) => Curso.guardarProgresoVarianteEnFirestore(data),
                    onGuardarProgresoCapCompleto: (data) => Curso.guardarProgresoCapCompletoEnFirestore(data),
                    onRenombrarCapitulo: (data) => Render.guardarPGNEnFirestore(claseId, temaId, bloqueId, data.pgnNuevo)
                };

                // ⭐ v22 Fix A: registrar la instancia para poder actualizarla después
                const instancia = window.Entrenador.render(bloqueEl, config, contexto);
                if (instancia) Render.instanciasTablero.push(instancia);

                bloqueEl.dataset.inicializado = 'true';
            } catch (err) {
                console.error('[Fase 5] Error al inicializar tablero:', err);
            }
        });
    };
   
    // ⭐ v27: Verificar si TODOS los tableros del tema están completos.
    // Solo entonces marca el tema como completado.
    Render.verificarTemaCompleto = function (claseId, temaId) {
        // Los admins no marcan temas automáticamente
        if (Core.state.currentUser?.esAdmin) return;

        const clase = Core.state.curso.clases.find(c => c.id === claseId);
        if (!clase) return;
        const tema = Curso.buscarTemaRecursivo(clase.temas, temaId);
        if (!tema || !tema.bloques) return;

        // Obtener solo bloques de tablero CON PGN
        const bloquesTablero = tema.bloques.filter(b =>
            b.tipo === 'tablero' && b.config && b.config.pgn && b.config.pgn.trim()
        );
        if (bloquesTablero.length === 0) return;

        // Buscar instancias activas por bloque
        const instanciasPorBloque = {};
        Render.instanciasTablero.forEach(inst => {
            if (inst.destroyed) return;
            if (inst.claseIdContexto === claseId &&
                inst.temaIdContexto === temaId &&
                inst.bloqueIdContexto) {
                instanciasPorBloque[inst.bloqueIdContexto] = inst;
            }
        });

        // Si algún bloque de tablero no tiene instancia o no está completo → no marcar
        for (const bloque of bloquesTablero) {
            const inst = instanciasPorBloque[bloque.id];
            if (!inst) return; // Bloque aún no cargado
            const todosCaps = inst.capitulos.every(c => c.completado);
            if (!todosCaps) return; // Aún no terminó
        }

        // Si llegamos aquí, TODOS los tableros del tema están completos
        if (!Curso.estaCompletado(claseId, temaId)) {
            console.log('[v27] Tema completo, marcando como visto:', tema.titulo);
            Curso.marcarVisto(claseId, temaId);
        }
    };
   
    // ⭐ v22 Fix A: actualizar progreso de los tableros ya inicializados
    // (se llama cuando llega el snapshot de Firestore con el progreso)
    Render.actualizarProgresoTableros = function () {
        if (!Core.state.progresoTableros) return;
        // Limpiar instancias destruidas
        Render.instanciasTablero = Render.instanciasTablero.filter(inst => inst && !inst.destroyed);
        // Actualizar el progreso de cada instancia activa
        Render.instanciasTablero.forEach(inst => {
            if (typeof inst.actualizarProgresoVariantes === 'function') {
                try {
                    inst.actualizarProgresoVariantes(Core.state.progresoTableros);
                } catch (e) {
                    console.warn('[v22] Error al actualizar progreso de instancia:', e);
                }
            }
        });
    };
    // ============================================================
    // BLOQUES DEL TABLERO (admin)
    // ============================================================
    Render.actualizarBloqueTablero = function (claseId, temaId, bloqueId, campo, valor) {
        const clase = Core.state.curso.clases.find(c => c.id === claseId);
        if (!clase) return;
        const tema = Curso.buscarTemaRecursivo(clase.temas, temaId);
        const bloque = tema?.bloques?.find(b => b.id === bloqueId);
        if (!bloque || bloque.tipo !== 'tablero') return;
        if (!bloque.config) bloque.config = { pgn: '', modo: 'ejercicio', colorHumano: 'w', nivelSF: 5, orientacion: 'auto' };
        bloque.config[campo] = valor;
        Curso.guardarCurso().then(() => Render.actualizarUI());
    };

    Render.actualizarBloqueConsejo = function (claseId, temaId, bloqueId, campo, valor) {
        const clase = Core.state.curso.clases.find(c => c.id === claseId);
        if (!clase) return;
        const tema = Curso.buscarTemaRecursivo(clase.temas, temaId);
        const bloque = tema?.bloques?.find(b => b.id === bloqueId);
        if (!bloque || bloque.tipo !== 'consejo') return;
        if (campo === 'imagenURL') bloque.imagenURL = valor;
        if (campo === 'texto') bloque.texto = valor;
        Curso.guardarCurso().then(() => Render.actualizarUI());
    };

    Render.cargarPGNArchivoEnBloque = function (claseId, temaId, bloqueId, event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            Render.actualizarBloqueTablero(claseId, temaId, bloqueId, 'pgn', ev.target.result);
            mostrarToast('📂 PGN cargado desde archivo', 'success');
        };
        reader.readAsText(file);
    };

    // ============================================================
    // PERSISTENCIA DE VARIANTES/PGN
    // ============================================================
    Render.guardarVarianteEnFirestore = function (claseId, temaId, bloqueId, data) {
        if (!Core.state.currentUser?.esAdmin) return;
        const clase = Core.state.curso.clases.find(c => c.id === claseId);
        if (!clase) return;
        const tema = Curso.buscarTemaRecursivo(clase.temas, temaId);
        const bloque = tema?.bloques?.find(b => b.id === bloqueId);
        if (!bloque || bloque.tipo !== 'tablero') return;

        const { capituloIdx, pgnCapitulo } = data;
        if (!pgnCapitulo) return;

        const pgnOriginal = (bloque.config || {}).pgn || '';
        const bloques = pgnOriginal.split(/(?=\[Event\s)/i).filter(b => b.trim());
        if (capituloIdx < 0 || capituloIdx >= bloques.length) return;

        bloques[capituloIdx] = pgnCapitulo.trim();
        if (!bloque.config) bloque.config = {};
        bloque.config.pgn = bloques.join('\n\n');

        Curso.guardarCurso().then(() => {
            console.log(`[v20] Variante guardada en cap ${capituloIdx + 1}`);
        }).catch(err => {
            console.error('[v20] Error al guardar variante:', err);
        });
    };

    Render.guardarPGNEnFirestore = function (claseId, temaId, bloqueId, pgn) {
        if (!Core.state.currentUser?.esAdmin) return;
        const clase = Core.state.curso.clases.find(c => c.id === claseId);
        if (!clase) return;
        const tema = Curso.buscarTemaRecursivo(clase.temas, temaId);
        const bloque = tema?.bloques?.find(b => b.id === bloqueId);
        if (!bloque || bloque.tipo !== 'tablero') return;
        if (!bloque.config) bloque.config = {};
        bloque.config.pgn = pgn;
        Curso.guardarCurso().then(() => console.log(`[v20] PGN guardado`)).catch(err => console.error('[v20]', err));
    };

    Render.eliminarCapituloDeFirestore = function (claseId, temaId, bloqueId, pgnNuevo) {
        if (!Core.state.currentUser?.esAdmin) return;
        const clase = Core.state.curso.clases.find(c => c.id === claseId);
        if (!clase) return;
        const tema = Curso.buscarTemaRecursivo(clase.temas, temaId);
        const bloque = tema?.bloques?.find(b => b.id === bloqueId);
        if (!bloque || bloque.tipo !== 'tablero') return;
        if (!bloque.config) bloque.config = {};
        bloque.config.pgn = pgnNuevo;
        Curso.guardarCurso().then(() => console.log(`[v20] Capítulo eliminado`)).catch(err => console.error('[v20]', err));
    };

    // ============================================================
    // BADGE DEL ELO EN EL HEADER
    // ============================================================
    Render.inicializarBadgeELO = function () {
        const badge = document.getElementById('header-elo-badge');
        const valor = document.getElementById('header-elo-value');
        if (!badge || !valor) return;

        if (window.Entrenador && typeof window.Entrenador.obtenerELO === 'function') {
            valor.textContent = window.Entrenador.obtenerELO();
            badge.style.display = 'inline-flex';
        } else {
            setTimeout(Render.inicializarBadgeELO, 500);
            return;
        }

        if (!window._cmBadgeELOListenerActivo) {
            window._cmBadgeELOListenerActivo = true;
            document.addEventListener('cm-tablero-elo-changed', (e) => {
                const badgeEl = document.getElementById('header-elo-badge');
                const valueEl = document.getElementById('header-elo-value');
                if (!badgeEl || !valueEl) return;
                valueEl.textContent = e.detail.total;
                badgeEl.style.transform = 'scale(1.1)';
                setTimeout(() => { badgeEl.style.transform = 'scale(1)'; }, 200);
            });
        }
    };

// === FIN DE LA PARTE 2/4 ===
     // ============================================================
    // JUEGO VS IA — MODAL DE CONFIGURACIÓN
    // ============================================================
    Render.abrirModalJuegoIA = function () {
        if (!Core.state.currentUser) {
            mostrarToast('Debes iniciar sesión para jugar', 'error');
            return;
        }

        if (!dom.modalJuegoIA) {
            console.warn('[v20] Modal de juego IA no encontrado en el DOM');
            return;
        }

        // ⭐ Resetear config a valores por defecto cada vez que se abre
        Core.state.juegoIAConfig = {
            nivelSF: 5,
            colorHumano: 'w',
            tiempo: 'libre'
        };

        const niveles = [
            { nivel: 1, nombre: 'Principiante', elo: 800 },
            { nivel: 2, nombre: 'Muy fácil', elo: 1000 },
            { nivel: 3, nombre: 'Fácil', elo: 1200 },
            { nivel: 4, nombre: 'Normal', elo: 1400 },
            { nivel: 5, nombre: 'Intermedio', elo: 1600 },
            { nivel: 6, nombre: 'Difícil', elo: 1800 },
            { nivel: 7, nombre: 'Muy difícil', elo: 2100 },
            { nivel: 8, nombre: 'Maestro', elo: 2400 }
        ];

        const tiempos = [
            { id: 'libre', nombre: 'Sin límite' },
            { id: '3+0', nombre: '3 min' },
            { id: '5+0', nombre: '5 min' },
            { id: '10+0', nombre: '10 min' },
            { id: '15+10', nombre: '15 min + 10s' }
        ];

        const htmlNiveles = niveles.map(n => `
            <button class="juego-ia-nivel-btn ${Core.state.juegoIAConfig.nivelSF === n.nivel ? 'activo' : ''}" data-nivel="${n.nivel}">
                <span class="nivel-num">Nv${n.nivel}</span>
                <span class="nivel-elo">~${n.elo} ELO</span>
                <span class="nivel-nombre">${n.nombre}</span>
            </button>
        `).join('');

        const htmlColores = `
            <button class="juego-ia-color-btn ${Core.state.juegoIAConfig.colorHumano === 'w' ? 'activo' : ''}" data-color="w">
                <span class="pieza">♔</span> Blancas
            </button>
            <button class="juego-ia-color-btn ${Core.state.juegoIAConfig.colorHumano === 'b' ? 'activo' : ''}" data-color="b">
                <span class="pieza">♚</span> Negras
            </button>
            <button class="juego-ia-color-btn ${Core.state.juegoIAConfig.colorHumano === 'random' ? 'activo' : ''}" data-color="random">
                🎲 Aleatorio
            </button>
        `;

        const htmlTiempos = tiempos.map(t => `
            <button class="juego-ia-tiempo-btn ${Core.state.juegoIAConfig.tiempo === t.id ? 'activo' : ''}" data-tiempo="${t.id}">
                ${t.nombre}
            </button>
        `).join('');

        const eloHumano = window.Entrenador && window.Entrenador.obtenerELO
            ? window.Entrenador.obtenerELO()
            : 1200;

        dom.modalJuegoIA.querySelector('.modal-juego-ia-content').innerHTML = `
            <div class="juego-ia-setup">
                <div class="juego-ia-header">
                    <span class="juego-ia-header-icon">♟️</span>
                    <div class="juego-ia-header-text">
                        <h3>Jugar vs Inteligencia Artificial</h3>
                        <p>Elige el nivel, tu color y el tiempo. Tu ELO actual: <strong>${eloHumano}</strong></p>
                    </div>
                </div>

                <div class="juego-ia-seccion">
                    <label class="juego-ia-seccion-label">🎯 Nivel de dificultad</label>
                    <div class="juego-ia-niveles">${htmlNiveles}</div>
                </div>

                <div class="juego-ia-seccion">
                    <label class="juego-ia-seccion-label">♟️ Tu color</label>
                    <div class="juego-ia-colores">${htmlColores}</div>
                </div>

                <div class="juego-ia-seccion">
                    <label class="juego-ia-seccion-label">⏱️ Tiempo de partida</label>
                    <div class="juego-ia-tiempos">${htmlTiempos}</div>
                </div>
            </div>

            <div class="juego-ia-preview">
                <span class="preview-item">🤖 <strong>IA Nv${Core.state.juegoIAConfig.nivelSF}</strong></span>
                <span class="preview-item">🎨 <strong>${Core.state.juegoIAConfig.colorHumano === 'w' ? 'Blancas' : Core.state.juegoIAConfig.colorHumano === 'b' ? 'Negras' : 'Aleatorio'}</strong></span>
                <span class="preview-item">⏱️ <strong>${Core.TIEMPOS_PARTIDA_MAP[Core.state.juegoIAConfig.tiempo] || 'Sin límite'}</strong></span>
            </div>

            <div class="juego-ia-acciones">
                <button class="juego-ia-btn-cancelar" data-accion="cancelar">Cancelar</button>
                <button class="juego-ia-btn-empezar" data-accion="empezar" ${Core.state.juegoIAEsperandoStockfish ? 'disabled' : ''}>
                    ${Core.state.juegoIAEsperandoStockfish ? '⏳ Cargando motor…' : '▶ Empezar partida'}
                </button>
            </div>
        `;

        // Listeners de los botones
        dom.modalJuegoIA.querySelectorAll('.juego-ia-nivel-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                dom.modalJuegoIA.querySelectorAll('.juego-ia-nivel-btn').forEach(b => b.classList.remove('activo'));
                btn.classList.add('activo');
                Core.state.juegoIAConfig.nivelSF = parseInt(btn.dataset.nivel, 10);
                Render.actualizarPreviewJuegoIA();
            });
        });

        dom.modalJuegoIA.querySelectorAll('.juego-ia-color-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                dom.modalJuegoIA.querySelectorAll('.juego-ia-color-btn').forEach(b => b.classList.remove('activo'));
                btn.classList.add('activo');
                Core.state.juegoIAConfig.colorHumano = btn.dataset.color;
                Render.actualizarPreviewJuegoIA();
            });
        });

        dom.modalJuegoIA.querySelectorAll('.juego-ia-tiempo-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                dom.modalJuegoIA.querySelectorAll('.juego-ia-tiempo-btn').forEach(b => b.classList.remove('activo'));
                btn.classList.add('activo');
                Core.state.juegoIAConfig.tiempo = btn.dataset.tiempo;
                Render.actualizarPreviewJuegoIA();
            });
        });

        const btnCancelar = dom.modalJuegoIA.querySelector('[data-accion="cancelar"]');
        if (btnCancelar) btnCancelar.addEventListener('click', () => Render.cerrarModalJuegoIA());

        const btnEmpezar = dom.modalJuegoIA.querySelector('[data-accion="empezar"]');
        if (btnEmpezar) btnEmpezar.addEventListener('click', () => Render.iniciarJuegoIA());

        dom.modalJuegoIA.classList.add('active');

        Render.precargarStockfishParaJuego();
    };

    Render.actualizarPreviewJuegoIA = function () {
        if (!dom.modalJuegoIA) return;
        const preview = dom.modalJuegoIA.querySelector('.juego-ia-preview');
        if (!preview) return;
        preview.innerHTML = `
            <span class="preview-item">🤖 <strong>IA Nv${Core.state.juegoIAConfig.nivelSF}</strong></span>
            <span class="preview-item">🎨 <strong>${Core.state.juegoIAConfig.colorHumano === 'w' ? 'Blancas' : Core.state.juegoIAConfig.colorHumano === 'b' ? 'Negras' : 'Aleatorio'}</strong></span>
            <span class="preview-item">⏱️ <strong>${Core.TIEMPOS_PARTIDA_MAP[Core.state.juegoIAConfig.tiempo] || 'Sin límite'}</strong></span>
        `;
    };

    // ============================================================
    // PRECARGA DE STOCKFISH EN BACKGROUND
    // ============================================================
    Render.precargarStockfishParaJuego = function () {
        if (!window.Entrenador || typeof window.Entrenador.precargarStockfish !== 'function') return;
        if (Core.state.juegoIAEsperandoStockfish) return;

        const estado = window.Entrenador.estadoStockfish();
        if (estado === 'listo') return;

        Core.state.juegoIAEsperandoStockfish = true;
        const btnEmpezar = dom.modalJuegoIA?.querySelector('[data-accion="empezar"]');
        if (btnEmpezar) {
            btnEmpezar.disabled = true;
            btnEmpezar.textContent = '⏳ Cargando motor…';
        }

        window.Entrenador.precargarStockfish().then(() => {
            Core.state.juegoIAEsperandoStockfish = false;
            const btnEmpezar2 = dom.modalJuegoIA?.querySelector('[data-accion="empezar"]');
            if (btnEmpezar2) {
                btnEmpezar2.disabled = false;
                btnEmpezar2.innerHTML = '▶ Empezar partida';
            }
        });
    };

    // ============================================================
    // INICIO DE LA PARTIDA
    // ============================================================
    Render.iniciarJuegoIA = function () {
        if (!Core.state.currentUser) return;

        // Resolver color aleatorio
        let colorHumano = Core.state.juegoIAConfig.colorHumano;
        if (colorHumano === 'random') {
            colorHumano = Math.random() < 0.5 ? 'w' : 'b';
        }

        // Cambiar el contenido del modal a la sala de juego
        const contentEl = dom.modalJuegoIA.querySelector('.modal-juego-ia-content');
        if (!contentEl) return;

        contentEl.innerHTML = `
            <div class="juego-ia-sala" id="contenedor-juego-ia">
                <div style="padding:40px; text-align:center; color:var(--texto-suave);">
                    <div class="loader" style="width:32px; height:32px; border-width:3px; margin-bottom:12px;"></div>
                    <p>Preparando tablero…</p>
                </div>
            </div>
        `;

        const contenedor = document.getElementById('contenedor-juego-ia');
        if (!contenedor) return;

        if (!window.Entrenador || typeof window.Entrenador.abrirSalaLibre !== 'function') {
            contenedor.innerHTML = '<div style="padding:40px; text-align:center; color:var(--peligro);">⚠️ El entrenador no está disponible. Recarga la página.</div>';
            return;
        }

        const config = {
            nivelSF: Core.state.juegoIAConfig.nivelSF,
            colorHumano: colorHumano,
            tiempo: Core.state.juegoIAConfig.tiempo
        };

        const contexto = {
            esAdmin: !!(Core.state.currentUser && Core.state.currentUser.esAdmin),
            uid: Core.state.currentUser.uid,
            onSalirSalaLibre: () => {
                Render.cerrarModalJuegoIA();
                Core.state.juegoIAInstancia = null;
            },
            onFinPartida: (data) => {
                console.log('[v20] Partida terminada:', data.resultado);
                Render.inicializarBadgeELO();
            }
        };

        try {
            if (Core.state.juegoIAInstancia) {
                try { window.Entrenador.destroy(contenedor); } catch (e) {}
                Core.state.juegoIAInstancia = null;
            }

            Core.state.juegoIAInstancia = window.Entrenador.abrirSalaLibre(contenedor, config, contexto);
        } catch (err) {
            console.error('[v20] Error al iniciar sala libre:', err);
            contenedor.innerHTML = '<div style="padding:40px; text-align:center; color:var(--peligro);">⚠️ No se pudo iniciar la partida. Intenta de nuevo.</div>';
        }
    };

    // ============================================================
    // CIERRE DEL MODAL
    // ============================================================
    Render.cerrarModalJuegoIA = function () {
        if (!dom.modalJuegoIA) return;
        dom.modalJuegoIA.classList.remove('active');
    };

    Render.cerrarSalaLibre = function () {
        Render.cerrarModalJuegoIA();
        Core.state.juegoIAInstancia = null;
    };

// === FIN DE LA PARTE 3/4 ===
     // ============================================================
    // EXPOSICIÓN GLOBAL (para que onclick del HTML funcione)
    // ============================================================
    window.renderizarSidebar = Render.renderizarSidebar;
    window.filtrarClases = Render.filtrarClases;
    window.seleccionarClase = Render.seleccionarClase;
    window.esClaseDesbloqueada = Render.esClaseDesbloqueada;
    window.tieneAccesoEspecial = Render.tieneAccesoEspecial;
    window.gestionarAccesosClase = Render.gestionarAccesosClase;
    window.cerrarModalAccesos = Render.cerrarModalAccesos;

    window.renderizarTemaRecursivo = Render.renderizarTemaRecursivo;
    window.actualizarUI = Render.actualizarUI;
    window.renderizarContenido = Render.renderizarContenido;
    window.agregarTema = Render.agregarTema;

    window.habilitarEdicionPorLongPress = Render.habilitarEdicionPorLongPress;
    window.activarEdicion = Render.activarEdicion;

    window.inicializarTablerosEntrenador = Render.inicializarTablerosEntrenador;
    window.actualizarProgresoTableros = Render.actualizarProgresoTableros;
    window.actualizarBloqueTablero = Render.actualizarBloqueTablero;
    window.actualizarBloqueConsejo = Render.actualizarBloqueConsejo;
    window.cargarPGNArchivoEnBloque = Render.cargarPGNArchivoEnBloque;

    window.guardarVarianteEnFirestore = Render.guardarVarianteEnFirestore;
    window.guardarPGNEnFirestore = Render.guardarPGNEnFirestore;
    window.eliminarCapituloDeFirestore = Render.eliminarCapituloDeFirestore;

    window.inicializarBadgeELO = Render.inicializarBadgeELO;

    window.abrirModalJuegoIA = Render.abrirModalJuegoIA;
    window.actualizarPreviewJuegoIA = Render.actualizarPreviewJuegoIA;
    window.precargarStockfishParaJuego = Render.precargarStockfishParaJuego;
    window.iniciarJuegoIA = Render.iniciarJuegoIA;
    window.cerrarModalJuegoIA = Render.cerrarModalJuegoIA;
    window.cerrarSalaLibre = Render.cerrarSalaLibre;

    // ============================================================
    // LOG FINAL
    // ============================================================
    console.log('✅ CMRender cargado (sidebar + temas + entrenador + juego vs IA + Fix F)');

})();
