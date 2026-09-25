/* ============================================================
   SCRIPT MAIN — Club Morphy
   
   Contiene:
   - Funciones de autenticación (login, registro, perfil, logout)
   - auth.onAuthStateChanged (orquestador principal)
   - Eventos del DOM (submit, change, click, keydown)
   - Configuración de autofill
   - Registro del Service Worker
   - Inicialización global
   
   Depende de: script-core.js + script-curso.js + script-render.js + entrenador-*.js
   Expone: window.CMMain
   Cargado AL FINAL (después de script-render.js)
   ============================================================ */

(function () {
    'use strict';

    const Core = window.CMScriptCore;
    const Curso = window.CMCurso;
    const Render = window.CMRender;

    if (!Core) {
        console.error('[CMMain] CMScriptCore no está cargado.');
        return;
    }
    if (!Curso) {
        console.error('[CMMain] CMCurso no está cargado.');
        return;
    }
    if (!Render) {
        console.error('[CMMain] CMRender no está cargado.');
        return;
    }

    const {
        escapeHtml, escapeAttr, mostrarToast,
        traducirErrorFirebase, guardarEstadoNavegacion,
        cargarEstadoNavegacion, cargarModoZen, aplicarModoZen,
        toggleModoZen, closeConfirm, getInicial,
        ADMIN_UID, db, auth, dom
    } = Core;

    const Main = window.CMMain = window.CMMain || {};

    // ============================================================
    // AUTENTICACIÓN Y PERFIL DE USUARIO
    // ============================================================
    Main.registrarUsuarioEnColeccion = async function (user, nombre = null, apellidos = null) {
        if (!user) return;
        const userRef = db.collection('usuarios').doc(user.uid);
        const doc = await userRef.get();

        if (!doc.exists) {
            const data = {
                uid: user.uid,
                email: user.email,
                nombre: nombre || '',
                apellidos: apellidos || '',
                perfilCompletado: !!(nombre && apellidos),
                asignadoPorAdmin: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            await userRef.set(data);
        } else {
            const updates = {};
            if (doc.data().email !== user.email) {
                updates.email = user.email;
            }
            if (nombre && apellidos && !doc.data().nombre) {
                updates.nombre = nombre;
                updates.apellidos = apellidos;
                updates.perfilCompletado = true;
            }
            if (Object.keys(updates).length > 0) {
                await userRef.update(updates);
            }
        }
    };

    Main.cargarPerfilUsuario = async function (uid) {
        try {
            const doc = await db.collection('usuarios').doc(uid).get();
            if (doc.exists) return doc.data();
            return null;
        } catch (error) {
            console.error('Error al cargar perfil:', error);
            return null;
        }
    };

    Main.actualizarHeaderUsuario = function () {
        const nombreMostrar = Core.getNombreMostrar();
        if (dom.userInfo) {
            dom.userInfo.textContent = `👤 ${nombreMostrar}`;
            dom.userInfo.title = Core.state.currentUser ? Core.state.currentUser.email : '';
        }
    };

    Main.mostrarCompletarPerfil = function () {
        if (Core.state.modalCompletarPerfilYaMostrado) return;
        Core.state.modalCompletarPerfilYaMostrado = true;
        document.getElementById('modal-completar-perfil')?.remove();

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'modal-completar-perfil';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 450px;">
                <div style="text-align:center; margin-bottom:16px;">
                    <div style="font-size:3rem;">👋</div>
                    <h3 style="color:var(--acento); margin-top:8px;">¡Bienvenido a Club Morphy!</h3>
                    <p style="font-size:0.9rem; color:var(--texto-suave); margin-top:8px;">
                        Antes de continuar, cuéntanos cómo te llamas.
                    </p>
                </div>

                <label for="perfil-nombre">Nombre(s)</label>
                <input id="perfil-nombre" type="text"
                       placeholder="Ej: Juan Carlos"
                       autocomplete="given-name"
                       value="${escapeAttr(Core.state.userProfile?.nombre || '')}">

                <label for="perfil-apellidos">Apellidos</label>
                <input id="perfil-apellidos" type="text"
                       placeholder="Ej: Pérez García"
                       autocomplete="family-name"
                       value="${escapeAttr(Core.state.userProfile?.apellidos || '')}">

                <div class="modal-buttons" style="margin-top:20px;">
                    <button class="btn" type="button" onclick="cerrarCompletarPerfil()">Más tarde</button>
                    <button class="btn btn-azul" type="button" onclick="guardarPerfilUsuario()">Guardar y continuar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        setTimeout(() => {
            document.getElementById('perfil-nombre')?.focus();
        }, 100);
    };

    Main.cerrarCompletarPerfil = function () {
        document.getElementById('modal-completar-perfil')?.remove();
        Core.state.modalCompletarPerfilYaMostrado = false;
    };

    Main.guardarPerfilUsuario = async function () {
        if (!Core.state.currentUser) return;

        const nombre = document.getElementById('perfil-nombre').value.trim();
        const apellidos = document.getElementById('perfil-apellidos').value.trim();

        if (!nombre || !apellidos) {
            mostrarToast('Por favor escribe tu nombre y apellidos', 'error');
            return;
        }

        const btnGuardar = document.querySelector('#modal-completar-perfil .btn-azul');
        if (btnGuardar) {
            btnGuardar.disabled = true;
            btnGuardar.innerHTML = '<span class="loader"></span> Guardando...';
        }

        try {
            await db.collection('usuarios').doc(Core.state.currentUser.uid).update({
                nombre: nombre,
                apellidos: apellidos,
                perfilCompletado: true
            });

            Core.state.userProfile = { ...Core.state.userProfile, nombre, apellidos, perfilCompletado: true };
            Main.actualizarHeaderUsuario();
            Main.cerrarCompletarPerfil();
            mostrarToast(`¡Gracias, ${nombre}!`, 'success');
        } catch (error) {
            console.error('Error al guardar perfil:', error);
            mostrarToast('Error al guardar. Intenta de nuevo.', 'error');
            if (btnGuardar) {
                btnGuardar.disabled = false;
                btnGuardar.textContent = 'Guardar y continuar';
            }
        }
    };

    Main.obtenerListaUsuarios = async function () {
        try {
            const snapshot = await db.collection('usuarios').get();
            const users = [];
            snapshot.forEach(doc => {
                const d = doc.data();
                users.push({
                    uid: doc.id,
                    email: d.email,
                    nombre: d.nombre || '',
                    apellidos: d.apellidos || '',
                    perfilCompletado: d.perfilCompletado || false
                });
            });
            users.sort((a, b) => (a.email || '').localeCompare(b.email || ''));
            return users;
        } catch (error) {
            console.error('Error al obtener usuarios:', error);
            return [];
        }
    };

    // ============================================================
    // LOGIN / LOGOUT / CUENTA
    // ============================================================
    Main.limpiarCampos = function () {
        document.getElementById('email').value = '';
        document.getElementById('password').value = '';

        const nombreInput = document.getElementById('nombre');
        const apellidosInput = document.getElementById('apellidos');
        if (nombreInput) nombreInput.value = '';
        if (apellidosInput) apellidosInput.value = '';

        document.getElementById('autofill-warning').style.display = 'none';
        document.getElementById('email').focus();
    };

    Main.mostrarLogin = function () {
        if (Core.state.currentUser) {
            const nombreMostrar = Core.getNombreMostrar();
            document.getElementById('modal-title').textContent = 'Tu cuenta';
            document.getElementById('current-session').style.display = 'block';
            document.getElementById('auth-form').style.display = 'none';
            document.getElementById('extra-controls').style.display = 'none';
            document.getElementById('session-email').innerHTML = `
                <strong style="font-size:1.05rem;">${escapeHtml(nombreMostrar)}</strong><br>
                <span style="font-size:0.8rem; color:var(--texto-suave);">${escapeHtml(Core.state.currentUser.email)}</span>
            `;
            document.getElementById('session-avatar').textContent = getInicial();
        } else {
            document.getElementById('modal-title').textContent = 'Iniciar sesión';
            document.getElementById('current-session').style.display = 'none';
            document.getElementById('auth-form').style.display = 'block';
            document.getElementById('extra-controls').style.display = 'block';
            document.getElementById('btn-auth').textContent = 'Ingresar';
            Core.state.modoRegistro = false;

            const registerFields = document.getElementById('register-fields');
            if (registerFields) {
                registerFields.style.display = 'none';
            }

            Main.limpiarCampos();
        }
        dom.modalLogin.classList.add('active');
    };

    Main.cambiarCuenta = function () {
        auth.signOut();
        dom.modalLogin.classList.remove('active');
        setTimeout(() => { Main.mostrarLogin(); }, 300);
    };

    Main.confirmarCerrarSesion = function () {
        dom.modalConfirmLogout.classList.add('active');
    };

    Main.cerrarSesionConfirmada = function () {
        dom.modalConfirmLogout.classList.remove('active');
        auth.signOut();
    };

    Main.toggleAdmin = function () {
        if (!Core.state.currentUser || !Core.state.currentUser.esAdmin) return;
        Core.state.modoAdmin = !Core.state.modoAdmin;
        document.body.classList.toggle('modo-admin', Core.state.modoAdmin);
        mostrarToast(Core.state.modoAdmin ? 'Modo administrador activado' : 'Modo usuario', 'success');
        Render.actualizarUI();
    };

// === FIN DE LA PARTE 1/2 ===
      // ============================================================
    // ON AUTH STATE CHANGED (orquestador principal)
    // ============================================================
    auth.onAuthStateChanged(async (user) => {
        try {
            if (user) {
                Core.state.currentUser = { uid: user.uid, email: user.email, esAdmin: user.uid === ADMIN_UID };
                await Main.registrarUsuarioEnColeccion(user);

                Core.state.userProfile = await Main.cargarPerfilUsuario(user.uid);

                if (dom.btnLogin) dom.btnLogin.style.display = 'none';
                if (dom.btnLogout) dom.btnLogout.style.display = 'inline-flex';

                Main.actualizarHeaderUsuario();

                if (Core.state.currentUser.esAdmin) {
                    if (dom.btnAdmin) dom.btnAdmin.style.display = 'inline-flex';
                    Core.state.modoAdmin = true;
                    document.body.classList.add('modo-admin');
                } else {
                    if (dom.btnAdmin) dom.btnAdmin.style.display = 'none';
                    Core.state.modoAdmin = false;
                    document.body.classList.remove('modo-admin');
                }

                Curso.suscribirAccesosEspeciales();
                Curso.suscribirAccesosTema();
                Curso.suscribirNotificaciones();
                Curso.suscribirSolicitudesAdmin();
                Curso.suscribirMisSolicitudes();
                // ⭐ v21: Cargar progreso ANTES de iniciar la escucha del curso
                // para que los tableros se inicialicen con el progreso ya cargado
                await Curso.sincronizarProgresoDesdeFirestore();
                Curso.suscribirProgresoTableros();
                Curso.iniciarEscuchaCurso();

                const estadoPrevio = cargarEstadoNavegacion();
                if (estadoPrevio && estadoPrevio.claseActivaId && Core.state.curso.clases.some(c => c.id === estadoPrevio.claseActivaId)) {
                    Core.state.claseActivaId = estadoPrevio.claseActivaId;
                    Core.state.temaAbiertoGlobal = estadoPrevio.temaAbiertoId || null;
                } else if (!Core.state.claseActivaId && Core.state.curso.clases.length > 0) {
                    Core.state.claseActivaId = Core.state.curso.clases[0].id;
                    Core.state.temaAbiertoGlobal = null;
                }
                Render.actualizarUI();

                if (estadoPrevio && estadoPrevio.scrollTop) {
                    setTimeout(() => {
                        const content = document.getElementById('main-content');
                        if (content) content.scrollTop = estadoPrevio.scrollTop;
                    }, 100);
                }
                Curso.actualizarBotonDatosClub();

                // Activar badge ELO en header
                Render.inicializarBadgeELO();

                // ⭐ v29: Precargar Stockfish al login (para que esté listo cuando
                // el usuario entre al juego vs IA o termine una partida)
                if (window.Entrenador && typeof window.Entrenador.initStockfish === 'function') {
                    try {
                        window.Entrenador.initStockfish();
                        console.log('[v29] Stockfish precargando en background...');
                    } catch (e) {
                        console.warn('[v29] Error al precargar Stockfish:', e);
                    }
                }

                if (!Core.state.currentUser.esAdmin && (!Core.state.userProfile || !Core.state.userProfile.nombre || !Core.state.userProfile.apellidos)) {
                    setTimeout(() => Main.mostrarCompletarPerfil(), 1500);
                }
            } else {
                Core.state.currentUser = null;
                Core.state.userProfile = null;
                Core.state.modalCompletarPerfilYaMostrado = false;

                document.getElementById('modal-completar-perfil')?.remove();

                if (dom.btnLogin) dom.btnLogin.style.display = 'inline-flex';
                if (dom.btnLogout) dom.btnLogout.style.display = 'none';
                if (dom.btnAdmin) dom.btnAdmin.style.display = 'none';
                if (dom.userInfo) dom.userInfo.textContent = '';
                document.body.classList.remove('modo-admin');
                Core.state.modoAdmin = false;

                if (Core.state.unsubscribeAccesos) { Core.state.unsubscribeAccesos(); Core.state.unsubscribeAccesos = null; }
                if (Core.state.unsubscribeAccesosTema) { Core.state.unsubscribeAccesosTema(); Core.state.unsubscribeAccesosTema = null; }
                if (Core.state.unsubscribeNotificaciones) { Core.state.unsubscribeNotificaciones(); Core.state.unsubscribeNotificaciones = null; }
                if (Core.state.unsubscribeSolicitudesAdmin) { Core.state.unsubscribeSolicitudesAdmin(); Core.state.unsubscribeSolicitudesAdmin = null; }
                if (Core.state.unsubscribeMisSolicitudes) { Core.state.unsubscribeMisSolicitudes(); Core.state.unsubscribeMisSolicitudes = null; }
                if (Core.state.unsubscribeCurso) { Core.state.unsubscribeCurso(); Core.state.unsubscribeCurso = null; }

                Core.state.notificaciones = [];
                Core.state.solicitudesPendientes = [];
                Core.state.misSolicitudes = [];
                Core.state.progresoTableros = {};

                const notifBadge = document.getElementById('notif-badge');
                if (notifBadge) notifBadge.style.display = 'none';
                const solBadge = document.getElementById('solicitudes-badge');
                if (solBadge) solBadge.style.display = 'none';
                const btnNotif = document.getElementById('btn-notificaciones');
                if (btnNotif) btnNotif.style.display = 'none';
                const btnSol = document.getElementById('btn-solicitudes-admin');
                if (btnSol) btnSol.style.display = 'none';
                const btnDatos = document.getElementById('btn-datos-club');
                if (btnDatos) btnDatos.style.display = 'none';
                const searchInput = document.getElementById('search-input');
                if (searchInput) {
                    searchInput.style.display = 'none';
                    searchInput.value = '';
                }
                Core.state.terminoBusqueda = '';
                const btnProg = document.getElementById('btn-progreso');
                if (btnProg) btnProg.style.display = 'none';

                const badge = document.getElementById('header-elo-badge');
                if (badge) badge.style.display = 'none';

                Render.actualizarUI();
            }
        } catch (err) {
            console.error('[auth] Error en onAuthStateChanged:', err);
            mostrarToast('Error al cargar tu sesión. Recarga la página.', 'error');
        }
    });

    // ============================================================
    // EVENTOS DEL DOM
    // ============================================================
    document.addEventListener('focusin', (event) => {
        const target = event.target;
        if (!target.closest) return;

        if (target.classList?.contains('bloque-texto-editor')) {
            const bloqueId = target.dataset.bloque;
            const temaId = target.dataset.tema;
            const claseId = target.dataset.clase;
            if (bloqueId && temaId && claseId) {
                Curso.setActiveTextEditor(target, claseId, temaId, bloqueId);
            }
        }

        const modalContent = target.closest('.modal-content');
        if (!modalContent) return;
        setTimeout(() => {
            const rect = target.getBoundingClientRect();
            const modalRect = modalContent.getBoundingClientRect();
            if (rect.bottom > modalRect.bottom - 40 || rect.top < modalRect.top + 40) {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 400);
    });

    document.addEventListener('selectionchange', Curso.textEditorUpdateState);

    // Toggle password
    const elTogglePassword = document.getElementById('toggle-password');
    if (elTogglePassword) {
        elTogglePassword.addEventListener('click', function() {
            const passInput = document.getElementById('password');
            const type = passInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passInput.setAttribute('type', type);
            this.textContent = type === 'password' ? '👁️' : '🙈';
            this.setAttribute('aria-label', type === 'password' ? 'Mostrar contraseña' : 'Ocultar contraseña');
        });
    }

    // Formulario de autenticación
    const elAuthForm = document.getElementById('auth-form');
    if (elAuthForm) {
        elAuthForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            const pass = document.getElementById('password').value.trim();

            if (!email || !pass) return mostrarToast('Falta tu correo o contraseña', 'error');

            let nombre = '';
            let apellidos = '';
            if (Core.state.modoRegistro) {
                nombre = document.getElementById('nombre').value.trim();
                apellidos = document.getElementById('apellidos').value.trim();
                if (!nombre || !apellidos) {
                    return mostrarToast('Por favor escribe tu nombre y apellidos', 'error');
                }
            }

            const btnAuth = document.getElementById('btn-auth');
            btnAuth.disabled = true;
            btnAuth.innerHTML = '<span class="loader"></span> Procesando...';

            try {
                if (Core.state.modoRegistro) {
                    const credencial = await auth.createUserWithEmailAndPassword(email, pass);
                    await Main.registrarUsuarioEnColeccion(credencial.user, nombre, apellidos);

                    Core.state.userProfile = await Main.cargarPerfilUsuario(credencial.user.uid);
                    Main.actualizarHeaderUsuario();

                    mostrarToast(`¡Cuenta creada, ${nombre}! Ya tienes acceso.`, 'success');
                    Core.state.modoRegistro = false;
                    document.getElementById('modal-title').textContent = 'Iniciar sesión';
                    document.getElementById('btn-auth').textContent = 'Ingresar';

                    const registerFields = document.getElementById('register-fields');
                    if (registerFields) registerFields.style.display = 'none';

                    Main.limpiarCampos();
                } else {
                    const credencial = await auth.signInWithEmailAndPassword(email, pass);
                    await Main.registrarUsuarioEnColeccion(credencial.user);
                    mostrarToast('¡Bienvenido!', 'success');
                    dom.modalLogin.classList.remove('active');
                }
            } catch (error) {
                mostrarToast(traducirErrorFirebase(error.code), 'error');
            } finally {
                btnAuth.disabled = false;
                btnAuth.textContent = Core.state.modoRegistro ? 'Crear cuenta' : 'Ingresar';
            }
        });
    }

    // Cambiar a modo registro
    const elSwitchAuth = document.getElementById('switch-auth');
    if (elSwitchAuth) {
        elSwitchAuth.addEventListener('click', (e) => {
            e.preventDefault();
            Core.state.modoRegistro = !Core.state.modoRegistro;
            document.getElementById('modal-title').textContent = Core.state.modoRegistro ? 'Registrarse' : 'Iniciar sesión';
            document.getElementById('btn-auth').textContent = Core.state.modoRegistro ? 'Crear cuenta' : 'Ingresar';

            const passInput = document.getElementById('password');
            passInput.setAttribute('autocomplete', Core.state.modoRegistro ? 'new-password' : 'current-password');

            const registerFields = document.getElementById('register-fields');
            if (registerFields) {
                registerFields.style.display = Core.state.modoRegistro ? 'block' : 'none';
            }
            Main.limpiarCampos();
        });
    }

    // Recuperar contraseña
    const elBtnForgot = document.getElementById('btn-forgot-password');
    if (elBtnForgot) {
        elBtnForgot.addEventListener('click', async () => {
            const emailInput = document.getElementById('email');
            const email = emailInput.value.trim();

            if (!email) {
                mostrarToast('Escribe tu correo primero y vuelve a intentar', 'error');
                emailInput.focus();
                return;
            }

            const btn = document.getElementById('btn-forgot-password');
            btn.disabled = true;
            btn.textContent = 'Enviando...';

            try {
                await auth.sendPasswordResetEmail(email);
                mostrarToast('📧 Te enviamos un correo para restablecer tu contraseña', 'success');
            } catch (error) {
                mostrarToast(traducirErrorFirebase(error.code), 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = '¿Olvidaste tu contraseña?';
            }
        });
    }

    // ============================================================
    // DETECCIÓN DE AUTOFILL
    // ============================================================
    Main.configurarDeteccionAutofill = function () {
        const emailInput = document.getElementById('email');
        const passInput = document.getElementById('password');
        const warningEl = document.getElementById('autofill-warning');
        if (!emailInput || !passInput || !warningEl) return;

        const handler = (e) => { if (e.animationName === 'onAutoFillStart') warningEl.style.display = 'block'; };
        emailInput.addEventListener('animationstart', handler);
        passInput.addEventListener('animationstart', handler);
        const styleEl = document.createElement('style');
        styleEl.textContent = `@keyframes onAutoFillStart { from { /* dummy */ } to { /* dummy */ } } input:-webkit-autofill { animation-name: onAutoFillStart; }`;
        document.head.appendChild(styleEl);
    };

    // ============================================================
    // EVENTOS DE NAVEGACIÓN
    // ============================================================
    if (dom.hamburgerBtn) {
        dom.hamburgerBtn.addEventListener('click', () => {
            dom.sidebar.classList.toggle('open');
            dom.sidebarOverlay.classList.toggle('active');
            const abierto = dom.sidebar.classList.contains('open');
            dom.hamburgerBtn.setAttribute('aria-expanded', abierto ? 'true' : 'false');
            dom.hamburgerBtn.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
        });
    }

    if (dom.sidebarOverlay) {
        dom.sidebarOverlay.addEventListener('click', () => {
            dom.sidebar.classList.remove('open');
            dom.sidebarOverlay.classList.remove('active');
            if (dom.hamburgerBtn) {
                dom.hamburgerBtn.setAttribute('aria-expanded', 'false');
                dom.hamburgerBtn.setAttribute('aria-label', 'Abrir menú');
            }
        });
    }

    const elMainContent = document.getElementById('main-content');
    if (elMainContent) {
        elMainContent.addEventListener('click', () => {
            if (window.innerWidth <= 768 && dom.sidebar && dom.sidebarOverlay && dom.hamburgerBtn) {
                dom.sidebar.classList.remove('open');
                dom.sidebarOverlay.classList.remove('active');
                dom.hamburgerBtn.setAttribute('aria-expanded', 'false');
                dom.hamburgerBtn.setAttribute('aria-label', 'Abrir menú');
            }
        });

        elMainContent.addEventListener('scroll', Core.onContentScroll, { passive: true });
    }

    window.addEventListener('pagehide', () => { guardarEstadoNavegacion(); });

    window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
            const estadoPrevio = cargarEstadoNavegacion();
            if (estadoPrevio && estadoPrevio.claseActivaId && Core.state.curso.clases.some(c => c.id === estadoPrevio.claseActivaId)) {
                Core.state.claseActivaId = estadoPrevio.claseActivaId;
                Core.state.temaAbiertoGlobal = estadoPrevio.temaAbiertoId || null;
                Render.actualizarUI();
                if (estadoPrevio.scrollTop) {
                    setTimeout(() => {
                        const content = document.getElementById('main-content');
                        if (content) content.scrollTop = estadoPrevio.scrollTop;
                    }, 100);
                }
            }
        }
    });

    const elSearchInput = document.getElementById('search-input');
    if (elSearchInput) {
        elSearchInput.addEventListener('input', (e) => {
            Core.state.terminoBusqueda = e.target.value;
            Render.filtrarClases();
        });
    }

    // ============================================================
    // ATAJOS DE TECLADO
    // ============================================================
    document.addEventListener('keydown', (e) => {
        // Escape: cerrar modal más reciente
        if (e.key === 'Escape') {
            if (dom.modalJuegoIA && dom.modalJuegoIA.classList.contains('active') && !Core.state.juegoIAInstancia) {
                Render.cerrarModalJuegoIA();
                return;
            }
            const modalesAbiertos = document.querySelectorAll('.modal-overlay.active');
            if (modalesAbiertos.length === 0) return;
            const ultimoModal = modalesAbiertos[modalesAbiertos.length - 1];
            if (ultimoModal.id === 'modal-confirm' && Core.state.confirmCallback) return;
            if (ultimoModal.id === 'modal-juego-ia' && Core.state.juegoIAInstancia) return;
            ultimoModal.classList.remove('active');
        }

        // Z: modo zen (si no hay input activo)
        if ((e.key === 'z' || e.key === 'Z') && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const tag = document.activeElement?.tagName?.toLowerCase();
            if (tag === 'input' || tag === 'textarea' || document.activeElement?.isContentEditable) return;
            e.preventDefault();
            toggleModoZen();
        }
    });

    // ============================================================
    // EXPOSICIÓN GLOBAL DE FUNCIONES DE AUTH
    // ============================================================
    window.registrarUsuarioEnColeccion = Main.registrarUsuarioEnColeccion;
    window.cargarPerfilUsuario = Main.cargarPerfilUsuario;
    window.actualizarHeaderUsuario = Main.actualizarHeaderUsuario;
    window.mostrarCompletarPerfil = Main.mostrarCompletarPerfil;
    window.cerrarCompletarPerfil = Main.cerrarCompletarPerfil;
    window.guardarPerfilUsuario = Main.guardarPerfilUsuario;
    window.obtenerListaUsuarios = Main.obtenerListaUsuarios;
    window.limpiarCampos = Main.limpiarCampos;
    window.mostrarLogin = Main.mostrarLogin;
    window.cambiarCuenta = Main.cambiarCuenta;
    window.confirmarCerrarSesion = Main.confirmarCerrarSesion;
    window.cerrarSesionConfirmada = Main.cerrarSesionConfirmada;
    window.toggleAdmin = Main.toggleAdmin;

    // Exponer helpers de utilidad
    window._exponerFuncionesGlobales = function () {
        window.escapeHtml = escapeHtml;
        window.escapeAttr = escapeAttr;
        window.convertirUrlImagen = Core.convertirUrlImagen;
        window.escapeOnclick = Core.escapeOnclick;
    };
    window._exponerFuncionesGlobales();

    // ============================================================
    // INICIALIZACIÓN GLOBAL
    // ============================================================
    cargarModoZen();
    aplicarModoZen();

    try {
        Main.configurarDeteccionAutofill();
    } catch (err) {
        console.error('[Init] Error en configurarDeteccionAutofill:', err);
    }

    try {
        Curso.suscribirDatosClub();
    } catch (err) {
        console.error('[Init] Error en suscribirDatosClub:', err);
    }

    // ⭐ Log final del refactor v20
    console.log('✅ Club Morphy v20 — refactor modular completo (4 archivos script + 3 archivos entrenador)');

    // ============================================================
    // REGISTRO DEL SERVICE WORKER
    // ============================================================
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('✅ Service Worker registrado en:', registration.scope);

                    navigator.serviceWorker.addEventListener('message', event => {
                        if (event.data && event.data.type === 'NEW_VERSION_AVAILABLE') {
                            if (window.confirm('Hay una nueva versión del sitio. ¿Recargar ahora?')) {
                                window.location.reload();
                            }
                        }
                    });
                })
                .catch(err => {
                    console.warn('⚠️ Service Worker no disponible:', err.message);
                });
        });
    }

    // ============================================================
    // LOG FINAL DEL ARCHIVO
    // ============================================================
    console.log('✅ CMMain cargado (auth + eventos + Service Worker + inicialización)');

})();
 
