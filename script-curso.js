/* ============================================================
   SCRIPT CURSO — Club Morphy
   
   Contiene:
   - Suscripciones en tiempo real a Firestore
   - Badges de notificaciones y solicitudes
   - Datos del club (logo, contacto)
   - CRUD del curso (guardar con transacciones, migración)
   - Búsqueda recursiva, reordenamiento
   - Gestión de accesos a clases/temas
   - Solicitudes, notificaciones
   - Panel de progreso
   - Bloques del editor
   - Editor de texto enriquecido
   - Donación voluntaria
   
   Depende de: script-core.js (CMScriptCore)
   Expone: window.CMCurso
   Cargado DESPUÉS de script-core.js
   ============================================================ */

(function () {
    'use strict';

    const Core = window.CMScriptCore;
    if (!Core) {
        console.error('[CMCurso] CMScriptCore no está cargado.');
        return;
    }

    const {
        escapeHtml, escapeAttr, escapeOnclick, esUrlSegura, sanitizeHtml,
        convertirUrlImagen, generarId, extraerYouTubeID, getNombreMostrar,
        traducirErrorFirebase, mostrarToast, mostrarConfirmacion,
        guardarEstadoNavegacion,
        ADMIN_UID, db, auth, dom
    } = Core;

    const Curso = window.CMCurso = window.CMCurso || {};

    // ============================================================
    // SUSCRIPCIONES EN TIEMPO REAL (Firestore)
    // ============================================================
    Curso.suscribirAccesosEspeciales = function () {
        if (Core.state.unsubscribeAccesos) Core.state.unsubscribeAccesos();
        if (!Core.state.currentUser) return;
        Core.state.unsubscribeAccesos = db.collection('accesosEspeciales').onSnapshot(snapshot => {
            Core.state.accesosEspeciales = {};
            snapshot.forEach(doc => { Core.state.accesosEspeciales[doc.id] = doc.data().uids || []; });
            window.actualizarUI();
        }, error => console.warn('Error snapshot accesos clase:', error));
    };

    Curso.suscribirAccesosTema = function () {
        if (Core.state.unsubscribeAccesosTema) Core.state.unsubscribeAccesosTema();
        if (!Core.state.currentUser) return;
        Core.state.unsubscribeAccesosTema = db.collection('accesosTema').onSnapshot(snapshot => {
            Core.state.accesosTema = {};
            snapshot.forEach(doc => { Core.state.accesosTema[doc.id] = doc.data().uids || []; });
            window.actualizarUI();
        }, error => console.warn('Error snapshot accesos tema:', error));
    };

    Curso.suscribirNotificaciones = function () {
        if (Core.state.unsubscribeNotificaciones) Core.state.unsubscribeNotificaciones();
        if (!Core.state.currentUser) {
            Core.state.notificaciones = [];
            Curso.actualizarBadgeNotificaciones();
            return;
        }
        Core.state.unsubscribeNotificaciones = db.collection('notificaciones')
            .where('paraUid', '==', Core.state.currentUser.uid)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .onSnapshot(snapshot => {
                Core.state.notificaciones = [];
                snapshot.forEach(doc => {
                    Core.state.notificaciones.push({ id: doc.id, ...doc.data() });
                });
                Curso.actualizarBadgeNotificaciones();
            }, error => console.warn('Error snapshot notificaciones:', error));
    };

    Curso.suscribirSolicitudesAdmin = function () {
        if (Core.state.unsubscribeSolicitudesAdmin) Core.state.unsubscribeSolicitudesAdmin();
        if (!Core.state.currentUser?.esAdmin) {
            Core.state.solicitudesPendientes = [];
            Curso.actualizarBadgeSolicitudes();
            return;
        }
        Core.state.unsubscribeSolicitudesAdmin = db.collection('solicitudesAcceso')
            .where('estado', '==', 'pendiente')
            .onSnapshot(snapshot => {
                Core.state.solicitudesPendientes = [];
                snapshot.forEach(doc => {
                    Core.state.solicitudesPendientes.push({ id: doc.id, ...doc.data() });
                });
                Core.state.solicitudesPendientes.sort((a, b) => {
                    const ta = a.createdAt?.toDate?.() || new Date(0);
                    const tb = b.createdAt?.toDate?.() || new Date(0);
                    return tb - ta;
                });
                Curso.actualizarBadgeSolicitudes();
            }, error => console.warn('Error snapshot solicitudes admin:', error));
    };

    Curso.suscribirMisSolicitudes = function () {
        if (Core.state.unsubscribeMisSolicitudes) Core.state.unsubscribeMisSolicitudes();
        if (!Core.state.currentUser) {
            Core.state.misSolicitudes = [];
            return;
        }
        Core.state.unsubscribeMisSolicitudes = db.collection('solicitudesAcceso')
            .where('uid', '==', Core.state.currentUser.uid)
            .onSnapshot(snapshot => {
                Core.state.misSolicitudes = [];
                snapshot.forEach(doc => {
                    Core.state.misSolicitudes.push({ id: doc.id, ...doc.data() });
                });
                window.actualizarUI();
            }, error => console.warn('Error snapshot mis solicitudes:', error));
    };

    Curso.suscribirDatosClub = function () {
        if (Core.state.unsubscribeClub) Core.state.unsubscribeClub();
        Core.state.unsubscribeClub = db.collection('config').doc('club').onSnapshot(doc => {
            if (doc.exists) {
                Core.state.datosClub = doc.data();
            } else {
                Core.state.datosClub = {};
            }
            Curso.actualizarLogoClub();
            Curso.actualizarBotonDatosClub();
        }, error => console.warn('Error snapshot club:', error));
    };

       Curso.suscribirProgresoTableros = function () {
        if (!Core.state.currentUser) {
            Core.state.progresoTableros = {};
            return;
        }
        db.collection('progreso').doc(Core.state.currentUser.uid).onSnapshot(doc => {
            if (doc.exists) {
                Core.state.progresoTableros = doc.data() || {};
            } else {
                Core.state.progresoTableros = {};
            }
            // ⭐ v22: Actualizar progreso en tableros ya inicializados
            if (typeof window.actualizarProgresoTableros === 'function') {
                setTimeout(() => window.actualizarProgresoTableros(), 100);
            } else if (typeof window.inicializarTablerosEntrenador === 'function') {
                setTimeout(() => window.inicializarTablerosEntrenador(), 100);
            }
        }, error => console.warn('Error snapshot progreso tableros:', error));
    };

    // ============================================================
    // BADGES
    // ============================================================
    Curso.actualizarBadgeNotificaciones = function () {
        const badge = document.getElementById('notif-badge');
        const btn = document.getElementById('btn-notificaciones');
        if (!badge || !btn) return;
        if (!Core.state.currentUser) {
            badge.style.display = 'none';
            btn.style.display = 'none';
            return;
        }
        btn.style.display = 'inline-flex';
        const noLeidas = Core.state.notificaciones.filter(n => !n.leida).length;
        if (noLeidas > 0) {
            badge.textContent = noLeidas;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    };

    Curso.actualizarBadgeSolicitudes = function () {
        const badge = document.getElementById('solicitudes-badge');
        const btn = document.getElementById('btn-solicitudes-admin');
        if (!badge || !btn) return;
        if (!Core.state.currentUser?.esAdmin) {
            badge.style.display = 'none';
            btn.style.display = 'none';
            return;
        }
        btn.style.display = 'inline-flex';
        const count = Core.state.solicitudesPendientes.length;
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    };

    // ============================================================
    // DATOS DEL CLUB (logo y botones)
    // ============================================================
    Curso.actualizarLogoClub = function () {
        const logoImg = document.getElementById('logo-club-img');
        if (!logoImg) return;
        if (Core.state.datosClub.logoURL && Core.state.datosClub.logoURL.trim()) {
            logoImg.style.display = '';
            logoImg.src = convertirUrlImagen(Core.state.datosClub.logoURL.trim());
            logoImg.classList.add('visible');
        } else {
            logoImg.style.display = 'none';
            logoImg.removeAttribute('src');
            logoImg.classList.remove('visible');
        }
    };

    Curso.actualizarBotonDatosClub = function () {
        const btn = document.getElementById('btn-datos-club');
        const btnDonar = document.getElementById('btn-donar');
        if (!btn) return;

        if (!Core.state.currentUser) {
            btn.style.display = 'none';
        } else {
            const d = Core.state.datosClub;
            const tieneDatos = d.telefono || d.direccion || d.emailContacto || d.horarios || d.web;
            btn.style.display = tieneDatos ? 'inline-flex' : 'none';
        }

        if (btnDonar) {
            const d = Core.state.datosClub;
            const tieneDonacion = d.donacionTitular || d.donacionBanco ||
                                  d.donacionTarjeta || d.donacionCuenta ||
                                  d.donacionClabe;
            btnDonar.style.display = tieneDonacion ? 'inline-flex' : 'none';
        }
    };

// === FIN DE LA PARTE 1/4 ===
     // ============================================================
    // GESTIÓN DEL CURSO (CRUD)
    // ============================================================
    Curso.iniciarEscuchaCurso = function () {
        if (Core.state.unsubscribeCurso) Core.state.unsubscribeCurso();
        Core.state.migracionRealizada = false;

        Core.state.unsubscribeCurso = db.collection('config').doc('curso').onSnapshot(async (doc) => {
            // ⭐ Ignorar ecos de nuestras propias escrituras pendientes
            if (doc.metadata.hasPendingWrites || Core.state._guardandoCursoContador > 0) {
                console.log('[Curso] Snapshot ignorado (escritura pendiente)');
                return;
            }

            if (doc.exists) {
                Core.state.curso = doc.data();
            } else {
                Core.state.curso = { clases: [] };
                if (Core.state.currentUser && Core.state.currentUser.esAdmin) {
                    await db.collection('config').doc('curso').set(Core.state.curso);
                }
            }

            if (!Core.state.curso.clases) Core.state.curso.clases = [];
            Core.state.curso.clases.forEach(c => {
                if (!c.id) c.id = generarId();
                if (!c.temas) c.temas = [];
            });

            if (Core.state.currentUser && Core.state.currentUser.esAdmin && !Core.state.migracionRealizada) {
                Core.state.migracionRealizada = true;
                let migrado = false;
                Core.state.curso.clases.forEach(c => {
                    c.temas.forEach(t => {
                        t.notaDebajoVideo = t.notaDebajoVideo || '';
                        t.notaDebajoEjercicios = t.notaDebajoEjercicios || '';
                        if (t.bloqueado === undefined) t.bloqueado = false;
                        if (!t.accesos) t.accesos = [];
                        if (!t.subtemas) t.subtemas = [];
                        if (!t.accesosTemaId) t.accesosTemaId = null;
                        if (!t.bloques || t.bloques.length === 0) {
                            Curso.migrarTemaABloques(t);
                            migrado = true;
                        }
                    });
                });
                if (migrado) await Curso.guardarCurso();
            }

            Core.state.curso.clases.sort((a, b) => a.numero - b.numero);

            if (Core.state.currentUser) {
                window.actualizarUI();
            }
        }, error => {
            console.warn('Error en snapshot del curso:', error);
            mostrarToast('Error al sincronizar el curso. Revisa tu conexión.', 'error');
        });
    };

    // ⭐ v20: Guardar curso con transacción + fusión (fix multi-dispositivo)
        Curso.guardarCurso = async function () {
        Core.state._guardandoCursoContador++;
        const cursoLocalSnapshot = JSON.parse(JSON.stringify(Core.state.curso));

        try {
           
            // ⭐ v28: Si hay una eliminación en curso, hacer set directo (sin fusión)
            // Esto evita que fusionarCursos reinserten las clases/temas eliminados
            if (Core.state._operacionEliminar) {
                await db.collection('config').doc('curso').set(cursoLocalSnapshot);
                localStorage.setItem('cursoBackup', JSON.stringify(cursoLocalSnapshot));
                return;
            }

            const cursoFinal = await db.runTransaction(async (transaction) => {
                const ref = db.collection('config').doc('curso');
                const doc = await transaction.get(ref);

                const cursoRemoto = doc.exists ? doc.data() : { clases: [] };
                const cursoFusionado = Curso.fusionarCursos(cursoRemoto, cursoLocalSnapshot);

                transaction.set(ref, cursoFusionado);
                return cursoFusionado;
            });

            Core.state.curso = cursoFinal;
            localStorage.setItem('cursoBackup', JSON.stringify(cursoFinal));
        } catch (err) {
            console.error('[Curso] Error en transacción:', err);
            mostrarToast('Error al guardar. Verifica tu conexión.', 'error');
        } finally {
            Core.state._guardandoCursoContador--;
        }
    };
   
    // ⭐ v20: Fusiona dos versiones del curso sin perder datos
    Curso.fusionarCursos = function (cursoRemoto, cursoLocal) {
        const remotas = (cursoRemoto && cursoRemoto.clases) || [];
        const locales = (cursoLocal && cursoLocal.clases) || [];

        const clasesPorId = {};
        remotas.forEach(c => { clasesPorId[c.id] = c; });
        locales.forEach(c => { clasesPorId[c.id] = c; });

        const clasesFusionadas = Object.values(clasesPorId).map(claseLocal => {
            const claseRemota = remotas.find(c => c.id === claseLocal.id);
            if (!claseRemota) return claseLocal;

            const temasPorId = {};
            (claseRemota.temas || []).forEach(t => { temasPorId[t.id] = t; });
            (claseLocal.temas || []).forEach(t => {
                const temaRemoto = temasPorId[t.id];
                if (!temaRemoto) {
                    temasPorId[t.id] = t;
                    return;
                }
                const bloquesPorId = {};
                (temaRemoto.bloques || []).forEach(b => { bloquesPorId[b.id] = b; });
                (t.bloques || []).forEach(b => { bloquesPorId[b.id] = b; });

                temasPorId[t.id] = {
                    ...temaRemoto,
                    ...t,
                    bloques: Object.values(bloquesPorId)
                };
            });

            return {
                ...claseRemota,
                ...claseLocal,
                temas: Object.values(temasPorId)
            };
        });

        return {
            ...cursoRemoto,
            ...cursoLocal,
            clases: clasesFusionadas
        };
    };

    Curso.migrarTemaABloques = function (tema) {
        if (tema.bloques && tema.bloques.length > 0) return;
        tema.bloques = [];
        if (tema.videoUrl) tema.bloques.push({ id: generarId(), tipo: 'video', contenido: tema.videoUrl, nota: tema.notaDebajoVideo || '' });
        if (tema.iframeCode) tema.bloques.push({ id: generarId(), tipo: 'iframe', contenido: tema.iframeCode, nota: tema.notaDebajoEjercicios || '' });
        if (tema.links && tema.links.length) {
            tema.links.forEach(link => tema.bloques.push({ id: generarId(), tipo: 'enlace', label: link.label, url: link.url }));
        }
        if (tema.materialUrl) tema.bloques.push({ id: generarId(), tipo: 'enlace', label: 'Material', url: tema.materialUrl });
        tema.videoUrl = '';
        tema.iframeCode = '';
        tema.links = [];
        tema.materialUrl = '';
        tema.notaDebajoVideo = '';
        tema.notaDebajoEjercicios = '';
    };

    // ============================================================
    // BÚSQUEDA RECURSIVA Y REORDENAMIENTO
    // ============================================================
    Curso.buscarTemaRecursivo = function (temas, temaId) {
        for (let t of temas) {
            if (t.id === temaId) return t;
            if (t.subtemas && t.subtemas.length) {
                const encontrado = Curso.buscarTemaRecursivo(t.subtemas, temaId);
                if (encontrado) return encontrado;
            }
        }
        return null;
    };

    Curso.encontrarTemaYPadre = function (temas, temaId, padre = null, listaPadre = null) {
        for (let i = 0; i < temas.length; i++) {
            if (temas[i].id === temaId) {
                return { tema: temas[i], padre: padre, lista: temas, index: i };
            }
            if (temas[i].subtemas) {
                const resultado = Curso.encontrarTemaYPadre(temas[i].subtemas, temaId, temas[i], temas[i].subtemas);
                if (resultado) return resultado;
            }
        }
        return null;
    };

    Curso.reordenarTemasRecursivo = function (temas) {
        temas.forEach((t, index) => {
            t.numero = index + 1;
            if (t.subtemas && t.subtemas.length) {
                Curso.reordenarTemasRecursivo(t.subtemas);
            }
        });
    };

    Curso.obtenerTodasSubtemas = function (tema) {
        let lista = [tema];
        if (tema.subtemas) {
            tema.subtemas.forEach(st => {
                lista = lista.concat(Curso.obtenerTodasSubtemas(st));
            });
        }
        return lista;
    };

    // ============================================================
    // LÓGICA DE ACCESO A TEMAS
    // ============================================================
    Curso.temaAccesible = function (tema, usuario) {
        if (!usuario) return false;
        if (usuario.esAdmin) return true;
        if (!tema.bloqueado) return true;

        if (tema.accesosTemaId) {
            const uids = Core.state.accesosTema[tema.accesosTemaId] || [];
            if (uids.includes(usuario.uid)) return true;
        }
        return false;
    };

    // ============================================================
    // ADMIN: GESTIÓN DE ACCESOS A TEMAS
    // ============================================================
    Curso.gestionarAccesosTema = async function (claseId, temaId) {
        if (!Core.state.currentUser?.esAdmin) return;
        const clase = Core.state.curso.clases.find(c => c.id === claseId);
        if (!clase) return;
        const tema = Curso.buscarTemaRecursivo(clase.temas, temaId);
        if (!tema) return;

        if (!tema.accesosTemaId) {
            const docRef = await db.collection('accesosTema').doc();
            await docRef.set({ uids: [] });
            tema.accesosTemaId = docRef.id;
            await Curso.guardarCurso();
        }

        const uidsActual = Core.state.accesosTema[tema.accesosTemaId] || [];
        const usuarios = await window.obtenerListaUsuarios();

        document.getElementById('accesos-title').innerHTML = `🔐 Accesos: ${escapeHtml(tema.titulo)}`;
        const listaDiv = document.getElementById('accesos-lista');

        if (usuarios.length === 0) {
            listaDiv.innerHTML = `<div class="no-users-msg">📭 No hay usuarios registrados.</div>`;
        } else {
            listaDiv.innerHTML = usuarios.map(user => {
                const checked = uidsActual.includes(user.uid);
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
                    let uidsActual = [...(Core.state.accesosTema[tema.accesosTemaId] || [])];
                    if (cb.checked) {
                        if (!uidsActual.includes(uid)) uidsActual.push(uid);
                    } else {
                        uidsActual = uidsActual.filter(id => id !== uid);
                    }
                    await db.collection('accesosTema').doc(tema.accesosTemaId).set({ uids: uidsActual }, { merge: true });
                    mostrarToast('Accesos actualizados', 'success');
                });
            });
        }
        Core.dom.modalAccesos.classList.add('active');
    };

    Curso.toggleBloqueoTema = async function (claseId, temaId) {
        if (!Core.state.currentUser?.esAdmin) return;
        const clase = Core.state.curso.clases.find(c => c.id === claseId);
        const tema = Curso.buscarTemaRecursivo(clase.temas, temaId);
        if (!tema) return;

        const seVaABloquear = !tema.bloqueado;

        if (seVaABloquear) {
            mostrarConfirmacion(
                'Bloquear tema',
                '¿Quieres revocar el acceso a los alumnos que ya lo tenían?',
                async () => {
                    tema.bloqueado = true;
                    if (!tema.accesosTemaId) {
                        const docRef = await db.collection('accesosTema').doc();
                        await docRef.set({ uids: [] });
                        tema.accesosTemaId = docRef.id;
                    } else {
                        await db.collection('accesosTema')
                            .doc(tema.accesosTemaId)
                            .set({ uids: [] }, { merge: true });
                    }
                    await Curso.guardarCurso();
                    window.actualizarUI();
                    mostrarToast('Tema bloqueado y accesos revocados', 'success');
                }
            );
        } else {
            tema.bloqueado = false;
            await Curso.guardarCurso();
            window.actualizarUI();
            mostrarToast('Tema desbloqueado', 'success');
        }
    };

    // ============================================================
    // ADMIN: AGREGAR SUBTEMA
    // ============================================================
    Curso.agregarSubtema = async function (claseId, temaPadreId) {
        if (!Core.state.currentUser?.esAdmin) return;
        const clase = Core.state.curso.clases.find(c => c.id === claseId);
        if (!clase) return;
        const padre = Curso.buscarTemaRecursivo(clase.temas, temaPadreId);
        if (!padre) return;

        const nuevoNum = padre.subtemas.length + 1;
        const nuevoTema = {
            id: generarId(),
            numero: nuevoNum,
            titulo: `Subtema ${nuevoNum}`,
            bloqueado: false,
            accesos: [],
            accesosTemaId: null,
            subtemas: [],
            bloques: []
        };
        padre.subtemas.push(nuevoTema);
        Curso.reordenarTemasRecursivo(padre.subtemas);
        await Curso.guardarCurso();
        window.actualizarUI();
        mostrarToast('Subtema agregado', 'success');
    };

    // ============================================================
    // ADMIN: ELIMINAR TEMA
    // ============================================================
    Curso.eliminarTema = async function (claseId, temaId) {
        if (!Core.state.currentUser?.esAdmin) return;
        const clase = Core.state.curso.clases.find(c => c.id === claseId);
        if (!clase) return;
        const tema = Curso.buscarTemaRecursivo(clase.temas, temaId);
        if (!tema) return;

        const numSubtemas = tema.subtemas?.length || 0;
        const numBloques = tema.bloques?.length || 0;
        let advertencia = '';
        if (numSubtemas > 0 || numBloques > 0) {
            advertencia = ` Contiene ${numSubtemas} subtema${numSubtemas === 1 ? '' : 's'} y ${numBloques} bloque${numBloques === 1 ? '' : 's'}.`;
        }

        mostrarConfirmacion(
            '🗑️ Eliminar tema',
            `¿Seguro que quieres eliminar "${tema.titulo}"?${advertencia} Esta acción no se puede deshacer.`,
            async () => {
                function eliminarDeLista(temas) {
                    for (let i = 0; i < temas.length; i++) {
                        if (temas[i].id === temaId) {
                            temas.splice(i, 1);
                            return true;
                        }
                        if (temas[i].subtemas) {
                            if (eliminarDeLista(temas[i].subtemas)) return true;
                        }
                    }
                    return false;
                }
                eliminarDeLista(clase.temas);
                Curso.reordenarTemasRecursivo(clase.temas);
                await Curso.guardarCurso();
                window.actualizarUI();
                mostrarToast('🗑️ Tema eliminado', 'success');
            }
        );
    };

    // ============================================================
    // ADMIN: MOVER TEMA ARRIBA/ABAJO
    // ============================================================
    Curso.moverTemaArriba = async function (claseId, temaId) {
        if (!Core.state.currentUser?.esAdmin) return;
        const clase = Core.state.curso.clases.find(c => c.id === claseId);
        if (!clase) return;
        const info = Curso.encontrarTemaYPadre(clase.temas, temaId);
        if (!info || info.index === 0) return;

        const { lista, index } = info;
        [lista[index - 1], lista[index]] = [lista[index], lista[index - 1]];
        Curso.reordenarTemasRecursivo(clase.temas);
        await Curso.guardarCurso();
        window.actualizarUI();
        mostrarToast('Orden actualizado', 'success');
    };

    Curso.moverTemaAbajo = async function (claseId, temaId) {
        if (!Core.state.currentUser?.esAdmin) return;
        const clase = Core.state.curso.clases.find(c => c.id === claseId);
        if (!clase) return;
        const info = Curso.encontrarTemaYPadre(clase.temas, temaId);
        if (!info || info.index >= info.lista.length - 1) return;

        const { lista, index } = info;
        [lista[index], lista[index + 1]] = [lista[index + 1], lista[index]];
        Curso.reordenarTemasRecursivo(clase.temas);
        await Curso.guardarCurso();
        window.actualizarUI();
        mostrarToast('Orden actualizado', 'success');
    };

    // ============================================================
    // ADMIN: RENOMBRAR CLASE / TEMA
    // ============================================================
    Curso.renombrarClase = async function (id, nuevoNombre = null) {
        if (!Core.state.currentUser?.esAdmin) return;
        if (!nuevoNombre || !nuevoNombre.trim()) return;
        const clase = Core.state.curso.clases.find(c => c.id === id);
        if (!clase) return;
        clase.titulo = nuevoNombre.trim();
        await Curso.guardarCurso();
        window.actualizarUI();
        mostrarToast('Clase renombrada', 'success');
    };

    Curso.renombrarTema = async function (claseId, temaId, nuevoNombre = null) {
        if (!Core.state.currentUser?.esAdmin) return;
        if (!nuevoNombre || !nuevoNombre.trim()) return;
        const clase = Core.state.curso.clases.find(c => c.id === claseId);
        const tema = Curso.buscarTemaRecursivo(clase.temas, temaId);
        if (!tema) return;
        tema.titulo = nuevoNombre.trim();
        await Curso.guardarCurso();
        window.actualizarUI();
        mostrarToast('Tema renombrado', 'success');
    };

    // ============================================================
    // ADMIN: AGREGAR / ELIMINAR CLASE
    // ============================================================
    Curso.agregarClase = async function () {
        if (!Core.state.currentUser?.esAdmin) return;
        const num = Core.state.curso.clases.length + 1;
        const nuevaClase = {
            id: generarId(),
            numero: num,
            titulo: `Clase ${num}`,
            temas: [],
            publicada: false
        };
        Core.state.curso.clases.push(nuevaClase);
        Core.state.claseActivaId = nuevaClase.id;
        Core.state.temaAbiertoGlobal = null;
        window.actualizarUI();
        guardarEstadoNavegacion();
        try {
            await Curso.guardarCurso();
            mostrarToast('Clase creada (oculta para alumnos)', 'success');
        } catch (err) {
            Core.state.curso.clases.pop();
            Core.state.claseActivaId = Core.state.curso.clases.length > 0 ? Core.state.curso.clases[0].id : null;
            window.actualizarUI();
            mostrarToast('Error al crear clase', 'error');
        }
    };

      Curso.eliminarClase = async function (id) {
        if (!Core.state.currentUser?.esAdmin) return;
        const index = Core.state.curso.clases.findIndex(c => c.id === id);
        if (index === -1) return;
        Core.state.curso.clases.splice(index, 1);
        if (Core.state.claseActivaId === id) {
            Core.state.claseActivaId = Core.state.curso.clases.length > 0 ? Core.state.curso.clases[0].id : null;
        }
        Core.state.temaAbiertoGlobal = null;

        // ⭐ v28: Marcar operación de eliminación
        Core.state._operacionEliminar = true;
        try {
            await Curso.guardarCurso();
        } finally {
            Core.state._operacionEliminar = false;
        }

        window.actualizarUI();
        guardarEstadoNavegacion();
        mostrarToast('Clase eliminada', 'success');
        try {
            await db.collection('accesosEspeciales').doc(id).delete();
        } catch (e) { console.warn('No se pudo eliminar accesos', e); }
    };
    Curso.togglePublicarClase = async function (claseId) {
        if (!Core.state.currentUser?.esAdmin) return;
        const clase = Core.state.curso.clases.find(c => c.id === claseId);
        if (!clase) return;
        clase.publicada = !clase.publicada;
        await Curso.guardarCurso();
        window.actualizarUI();
        mostrarToast(clase.publicada ? 'Clase visible para alumnos' : 'Clase oculta para alumnos', 'success');
    };

// === FIN DE LA PARTE 2/4 ===
     // ============================================================
    // MOVER CLASE ARRIBA/ABAJO
    // ============================================================
    Curso.moverClaseArriba = async function (claseId) {
        if (!Core.state.currentUser?.esAdmin) return;
        const index = Core.state.curso.clases.findIndex(c => c.id === claseId);
        if (index <= 0) return;
        const anterior = Core.state.curso.clases[index - 1];
        const actual = Core.state.curso.clases[index];
        const tempNum = actual.numero;
        actual.numero = anterior.numero;
        anterior.numero = tempNum;
        Core.state.curso.clases.sort((a, b) => a.numero - b.numero);
        Core.state.curso.clases.forEach((c, i) => c.numero = i + 1);
        await Curso.guardarCurso();
        window.actualizarUI();
        mostrarToast('Orden de clases actualizado', 'success');
    };

    Curso.moverClaseAbajo = async function (claseId) {
        if (!Core.state.currentUser?.esAdmin) return;
        const index = Core.state.curso.clases.findIndex(c => c.id === claseId);
        if (index === -1 || index >= Core.state.curso.clases.length - 1) return;
        const siguiente = Core.state.curso.clases[index + 1];
        const actual = Core.state.curso.clases[index];
        const tempNum = actual.numero;
        actual.numero = siguiente.numero;
        siguiente.numero = tempNum;
        Core.state.curso.clases.sort((a, b) => a.numero - b.numero);
        Core.state.curso.clases.forEach((c, i) => c.numero = i + 1);
        await Curso.guardarCurso();
        window.actualizarUI();
        mostrarToast('Orden de clases actualizado', 'success');
    };

    // ============================================================
    // PROGRESO DEL USUARIO
    // ============================================================
    Curso.sincronizarProgresoDesdeFirestore = async function () {
        if (!Core.state.currentUser) return;
        try {
            const doc = await db.collection('progreso').doc(Core.state.currentUser.uid).get();
            if (doc.exists) {
                const data = doc.data();
                const local = JSON.parse(localStorage.getItem(`progreso_${Core.state.currentUser.uid}`) || '{}');
                const combinado = { ...local, ...data };
                localStorage.setItem(`progreso_${Core.state.currentUser.uid}`, JSON.stringify(combinado));
                Core.state.progresoTableros = data || {};
            }
        } catch (err) { console.warn('No se pudo sincronizar progreso', err); }
    };

    Curso.estaCompletado = function (claseId, temaId) {
        if (!Core.state.currentUser) return false;
        const progreso = JSON.parse(localStorage.getItem(`progreso_${Core.state.currentUser.uid}`) || '{}');
        return progreso[`${claseId}_${temaId}`] === true;
    };

    Curso.marcarVisto = async function (claseId, temaId) {
        if (!Core.state.currentUser) return;
        const key = `${claseId}_${temaId}`;
        const progreso = JSON.parse(localStorage.getItem(`progreso_${Core.state.currentUser.uid}`) || '{}');
        if (progreso[key]) { mostrarToast('Ya habías completado este tema ✓'); return; }
        progreso[key] = true;
        localStorage.setItem(`progreso_${Core.state.currentUser.uid}`, JSON.stringify(progreso));
        try {
            await db.collection('progreso').doc(Core.state.currentUser.uid).set({ [key]: true }, { merge: true });
            mostrarToast('Progreso guardado ✓', 'success');
        } catch (error) {
            mostrarToast('Progreso guardado localmente (sin conexión)', 'error');
        }
        window.actualizarUI();
    };

    Curso.guardarProgresoVarianteEnFirestore = async function ({ claseId, temaId, bloqueId, capituloIdx, clave }) {
        if (!Core.state.currentUser) return;
        const key = `tablero_${claseId}_${temaId}_${bloqueId}_${clave}`;
        Core.state.progresoTableros[key] = true;
        try {
            await db.collection('progreso').doc(Core.state.currentUser.uid).set({
                [key]: true,
                [`tablero_actual_${bloqueId}`]: capituloIdx
            }, { merge: true });
        } catch (e) {
            console.warn('Error al guardar progreso de variante:', e);
        }
    };

    Curso.guardarProgresoCapCompletoEnFirestore = async function ({ claseId, temaId, bloqueId, capituloIdx }) {
        if (!Core.state.currentUser) return;
        const key = `tablero_cap_${claseId}_${temaId}_${bloqueId}_${capituloIdx}`;
        Core.state.progresoTableros[key] = true;
        try {
            await db.collection('progreso').doc(Core.state.currentUser.uid).set({ [key]: true }, { merge: true });
        } catch (e) {
            console.warn('Error al guardar capítulo completo:', e);
        }
    };

    Curso.renombrarCapituloEnFirestore = async function ({ capituloIdx, nuevoNombre, pgnNuevo }) {
        console.log('[Curso] Capítulo renombrado a:', nuevoNombre);
    };

    // ============================================================
    // PANEL DE PROGRESO
    // ============================================================
    Curso.calcularProgresoClase = function (clase) {
        if (!clase.temas || clase.temas.length === 0) return { completados: 0, total: 0, porcentaje: 0 };
        let completados = 0, total = 0;
        function contar(temas) {
            temas.forEach(t => {
                total++;
                if (Curso.estaCompletado(clase.id, t.id)) completados++;
                if (t.subtemas) contar(t.subtemas);
            });
        }
        contar(clase.temas);
        return {
            completados, total,
            porcentaje: total > 0 ? Math.round((completados / total) * 100) : 0
        };
    };

    Curso.abrirPanelProgreso = function () {
        const contenedor = document.getElementById('progreso-contenido');
        const clasesVisibles = Core.state.currentUser?.esAdmin
            ? Core.state.curso.clases
            : Core.state.curso.clases.filter(c => c.publicada === true);

        if (!clasesVisibles || clasesVisibles.length === 0) {
            contenedor.innerHTML = '<p style="color:var(--texto-suave);">No hay clases disponibles para calcular progreso.</p>';
        } else {
            let html = '<div style="max-height:400px; overflow-y:auto;">';
            let totalCompletados = 0, totalTemas = 0;
            clasesVisibles.forEach(clase => {
                const prog = Curso.calcularProgresoClase(clase);
                totalCompletados += prog.completados;
                totalTemas += prog.total;
                html += `
                    <div style="margin-bottom:10px; border-bottom:1px solid var(--borde); padding-bottom:8px;">
                        <strong>${escapeHtml(clase.titulo)}</strong>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <progress value="${prog.porcentaje}" max="100" style="flex:1; height:12px;"></progress>
                            <span style="font-size:0.85rem;">${prog.porcentaje}% (${prog.completados}/${prog.total})</span>
                        </div>
                    </div>`;
            });
            const porcentajeGeneral = totalTemas > 0 ? Math.round((totalCompletados / totalTemas) * 100) : 0;
            html += `<div style="margin-top:15px; font-weight:bold;">📈 Progreso general: ${porcentajeGeneral}%</div></div>`;
            contenedor.innerHTML = html;
        }
        document.getElementById('modal-progreso').classList.add('active');
    };

    // ============================================================
    // SOLICITUDES DE ACCESO
    // ============================================================
    Curso.solicitarAcceso = async function (claseId) {
        if (!Core.state.currentUser) return mostrarToast('Debes iniciar sesión', 'error');
        const clase = Core.state.curso.clases.find(c => c.id === claseId);
        if (!clase) return;

        try {
            const previas = await db.collection('solicitudesAcceso')
                .where('claseId', '==', claseId)
                .where('uid', '==', Core.state.currentUser.uid)
                .get();
            if (!previas.empty) {
                const batch = db.batch();
                previas.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
            }
        } catch (error) {
            console.warn('No se pudieron eliminar solicitudes anteriores:', error);
        }

        try {
            await db.collection('solicitudesAcceso').add({
                claseId: claseId,
                claseTitulo: clase.titulo,
                uid: Core.state.currentUser.uid,
                email: Core.state.currentUser.email,
                nombreAlumno: getNombreMostrar(),
                estado: 'pendiente',
                tipo: 'clase',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            await db.collection('notificaciones').add({
                paraUid: ADMIN_UID,
                mensaje: `${getNombreMostrar()} solicita acceso a "${clase.titulo}"`,
                leida: false,
                tipo: 'solicitud_clase',
                claseId: claseId,
                uidAlumno: Core.state.currentUser.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            mostrarToast('Solicitud enviada. El administrador la revisará pronto.', 'success');
            window.actualizarUI();
        } catch (error) {
            mostrarToast('Error al enviar solicitud', 'error');
            console.error(error);
        }
    };

    Curso.solicitarAccesoTema = async function (claseId, temaId) {
        if (!Core.state.currentUser) {
            mostrarToast("Debes iniciar sesión para solicitar acceso.", "error");
            return;
        }

        const clase = Core.state.curso.clases.find(c => c.id === claseId);
        if (!clase) return;

        const tema = Curso.buscarTemaRecursivo(clase.temas, temaId);
        if (!tema) {
            mostrarToast("El tema no existe.", "error");
            return;
        }

        const yaSolicitada = Core.state.misSolicitudes.some(s => s.temaId === temaId && s.estado === 'pendiente');
        if (yaSolicitada) {
            mostrarToast("Ya enviaste una solicitud para este tema. Espera la respuesta del administrador.", "info");
            return;
        }

        try {
            await db.collection('solicitudesAcceso').add({
                uid: Core.state.currentUser.uid,
                email: Core.state.currentUser.email,
                nombreAlumno: getNombreMostrar(),
                claseId: claseId,
                claseTitulo: clase.titulo,
                temaId: temaId,
                temaTitulo: tema.titulo,
                tipo: 'tema',
                estado: 'pendiente',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            await db.collection('notificaciones').add({
                paraUid: ADMIN_UID,
                mensaje: `${getNombreMostrar()} solicita acceso al tema "${tema.titulo}" (Clase: ${clase.titulo})`,
                leida: false,
                tipo: 'solicitud_tema',
                claseId: claseId,
                temaId: temaId,
                uidAlumno: Core.state.currentUser.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            mostrarToast("✅ Solicitud enviada al administrador.", "success");
            window.actualizarUI();
        } catch (error) {
            console.error("Error al solicitar acceso:", error);
            mostrarToast("Error al enviar la solicitud. Intenta de nuevo.", "error");
        }
    };

    Curso.aprobarSolicitud = async function (solicitudId, claseId, uid, email, tipo = 'clase', temaId = null) {
        if (!Core.state.currentUser?.esAdmin) return;
        try {
            await db.collection('solicitudesAcceso').doc(solicitudId).update({ estado: 'aprobada' });

            let mensaje = '';
            if (tipo === 'tema' && temaId) {
                const clase = Core.state.curso.clases.find(c => c.id === claseId);
                if (!clase) { mostrarToast('La clase ya no existe', 'error'); return; }
                const tema = Curso.buscarTemaRecursivo(clase.temas, temaId);
                if (!tema) { mostrarToast('El tema ya no existe', 'error'); return; }
                if (tema.accesosTemaId) {
                    const uidsActual = Core.state.accesosTema[tema.accesosTemaId] || [];
                    if (!uidsActual.includes(uid)) {
                        uidsActual.push(uid);
                        await db.collection('accesosTema').doc(tema.accesosTemaId).set({ uids: uidsActual }, { merge: true });
                    }
                    mensaje = `Tu solicitud de acceso al tema "${tema.titulo}" en la clase "${clase.titulo}" ha sido aprobada`;
                } else {
                    mensaje = `Tu solicitud de acceso al tema en la clase "${clase.titulo}" ha sido aprobada`;
                }
            } else {
                const uidsActual = Core.state.accesosEspeciales[claseId] || [];
                if (!uidsActual.includes(uid)) {
                    uidsActual.push(uid);
                    await db.collection('accesosEspeciales').doc(claseId).set({ uids: uidsActual }, { merge: true });
                }
                const clase = Core.state.curso.clases.find(c => c.id === claseId);
                if (!clase) { mostrarToast('La clase ya no existe', 'error'); return; }
                mensaje = `Tu solicitud de acceso a la clase "${clase.titulo}" ha sido aprobada`;
            }

            await db.collection('notificaciones').add({
                paraUid: uid,
                mensaje: mensaje,
                leida: false,
                tipo: 'aprobada',
                claseId: claseId,
                temaId: temaId || null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            mostrarToast('Solicitud aprobada y acceso concedido', 'success');
            window.actualizarUI();
        } catch (error) {
            mostrarToast('Error al aprobar solicitud', 'error');
            console.error(error);
        }
    };

    Curso.rechazarSolicitud = async function (solicitudId, uid, claseId, tipo = 'clase', temaId = null) {
        if (!Core.state.currentUser?.esAdmin) return;
        try {
            await db.collection('solicitudesAcceso').doc(solicitudId).update({ estado: 'rechazada' });

            const clase = Core.state.curso.clases.find(c => c.id === claseId);
            if (!clase) { mostrarToast('La clase ya no existe', 'error'); return; }

            let mensaje = '';
            if (tipo === 'tema' && temaId) {
                const tema = Curso.buscarTemaRecursivo(clase.temas, temaId);
                if (!tema) { mostrarToast('El tema ya no existe', 'error'); return; }
                mensaje = `Tu solicitud de acceso al tema "${tema.titulo}" en la clase "${clase.titulo}" ha sido rechazada`;
            } else {
                mensaje = `Tu solicitud de acceso a la clase "${clase.titulo}" ha sido rechazada`;
            }

            await db.collection('notificaciones').add({
                paraUid: uid,
                mensaje: mensaje,
                leida: false,
                tipo: 'rechazada',
                claseId: claseId,
                temaId: temaId || null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            mostrarToast('Solicitud rechazada', 'success');
        } catch (error) {
            mostrarToast('Error al rechazar solicitud', 'error');
            console.error(error);
        }
    };

    // ============================================================
    // GESTIÓN MASIVA DE ACCESOS
    // ============================================================
    Curso.ejecutarEnLotes = async function (operaciones) {
        const CHUNK = 400;
        for (let i = 0; i < operaciones.length; i += CHUNK) {
            const batch = db.batch();
            operaciones.slice(i, i + CHUNK).forEach(fn => fn(batch));
            await batch.commit();
        }
    };

    Curso.aprobarTodoElCurso = async function (uid, email) {
        if (!Core.state.currentUser?.esAdmin) return;
        mostrarConfirmacion(
            '🎓 Aprobar TODO el curso',
            `¿Dar acceso completo a "${email}"? Se liberarán TODAS las clases publicadas y TODOS los temas bloqueados.`,
            async () => {
                try {
                    const operaciones = [];
                    for (const clase of Core.state.curso.clases) {
                        if (!clase.publicada) continue;
                        const uidsActual = Core.state.accesosEspeciales[clase.id] || [];
                        if (!uidsActual.includes(uid)) {
                            const nuevos = [...uidsActual, uid];
                            operaciones.push(batch =>
                                batch.set(db.collection('accesosEspeciales').doc(clase.id), { uids: nuevos }, { merge: true })
                            );
                        }
                    }
                    function recorrerTemas(temas) {
                        temas.forEach(t => {
                            if (t.bloqueado && t.accesosTemaId) {
                                const uidsTema = Core.state.accesosTema[t.accesosTemaId] || [];
                                if (!uidsTema.includes(uid)) {
                                    const nuevos = [...uidsTema, uid];
                                    operaciones.push(batch =>
                                        batch.set(db.collection('accesosTema').doc(t.accesosTemaId), { uids: nuevos }, { merge: true })
                                    );
                                }
                            }
                            if (t.subtemas && t.subtemas.length) recorrerTemas(t.subtemas);
                        });
                    }
                    Core.state.curso.clases.forEach(c => { if (c.publicada) recorrerTemas(c.temas || []); });

                    const solicitudesDelAlumno = await db.collection('solicitudesAcceso')
                        .where('uid', '==', uid)
                        .where('estado', '==', 'pendiente')
                        .get();
                    solicitudesDelAlumno.forEach(doc => {
                        operaciones.push(batch => batch.update(doc.ref, { estado: 'aprobada' }));
                    });

                    const notifRef = db.collection('notificaciones').doc();
                    operaciones.push(batch =>
                        batch.set(notifRef, {
                            paraUid: uid,
                            mensaje: '🎓 El profesor te ha dado acceso a TODO el curso. ¡A disfrutar!',
                            leida: false,
                            tipo: 'aprobada_total',
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        })
                    );

                    if (operaciones.length === 0) {
                        mostrarToast('ℹ️ No había nada que liberar (ya tenía acceso completo)', 'info');
                        return;
                    }

                    await Curso.ejecutarEnLotes(operaciones);
                    mostrarToast(`✅ Curso completo liberado para ${email}`, 'success');
                    window.actualizarUI();
                } catch (error) {
                    console.error(error);
                    mostrarToast('❌ Error al liberar el curso: ' + error.message, 'error');
                }
            }
        );
    };

    Curso.revocarTodoElCurso = async function (uid, email) {
        if (!Core.state.currentUser?.esAdmin) return;
        mostrarConfirmacion(
            '🚫 Revocar TODO el curso',
            `¿Quitar TODOS los accesos a "${email}"? Seguirá viendo la Clase 1 (pública), pero perderá el resto. Esta acción se puede revertir aprobando de nuevo.`,
            async () => {
                try {
                    const operaciones = [];
                    for (const clase of Core.state.curso.clases) {
                        const uidsActual = Core.state.accesosEspeciales[clase.id] || [];
                        if (uidsActual.includes(uid)) {
                            const nuevos = uidsActual.filter(id => id !== uid);
                            operaciones.push(batch =>
                                batch.set(db.collection('accesosEspeciales').doc(clase.id), { uids: nuevos }, { merge: true })
                            );
                        }
                    }
                    function recorrerTemas(temas) {
                        temas.forEach(t => {
                            if (t.accesosTemaId) {
                                const uidsTema = Core.state.accesosTema[t.accesosTemaId] || [];
                                if (uidsTema.includes(uid)) {
                                    const nuevos = uidsTema.filter(id => id !== uid);
                                    operaciones.push(batch =>
                                        batch.set(db.collection('accesosTema').doc(t.accesosTemaId), { uids: nuevos }, { merge: true })
                                    );
                                }
                            }
                            if (t.subtemas && t.subtemas.length) recorrerTemas(t.subtemas);
                        });
                    }
                    Core.state.curso.clases.forEach(c => recorrerTemas(c.temas || []));

                    const notifRef = db.collection('notificaciones').doc();
                    operaciones.push(batch =>
                        batch.set(notifRef, {
                            paraUid: uid,
                            mensaje: '🚫 Tu acceso al curso ha sido revocado. Contacta al profesor si crees que es un error.',
                            leida: false,
                            tipo: 'revocada_total',
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        })
                    );

                    if (operaciones.length === 0) {
                        mostrarToast('ℹ️ Este alumno no tenía accesos que revocar', 'info');
                        return;
                    }

                    await Curso.ejecutarEnLotes(operaciones);
                    mostrarToast(`✅ Accesos revocados para ${email}`, 'success');
                    window.actualizarUI();
                } catch (error) {
                    console.error(error);
                    mostrarToast('❌ Error al revocar: ' + error.message, 'error');
                }
            }
        );
    };

    Curso.abrirGestionAlumnos = async function () {
        if (!Core.state.currentUser?.esAdmin) return;

        let modal = document.getElementById('modal-gestion-alumnos');
        if (!modal) {
            modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.id = 'modal-gestion-alumnos';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.innerHTML = `
                <div class="modal-content">
                    <h3>🎓 Gestionar Alumnos</h3>
                    <p style="color:var(--texto-suave); font-size:0.85rem; margin-bottom:12px;">
                        Aprobar TODO libera todas las clases publicadas y temas bloqueados.<br>
                        Revocar TODO quita todos los accesos excepto la Clase 1.
                    </p>
                    <div id="gestion-alumnos-lista" class="user-access-list"></div>
                    <button class="btn" type="button" onclick="document.getElementById('modal-gestion-alumnos').classList.remove('active')">Cerrar</button>
                </div>
            `;
            document.body.appendChild(modal);
        }

        const lista = document.getElementById('gestion-alumnos-lista');
        lista.innerHTML = '<div class="loader" style="margin:20px auto;"></div>';
        modal.classList.add('active');

        const usuarios = await window.obtenerListaUsuarios();
        const alumnos = usuarios.filter(u => u.uid !== ADMIN_UID);

        if (alumnos.length === 0) {
            lista.innerHTML = '<div class="no-users-msg">📭 No hay alumnos registrados.</div>';
            return;
        }

        lista.innerHTML = alumnos.map(u => {
            const tieneNombre = u.nombre && u.apellidos;
            const displayName = tieneNombre ? `${u.nombre} ${u.apellidos}` : u.email;
            return `
            <div class="user-access-item">
                <div style="flex:1; min-width:0;">
                    <span class="user-email" style="display:block; ${!tieneNombre ? 'color:var(--texto-suave); font-style:italic;' : ''}">
                        ${escapeHtml(displayName)}
                    </span>
                    ${tieneNombre ? `<span style="font-size:0.75rem; color:var(--texto-suave);">${escapeHtml(u.email)}</span>` : ''}
                </div>
                <div style="display:flex; gap:6px; flex-wrap:wrap;">
                    <button class="btn btn-exito btn-small"
                            onclick="aprobarTodoElCurso('${u.uid}','${escapeOnclick(u.email)}')">
                        🎓 Aprobar TODO
                    </button>
                    <button class="btn btn-peligro btn-small"
                            onclick="revocarTodoElCurso('${u.uid}','${escapeOnclick(u.email)}')">
                        🚫 Revocar TODO
                    </button>
                </div>
            </div>
        `;
        }).join('');
    };

    Curso.abrirSolicitudesAdmin = function () {
        if (!Core.state.currentUser?.esAdmin) return;
        const listaDiv = document.getElementById('solicitudes-lista');
        if (Core.state.solicitudesPendientes.length === 0) {
            listaDiv.innerHTML = '<div class="no-users-msg">📭 No hay solicitudes pendientes.</div>';
        } else {
            listaDiv.innerHTML = Core.state.solicitudesPendientes.map(s => {
                const nombreAMostrar = s.nombreAlumno || s.email;
                return `
                <div class="solicitud-item" style="flex-direction:column; align-items:stretch; gap:10px;">
                    <div>
                        <strong>${escapeHtml(nombreAMostrar)}</strong><br>
                        <span style="font-size:0.85rem; color:var(--texto-suave);">Clase: ${escapeHtml(s.claseTitulo || 'Desconocida')}</span>
                        ${s.temaTitulo ? `<br><span style="font-size:0.85rem; color:var(--texto-suave);">Tema: ${escapeHtml(s.temaTitulo)}</span>` : ''}
                        <br><span class="estado-pendiente">⏳ Pendiente</span>
                    </div>
                    <div style="display:flex; gap:6px; flex-wrap:wrap;">
                        <button class="btn btn-exito btn-small"
                                onclick="aprobarSolicitud('${s.id}','${s.claseId}','${s.uid}','${escapeOnclick(s.email)}','${s.tipo || 'clase'}','${s.temaId || ''}')">
                            ✅ Aprobar esta
                        </button>
                        <button class="btn btn-azul btn-small"
                                onclick="aprobarTodoElCurso('${s.uid}','${escapeOnclick(s.email)}')">
                            🎓 Aprobar TODO el curso
                        </button>
                        <button class="btn btn-peligro btn-small"
                                onclick="rechazarSolicitud('${s.id}','${s.uid}','${s.claseId}','${s.tipo || 'clase'}','${s.temaId || ''}')">
                            ❌ Rechazar
                        </button>
                    </div>
                </div>
            `;
            }).join('');
        }
        Core.dom.modalSolicitudesAdmin.classList.add('active');
    };

// === FIN DE LA PARTE 3/4 ===
     // ============================================================
    // NOTIFICACIONES
    // ============================================================
    Curso.abrirNotificaciones = function () {
        const listaDiv = document.getElementById('notificaciones-lista');
        if (Core.state.notificaciones.length === 0) {
            listaDiv.innerHTML = '<div class="no-users-msg">🔔 No tienes notificaciones.</div>';
            document.getElementById('btn-marcar-todo-leido').style.display = 'none';
        } else {
            document.getElementById('btn-marcar-todo-leido').style.display = 'inline-flex';
            listaDiv.innerHTML = Core.state.notificaciones.map(n => {
                const fecha = n.createdAt?.toDate?.() || new Date();
                const fechaStr = fecha.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
                return `
                    <div class="notificacion-item ${n.leida ? '' : 'notificacion-no-leida'}" data-id="${n.id}">
                        <div class="notificacion-texto">
                            <span>${escapeHtml(n.mensaje)}</span>
                            <br><small style="color:var(--texto-suave);">${fechaStr}</small>
                        </div>
                        ${!n.leida ? `<button class="btn btn-small btn-azul" onclick="marcarNotificacionLeida('${n.id}')">✓ Leída</button>` : ''}
                        <button class="btn btn-small btn-peligro" onclick="eliminarNotificacion('${n.id}')">🗑️</button>
                    </div>
                `;
            }).join('');
        }
        Core.dom.modalNotificaciones.classList.add('active');
    };

    Curso.marcarNotificacionLeida = async function (notifId) {
        try {
            await db.collection('notificaciones').doc(notifId).update({ leida: true });
            mostrarToast('✅ Notificación marcada como leída', 'success');
        } catch (error) {
            console.error('❌ Error al marcar leída:', error);
            mostrarToast('❌ Error al marcar leída: ' + error.message, 'error');
        }
    };

    Curso.marcarTodasNotificacionesLeidas = async function () {
        const noLeidas = Core.state.notificaciones.filter(n => !n.leida);
        if (noLeidas.length === 0) {
            mostrarToast('No hay notificaciones sin leer', 'info');
            return;
        }
        const batch = db.batch();
        noLeidas.forEach(n => batch.update(db.collection('notificaciones').doc(n.id), { leida: true }));
        try {
            await batch.commit();
            mostrarToast('✅ Todas las notificaciones marcadas como leídas', 'success');
        } catch (error) {
            mostrarToast('❌ Error al actualizar: ' + error.message, 'error');
            console.error(error);
        }
    };

    Curso.eliminarNotificacion = async function (notifId) {
        mostrarConfirmacion(
            '🗑️ Eliminar notificación',
            '¿Seguro que quieres eliminar esta notificación?',
            async () => {
                try {
                    await db.collection('notificaciones').doc(notifId).delete();
                    mostrarToast('🗑️ Notificación eliminada', 'success');
                } catch (error) {
                    console.error('❌ Error al eliminar notificación:', error);
                    mostrarToast('❌ Error al eliminar: ' + error.message, 'error');
                }
            }
        );
    };

    // ============================================================
    // DATOS DEL CLUB
    // ============================================================
    Curso.mostrarDatosClub = function () {
        const contenedor = document.getElementById('datos-club-contenido');
        const d = Core.state.datosClub;
        let html = '';
        if (d.telefono) html += `<div class="club-data-item"><span class="club-data-icon">📞</span><span>${escapeHtml(d.telefono)}</span></div>`;
        if (d.direccion) html += `<div class="club-data-item"><span class="club-data-icon">📍</span><span>${escapeHtml(d.direccion)}</span></div>`;
        if (d.emailContacto) html += `<div class="club-data-item"><span class="club-data-icon">📧</span><a href="mailto:${escapeHtml(d.emailContacto)}">${escapeHtml(d.emailContacto)}</a></div>`;
        if (d.horarios) html += `<div class="club-data-item"><span class="club-data-icon">🕐</span><span style="white-space:pre-wrap;">${escapeHtml(d.horarios)}</span></div>`;
        if (d.web) html += `<div class="club-data-item"><span class="club-data-icon">🌐</span><a href="${escapeHtml(d.web)}" target="_blank">${escapeHtml(d.web)}</a></div>`;
        if (!html) html = '<p style="color:var(--texto-suave);">No hay datos de contacto configurados.</p>';
        contenedor.innerHTML = html;
        Core.dom.modalDatosClub.classList.add('active');
    };

    Curso.abrirConfigClub = function () {
        if (!Core.state.currentUser?.esAdmin) return;
        const d = Core.state.datosClub;
        document.getElementById('config-logo-url').value = d.logoURL || '';
        document.getElementById('config-telefono').value = d.telefono || '';
        document.getElementById('config-direccion').value = d.direccion || '';
        document.getElementById('config-email-contacto').value = d.emailContacto || '';
        document.getElementById('config-horarios').value = d.horarios || '';
        document.getElementById('config-web').value = d.web || '';
        document.getElementById('config-donacion-titular').value = d.donacionTitular || '';
        document.getElementById('config-donacion-banco').value = d.donacionBanco || '';
        document.getElementById('config-donacion-tarjeta').value = d.donacionTarjeta || '';
        document.getElementById('config-donacion-cuenta').value = d.donacionCuenta || '';
        document.getElementById('config-donacion-clabe').value = d.donacionClabe || '';
        document.getElementById('config-donacion-nota').value = d.donacionNota || '';
        Core.dom.modalConfigClub.classList.add('active');
    };

    Curso.guardarConfigClub = async function () {
        if (!Core.state.currentUser?.esAdmin) return;
        const nuevosDatos = {
            logoURL: document.getElementById('config-logo-url').value.trim(),
            telefono: document.getElementById('config-telefono').value.trim(),
            direccion: document.getElementById('config-direccion').value.trim(),
            emailContacto: document.getElementById('config-email-contacto').value.trim(),
            horarios: document.getElementById('config-horarios').value.trim(),
            web: document.getElementById('config-web').value.trim(),
            donacionTitular: document.getElementById('config-donacion-titular').value.trim(),
            donacionBanco: document.getElementById('config-donacion-banco').value.trim(),
            donacionTarjeta: document.getElementById('config-donacion-tarjeta').value.trim(),
            donacionCuenta: document.getElementById('config-donacion-cuenta').value.trim(),
            donacionClabe: document.getElementById('config-donacion-clabe').value.trim(),
            donacionNota: document.getElementById('config-donacion-nota').value.trim()
        };
        try {
            await db.collection('config').doc('club').set(nuevosDatos, { merge: true });
            Core.dom.modalConfigClub.classList.remove('active');
            mostrarToast('Configuración del club guardada', 'success');
        } catch (error) {
            mostrarToast('Error al guardar configuración', 'error');
            console.error(error);
        }
    };

    // ============================================================
    // DONACIÓN VOLUNTARIA
    // ============================================================
    Curso.copiarAlPortapapeles = async function (texto, btn) {
        const originalText = btn.textContent;
        try {
            await navigator.clipboard.writeText(texto);
            btn.textContent = '✓';
            btn.style.color = 'var(--exito)';
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.color = '';
            }, 1500);
            mostrarToast('📋 Copiado al portapapeles', 'success');
        } catch (err) {
            try {
                const textarea = document.createElement('textarea');
                textarea.value = texto;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                btn.textContent = '✓';
                setTimeout(() => { btn.textContent = originalText; }, 1500);
                mostrarToast('📋 Copiado al portapapeles', 'success');
            } catch (e) {
                mostrarToast('No se pudo copiar. Selecciona el texto manualmente.', 'error');
            }
        }
    };

    Curso.mostrarDonacion = function () {
        const contenedor = document.getElementById('donacion-contenido');
        const d = Core.state.datosClub;

        const tieneAlgo = d.donacionTitular || d.donacionBanco ||
                          d.donacionTarjeta || d.donacionCuenta ||
                          d.donacionClabe || d.donacionNota;

        if (!tieneAlgo) {
            contenedor.innerHTML = '<p style="text-align:center; color:var(--texto-suave);">Aún no hay datos de donación configurados.</p>';
            Core.dom.modalDonacion.classList.add('active');
            return;
        }

        let html = '';
        let contador = 0;

        const makeCard = (icon, label, value) => {
            if (!value || !value.trim()) return '';
            contador++;
            const id = `donacion-campo-${contador}`;
            return `
                <div class="donacion-item">
                    <div class="donacion-label">${icon} ${escapeHtml(label)}</div>
                    <div class="donacion-value">
                        <span id="${id}" class="donacion-texto">${escapeHtml(value.trim())}</span>
                        <button class="btn-copy" type="button" data-target="${id}" title="Copiar" aria-label="Copiar ${escapeHtml(label)}">📋</button>
                    </div>
                </div>
            `;
        };

        html += makeCard('👤', 'Titular', d.donacionTitular);
        html += makeCard('🏦', 'Banco', d.donacionBanco);
        html += makeCard('💳', 'Tarjeta de débito', d.donacionTarjeta);
        html += makeCard('📄', 'Número de cuenta', d.donacionCuenta);
        html += makeCard('🔢', 'CLABE interbancaria', d.donacionClabe);

        if (d.donacionNota && d.donacionNota.trim()) {
            html += `<div class="nota-debajo" style="margin-top:15px; text-align:center;">${escapeHtml(d.donacionNota.trim())}</div>`;
        }

        contenedor.innerHTML = html;

        contenedor.querySelectorAll('.btn-copy').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = document.getElementById(btn.dataset.target);
                if (target) Curso.copiarAlPortapapeles(target.textContent, btn);
            });
        });

        Core.dom.modalDonacion.classList.add('active');
    };

    // ============================================================
    // EDITOR DE TEXTO ENRIQUECIDO
    // ============================================================
    Curso.buildTextEditorToolbar = function (bloqueId) {
        return `
        <div class="text-editor-toolbar" data-editor-toolbar="${bloqueId}">
            <div class="toolbar-group">
                <button type="button" class="toolbar-btn" onclick="textEditorCmd('undo')" title="Deshacer">↶</button>
                <button type="button" class="toolbar-btn" onclick="textEditorCmd('redo')" title="Rehacer">↷</button>
            </div>
            <div class="toolbar-group">
                <select class="toolbar-select" onchange="textEditorCmd('fontName', this.value); this.value='';">
                    <option value="">Fuente…</option>
                    <option value="Lato">Lato</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Arial">Arial</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Courier New">Courier New</option>
                    <option value="Verdana">Verdana</option>
                    <option value="Playfair Display">Playfair Display</option>
                </select>
                <select class="toolbar-select toolbar-select-sm" onchange="textEditorCmd('fontSize', this.value); this.value='';">
                    <option value="">Tamaño…</option>
                    <option value="1">Pequeño</option>
                    <option value="3">Normal</option>
                    <option value="5">Grande</option>
                    <option value="7">Enorme</option>
                </select>
            </div>
            <div class="toolbar-group">
                <button type="button" class="toolbar-btn" data-cmd="bold" onclick="textEditorCmd('bold')" title="Negrita"><b>B</b></button>
                <button type="button" class="toolbar-btn" data-cmd="italic" onclick="textEditorCmd('italic')" title="Cursiva"><i>I</i></button>
                <button type="button" class="toolbar-btn" data-cmd="underline" onclick="textEditorCmd('underline')" title="Subrayado"><u>U</u></button>
                <button type="button" class="toolbar-btn" data-cmd="strikeThrough" onclick="textEditorCmd('strikeThrough')" title="Tachado"><s>S</s></button>
            </div>
            <div class="toolbar-group">
                <label class="toolbar-color" title="Color de texto">
                    <span>A</span>
                    <input type="color" value="#1e293b" onchange="textEditorCmd('foreColor', this.value)">
                </label>
                <label class="toolbar-color" title="Resaltar">
                    <span>🖍</span>
                    <input type="color" value="#ffff00" onchange="textEditorCmd('hiliteColor', this.value)">
                </label>
                <button type="button" class="toolbar-btn" onclick="textEditorCmd('hiliteColor', 'transparent')" title="Quitar resaltado">🚫</button>
            </div>
            <div class="toolbar-group">
                <button type="button" class="toolbar-btn" data-cmd="justifyLeft" onclick="textEditorCmd('justifyLeft')" title="Izquierda">⬅</button>
                <button type="button" class="toolbar-btn" data-cmd="justifyCenter" onclick="textEditorCmd('justifyCenter')" title="Centro">↔</button>
                <button type="button" class="toolbar-btn" data-cmd="justifyRight" onclick="textEditorCmd('justifyRight')" title="Derecha">➡</button>
                <button type="button" class="toolbar-btn" data-cmd="justifyFull" onclick="textEditorCmd('justifyFull')" title="Justificar">☰</button>
            </div>
            <div class="toolbar-group">
                <button type="button" class="toolbar-btn" data-cmd="insertUnorderedList" onclick="textEditorCmd('insertUnorderedList')" title="Lista">•</button>
                <button type="button" class="toolbar-btn" data-cmd="insertOrderedList" onclick="textEditorCmd('insertOrderedList')" title="Lista numerada">1.</button>
                <button type="button" class="toolbar-btn" onclick="textEditorCmd('outdent')" title="Menos sangría">⇤</button>
                <button type="button" class="toolbar-btn" onclick="textEditorCmd('indent')" title="Más sangría">⇥</button>
            </div>
            <div class="toolbar-group">
                <button type="button" class="toolbar-btn" onclick="textEditorHr()" title="Línea horizontal">─</button>
                <button type="button" class="toolbar-btn toolbar-btn-danger" onclick="textEditorCmd('removeFormat')" title="Quitar formato">✕</button>
            </div>
        </div>`;
    };

    Curso.setActiveTextEditor = function (element, claseId, temaId, bloqueId) {
        Core.state.activeTextEditor = element;
        Core.state.activeTextEditorIds = { claseId, temaId, bloqueId };
    };

    Curso.textEditorCmd = function (cmd, value) {
        if (!Core.state.activeTextEditor) return;
        Core.state.activeTextEditor.focus();
        try {
            document.execCommand('styleWithCSS', false, true);
            document.execCommand(cmd, false, value || null);
        } catch (e) { console.warn(e); }
        Curso.textEditorSave();
        Curso.textEditorUpdateState();
    };

    Curso.textEditorHr = function () {
        if (!Core.state.activeTextEditor) return;
        Core.state.activeTextEditor.focus();
        document.execCommand('insertHTML', false, '<hr>');
        Curso.textEditorSave();
    };

    Curso.textEditorSave = function () {
        if (!Core.state.activeTextEditor || !Core.state.activeTextEditorIds.bloqueId) return;
        const { claseId, temaId, bloqueId } = Core.state.activeTextEditorIds;
        const clase = Core.state.curso.clases.find(c => c.id === claseId);
        if (!clase) return;
        const tema = Curso.buscarTemaRecursivo(clase.temas, temaId);
        if (!tema) return;
        if (!tema.bloques) return;
        const bloque = tema.bloques.find(b => b.id === bloqueId);
        if (!bloque) return;
        bloque.contenido = sanitizeHtml(Core.state.activeTextEditor.innerHTML);
        Curso._debouncedGuardarCurso();
    };

    Curso.textEditorUpdateState = function () {
        document.querySelectorAll('[data-editor-toolbar]').forEach(toolbar => {
            const editor = toolbar.parentElement?.querySelector('.bloque-texto-editor');
            if (!editor) return;
            const isActive = document.activeElement === editor || editor.contains(document.activeElement);
            toolbar.querySelectorAll('[data-cmd]').forEach(btn => {
                if (!isActive) { btn.classList.remove('active'); return; }
                try {
                    btn.classList.toggle('active', document.queryCommandState(btn.dataset.cmd));
                } catch (e) { /* ignorar */ }
            });
        });
    };

    Curso._debouncedGuardarCurso = function () {
        if (Core.state._debounceGuardarCursoTimer) clearTimeout(Core.state._debounceGuardarCursoTimer);
        Core.state._debounceGuardarCursoTimer = setTimeout(() => {
            Curso.guardarCurso();
        }, 800);
    };

    // ============================================================
    // BLOQUES (EDITOR)
    // ============================================================
    Curso.agregarBloque = function (claseId, temaId, tipo) {
        const clase = Core.state.curso.clases.find(c => c.id === claseId);
        const tema = Curso.buscarTemaRecursivo(clase.temas, temaId);
        if (!tema) return;
        if (!tema.bloques) tema.bloques = [];
        const nuevo = {
            id: generarId(),
            tipo: tipo,
            contenido: '',
            estilo: tipo === 'texto' ? { fontSize: '1rem', color: '#000000', textAlign: 'left' } : {},
            nota: ''
        };
        if (tipo === 'enlace') { nuevo.label = ''; nuevo.url = ''; }
        if (tipo === 'tablero') {
            nuevo.config = { pgn: '', modo: 'ejercicio', colorHumano: 'w', nivelSF: 5, orientacion: 'auto' };
        }
        if (tipo === 'consejo') {
            nuevo.imagenURL = '';
            nuevo.texto = '';
        }
        tema.bloques.push(nuevo);
        Curso.guardarCurso().then(() => window.actualizarUI());
    };

    Curso.eliminarBloque = function (claseId, temaId, bloqueId) {
        const clase = Core.state.curso.clases.find(c => c.id === claseId);
        const tema = Curso.buscarTemaRecursivo(clase.temas, temaId);
        if (!tema || !tema.bloques) return;
        const bloque = tema.bloques.find(b => b.id === bloqueId);
        if (!bloque) return;

        let preview = '';
        if (bloque.tipo === 'enlace') preview = bloque.label || 'sin etiqueta';
        else if (bloque.tipo === 'tablero') preview = 'Ejercicio de tablero';
        else if (bloque.tipo === 'consejo') preview = bloque.texto ? bloque.texto.substring(0, 40) : 'Consejo';
        else preview = bloque.contenido || 'vacío';
        const previewCorto = String(preview).length > 40 ? String(preview).substring(0, 40) + '...' : String(preview);

        mostrarConfirmacion(
            '🗑️ Eliminar bloque',
            `¿Seguro que quieres eliminar este bloque de tipo "${bloque.tipo}"? Contenido: "${previewCorto}". Esta acción no se puede deshacer.`,
            () => {
                tema.bloques = tema.bloques.filter(b => b.id !== bloqueId);
                Curso.guardarCurso().then(() => window.actualizarUI());
                mostrarToast('🗑️ Bloque eliminado', 'success');
            }
        );
    };

    Curso.moverBloqueArriba = function (claseId, temaId, bloqueId) {
        const clase = Core.state.curso.clases.find(c => c.id === claseId);
        const tema = Curso.buscarTemaRecursivo(clase.temas, temaId);
        if (!tema || !tema.bloques) return;
        const i = tema.bloques.findIndex(b => b.id === bloqueId);
        if (i <= 0) return;
        [tema.bloques[i-1], tema.bloques[i]] = [tema.bloques[i], tema.bloques[i-1]];
        Curso.guardarCurso().then(() => window.actualizarUI());
    };

    Curso.moverBloqueAbajo = function (claseId, temaId, bloqueId) {
        const clase = Core.state.curso.clases.find(c => c.id === claseId);
        const tema = Curso.buscarTemaRecursivo(clase.temas, temaId);
        if (!tema || !tema.bloques) return;
        const i = tema.bloques.findIndex(b => b.id === bloqueId);
        if (i === -1 || i >= tema.bloques.length - 1) return;
        [tema.bloques[i], tema.bloques[i+1]] = [tema.bloques[i+1], tema.bloques[i]];
        Curso.guardarCurso().then(() => window.actualizarUI());
    };

    Curso.actualizarBloqueContenido = function (claseId, temaId, bloqueId, contenido) {
        const clase = Core.state.curso.clases.find(c => c.id === claseId);
        const tema = Curso.buscarTemaRecursivo(clase.temas, temaId);
        const bloque = tema?.bloques?.find(b => b.id === bloqueId);
        if (!bloque) return;
        bloque.contenido = contenido;
        Curso.guardarCurso();
    };

    Curso.actualizarBloqueEnlace = function (claseId, temaId, bloqueId, label, url) {
        const clase = Core.state.curso.clases.find(c => c.id === claseId);
        const tema = Curso.buscarTemaRecursivo(clase.temas, temaId);
        const bloque = tema?.bloques?.find(b => b.id === bloqueId);
        if (!bloque) return;
        bloque.label = label; bloque.url = url;
        Curso.guardarCurso();
    };

    Curso.actualizarBloqueEstilo = function (claseId, temaId, bloqueId, prop, valor) {
        const clase = Core.state.curso.clases.find(c => c.id === claseId);
        const tema = Curso.buscarTemaRecursivo(clase.temas, temaId);
        const bloque = tema?.bloques?.find(b => b.id === bloqueId);
        if (!bloque) return;
        if (!bloque.estilo) bloque.estilo = {};
        bloque.estilo[prop] = valor;
        Curso.guardarCurso();
    };

    Curso.actualizarBloqueNota = function (claseId, temaId, bloqueId, nota) {
        const clase = Core.state.curso.clases.find(c => c.id === claseId);
        const tema = Curso.buscarTemaRecursivo(clase.temas, temaId);
        const bloque = tema?.bloques?.find(b => b.id === bloqueId);
        if (!bloque) return;
        bloque.nota = nota;
        Curso.guardarCurso();
    };

    Curso.cambiarTipoBloque = function (claseId, temaId, bloqueId, nuevoTipo) {
        const clase = Core.state.curso.clases.find(c => c.id === claseId);
        const tema = Curso.buscarTemaRecursivo(clase.temas, temaId);
        const bloque = tema?.bloques?.find(b => b.id === bloqueId);
        if (!bloque) return;
        bloque.tipo = nuevoTipo;
        if (nuevoTipo === 'enlace') {
            bloque.label = bloque.label || '';
            bloque.url = bloque.url || '';
            delete bloque.contenido;
        } else if (nuevoTipo === 'tablero') {
            bloque.config = bloque.config || { pgn: '', modo: 'ejercicio', colorHumano: 'w', nivelSF: 5, orientacion: 'auto' };
            delete bloque.contenido;
            delete bloque.label;
            delete bloque.url;
        } else if (nuevoTipo === 'consejo') {
            bloque.imagenURL = bloque.imagenURL || '';
            bloque.texto = bloque.texto || '';
            delete bloque.contenido;
            delete bloque.label;
            delete bloque.url;
        } else {
            bloque.contenido = bloque.contenido || '';
            delete bloque.label;
            delete bloque.url;
        }
        Curso.guardarCurso().then(() => window.actualizarUI());
    };

    // ============================================================
    // EXPOSICIÓN GLOBAL (compatibilidad con HTML onclick y código existente)
    // ============================================================
    window.suscribirAccesosEspeciales = Curso.suscribirAccesosEspeciales;
    window.suscribirAccesosTema = Curso.suscribirAccesosTema;
    window.suscribirNotificaciones = Curso.suscribirNotificaciones;
    window.suscribirSolicitudesAdmin = Curso.suscribirSolicitudesAdmin;
    window.suscribirMisSolicitudes = Curso.suscribirMisSolicitudes;
    window.suscribirDatosClub = Curso.suscribirDatosClub;
    window.suscribirProgresoTableros = Curso.suscribirProgresoTableros;

    window.actualizarBadgeNotificaciones = Curso.actualizarBadgeNotificaciones;
    window.actualizarBadgeSolicitudes = Curso.actualizarBadgeSolicitudes;
    window.actualizarLogoClub = Curso.actualizarLogoClub;
    window.actualizarBotonDatosClub = Curso.actualizarBotonDatosClub;

    window.iniciarEscuchaCurso = Curso.iniciarEscuchaCurso;
    window.guardarCurso = Curso.guardarCurso;
    window.fusionarCursos = Curso.fusionarCursos;
    window.migrarTemaABloques = Curso.migrarTemaABloques;
    window.buscarTemaRecursivo = Curso.buscarTemaRecursivo;
    window.encontrarTemaYPadre = Curso.encontrarTemaYPadre;
    window.reordenarTemasRecursivo = Curso.reordenarTemasRecursivo;
    window.obtenerTodasSubtemas = Curso.obtenerTodasSubtemas;
    window.temaAccesible = Curso.temaAccesible;

    window.gestionarAccesosTema = Curso.gestionarAccesosTema;
    window.toggleBloqueoTema = Curso.toggleBloqueoTema;
    window.agregarSubtema = Curso.agregarSubtema;
    window.eliminarTema = Curso.eliminarTema;
    window.moverTemaArriba = Curso.moverTemaArriba;
    window.moverTemaAbajo = Curso.moverTemaAbajo;
    window.renombrarClase = Curso.renombrarClase;
    window.renombrarTema = Curso.renombrarTema;
    window.agregarClase = Curso.agregarClase;
    window.eliminarClase = Curso.eliminarClase;
    window.togglePublicarClase = Curso.togglePublicarClase;
    window.moverClaseArriba = Curso.moverClaseArriba;
    window.moverClaseAbajo = Curso.moverClaseAbajo;

    window.sincronizarProgresoDesdeFirestore = Curso.sincronizarProgresoDesdeFirestore;
    window.estaCompletado = Curso.estaCompletado;
    window.marcarVisto = Curso.marcarVisto;
    window.guardarProgresoVarianteEnFirestore = Curso.guardarProgresoVarianteEnFirestore;
    window.guardarProgresoCapCompletoEnFirestore = Curso.guardarProgresoCapCompletoEnFirestore;
    window.renombrarCapituloEnFirestore = Curso.renombrarCapituloEnFirestore;
    window.calcularProgresoClase = Curso.calcularProgresoClase;
    window.abrirPanelProgreso = Curso.abrirPanelProgreso;

    window.solicitarAcceso = Curso.solicitarAcceso;
    window.solicitarAccesoTema = Curso.solicitarAccesoTema;
    window.aprobarSolicitud = Curso.aprobarSolicitud;
    window.rechazarSolicitud = Curso.rechazarSolicitud;
    window.ejecutarEnLotes = Curso.ejecutarEnLotes;
    window.aprobarTodoElCurso = Curso.aprobarTodoElCurso;
    window.revocarTodoElCurso = Curso.revocarTodoElCurso;
    window.abrirGestionAlumnos = Curso.abrirGestionAlumnos;
    window.abrirSolicitudesAdmin = Curso.abrirSolicitudesAdmin;

    window.abrirNotificaciones = Curso.abrirNotificaciones;
    window.marcarNotificacionLeida = Curso.marcarNotificacionLeida;
    window.marcarTodasNotificacionesLeidas = Curso.marcarTodasNotificacionesLeidas;
    window.eliminarNotificacion = Curso.eliminarNotificacion;

    window.mostrarDatosClub = Curso.mostrarDatosClub;
    window.abrirConfigClub = Curso.abrirConfigClub;
    window.guardarConfigClub = Curso.guardarConfigClub;

    window.copiarAlPortapapeles = Curso.copiarAlPortapapeles;
    window.mostrarDonacion = Curso.mostrarDonacion;

    window.buildTextEditorToolbar = Curso.buildTextEditorToolbar;
    window.setActiveTextEditor = Curso.setActiveTextEditor;
    window.textEditorCmd = Curso.textEditorCmd;
    window.textEditorHr = Curso.textEditorHr;
    window.textEditorSave = Curso.textEditorSave;
    window.textEditorUpdateState = Curso.textEditorUpdateState;

    window.agregarBloque = Curso.agregarBloque;
    window.eliminarBloque = Curso.eliminarBloque;
    window.moverBloqueArriba = Curso.moverBloqueArriba;
    window.moverBloqueAbajo = Curso.moverBloqueAbajo;
    window.actualizarBloqueContenido = Curso.actualizarBloqueContenido;
    window.actualizarBloqueEnlace = Curso.actualizarBloqueEnlace;
    window.actualizarBloqueEstilo = Curso.actualizarBloqueEstilo;
    window.actualizarBloqueNota = Curso.actualizarBloqueNota;
    window.cambiarTipoBloque = Curso.cambiarTipoBloque;

    // ============================================================
    // LOG FINAL
    // ============================================================
    console.log('✅ CMCurso cargado (suscripciones + CRUD curso + accesos + notificaciones + bloques)');

})();
