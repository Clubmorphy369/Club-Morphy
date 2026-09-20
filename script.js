// ------------------------------------------------
// CONFIGURACIÓN DE FIREBASE
// ------------------------------------------------
const firebaseConfig = {
    apiKey: "AIzaSyBEd81JSPeJLyEiTwoafyMqVHmFGPtNC2w",
    authDomain: "club-morphy-6aa5c.firebaseapp.com",
    projectId: "club-morphy-6aa5c",
    storageBucket: "club-morphy-6aa5c.firebasestorage.app",
    messagingSenderId: "162434548834",
    appId: "1:162434548834:web:e2fa127c7738f211c33d3b"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .catch(err => console.warn('No se pudo configurar persistencia', err));

db.enablePersistence({ synchronizeTabs: true }).catch(err => console.warn('Offline:', err));

const ADMIN_UID = 'FVnX1NOVgvavWnwnad75zBsRpBU2';
let currentUser = null;
let userProfile = null;
let curso = { clases: [] };
let temaAbiertoGlobal = null;
let claseActivaId = null;
let modoAdmin = false;
let confirmCallback = null;
let accesosEspeciales = {};
let accesosTema = {};
let datosClub = {};
let notificaciones = [];
let solicitudesPendientes = [];
let misSolicitudes = [];
let unsubscribeNotificaciones = null;
let unsubscribeSolicitudesAdmin = null;
let unsubscribeMisSolicitudes = null;
let unsubscribeAccesos = null;
let unsubscribeAccesosTema = null;
let unsubscribeClub = null;
let unsubscribeCurso = null;
let migracionRealizada = false;
let terminoBusqueda = '';
let modalCompletarPerfilYaMostrado = false;

// ------------------------------------------------
// VARIABLES GLOBALES Y REFERENCIAS A DOM
// ------------------------------------------------
const STORAGE_KEY = 'clubMorphy_navegacion';
const modalLogin = document.getElementById('modal-login');
const modalConfirmLogout = document.getElementById('modal-confirm-logout');
const modalConfirm = document.getElementById('modal-confirm');
const modalAccesos = document.getElementById('modal-accesos');
const modalSolicitudesAdmin = document.getElementById('modal-solicitudes-admin');
const modalNotificaciones = document.getElementById('modal-notificaciones');
const modalDatosClub = document.getElementById('modal-datos-club');
const modalConfigClub = document.getElementById('modal-config-club');
const modalDonacion = document.getElementById('modal-donacion');
const btnLogin = document.getElementById('btn-login');
const btnLogout = document.getElementById('btn-logout');
const btnAdmin = document.getElementById('btn-admin');
const userInfo = document.getElementById('user-info');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const hamburgerBtn = document.getElementById('hamburger-btn');
let modoRegistro = false;
let claseActualGestion = null;

// ------------------------------------------------
// FUNCIONES DE ESCAPE (SEGURIDAD)
// ------------------------------------------------
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        if (m === '"') return '&quot;';
        if (m === "'") return '&#39;';
        return m;
    });
}

function escapeAttr(str) {
    if (!str) return '';
    return String(str).replace(/["']/g, function(m) {
        if (m === '"') return '&quot;';
        if (m === "'") return '&#39;';
        return m;
    });
}

function esUrlSegura(url) {
    if (!url || typeof url !== 'string') return false;
    return /^(https?:\/\/|mailto:)/i.test(url.trim());
}

function escapeOnclick(str) {
    if (!str) return '';
    return String(str).replace(/\\/g, '\\\\')
              .replace(/'/g, "\\'")
              .replace(/"/g, '&quot;');
}

function sanitizeHtml(html) {
    if (!html) return '';
    return String(html)
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^>]*>.*?<\/iframe>/gi, '')
        .replace(/<object\b[^>]*>.*?<\/object>/gi, '')
        .replace(/<embed\b[^>]*>/gi, '')
        .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
        .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
        .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
        .replace(/javascript:/gi, '');
}

// ------------------------------------------------
// PERSISTENCIA DE NAVEGACIÓN (sessionStorage)
// ------------------------------------------------
function guardarEstadoNavegacion() {
    try {
        const estado = {
            claseActivaId: claseActivaId,
            temaAbiertoId: temaAbiertoGlobal,
            scrollTop: document.getElementById('main-content')?.scrollTop || 0
        };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
    } catch (e) { /* ignorar */ }
}

function cargarEstadoNavegacion() {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (e) { return null; }
}

let debounceScrollTimer = null;
function onContentScroll() {
    if (debounceScrollTimer) clearTimeout(debounceScrollTimer);
    debounceScrollTimer = setTimeout(() => {
        guardarEstadoNavegacion();
    }, 200);
}

// ------------------------------------------------
// UTILIDADES GENERALES
// ------------------------------------------------
function generarId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function extraerYouTubeID(url) {
    if (!url || typeof url !== 'string') return null;
    url = url.trim();
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
        /[?&]v=([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/
    ];
    for (let pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) return match[1];
    }
    return null;
}

function esUrlYouTubeValida(url) {
    return extraerYouTubeID(url) !== null;
}

function getNombreMostrar(user = currentUser, perfil = userProfile) {
    if (!user) return '';
    if (perfil && perfil.nombre && perfil.apellidos) {
        return `${perfil.nombre} ${perfil.apellidos}`;
    }
    if (perfil && perfil.nombre) {
        return perfil.nombre;
    }
    return user.email;
}

function getInicial(user = currentUser, perfil = userProfile) {
    if (perfil && perfil.nombre) return perfil.nombre.charAt(0).toUpperCase();
    if (user && user.email) return user.email.charAt(0).toUpperCase();
    return '?';
}

// ------------------------------------------------
// TOAST Y CONFIRMACIONES
// ------------------------------------------------
function mostrarToast(mensaje, tipo = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = mensaje;
    toast.className = `toast ${tipo} show`;
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => toast.classList.remove('show'), 3000);
}

function mostrarConfirmacion(titulo, mensaje, callback) {
    document.getElementById('confirm-title').textContent = titulo;
    document.getElementById('confirm-message').textContent = mensaje;
    confirmCallback = callback;
    modalConfirm.classList.add('active');
    document.getElementById('confirm-ok').onclick = () => {
        if (confirmCallback) confirmCallback();
        closeConfirm();
    };
}

function closeConfirm() {
    modalConfirm.classList.remove('active');
    confirmCallback = null;
}
window.closeConfirm = closeConfirm;

// ------------------------------------------------
// AUTENTICACIÓN Y USUARIOS
// ------------------------------------------------
async function registrarUsuarioEnColeccion(user, nombre = null, apellidos = null) {
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
}

async function cargarPerfilUsuario(uid) {
    try {
        const doc = await db.collection('usuarios').doc(uid).get();
        if (doc.exists) {
            return doc.data();
        }
        return null;
    } catch (error) {
        console.error('Error al cargar perfil:', error);
        return null;
    }
}

function actualizarHeaderUsuario() {
    const nombreMostrar = getNombreMostrar();
    userInfo.textContent = `👤 ${nombreMostrar}`;
    userInfo.title = currentUser ? currentUser.email : '';
}

function mostrarCompletarPerfil() {
    if (modalCompletarPerfilYaMostrado) return;
    modalCompletarPerfilYaMostrado = true;

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
                   value="${escapeAttr(userProfile?.nombre || '')}">

            <label for="perfil-apellidos">Apellidos</label>
            <input id="perfil-apellidos" type="text"
                   placeholder="Ej: Pérez García"
                   autocomplete="family-name"
                   value="${escapeAttr(userProfile?.apellidos || '')}">

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
}

function cerrarCompletarPerfil() {
    document.getElementById('modal-completar-perfil')?.remove();
    modalCompletarPerfilYaMostrado = false;
}

async function guardarPerfilUsuario() {
    if (!currentUser) return;

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
        await db.collection('usuarios').doc(currentUser.uid).update({
            nombre: nombre,
            apellidos: apellidos,
            perfilCompletado: true
        });

        userProfile = { ...userProfile, nombre, apellidos, perfilCompletado: true };
        actualizarHeaderUsuario();
        cerrarCompletarPerfil();
        mostrarToast(`¡Gracias, ${nombre}!`, 'success');
    } catch (error) {
        console.error('Error al guardar perfil:', error);
        mostrarToast('Error al guardar. Intenta de nuevo.', 'error');
        if (btnGuardar) {
            btnGuardar.disabled = false;
            btnGuardar.textContent = 'Guardar y continuar';
        }
    }
}
window.cerrarCompletarPerfil = cerrarCompletarPerfil;
window.guardarPerfilUsuario = guardarPerfilUsuario;
window.mostrarCompletarPerfil = mostrarCompletarPerfil;

async function obtenerListaUsuarios() {
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
}

function mostrarLogin() {
    if (currentUser) {
        const nombreMostrar = getNombreMostrar();
        document.getElementById('modal-title').textContent = 'Tu cuenta';
        document.getElementById('current-session').style.display = 'block';
        document.getElementById('auth-form').style.display = 'none';
        document.getElementById('extra-controls').style.display = 'none';
        document.getElementById('session-email').innerHTML = `
            <strong style="font-size:1.05rem;">${escapeHtml(nombreMostrar)}</strong><br>
            <span style="font-size:0.8rem; color:var(--texto-suave);">${escapeHtml(currentUser.email)}</span>
        `;
        document.getElementById('session-avatar').textContent = getInicial();
    } else {
        document.getElementById('modal-title').textContent = 'Iniciar sesión';
        document.getElementById('current-session').style.display = 'none';
        document.getElementById('auth-form').style.display = 'block';
        document.getElementById('extra-controls').style.display = 'block';
        document.getElementById('btn-auth').textContent = 'Ingresar';
        modoRegistro = false;

        const registerFields = document.getElementById('register-fields');
        if (registerFields) {
            registerFields.style.display = 'none';
        }

        limpiarCampos();
    }
    modalLogin.classList.add('active');
}

function limpiarCampos() {
    document.getElementById('email').value = '';
    document.getElementById('password').value = '';

    const nombreInput = document.getElementById('nombre');
    const apellidosInput = document.getElementById('apellidos');
    if (nombreInput) nombreInput.value = '';
    if (apellidosInput) apellidosInput.value = '';

    document.getElementById('autofill-warning').style.display = 'none';
    document.getElementById('email').focus();
}

function cambiarCuenta() {
    auth.signOut();
    modalLogin.classList.remove('active');
    setTimeout(() => { mostrarLogin(); }, 300);
}

function confirmarCerrarSesion() { modalConfirmLogout.classList.add('active'); }

function cerrarSesionConfirmada() { modalConfirmLogout.classList.remove('active'); auth.signOut(); }

function toggleAdmin() {
    if (!currentUser || !currentUser.esAdmin) return;
    modoAdmin = !modoAdmin;
    document.body.classList.toggle('modo-admin', modoAdmin);
    mostrarToast(modoAdmin ? 'Modo administrador activado' : 'Modo usuario', 'success');
    actualizarUI();
}
window.toggleAdmin = toggleAdmin;

function traducirErrorFirebase(codigo) {
    const mensajes = {
        'auth/invalid-email': 'Ese correo no parece válido. Revísalo e inténtalo de nuevo.',
        'auth/invalid-credential': 'Correo o contraseña incorrectos.',
        'auth/wrong-password': 'Correo o contraseña incorrectos.',
        'auth/user-not-found': 'No encontramos una cuenta con ese correo. ¿Quieres registrarte?',
        'auth/email-already-in-use': 'Ya existe una cuenta con ese correo. Intenta iniciar sesión.',
        'auth/weak-password': 'Tu contraseña es muy corta. Usa al menos 6 caracteres.',
        'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos y vuelve a intentar.',
        'auth/network-request-failed': 'Sin conexión a internet. Verifica tu red e inténtalo de nuevo.'
    };
    return mensajes[codigo] || 'Ocurrió un problema. Inténtalo de nuevo en unos segundos.';
}

// === FIN DE LA PARTE 1/4 ===
// ------------------------------------------------
// SUSCRIPCIONES EN TIEMPO REAL (Firestore)
// ------------------------------------------------
function suscribirAccesosEspeciales() {
    if (unsubscribeAccesos) unsubscribeAccesos();
    if (!currentUser) return;
    unsubscribeAccesos = db.collection('accesosEspeciales').onSnapshot(snapshot => {
        accesosEspeciales = {};
        snapshot.forEach(doc => { accesosEspeciales[doc.id] = doc.data().uids || []; });
        actualizarUI();
    }, error => console.warn('Error snapshot accesos clase:', error));
}

function suscribirAccesosTema() {
    if (unsubscribeAccesosTema) unsubscribeAccesosTema();
    if (!currentUser) return;
    unsubscribeAccesosTema = db.collection('accesosTema').onSnapshot(snapshot => {
        accesosTema = {};
        snapshot.forEach(doc => { accesosTema[doc.id] = doc.data().uids || []; });
        actualizarUI();
    }, error => console.warn('Error snapshot accesos tema:', error));
}

function suscribirNotificaciones() {
    if (unsubscribeNotificaciones) unsubscribeNotificaciones();
    if (!currentUser) {
        notificaciones = [];
        actualizarBadgeNotificaciones();
        return;
    }
    unsubscribeNotificaciones = db.collection('notificaciones')
        .where('paraUid', '==', currentUser.uid)
        .orderBy('createdAt', 'desc')
        .limit(50)
        .onSnapshot(snapshot => {
            notificaciones = [];
            snapshot.forEach(doc => {
                notificaciones.push({ id: doc.id, ...doc.data() });
            });
            actualizarBadgeNotificaciones();
        }, error => console.warn('Error snapshot notificaciones:', error));
}

function suscribirSolicitudesAdmin() {
    if (unsubscribeSolicitudesAdmin) unsubscribeSolicitudesAdmin();
    if (!currentUser?.esAdmin) {
        solicitudesPendientes = [];
        actualizarBadgeSolicitudes();
        return;
    }
    unsubscribeSolicitudesAdmin = db.collection('solicitudesAcceso')
        .where('estado', '==', 'pendiente')
        .onSnapshot(snapshot => {
            solicitudesPendientes = [];
            snapshot.forEach(doc => {
                solicitudesPendientes.push({ id: doc.id, ...doc.data() });
            });
            solicitudesPendientes.sort((a, b) => {
                const ta = a.createdAt?.toDate?.() || new Date(0);
                const tb = b.createdAt?.toDate?.() || new Date(0);
                return tb - ta;
            });
            actualizarBadgeSolicitudes();
        }, error => console.warn('Error snapshot solicitudes admin:', error));
}

function suscribirMisSolicitudes() {
    if (unsubscribeMisSolicitudes) unsubscribeMisSolicitudes();
    if (!currentUser) {
        misSolicitudes = [];
        return;
    }
    unsubscribeMisSolicitudes = db.collection('solicitudesAcceso')
        .where('uid', '==', currentUser.uid)
        .onSnapshot(snapshot => {
            misSolicitudes = [];
            snapshot.forEach(doc => {
                misSolicitudes.push({ id: doc.id, ...doc.data() });
            });
            actualizarUI();
        }, error => console.warn('Error snapshot mis solicitudes:', error));
}

function suscribirDatosClub() {
    if (unsubscribeClub) unsubscribeClub();
    unsubscribeClub = db.collection('config').doc('club').onSnapshot(doc => {
        if (doc.exists) {
            datosClub = doc.data();
        } else {
            datosClub = {};
        }
        actualizarLogoClub();
        actualizarBotonDatosClub();
    }, error => console.warn('Error snapshot club:', error));
}

// ------------------------------------------------
// BADGES Y UI DE NOTIFICACIONES
// ------------------------------------------------
function actualizarBadgeNotificaciones() {
    const badge = document.getElementById('notif-badge');
    const btn = document.getElementById('btn-notificaciones');
    if (!currentUser) {
        badge.style.display = 'none';
        btn.style.display = 'none';
        return;
    }
    btn.style.display = 'inline-flex';
    const noLeidas = notificaciones.filter(n => !n.leida).length;
    if (noLeidas > 0) {
        badge.textContent = noLeidas;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

function actualizarBadgeSolicitudes() {
    const badge = document.getElementById('solicitudes-badge');
    const btn = document.getElementById('btn-solicitudes-admin');
    if (!currentUser?.esAdmin) {
        badge.style.display = 'none';
        btn.style.display = 'none';
        return;
    }
    btn.style.display = 'inline-flex';
    const count = solicitudesPendientes.length;
    if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

function actualizarLogoClub() {
    const logoImg = document.getElementById('logo-club-img');
    if (datosClub.logoURL && datosClub.logoURL.trim()) {
        logoImg.style.display = '';
        logoImg.src = datosClub.logoURL.trim();
        logoImg.classList.add('visible');
    } else {
        logoImg.style.display = 'none';
        logoImg.removeAttribute('src');
        logoImg.classList.remove('visible');
    }
}

function actualizarBotonDatosClub() {
    const btn = document.getElementById('btn-datos-club');
    const btnDonar = document.getElementById('btn-donar');

    if (!currentUser) {
        btn.style.display = 'none';
    } else {
        const tieneDatos = datosClub.telefono || datosClub.direccion || datosClub.emailContacto || datosClub.horarios || datosClub.web;
        btn.style.display = tieneDatos ? 'inline-flex' : 'none';
    }

    if (btnDonar) {
        const tieneDonacion = datosClub.donacionTitular || datosClub.donacionBanco ||
                              datosClub.donacionTarjeta || datosClub.donacionCuenta ||
                              datosClub.donacionClabe;
        btnDonar.style.display = tieneDonacion ? 'inline-flex' : 'none';
    }
}

// ------------------------------------------------
// DONACIÓN VOLUNTARIA
// ------------------------------------------------
async function copiarAlPortapapeles(texto, btn) {
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
}

function mostrarDonacion() {
    const contenedor = document.getElementById('donacion-contenido');
    const d = datosClub;

    const tieneAlgo = d.donacionTitular || d.donacionBanco ||
                      d.donacionTarjeta || d.donacionCuenta ||
                      d.donacionClabe || d.donacionNota;

    if (!tieneAlgo) {
        contenedor.innerHTML = '<p style="text-align:center; color:var(--texto-suave);">Aún no hay datos de donación configurados.</p>';
        document.getElementById('modal-donacion').classList.add('active');
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
            if (target) copiarAlPortapapeles(target.textContent, btn);
        });
    });

    document.getElementById('modal-donacion').classList.add('active');
}
window.mostrarDonacion = mostrarDonacion;

// ------------------------------------------------
// EDITOR DE TEXTO ENRIQUECIDO
// ------------------------------------------------
let activeTextEditor = null;
let activeTextEditorIds = { claseId: null, temaId: null, bloqueId: null };

function buildTextEditorToolbar(bloqueId) {
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
}

function setActiveTextEditor(element, claseId, temaId, bloqueId) {
    activeTextEditor = element;
    activeTextEditorIds = { claseId, temaId, bloqueId };
}

function textEditorCmd(cmd, value) {
    if (!activeTextEditor) return;
    activeTextEditor.focus();
    try {
        document.execCommand('styleWithCSS', false, true);
        document.execCommand(cmd, false, value || null);
    } catch (e) { console.warn(e); }
    textEditorSave();
    textEditorUpdateState();
}
window.textEditorCmd = textEditorCmd;

function textEditorHr() {
    if (!activeTextEditor) return;
    activeTextEditor.focus();
    document.execCommand('insertHTML', false, '<hr>');
    textEditorSave();
}
window.textEditorHr = textEditorHr;

function textEditorSave() {
    if (!activeTextEditor || !activeTextEditorIds.bloqueId) return;
    const { claseId, temaId, bloqueId } = activeTextEditorIds;
    const clase = curso.clases.find(c => c.id === claseId);
    if (!clase) return;
    const tema = buscarTemaRecursivo(clase.temas, temaId);
    if (!tema) return;
    if (!tema.bloques) return;
    const bloque = tema.bloques.find(b => b.id === bloqueId);
    if (!bloque) return;
    bloque.contenido = sanitizeHtml(activeTextEditor.innerHTML);
    guardarCurso();
}
window.textEditorSave = textEditorSave;

function textEditorUpdateState() {
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
}

// === FIN DE LA PARTE 2/4 ===
// ------------------------------------------------
// GESTIÓN DEL CURSO (CRUD)
// ------------------------------------------------
function iniciarEscuchaCurso() {
    if (unsubscribeCurso) unsubscribeCurso();
    migracionRealizada = false;

    unsubscribeCurso = db.collection('config').doc('curso').onSnapshot(async (doc) => {
        if (doc.exists) {
            curso = doc.data();
        } else {
            curso = { clases: [] };
            if (currentUser && currentUser.esAdmin) {
                await db.collection('config').doc('curso').set(curso);
            }
        }

        if (!curso.clases) curso.clases = [];
        curso.clases.forEach(c => {
            if (!c.id) c.id = generarId();
            if (!c.temas) c.temas = [];
        });

        if (currentUser && currentUser.esAdmin && !migracionRealizada) {
            migracionRealizada = true;
            let migrado = false;
            curso.clases.forEach(c => {
                c.temas.forEach(t => {
                    t.notaDebajoVideo = t.notaDebajoVideo || '';
                    t.notaDebajoEjercicios = t.notaDebajoEjercicios || '';
                    if (t.bloqueado === undefined) t.bloqueado = false;
                    if (!t.accesos) t.accesos = [];
                    if (!t.subtemas) t.subtemas = [];
                    if (!t.accesosTemaId) t.accesosTemaId = null;
                    if (!t.bloques || t.bloques.length === 0) {
                        migrarTemaABloques(t);
                        migrado = true;
                    }
                });
            });
            if (migrado) {
                await guardarCurso();
            }
        }

        curso.clases.sort((a, b) => a.numero - b.numero);

        if (currentUser) {
            actualizarUI();
        }
    }, error => {
        console.warn('Error en snapshot del curso:', error);
        mostrarToast('Error al sincronizar el curso. Revisa tu conexión.', 'error');
    });
}

async function guardarCurso() {
    try {
        await db.collection('config').doc('curso').set(curso, { merge: true });
        localStorage.setItem('cursoBackup', JSON.stringify(curso));
    } catch (err) {
        mostrarToast('Error al guardar. Verifica tu conexión.', 'error');
    }
}

function migrarTemaABloques(tema) {
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
}

// ------------------------------------------------
// BÚSQUEDA RECURSIVA Y REORDENAMIENTO
// ------------------------------------------------
function buscarTemaRecursivo(temas, temaId) {
    for (let t of temas) {
        if (t.id === temaId) return t;
        if (t.subtemas && t.subtemas.length) {
            const encontrado = buscarTemaRecursivo(t.subtemas, temaId);
            if (encontrado) return encontrado;
        }
    }
    return null;
}

function encontrarTemaYPadre(temas, temaId, padre = null, listaPadre = null) {
    for (let i = 0; i < temas.length; i++) {
        if (temas[i].id === temaId) {
            return { tema: temas[i], padre: padre, lista: temas, index: i };
        }
        if (temas[i].subtemas) {
            const resultado = encontrarTemaYPadre(temas[i].subtemas, temaId, temas[i], temas[i].subtemas);
            if (resultado) return resultado;
        }
    }
    return null;
}

function reordenarTemasRecursivo(temas) {
    temas.forEach((t, index) => {
        t.numero = index + 1;
        if (t.subtemas && t.subtemas.length) {
            reordenarTemasRecursivo(t.subtemas);
        }
    });
}

function obtenerTodasSubtemas(tema) {
    let lista = [tema];
    if (tema.subtemas) {
        tema.subtemas.forEach(st => {
            lista = lista.concat(obtenerTodasSubtemas(st));
        });
    }
    return lista;
}

// ------------------------------------------------
// LÓGICA DE ACCESO A TEMAS
// ------------------------------------------------
function temaAccesible(tema, usuario) {
    if (!usuario) return false;
    if (usuario.esAdmin) return true;
    if (!tema.bloqueado) return true;

    if (tema.accesosTemaId) {
        const uids = accesosTema[tema.accesosTemaId] || [];
        if (uids.includes(usuario.uid)) return true;
    }
    return false;
}

// ------------------------------------------------
// ADMIN: GESTIÓN DE ACCESOS A TEMAS
// ------------------------------------------------
async function gestionarAccesosTema(claseId, temaId) {
    if (!currentUser?.esAdmin) return;
    const clase = curso.clases.find(c => c.id === claseId);
    if (!clase) return;
    const tema = buscarTemaRecursivo(clase.temas, temaId);
    if (!tema) return;

    if (!tema.accesosTemaId) {
        const docRef = await db.collection('accesosTema').doc();
        await docRef.set({ uids: [] });
        tema.accesosTemaId = docRef.id;
        await guardarCurso();
    }

    const uidsActual = accesosTema[tema.accesosTemaId] || [];
    const usuarios = await obtenerListaUsuarios();

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
                let uidsActual = [...(accesosTema[tema.accesosTemaId] || [])];
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
    modalAccesos.classList.add('active');
}

async function toggleBloqueoTema(claseId, temaId) {
    if (!currentUser?.esAdmin) return;
    const clase = curso.clases.find(c => c.id === claseId);
    const tema = buscarTemaRecursivo(clase.temas, temaId);
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
                await guardarCurso();
                actualizarUI();
                mostrarToast('Tema bloqueado y accesos revocados', 'success');
            }
        );
    } else {
        tema.bloqueado = false;
        await guardarCurso();
        actualizarUI();
        mostrarToast('Tema desbloqueado', 'success');
    }
}

// ------------------------------------------------
// ADMIN: AGREGAR SUBTEMA
// ------------------------------------------------
async function agregarSubtema(claseId, temaPadreId) {
    if (!currentUser?.esAdmin) return;
    const clase = curso.clases.find(c => c.id === claseId);
    if (!clase) return;
    const padre = buscarTemaRecursivo(clase.temas, temaPadreId);
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
    reordenarTemasRecursivo(padre.subtemas);
    await guardarCurso();
    actualizarUI();
    mostrarToast('Subtema agregado', 'success');
}

// ------------------------------------------------
// ADMIN: ELIMINAR TEMA
// ------------------------------------------------
async function eliminarTema(claseId, temaId) {
    if (!currentUser?.esAdmin) return;
    const clase = curso.clases.find(c => c.id === claseId);
    if (!clase) return;
    const tema = buscarTemaRecursivo(clase.temas, temaId);
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
            reordenarTemasRecursivo(clase.temas);
            await guardarCurso();
            actualizarUI();
            mostrarToast('🗑️ Tema eliminado', 'success');
        }
    );
}

// ------------------------------------------------
// ADMIN: MOVER TEMA ARRIBA/ABAJO
// ------------------------------------------------
async function moverTemaArriba(claseId, temaId) {
    if (!currentUser?.esAdmin) return;
    const clase = curso.clases.find(c => c.id === claseId);
    if (!clase) return;
    const info = encontrarTemaYPadre(clase.temas, temaId);
    if (!info || info.index === 0) return;

    const { lista, index } = info;
    [lista[index - 1], lista[index]] = [lista[index], lista[index - 1]];
    reordenarTemasRecursivo(clase.temas);
    await guardarCurso();
    actualizarUI();
    mostrarToast('Orden actualizado', 'success');
}

async function moverTemaAbajo(claseId, temaId) {
    if (!currentUser?.esAdmin) return;
    const clase = curso.clases.find(c => c.id === claseId);
    if (!clase) return;
    const info = encontrarTemaYPadre(clase.temas, temaId);
    if (!info || info.index >= info.lista.length - 1) return;

    const { lista, index } = info;
    [lista[index], lista[index + 1]] = [lista[index + 1], lista[index]];
    reordenarTemasRecursivo(clase.temas);
    await guardarCurso();
    actualizarUI();
    mostrarToast('Orden actualizado', 'success');
}

// ------------------------------------------------
// ADMIN: RENOMBRAR CLASE / TEMA
// ------------------------------------------------
async function renombrarClase(id, nuevoNombre = null) {
    if (!currentUser?.esAdmin) return;
    if (!nuevoNombre || !nuevoNombre.trim()) return;
    const clase = curso.clases.find(c => c.id === id);
    if (!clase) return;
    clase.titulo = nuevoNombre.trim();
    await guardarCurso();
    actualizarUI();
    mostrarToast('Clase renombrada', 'success');
}

async function renombrarTema(claseId, temaId, nuevoNombre = null) {
    if (!currentUser?.esAdmin) return;
    if (!nuevoNombre || !nuevoNombre.trim()) return;
    const clase = curso.clases.find(c => c.id === claseId);
    const tema = buscarTemaRecursivo(clase.temas, temaId);
    if (!tema) return;
    tema.titulo = nuevoNombre.trim();
    await guardarCurso();
    actualizarUI();
    mostrarToast('Tema renombrado', 'success');
}

// ------------------------------------------------
// ADMIN: AGREGAR / ELIMINAR CLASE
// ------------------------------------------------
async function agregarClase() {
    if (!currentUser?.esAdmin) return;
    const num = curso.clases.length + 1;
    const nuevaClase = {
        id: generarId(),
        numero: num,
        titulo: `Clase ${num}`,
        temas: [],
        publicada: false
    };
    curso.clases.push(nuevaClase);
    claseActivaId = nuevaClase.id;
    temaAbiertoGlobal = null;
    actualizarUI();
    guardarEstadoNavegacion();
    try {
        await guardarCurso();
        mostrarToast('Clase creada (oculta para alumnos)', 'success');
    } catch (err) {
        curso.clases.pop();
        claseActivaId = curso.clases.length > 0 ? curso.clases[0].id : null;
        actualizarUI();
        mostrarToast('Error al crear clase', 'error');
    }
}

async function eliminarClase(id) {
    if (!currentUser?.esAdmin) return;
    const index = curso.clases.findIndex(c => c.id === id);
    if (index === -1) return;
    curso.clases.splice(index, 1);
    if (claseActivaId === id) claseActivaId = curso.clases.length > 0 ? curso.clases[0].id : null;
    temaAbiertoGlobal = null;
    await guardarCurso();
    actualizarUI();
    guardarEstadoNavegacion();
    mostrarToast('Clase eliminada', 'success');
    try {
        await db.collection('accesosEspeciales').doc(id).delete();
    } catch (e) { console.warn('No se pudo eliminar accesos', e); }
}

async function togglePublicarClase(claseId) {
    if (!currentUser?.esAdmin) return;
    const clase = curso.clases.find(c => c.id === claseId);
    if (!clase) return;
    clase.publicada = !clase.publicada;
    await guardarCurso();
    actualizarUI();
    mostrarToast(clase.publicada ? 'Clase visible para alumnos' : 'Clase oculta para alumnos', 'success');
}

// ------------------------------------------------
// MOVER CLASE ARRIBA/ABAJO
// ------------------------------------------------
async function moverClaseArriba(claseId) {
    if (!currentUser?.esAdmin) return;
    const index = curso.clases.findIndex(c => c.id === claseId);
    if (index <= 0) return;
    const anterior = curso.clases[index - 1];
    const actual = curso.clases[index];
    const tempNum = actual.numero;
    actual.numero = anterior.numero;
    anterior.numero = tempNum;
    curso.clases.sort((a, b) => a.numero - b.numero);
    curso.clases.forEach((c, i) => c.numero = i + 1);
    await guardarCurso();
    actualizarUI();
    mostrarToast('Orden de clases actualizado', 'success');
}

async function moverClaseAbajo(claseId) {
    if (!currentUser?.esAdmin) return;
    const index = curso.clases.findIndex(c => c.id === claseId);
    if (index === -1 || index >= curso.clases.length - 1) return;
    const siguiente = curso.clases[index + 1];
    const actual = curso.clases[index];
    const tempNum = actual.numero;
    actual.numero = siguiente.numero;
    siguiente.numero = tempNum;
    curso.clases.sort((a, b) => a.numero - b.numero);
    curso.clases.forEach((c, i) => c.numero = i + 1);
    await guardarCurso();
    actualizarUI();
    mostrarToast('Orden de clases actualizado', 'success');
}

// ------------------------------------------------
// PROGRESO DEL USUARIO
// ------------------------------------------------
async function sincronizarProgresoDesdeFirestore() {
    if (!currentUser) return;
    try {
        const doc = await db.collection('progreso').doc(currentUser.uid).get();
        if (doc.exists) {
            const data = doc.data();
            const local = JSON.parse(localStorage.getItem(`progreso_${currentUser.uid}`) || '{}');
            const combinado = { ...local, ...data };
            localStorage.setItem(`progreso_${currentUser.uid}`, JSON.stringify(combinado));
        }
    } catch (err) { console.warn('No se pudo sincronizar progreso', err); }
}

function estaCompletado(claseId, temaId) {
    if (!currentUser) return false;
    const progreso = JSON.parse(localStorage.getItem(`progreso_${currentUser.uid}`) || '{}');
    return progreso[`${claseId}_${temaId}`] === true;
}

async function marcarVisto(claseId, temaId) {
    if (!currentUser) return;
    const key = `${claseId}_${temaId}`;
    const progreso = JSON.parse(localStorage.getItem(`progreso_${currentUser.uid}`) || '{}');
    if (progreso[key]) { mostrarToast('Ya habías completado este tema ✓'); return; }
    progreso[key] = true;
    localStorage.setItem(`progreso_${currentUser.uid}`, JSON.stringify(progreso));
    try {
        await db.collection('progreso').doc(currentUser.uid).set({ [key]: true }, { merge: true });
        mostrarToast('Progreso guardado ✓', 'success');
    } catch (error) {
        mostrarToast('Progreso guardado localmente (sin conexión)', 'error');
    }
    actualizarUI();
}

// ------------------------------------------------
// PANEL DE PROGRESO
// ------------------------------------------------
function calcularProgresoClase(clase) {
    if (!clase.temas || clase.temas.length === 0) return { completados: 0, total: 0, porcentaje: 0 };
    let completados = 0, total = 0;
    function contar(temas) {
        temas.forEach(t => {
            total++;
            if (estaCompletado(clase.id, t.id)) completados++;
            if (t.subtemas) contar(t.subtemas);
        });
    }
    contar(clase.temas);
    return {
        completados, total,
        porcentaje: total > 0 ? Math.round((completados / total) * 100) : 0
    };
}

function abrirPanelProgreso() {
    const contenedor = document.getElementById('progreso-contenido');
    const clasesVisibles = currentUser?.esAdmin
        ? curso.clases
        : curso.clases.filter(c => c.publicada === true);

    if (!clasesVisibles || clasesVisibles.length === 0) {
        contenedor.innerHTML = '<p style="color:var(--texto-suave);">No hay clases disponibles para calcular progreso.</p>';
    } else {
        let html = '<div style="max-height:400px; overflow-y:auto;">';
        let totalCompletados = 0, totalTemas = 0;
        clasesVisibles.forEach(clase => {
            const prog = calcularProgresoClase(clase);
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
}

// ------------------------------------------------
// SOLICITUDES DE ACCESO
// ------------------------------------------------
async function solicitarAcceso(claseId) {
    if (!currentUser) return mostrarToast('Debes iniciar sesión', 'error');
    const clase = curso.clases.find(c => c.id === claseId);
    if (!clase) return;

    try {
        const previas = await db.collection('solicitudesAcceso')
            .where('claseId', '==', claseId)
            .where('uid', '==', currentUser.uid)
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
            uid: currentUser.uid,
            email: currentUser.email,
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
            uidAlumno: currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        mostrarToast('Solicitud enviada. El administrador la revisará pronto.', 'success');
        actualizarUI();
    } catch (error) {
        mostrarToast('Error al enviar solicitud', 'error');
        console.error(error);
    }
}

async function solicitarAccesoTema(claseId, temaId) {
    if (!currentUser) {
        mostrarToast("Debes iniciar sesión para solicitar acceso.", "error");
        return;
    }

    const clase = curso.clases.find(c => c.id === claseId);
    if (!clase) return;

    const tema = buscarTemaRecursivo(clase.temas, temaId);
    if (!tema) {
        mostrarToast("El tema no existe.", "error");
        return;
    }

    const yaSolicitada = misSolicitudes.some(s => s.temaId === temaId && s.estado === 'pendiente');
    if (yaSolicitada) {
        mostrarToast("Ya enviaste una solicitud para este tema. Espera la respuesta del administrador.", "info");
        return;
    }

    try {
        await db.collection('solicitudesAcceso').add({
            uid: currentUser.uid,
            email: currentUser.email,
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
            uidAlumno: currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        mostrarToast("✅ Solicitud enviada al administrador.", "success");
        actualizarUI();
    } catch (error) {
        console.error("Error al solicitar acceso:", error);
        mostrarToast("Error al enviar la solicitud. Intenta de nuevo.", "error");
    }
}

async function aprobarSolicitud(solicitudId, claseId, uid, email, tipo = 'clase', temaId = null) {
    if (!currentUser?.esAdmin) return;
    try {
        await db.collection('solicitudesAcceso').doc(solicitudId).update({ estado: 'aprobada' });

        let mensaje = '';
        if (tipo === 'tema' && temaId) {
            const clase = curso.clases.find(c => c.id === claseId);
            if (!clase) {
                mostrarToast('La clase ya no existe', 'error');
                return;
            }
            const tema = buscarTemaRecursivo(clase.temas, temaId);
            if (!tema) {
                mostrarToast('El tema ya no existe', 'error');
                return;
            }
            if (tema.accesosTemaId) {
                const uidsActual = accesosTema[tema.accesosTemaId] || [];
                if (!uidsActual.includes(uid)) {
                    uidsActual.push(uid);
                    await db.collection('accesosTema').doc(tema.accesosTemaId).set({ uids: uidsActual }, { merge: true });
                }
                mensaje = `Tu solicitud de acceso al tema "${tema.titulo}" en la clase "${clase.titulo}" ha sido aprobada`;
            } else {
                mensaje = `Tu solicitud de acceso al tema en la clase "${clase.titulo}" ha sido aprobada`;
            }
        } else {
            const uidsActual = accesosEspeciales[claseId] || [];
            if (!uidsActual.includes(uid)) {
                uidsActual.push(uid);
                await db.collection('accesosEspeciales').doc(claseId).set({ uids: uidsActual }, { merge: true });
            }
            const clase = curso.clases.find(c => c.id === claseId);
            if (!clase) {
                mostrarToast('La clase ya no existe', 'error');
                return;
            }
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
        actualizarUI();
    } catch (error) {
        mostrarToast('Error al aprobar solicitud', 'error');
        console.error(error);
    }
}

async function rechazarSolicitud(solicitudId, uid, claseId, tipo = 'clase', temaId = null) {
    if (!currentUser?.esAdmin) return;
    try {
        await db.collection('solicitudesAcceso').doc(solicitudId).update({ estado: 'rechazada' });

        const clase = curso.clases.find(c => c.id === claseId);
        if (!clase) {
            mostrarToast('La clase ya no existe', 'error');
            return;
        }

        let mensaje = '';
        if (tipo === 'tema' && temaId) {
            const tema = buscarTemaRecursivo(clase.temas, temaId);
            if (!tema) {
                mostrarToast('El tema ya no existe', 'error');
                return;
            }
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
}

// ------------------------------------------------
// GESTIÓN MASIVA DE ACCESOS
// ------------------------------------------------
async function ejecutarEnLotes(operaciones) {
    const CHUNK = 400;
    for (let i = 0; i < operaciones.length; i += CHUNK) {
        const batch = db.batch();
        operaciones.slice(i, i + CHUNK).forEach(fn => fn(batch));
        await batch.commit();
    }
}

async function aprobarTodoElCurso(uid, email) {
    if (!currentUser?.esAdmin) return;

    mostrarConfirmacion(
        '🎓 Aprobar TODO el curso',
        `¿Dar acceso completo a "${email}"? Se liberarán TODAS las clases publicadas y TODOS los temas bloqueados.`,
        async () => {
            try {
                const operaciones = [];

                for (const clase of curso.clases) {
                    if (!clase.publicada) continue;
                    const uidsActual = accesosEspeciales[clase.id] || [];
                    if (!uidsActual.includes(uid)) {
                        const nuevos = [...uidsActual, uid];
                        operaciones.push(batch =>
                            batch.set(
                                db.collection('accesosEspeciales').doc(clase.id),
                                { uids: nuevos },
                                { merge: true }
                            )
                        );
                    }
                }

                function recorrerTemas(temas) {
                    temas.forEach(t => {
                        if (t.bloqueado && t.accesosTemaId) {
                            const uidsTema = accesosTema[t.accesosTemaId] || [];
                            if (!uidsTema.includes(uid)) {
                                const nuevos = [...uidsTema, uid];
                                operaciones.push(batch =>
                                    batch.set(
                                        db.collection('accesosTema').doc(t.accesosTemaId),
                                        { uids: nuevos },
                                        { merge: true }
                                    )
                                );
                            }
                        }
                        if (t.subtemas && t.subtemas.length) recorrerTemas(t.subtemas);
                    });
                }
                curso.clases.forEach(c => {
                    if (c.publicada) recorrerTemas(c.temas || []);
                });

                const solicitudesDelAlumno = await db.collection('solicitudesAcceso')
                    .where('uid', '==', uid)
                    .where('estado', '==', 'pendiente')
                    .get();
                solicitudesDelAlumno.forEach(doc => {
                    operaciones.push(batch =>
                        batch.update(doc.ref, { estado: 'aprobada' })
                    );
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

                await ejecutarEnLotes(operaciones);
                mostrarToast(`✅ Curso completo liberado para ${email}`, 'success');
                actualizarUI();
            } catch (error) {
                console.error(error);
                mostrarToast('❌ Error al liberar el curso: ' + error.message, 'error');
            }
        }
    );
}
window.aprobarTodoElCurso = aprobarTodoElCurso;

async function revocarTodoElCurso(uid, email) {
    if (!currentUser?.esAdmin) return;

    mostrarConfirmacion(
        '🚫 Revocar TODO el curso',
        `¿Quitar TODOS los accesos a "${email}"? Seguirá viendo la Clase 1 (pública), pero perderá el resto. Esta acción se puede revertir aprobando de nuevo.`,
        async () => {
            try {
                const operaciones = [];

                for (const clase of curso.clases) {
                    const uidsActual = accesosEspeciales[clase.id] || [];
                    if (uidsActual.includes(uid)) {
                        const nuevos = uidsActual.filter(id => id !== uid);
                        operaciones.push(batch =>
                            batch.set(
                                db.collection('accesosEspeciales').doc(clase.id),
                                { uids: nuevos },
                                { merge: true }
                            )
                        );
                    }
                }

                function recorrerTemas(temas) {
                    temas.forEach(t => {
                        if (t.accesosTemaId) {
                            const uidsTema = accesosTema[t.accesosTemaId] || [];
                            if (uidsTema.includes(uid)) {
                                const nuevos = uidsTema.filter(id => id !== uid);
                                operaciones.push(batch =>
                                    batch.set(
                                        db.collection('accesosTema').doc(t.accesosTemaId),
                                        { uids: nuevos },
                                        { merge: true }
                                    )
                                );
                            }
                        }
                        if (t.subtemas && t.subtemas.length) recorrerTemas(t.subtemas);
                    });
                }
                curso.clases.forEach(c => recorrerTemas(c.temas || []));

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

                await ejecutarEnLotes(operaciones);
                mostrarToast(`✅ Accesos revocados para ${email}`, 'success');
                actualizarUI();
            } catch (error) {
                console.error(error);
                mostrarToast('❌ Error al revocar: ' + error.message, 'error');
            }
        }
    );
}
window.revocarTodoElCurso = revocarTodoElCurso;

async function abrirGestionAlumnos() {
    if (!currentUser?.esAdmin) return;

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

    const usuarios = await obtenerListaUsuarios();
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
}
window.abrirGestionAlumnos = abrirGestionAlumnos;

function abrirSolicitudesAdmin() {
    if (!currentUser?.esAdmin) return;
    const listaDiv = document.getElementById('solicitudes-lista');
    if (solicitudesPendientes.length === 0) {
        listaDiv.innerHTML = '<div class="no-users-msg">📭 No hay solicitudes pendientes.</div>';
    } else {
        listaDiv.innerHTML = solicitudesPendientes.map(s => {
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
                            onclick="aprobarTodoElCurso('${s.uid}','${escapeOnclick(s.email)}')"
                            title="Libera TODAS las clases publicadas y temas bloqueados para este alumno">
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
    modalSolicitudesAdmin.classList.add('active');
}

// ------------------------------------------------
// NOTIFICACIONES
// ------------------------------------------------
function abrirNotificaciones() {
    const listaDiv = document.getElementById('notificaciones-lista');
    if (notificaciones.length === 0) {
        listaDiv.innerHTML = '<div class="no-users-msg">🔔 No tienes notificaciones.</div>';
        document.getElementById('btn-marcar-todo-leido').style.display = 'none';
    } else {
        document.getElementById('btn-marcar-todo-leido').style.display = 'inline-flex';
        listaDiv.innerHTML = notificaciones.map(n => {
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
    modalNotificaciones.classList.add('active');
}

async function marcarNotificacionLeida(notifId) {
    try {
        await db.collection('notificaciones').doc(notifId).update({ leida: true });
        mostrarToast('✅ Notificación marcada como leída', 'success');
    } catch (error) {
        console.error('❌ Error al marcar leída:', error);
        mostrarToast('❌ Error al marcar leída: ' + error.message, 'error');
    }
}

async function marcarTodasNotificacionesLeidas() {
    const noLeidas = notificaciones.filter(n => !n.leida);
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
}

async function eliminarNotificacion(notifId) {
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
}

// ------------------------------------------------
// DATOS DEL CLUB
// ------------------------------------------------
function mostrarDatosClub() {
    const contenedor = document.getElementById('datos-club-contenido');
    let html = '';
    if (datosClub.telefono) html += `<div class="club-data-item"><span class="club-data-icon">📞</span><span>${escapeHtml(datosClub.telefono)}</span></div>`;
    if (datosClub.direccion) html += `<div class="club-data-item"><span class="club-data-icon">📍</span><span>${escapeHtml(datosClub.direccion)}</span></div>`;
    if (datosClub.emailContacto) html += `<div class="club-data-item"><span class="club-data-icon">📧</span><a href="mailto:${escapeHtml(datosClub.emailContacto)}">${escapeHtml(datosClub.emailContacto)}</a></div>`;
    if (datosClub.horarios) html += `<div class="club-data-item"><span class="club-data-icon">🕐</span><span style="white-space:pre-wrap;">${escapeHtml(datosClub.horarios)}</span></div>`;
    if (datosClub.web) html += `<div class="club-data-item"><span class="club-data-icon">🌐</span><a href="${escapeHtml(datosClub.web)}" target="_blank">${escapeHtml(datosClub.web)}</a></div>`;
    if (!html) html = '<p style="color:var(--texto-suave);">No hay datos de contacto configurados.</p>';
    contenedor.innerHTML = html;
    modalDatosClub.classList.add('active');
}

function abrirConfigClub() {
    if (!currentUser?.esAdmin) return;
    document.getElementById('config-logo-url').value = datosClub.logoURL || '';
    document.getElementById('config-telefono').value = datosClub.telefono || '';
    document.getElementById('config-direccion').value = datosClub.direccion || '';
    document.getElementById('config-email-contacto').value = datosClub.emailContacto || '';
    document.getElementById('config-horarios').value = datosClub.horarios || '';
    document.getElementById('config-web').value = datosClub.web || '';

    document.getElementById('config-donacion-titular').value = datosClub.donacionTitular || '';
    document.getElementById('config-donacion-banco').value = datosClub.donacionBanco || '';
    document.getElementById('config-donacion-tarjeta').value = datosClub.donacionTarjeta || '';
    document.getElementById('config-donacion-cuenta').value = datosClub.donacionCuenta || '';
    document.getElementById('config-donacion-clabe').value = datosClub.donacionClabe || '';
    document.getElementById('config-donacion-nota').value = datosClub.donacionNota || '';

    modalConfigClub.classList.add('active');
}

async function guardarConfigClub() {
    if (!currentUser?.esAdmin) return;
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
        donacionNota: document.getElementById('config-donacion-nota').value.trim(),
    };
    try {
        await db.collection('config').doc('club').set(nuevosDatos, { merge: true });
        modalConfigClub.classList.remove('active');
        mostrarToast('Configuración del club guardada', 'success');
    } catch (error) {
        mostrarToast('Error al guardar configuración', 'error');
        console.error(error);
    }
}

// === FIN DE LA PARTE 3/4 ===
// ------------------------------------------------
// BLOQUES (EDITOR)
// ------------------------------------------------
function agregarBloque(claseId, temaId, tipo) {
    const clase = curso.clases.find(c => c.id === claseId);
    const tema = buscarTemaRecursivo(clase.temas, temaId);
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

    // ⭐ FASE 5: Configuración inicial del bloque Tablero
    if (tipo === 'tablero') {
        nuevo.config = {
            pgn: '',
            modo: 'ejercicio',
            colorHumano: 'w',
            nivelSF: 5,
            orientacion: 'auto'
        };
    }

    // ⭐ FASE 5: Estructura inicial del bloque Consejo
    if (tipo === 'consejo') {
        nuevo.imagenURL = '';
        nuevo.texto = '';
    }

    tema.bloques.push(nuevo);
    guardarCurso().then(() => actualizarUI());
}

function eliminarBloque(claseId, temaId, bloqueId) {
    const clase = curso.clases.find(c => c.id === claseId);
    const tema = buscarTemaRecursivo(clase.temas, temaId);
    if (!tema || !tema.bloques) return;
    const bloque = tema.bloques.find(b => b.id === bloqueId);
    if (!bloque) return;

    let preview = '';
    if (bloque.tipo === 'enlace') {
        preview = bloque.label || 'sin etiqueta';
    } else if (bloque.tipo === 'tablero') {
        preview = 'Ejercicio de tablero';
    } else if (bloque.tipo === 'consejo') {
        preview = bloque.texto ? bloque.texto.substring(0, 40) : 'Consejo';
    } else {
        preview = bloque.contenido || 'vacío';
    }
    const previewCorto = String(preview).length > 40 ? String(preview).substring(0, 40) + '...' : String(preview);

    mostrarConfirmacion(
        '🗑️ Eliminar bloque',
        `¿Seguro que quieres eliminar este bloque de tipo "${bloque.tipo}"? Contenido: "${previewCorto}". Esta acción no se puede deshacer.`,
        () => {
            tema.bloques = tema.bloques.filter(b => b.id !== bloqueId);
            guardarCurso().then(() => actualizarUI());
            mostrarToast('🗑️ Bloque eliminado', 'success');
        }
    );
}

function moverBloqueArriba(claseId, temaId, bloqueId) {
    const clase = curso.clases.find(c => c.id === claseId);
    const tema = buscarTemaRecursivo(clase.temas, temaId);
    if (!tema || !tema.bloques) return;
    const i = tema.bloques.findIndex(b => b.id === bloqueId);
    if (i <= 0) return;
    [tema.bloques[i-1], tema.bloques[i]] = [tema.bloques[i], tema.bloques[i-1]];
    guardarCurso().then(() => actualizarUI());
}

function moverBloqueAbajo(claseId, temaId, bloqueId) {
    const clase = curso.clases.find(c => c.id === claseId);
    const tema = buscarTemaRecursivo(clase.temas, temaId);
    if (!tema || !tema.bloques) return;
    const i = tema.bloques.findIndex(b => b.id === bloqueId);
    if (i === -1 || i >= tema.bloques.length - 1) return;
    [tema.bloques[i], tema.bloques[i+1]] = [tema.bloques[i+1], tema.bloques[i]];
    guardarCurso().then(() => actualizarUI());
}

function actualizarBloqueContenido(claseId, temaId, bloqueId, contenido) {
    const clase = curso.clases.find(c => c.id === claseId);
    const tema = buscarTemaRecursivo(clase.temas, temaId);
    const bloque = tema?.bloques?.find(b => b.id === bloqueId);
    if (!bloque) return;
    bloque.contenido = contenido;
    guardarCurso();
}

function actualizarBloqueEnlace(claseId, temaId, bloqueId, label, url) {
    const clase = curso.clases.find(c => c.id === claseId);
    const tema = buscarTemaRecursivo(clase.temas, temaId);
    const bloque = tema?.bloques?.find(b => b.id === bloqueId);
    if (!bloque) return;
    bloque.label = label; bloque.url = url;
    guardarCurso();
}

function actualizarBloqueEstilo(claseId, temaId, bloqueId, prop, valor) {
    const clase = curso.clases.find(c => c.id === claseId);
    const tema = buscarTemaRecursivo(clase.temas, temaId);
    const bloque = tema?.bloques?.find(b => b.id === bloqueId);
    if (!bloque) return;
    if (!bloque.estilo) bloque.estilo = {};
    bloque.estilo[prop] = valor;
    guardarCurso();
}

function actualizarBloqueNota(claseId, temaId, bloqueId, nota) {
    const clase = curso.clases.find(c => c.id === claseId);
    const tema = buscarTemaRecursivo(clase.temas, temaId);
    const bloque = tema?.bloques?.find(b => b.id === bloqueId);
    if (!bloque) return;
    bloque.nota = nota;
    guardarCurso();
}

function cambiarTipoBloque(claseId, temaId, bloqueId, nuevoTipo) {
    const clase = curso.clases.find(c => c.id === claseId);
    const tema = buscarTemaRecursivo(clase.temas, temaId);
    const bloque = tema?.bloques?.find(b => b.id === bloqueId);
    if (!bloque) return;
    bloque.tipo = nuevoTipo;
    if (nuevoTipo === 'enlace') {
        bloque.label = bloque.label || '';
        bloque.url = bloque.url || '';
        delete bloque.contenido;
    } else if (nuevoTipo === 'tablero') {
        bloque.config = bloque.config || {
            pgn: '', modo: 'ejercicio', colorHumano: 'w', nivelSF: 5, orientacion: 'auto'
        };
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
    guardarCurso().then(() => actualizarUI());
}

// ------------------------------------------------
// RENDERIZADO PRINCIPAL
// ------------------------------------------------
function renderizarSidebar() {
    const lista = document.getElementById('lista-clases');
    if (!currentUser) { lista.innerHTML = ''; return; }
    const esAdmin = currentUser.esAdmin;

    const clasesVisibles = esAdmin
        ? curso.clases
        : curso.clases.filter(c => c.publicada === true);

    lista.innerHTML = clasesVisibles.map(c => {
        const desbloqueada = esClaseDesbloqueada(c);
        return `
        <div class="clase-item ${c.id === claseActivaId ? 'active' : ''} ${desbloqueada ? '' : 'bloqueada'}"
             data-id="${c.id}">
            <span class="titulo-editable" data-accion="renombrarClase" data-id="${c.id}">
                <span class="clase-num">${c.numero}.</span> ${c.titulo}
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
            mostrarConfirmacion('Eliminar clase', '¿Seguro que deseas eliminar esta clase y todos sus temas?', () => eliminarClase(id));
        });
    });

    document.querySelectorAll('.clase-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.closest('button')) return;
            const id = item.dataset.id;
            const clase = curso.clases.find(c => c.id === id);
            if (clase && esClaseDesbloqueada(clase)) {
                seleccionarClase(id);
            } else if (clase && !esClaseDesbloqueada(clase)) {
                seleccionarClase(id);
            }
        });
    });

    if (terminoBusqueda) {
        setTimeout(() => filtrarClases(), 0);
    }
}

function filtrarClases() {
    const lista = document.getElementById('lista-clases');
    if (!lista) return;
    const items = lista.querySelectorAll('.clase-item');
    const term = terminoBusqueda.toLowerCase().trim();
    items.forEach(item => {
        const titulo = item.querySelector('.titulo-editable')?.textContent.toLowerCase() || '';
        item.style.display = (!term || titulo.includes(term)) ? '' : 'none';
    });
}

function seleccionarClase(id) {
    claseActivaId = id;
    temaAbiertoGlobal = null;
    actualizarUI();
    guardarEstadoNavegacion();
    if (window.innerWidth <= 768) { sidebar.classList.remove('open'); sidebarOverlay.classList.remove('active'); }
}

function esClaseDesbloqueada(clase) {
    if (!currentUser) return false;
    if (currentUser.esAdmin) return true;
    if (clase.numero === 1) return true;
    if (tieneAccesoEspecial(clase.id, currentUser.uid)) return true;
    return false;
}

function tieneAccesoEspecial(claseId, uid) {
    if (!uid) return false;
    const uids = accesosEspeciales[claseId] || [];
    return uids.includes(uid);
}

async function gestionarAccesosClase(claseId) {
    if (!currentUser?.esAdmin) return;
    const clase = curso.clases.find(c => c.id === claseId);
    if (!clase) return;
    claseActualGestion = claseId;
    document.getElementById('accesos-title').innerHTML = `🔐 Accesos especiales: ${escapeHtml(clase.titulo)}`;
    const listaDiv = document.getElementById('accesos-lista');
    listaDiv.innerHTML = '<div class="loader" style="margin:20px auto;"></div>';
    const usuarios = await obtenerListaUsuarios();
    const uidsAutorizados = accesosEspeciales[claseId] || [];
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
                let uidsActual = [...(accesosEspeciales[claseId] || [])];
                if (cb.checked) { if (!uidsActual.includes(uid)) uidsActual.push(uid); } else { uidsActual = uidsActual.filter(id => id !== uid); }
                await db.collection('accesosEspeciales').doc(claseId).set({ uids: uidsActual }, { merge: true });
                accesosEspeciales[claseId] = uidsActual;
                actualizarUI();
            });
        });
    }
    modalAccesos.classList.add('active');
}

function cerrarModalAccesos() {
    modalAccesos.classList.remove('active');
    claseActualGestion = null;
}

// ------------------------------------------------
// RENDERIZADO RECURSIVO DE TEMAS
// ------------------------------------------------
function renderizarTemaRecursivo(tema, claseId, nivel = 0) {
    const accesible = temaAccesible(tema, currentUser);
    const completado = estaCompletado(claseId, tema.id);
    const esAdmin = currentUser?.esAdmin;

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
                            const contenidoSanitizado = sanitizeHtml(bloque.contenido);
                            html = `<div class="bloque-texto">${contenidoSanitizado}</div>`;
                        } else {
                            const textoSanitizado = escapeHtml(bloque.contenido);
                            const textoConSaltos = textoSanitizado.replace(/\n/g, '<br>');
                            const est = bloque.estilo || {};
                            html = `<div class="bloque-texto" style="font-size:${escapeHtml(est.fontSize)||'inherit'}; color:${escapeHtml(est.color)||'inherit'}; text-align:${escapeHtml(est.textAlign)||'left'};">${textoConSaltos}</div>`;
                        }
                        break;
                    }
                    case 'imagen': {
                        if (!bloque.contenido) return '';
                        if (!esUrlSegura(bloque.contenido)) {
                            html = `<p style="color:var(--peligro); font-style:italic;">⚠️ Imagen no segura (URL no permitida)</p>`;
                        } else {
                            const src = encodeURI(bloque.contenido);
                            html = `<img src="${escapeAttr(src)}" style="max-width:100%; border-radius:8px;" alt="Imagen">`;
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
                            htmlConsejo += `<img src="${escapeAttr(bloque.imagenURL.trim())}" alt="Consejo" onerror="this.style.display='none'">`;
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
                contenidoHTML += renderizarTemaRecursivo(st, claseId, nivel + 1);
            });
            contenidoHTML += `</div>`;
        }
    } else {
        const yaSolicitada = misSolicitudes.some(s => s.temaId === tema.id && s.estado === 'pendiente');
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
                const escape = escapeHtml;
                const info = TIPOS_BLOQUE[bloque.tipo] || TIPOS_BLOQUE.texto;

                let previewRaw = '';
                if (bloque.tipo === 'enlace') {
                    previewRaw = bloque.label || '(sin etiqueta)';
                } else if (bloque.tipo === 'tablero') {
                    const cfg = bloque.config || {};
                    const caps = cfg.pgn ? (cfg.pgn.match(/\[Event\s/g) || []).length : 0;
                    previewRaw = caps > 0 ? `${caps} capítulo${caps === 1 ? '' : 's'} PGN` : '(sin PGN)';
                } else if (bloque.tipo === 'consejo') {
                    previewRaw = bloque.texto ? String(bloque.texto).substring(0, 50) : (bloque.imagenURL ? 'Imagen cargada' : '(vacío)');
                } else {
                    previewRaw = bloque.contenido ? String(bloque.contenido).replace(/<[^>]+>/g, '').substring(0, 50) : '(vacío)';
                }
                const preview = escape(String(previewRaw).substring(0, 50));

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
                            ${buildTextEditorToolbar(bloque.id)}
                            <div class="bloque-texto-editor"
                                 contenteditable="true"
                                 spellcheck="true"
                                 data-placeholder="Escribe el texto aquí…"
                                 data-clase="${claseId}"
                                 data-tema="${tema.id}"
                                 data-bloque="${bloque.id}"
                                 oninput="textEditorSave()">${bloque.contenido || ''}</div>
                        ` : bloque.tipo === 'enlace' ? `
                            <input placeholder="Etiqueta" value="${escape(bloque.label||'')}" onchange="actualizarBloqueEnlace('${claseId}','${tema.id}','${bloque.id}', this.value, this.nextElementSibling.value)">
                            <input placeholder="URL" value="${escape(bloque.url||'')}" onchange="actualizarBloqueEnlace('${claseId}','${tema.id}','${bloque.id}', this.previousElementSibling.value, this.value)">
                        ` : bloque.tipo === 'tablero' ? `
                            <div class="bloque-tablero-config" style="background:#fff7ed; border:1px dashed #fdba74; border-radius:8px; padding:10px; margin-top:6px;">
                                <p style="font-size:0.78rem; color:#c2410c; font-weight:700; text-transform:uppercase; margin-bottom:8px;">🎯 Configuración del Tablero</p>
                                <label style="display:block; font-size:0.75rem; color:#92400e; font-weight:700; text-transform:uppercase; margin-bottom:3px;">📋 PGN del estudio</label>
                                <textarea placeholder="Pega aquí el PGN de tu estudio…" onchange="actualizarBloqueTablero('${claseId}','${tema.id}','${bloque.id}', 'pgn', this.value)" style="width:100%; min-height:90px; font-family:'Courier New',monospace; font-size:0.78rem; padding:8px; border:1px solid #fdba74; border-radius:6px; resize:vertical; background:white;">${escape((bloque.config||{}).pgn || '')}</textarea>
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
                                <input type="url" placeholder="https://…/imagen.png" value="${escape(bloque.imagenURL||'')}" onchange="actualizarBloqueConsejo('${claseId}','${tema.id}','${bloque.id}', 'imagenURL', this.value)" style="width:100%; padding:8px; border:1px solid #f59e0b; border-radius:6px; font-size:0.82rem; background:white; margin-bottom:8px;">
                                <label style="display:block; font-size:0.75rem; color:#92400e; font-weight:700; text-transform:uppercase; margin-bottom:3px;">📝 Texto del consejo (opcional)</label>
                                <input type="text" placeholder="Ej: Controla el centro del tablero…" value="${escape(bloque.texto||'')}" onchange="actualizarBloqueConsejo('${claseId}','${tema.id}','${bloque.id}', 'texto', this.value)" style="width:100%; padding:8px; border:1px solid #f59e0b; border-radius:6px; font-size:0.82rem; background:white;">
                                <p style="font-size:0.72rem; color:#92400e; margin-top:6px; font-style:italic;">ℹ️ Si no hay imagen ni texto, el alumno no verá nada aquí.</p>
                            </div>
                        ` : `
                            <input placeholder="Contenido" value="${escape(bloque.contenido||'')}" onchange="actualizarBloqueContenido('${claseId}','${tema.id}','${bloque.id}', this.value)">
                        `}
                        <input placeholder="Nota al pie (opcional)" value="${escape(bloque.nota||'')}" onchange="actualizarBloqueNota('${claseId}','${tema.id}','${bloque.id}', this.value)" style="margin-top:10px;">
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

    const nivelBadgeHTML = nivel > 0
        ? `<span class="nivel-badge">Nivel ${nivel}</span>`
        : '';

    const html = `
    <div class="tema ${completado ? 'abierto' : ''} ${!accesible ? 'bloqueado' : ''}"
         data-tema-id="${tema.id}"
         data-nivel="${Math.min(nivel, 4)}">
        <div class="tema-header" data-accion="toggle-tema" data-tema-id="${tema.id}">
            <span class="titulo-editable" data-accion="renombrarTema" data-clase="${claseId}" data-tema="${tema.id}">${tema.numero}. ${tema.titulo}</span>
            ${nivelBadgeHTML}
            ${!accesible ? '<span>🔒</span>' : ''}
            ${completado ? '<span class="badge">✓</span>' : ''}
            <span style="flex:1;"></span>
            ${accesible ? `<button class="btn btn-exito btn-small" onclick="event.stopPropagation(); marcarVisto('${claseId}','${tema.id}')">${completado ? '✓ Completado' : '👁️ Visto'}</button>` : ''}
            ${esAdmin ? `
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
}

// ------------------------------------------------
// ACTUALIZAR UI COMPLETA
// ------------------------------------------------
function actualizarUI() {
    const contentDiv = document.getElementById('main-content');

    if (!currentUser) {
        contentDiv.innerHTML = `
            <div style="text-align:center; margin-top:40px; color:var(--texto-suave);">
                <p style="font-size:1.2rem;">♞ Bienvenido al curso de ajedrez del Club Morphy</p>
                <p style="margin-top:12px; font-size:0.95rem;">Inicia sesión o regístrate para acceder a las clases, videos y ejercicios interactivos.</p>
            </div>`;
        renderizarSidebar();
        document.getElementById('search-input').style.display = 'none';
        document.getElementById('btn-progreso').style.display = 'none';
        return;
    }
    renderizarSidebar();

    const searchInput = document.getElementById('search-input');
    searchInput.style.display = 'block';
    if (terminoBusqueda) searchInput.value = terminoBusqueda;
    document.getElementById('btn-progreso').style.display = 'inline-flex';

    if (claseActivaId) {
        const clase = curso.clases.find(c => c.id === claseActivaId);
        if (clase && esClaseDesbloqueada(clase)) {
            renderizarContenido(clase);
        } else if (clase && !esClaseDesbloqueada(clase)) {
            const yaSolicitada = misSolicitudes.some(s => s.claseId === clase.id && s.estado === 'pendiente');
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
            contentDiv.innerHTML = `
                <div style="text-align:center; margin-top:40px; color:var(--texto-suave);">
                    <p>Selecciona una clase del menú lateral.</p>
                </div>`;
        }
    } else if (curso.clases.length > 0) {
        const primeraDesbloqueada = curso.clases.find(c => esClaseDesbloqueada(c));
        if (primeraDesbloqueada) {
            claseActivaId = primeraDesbloqueada.id;
            renderizarContenido(primeraDesbloqueada);
        } else {
            contentDiv.innerHTML = `
                <div style="text-align:center; margin-top:40px; color:var(--texto-suave);">
                    <p>No hay clases disponibles o todas están bloqueadas.</p>
                </div>`;
        }
    } else {
        contentDiv.innerHTML = `
            <div style="text-align:center; margin-top:40px; color:var(--texto-suave);">
                <p>📚 El curso aún no tiene contenido. Si eres administrador, agrega clases desde el menú.</p>
            </div>`;
    }
    habilitarEdicionPorLongPress();

    const idNuevoTema = window.__nuevoTemaId;
    if (idNuevoTema) {
        window.__nuevoTemaId = null;
    }
    const idParaAbrir = idNuevoTema || temaAbiertoGlobal;

    if (idParaAbrir) {
        setTimeout(() => {
            const tema = contentDiv.querySelector(`.tema[data-tema-id="${idParaAbrir}"]`);
            if (tema) {
                if (!tema.classList.contains('abierto')) {
                    tema.classList.add('abierto');
                }
                tema.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 50);
    }

    // ⭐ FASE 5: Inicializar tableros después de renderizar
    setTimeout(() => inicializarTablerosEntrenador(), 100);

    guardarEstadoNavegacion();
}

function renderizarContenido(clase) {
    const temasHTML = clase.temas.map(t => renderizarTemaRecursivo(t, clase.id, 0)).join('');

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
            temaAbiertoGlobal = temaDiv.classList.contains('abierto') ? temaId : null;
            guardarEstadoNavegacion();

            // ⭐ FASE 5: Inicializar tableros al abrir tema
            if (temaDiv.classList.contains('abierto')) {
                setTimeout(() => inicializarTablerosEntrenador(), 100);
            }
        });
    });

    // ⭐ FASE 5: Inicializar tableros de temas ya abiertos
    setTimeout(() => inicializarTablerosEntrenador(), 100);
}

async function agregarTema(claseId) {
    if (!currentUser?.esAdmin) return;
    const clase = curso.clases.find(c => c.id === claseId);
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
    actualizarUI();
    try {
        await guardarCurso();
        mostrarToast('Tema agregado', 'success');
    } catch (err) {
        clase.temas.pop();
        actualizarUI();
        mostrarToast('Error al agregar tema', 'error');
    }
}

// ------------------------------------------------
// EDICIÓN POR LONG PRESS
// ------------------------------------------------
function habilitarEdicionPorLongPress() {
    document.querySelectorAll('.titulo-editable').forEach(span => {
        if (span.dataset.longPressEnabled === 'true') return;
        span.dataset.longPressEnabled = 'true';
        let timer;
        let longPressed = false;
        const start = (e) => { longPressed = false; timer = setTimeout(() => { longPressed = true; activarEdicion(span); }, 600); };
        const cancel = () => { clearTimeout(timer); };
        const cancelOnMove = (e) => { if (e.cancelable) { clearTimeout(timer); } };
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
}

function activarEdicion(span) {
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
            if (tipo === 'renombrarClase') { await renombrarClase(input.dataset.id, nuevo); } else if (tipo === 'renombrarTema') { await renombrarTema(input.dataset.clase, input.dataset.tema, nuevo); }
        }
        const nuevoSpan = document.createElement('span');
        nuevoSpan.className = span.className;
        for (let attr of span.attributes) { if (attr.name.startsWith('data-')) nuevoSpan.setAttribute(attr.name, attr.value); }
        nuevoSpan.textContent = nuevo || textoActual;
        input.replaceWith(nuevoSpan);
        habilitarEdicionPorLongPress();
    };
    input.addEventListener('blur', guardar);
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); input.blur(); } });
}

// ------------------------------------------------
// ⭐ FASE 5: FUNCIONES AUXILIARES DEL ENTRENADOR
// ------------------------------------------------

function inicializarTablerosEntrenador() {
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
                esAdmin: !!(currentUser && currentUser.esAdmin),
                uid: currentUser ? currentUser.uid : null,
                nombreTema: bloqueEl.closest('.tema')?.querySelector('.titulo-editable')?.textContent || '',
                onCompletado: () => {
                    console.log('[Fase 5] Tablero completado');
                },
                // ⭐ NUEVO: callback para guardar variantes desde el editor visual
                onGuardarVariante: (data) => {
                    guardarVarianteEnFirestore(claseId, temaId, bloqueId, data);
                }
            };
            window.Entrenador.render(bloqueEl, config, contexto);
            bloqueEl.dataset.inicializado = 'true';
        } catch (err) {
            console.error('[Fase 5] Error al inicializar tablero:', err);
        }
    });
}

function actualizarBloqueTablero(claseId, temaId, bloqueId, campo, valor) {
    const clase = curso.clases.find(c => c.id === claseId);
    if (!clase) return;
    const tema = buscarTemaRecursivo(clase.temas, temaId);
    const bloque = tema?.bloques?.find(b => b.id === bloqueId);
    if (!bloque || bloque.tipo !== 'tablero') return;
    if (!bloque.config) bloque.config = { pgn: '', modo: 'ejercicio', colorHumano: 'w', nivelSF: 5, orientacion: 'auto' };
    bloque.config[campo] = valor;
    guardarCurso().then(() => actualizarUI());
}

function actualizarBloqueConsejo(claseId, temaId, bloqueId, campo, valor) {
    const clase = curso.clases.find(c => c.id === claseId);
    if (!clase) return;
    const tema = buscarTemaRecursivo(clase.temas, temaId);
    const bloque = tema?.bloques?.find(b => b.id === bloqueId);
    if (!bloque || bloque.tipo !== 'consejo') return;
    if (campo === 'imagenURL') bloque.imagenURL = valor;
    if (campo === 'texto') bloque.texto = valor;
    guardarCurso().then(() => actualizarUI());
}

function cargarPGNArchivoEnBloque(claseId, temaId, bloqueId, event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        const pgn = ev.target.result;
        actualizarBloqueTablero(claseId, temaId, bloqueId, 'pgn', pgn);
        mostrarToast('📂 PGN cargado desde archivo', 'success');
    };
    reader.readAsText(file);
}

// ⭐ NUEVA: guarda la variante que el maestro agregó en el editor visual
function guardarVarianteEnFirestore(claseId, temaId, bloqueId, data) {
    if (!currentUser?.esAdmin) return;
    const clase = curso.clases.find(c => c.id === claseId);
    if (!clase) return;
    const tema = buscarTemaRecursivo(clase.temas, temaId);
    const bloque = tema?.bloques?.find(b => b.id === bloqueId);
    if (!bloque || bloque.tipo !== 'tablero') return;

    const { capituloIdx, pgnCapitulo, nuevoNumLineas } = data;
    if (!pgnCapitulo) return;

    // Separar el PGN completo en capítulos y reemplazar solo el capítulo modificado
    const pgnOriginal = (bloque.config || {}).pgn || '';
    const bloques = pgnOriginal.split(/(?=\[Event\s)/i).filter(b => b.trim());

    if (capituloIdx < 0 || capituloIdx >= bloques.length) {
        console.warn('[Fase 5] Índice de capítulo fuera de rango');
        return;
    }

    bloques[capituloIdx] = pgnCapitulo.trim();
    const pgnActualizado = bloques.join('\n\n');

    // Actualizar la config del bloque
    if (!bloque.config) bloque.config = {};
    bloque.config.pgn = pgnActualizado;

    // Guardar en Firestore
    guardarCurso().then(() => {
        mostrarToast('💾 Variante guardada en el bloque', 'success');
        console.log(`[Fase 5] Variante guardada. Capítulo ${capituloIdx + 1} ahora tiene ${nuevoNumLineas} solución(es).`);
    }).catch(err => {
        console.error('[Fase 5] Error al guardar variante:', err);
        mostrarToast('Error al guardar la variante', 'error');
    });
}

// ------------------------------------------------
// EVENTOS DE AUTENTICACIÓN Y CARGA INICIAL
// ------------------------------------------------
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = { uid: user.uid, email: user.email, esAdmin: user.uid === ADMIN_UID };
        await registrarUsuarioEnColeccion(user);

        userProfile = await cargarPerfilUsuario(user.uid);

        btnLogin.style.display = 'none';
        btnLogout.style.display = 'inline-flex';

        actualizarHeaderUsuario();

        if (currentUser.esAdmin) {
            btnAdmin.style.display = 'inline-flex';
            modoAdmin = true;
            document.body.classList.add('modo-admin');
        } else {
            btnAdmin.style.display = 'none';
            modoAdmin = false;
            document.body.classList.remove('modo-admin');
        }

        suscribirAccesosEspeciales();
        suscribirAccesosTema();
        suscribirNotificaciones();
        suscribirSolicitudesAdmin();
        suscribirMisSolicitudes();
        iniciarEscuchaCurso();
        await sincronizarProgresoDesdeFirestore();

        const estadoPrevio = cargarEstadoNavegacion();
        if (estadoPrevio && estadoPrevio.claseActivaId && curso.clases.some(c => c.id === estadoPrevio.claseActivaId)) {
            claseActivaId = estadoPrevio.claseActivaId;
            temaAbiertoGlobal = estadoPrevio.temaAbiertoId || null;
        } else if (!claseActivaId && curso.clases.length > 0) {
            claseActivaId = curso.clases[0].id;
            temaAbiertoGlobal = null;
        }
        actualizarUI();

        if (estadoPrevio && estadoPrevio.scrollTop) {
            setTimeout(() => {
                const content = document.getElementById('main-content');
                if (content) {
                    content.scrollTop = estadoPrevio.scrollTop;
                }
            }, 100);
        }
        actualizarBotonDatosClub();

        if (!currentUser.esAdmin && (!userProfile || !userProfile.nombre || !userProfile.apellidos)) {
            setTimeout(() => mostrarCompletarPerfil(), 1500);
        }
    } else {
        currentUser = null;
        userProfile = null;
        modalCompletarPerfilYaMostrado = false;

        document.getElementById('modal-completar-perfil')?.remove();

        btnLogin.style.display = 'inline-flex';
        btnLogout.style.display = 'none';
        btnAdmin.style.display = 'none';
        userInfo.textContent = '';
        document.body.classList.remove('modo-admin');
        modoAdmin = false;
        if (unsubscribeAccesos) { unsubscribeAccesos(); unsubscribeAccesos = null; }
        if (unsubscribeAccesosTema) { unsubscribeAccesosTema(); unsubscribeAccesosTema = null; }
        if (unsubscribeNotificaciones) { unsubscribeNotificaciones(); unsubscribeNotificaciones = null; }
        if (unsubscribeSolicitudesAdmin) { unsubscribeSolicitudesAdmin(); unsubscribeSolicitudesAdmin = null; }
        if (unsubscribeMisSolicitudes) { unsubscribeMisSolicitudes(); unsubscribeMisSolicitudes = null; }
        if (unsubscribeCurso) { unsubscribeCurso(); unsubscribeCurso = null; }
        notificaciones = [];
        solicitudesPendientes = [];
        misSolicitudes = [];
        document.getElementById('notif-badge').style.display = 'none';
        document.getElementById('solicitudes-badge').style.display = 'none';
        document.getElementById('btn-notificaciones').style.display = 'none';
        document.getElementById('btn-solicitudes-admin').style.display = 'none';
        document.getElementById('btn-datos-club').style.display = 'none';
        document.getElementById('search-input').style.display = 'none';
        document.getElementById('search-input').value = '';
        terminoBusqueda = '';
        document.getElementById('btn-progreso').style.display = 'none';
        actualizarUI();
    }
});

// ------------------------------------------------
// EVENTOS DEL DOM
// ------------------------------------------------
document.addEventListener('focusin', (event) => {
    const target = event.target;
    if (!target.closest) return;

    if (target.classList?.contains('bloque-texto-editor')) {
        const bloqueId = target.dataset.bloque;
        const temaId = target.dataset.tema;
        const claseId = target.dataset.clase;
        if (bloqueId && temaId && claseId) {
            setActiveTextEditor(target, claseId, temaId, bloqueId);
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

document.addEventListener('selectionchange', textEditorUpdateState);

document.getElementById('toggle-password').addEventListener('click', function() {
    const passInput = document.getElementById('password');
    const type = passInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passInput.setAttribute('type', type);
    this.textContent = type === 'password' ? '👁️' : '🙈';
    this.setAttribute('aria-label', type === 'password' ? 'Mostrar contraseña' : 'Ocultar contraseña');
});

document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const pass = document.getElementById('password').value.trim();

    if (!email || !pass) return mostrarToast('Falta tu correo o contraseña', 'error');

    let nombre = '';
    let apellidos = '';
    if (modoRegistro) {
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
        if (modoRegistro) {
            const credencial = await auth.createUserWithEmailAndPassword(email, pass);
            await registrarUsuarioEnColeccion(credencial.user, nombre, apellidos);

            userProfile = await cargarPerfilUsuario(credencial.user.uid);
            actualizarHeaderUsuario();

            mostrarToast(`¡Cuenta creada, ${nombre}! Ya tienes acceso.`, 'success');
            modoRegistro = false;
            document.getElementById('modal-title').textContent = 'Iniciar sesión';
            document.getElementById('btn-auth').textContent = 'Ingresar';

            const registerFields = document.getElementById('register-fields');
            if (registerFields) registerFields.style.display = 'none';

            limpiarCampos();
        } else {
            const credencial = await auth.signInWithEmailAndPassword(email, pass);
            await registrarUsuarioEnColeccion(credencial.user);
            mostrarToast('¡Bienvenido!', 'success');
            modalLogin.classList.remove('active');
        }
    } catch (error) {
        mostrarToast(traducirErrorFirebase(error.code), 'error');
    } finally {
        btnAuth.disabled = false;
        btnAuth.textContent = modoRegistro ? 'Crear cuenta' : 'Ingresar';
    }
});

document.getElementById('switch-auth').addEventListener('click', (e) => {
    e.preventDefault();
    modoRegistro = !modoRegistro;
    document.getElementById('modal-title').textContent = modoRegistro ? 'Registrarse' : 'Iniciar sesión';
    document.getElementById('btn-auth').textContent = modoRegistro ? 'Crear cuenta' : 'Ingresar';

    const passInput = document.getElementById('password');
    passInput.setAttribute('autocomplete', modoRegistro ? 'new-password' : 'current-password');

    const registerFields = document.getElementById('register-fields');
    if (registerFields) {
        registerFields.style.display = modoRegistro ? 'block' : 'none';
    }

    limpiarCampos();
});

document.getElementById('btn-forgot-password').addEventListener('click', async () => {
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

function configurarDeteccionAutofill() {
    const emailInput = document.getElementById('email');
    const passInput = document.getElementById('password');
    const warningEl = document.getElementById('autofill-warning');
    const handler = (e) => { if (e.animationName === 'onAutoFillStart') warningEl.style.display = 'block'; };
    emailInput.addEventListener('animationstart', handler);
    passInput.addEventListener('animationstart', handler);
    const styleEl = document.createElement('style');
    styleEl.textContent = `@keyframes onAutoFillStart { from { /* dummy */ } to { /* dummy */ } } input:-webkit-autofill { animation-name: onAutoFillStart; }`;
    document.head.appendChild(styleEl);
}

// ------------------------------------------------
// EVENTOS DE NAVEGACIÓN Y PERSISTENCIA
// ------------------------------------------------
hamburgerBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    sidebarOverlay.classList.toggle('active');
    const abierto = sidebar.classList.contains('open');
    hamburgerBtn.setAttribute('aria-expanded', abierto ? 'true' : 'false');
    hamburgerBtn.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
});

sidebarOverlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('active');
    hamburgerBtn.setAttribute('aria-expanded', 'false');
    hamburgerBtn.setAttribute('aria-label', 'Abrir menú');
});

document.getElementById('main-content').addEventListener('click', () => {
    if (window.innerWidth <= 768) {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('active');
        hamburgerBtn.setAttribute('aria-expanded', 'false');
        hamburgerBtn.setAttribute('aria-label', 'Abrir menú');
    }
});

document.getElementById('main-content').addEventListener('scroll', onContentScroll, { passive: true });

window.addEventListener('pagehide', () => { guardarEstadoNavegacion(); });
window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        const estadoPrevio = cargarEstadoNavegacion();
        if (estadoPrevio && estadoPrevio.claseActivaId && curso.clases.some(c => c.id === estadoPrevio.claseActivaId)) {
            claseActivaId = estadoPrevio.claseActivaId;
            temaAbiertoGlobal = estadoPrevio.temaAbiertoId || null;
            actualizarUI();
            if (estadoPrevio.scrollTop) {
                setTimeout(() => {
                    const content = document.getElementById('main-content');
                    if (content) content.scrollTop = estadoPrevio.scrollTop;
                }, 100);
            }
        }
    }
});

document.getElementById('search-input').addEventListener('input', (e) => {
    terminoBusqueda = e.target.value;
    filtrarClases();
});

document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const modalesAbiertos = document.querySelectorAll('.modal-overlay.active');
    if (modalesAbiertos.length === 0) return;
    const ultimoModal = modalesAbiertos[modalesAbiertos.length - 1];
    if (ultimoModal.id === 'modal-confirm' && confirmCallback) return;
    ultimoModal.classList.remove('active');
});

// ------------------------------------------------
// INICIALIZACIÓN
// ------------------------------------------------
configurarDeteccionAutofill();
suscribirDatosClub();
console.log('✅ Club Morphy – Fase 5 completada (bloques Tablero + Consejo + editor variantes)');

// Exponer funciones globales
window.mostrarLogin = mostrarLogin;
window.cambiarCuenta = cambiarCuenta;
window.confirmarCerrarSesion = confirmarCerrarSesion;
window.cerrarSesionConfirmada = cerrarSesionConfirmada;
window.agregarClase = agregarClase;
window.agregarTema = agregarTema;
window.eliminarTema = eliminarTema;
window.renombrarClase = renombrarClase;
window.renombrarTema = renombrarTema;
window.marcarVisto = marcarVisto;
window.eliminarClase = eliminarClase;
window.moverClaseArriba = moverClaseArriba;
window.moverClaseAbajo = moverClaseAbajo;
window.moverTemaArriba = moverTemaArriba;
window.moverTemaAbajo = moverTemaAbajo;
window.gestionarAccesosClase = gestionarAccesosClase;
window.cerrarModalAccesos = cerrarModalAccesos;
window.solicitarAcceso = solicitarAcceso;
window.solicitarAccesoTema = solicitarAccesoTema;
window.aprobarSolicitud = aprobarSolicitud;
window.rechazarSolicitud = rechazarSolicitud;
window.abrirSolicitudesAdmin = abrirSolicitudesAdmin;
window.abrirNotificaciones = abrirNotificaciones;
window.marcarNotificacionLeida = marcarNotificacionLeida;
window.marcarTodasNotificacionesLeidas = marcarTodasNotificacionesLeidas;
window.eliminarNotificacion = eliminarNotificacion;
window.mostrarDatosClub = mostrarDatosClub;
window.abrirConfigClub = abrirConfigClub;
window.guardarConfigClub = guardarConfigClub;
window.suscribirDatosClub = suscribirDatosClub;
window.suscribirNotificaciones = suscribirNotificaciones;
window.suscribirSolicitudesAdmin = suscribirSolicitudesAdmin;
window.agregarBloque = agregarBloque;
window.eliminarBloque = eliminarBloque;
window.moverBloqueArriba = moverBloqueArriba;
window.moverBloqueAbajo = moverBloqueAbajo;
window.actualizarBloqueContenido = actualizarBloqueContenido;
window.actualizarBloqueEnlace = actualizarBloqueEnlace;
window.actualizarBloqueEstilo = actualizarBloqueEstilo;
window.actualizarBloqueNota = actualizarBloqueNota;
window.cambiarTipoBloque = cambiarTipoBloque;
window.togglePublicarClase = togglePublicarClase;
window.toggleBloqueoTema = toggleBloqueoTema;
window.agregarSubtema = agregarSubtema;
window.gestionarAccesosTema = gestionarAccesosTema;
window.abrirPanelProgreso = abrirPanelProgreso;
window.closeConfirm = closeConfirm;

// Gestión masiva
window.aprobarTodoElCurso = aprobarTodoElCurso;
window.revocarTodoElCurso = revocarTodoElCurso;
window.abrirGestionAlumnos = abrirGestionAlumnos;

// Donación
window.mostrarDonacion = mostrarDonacion;

// Editor de texto
window.textEditorCmd = textEditorCmd;
window.textEditorHr = textEditorHr;
window.textEditorSave = textEditorSave;

// Fase 3
window.mostrarCompletarPerfil = mostrarCompletarPerfil;
window.cerrarCompletarPerfil = cerrarCompletarPerfil;
window.guardarPerfilUsuario = guardarPerfilUsuario;

// ⭐ FASE 5: Funciones del entrenador
window.inicializarTablerosEntrenador = inicializarTablerosEntrenador;
window.actualizarBloqueTablero = actualizarBloqueTablero;
window.actualizarBloqueConsejo = actualizarBloqueConsejo;
window.cargarPGNArchivoEnBloque = cargarPGNArchivoEnBloque;
window.guardarVarianteEnFirestore = guardarVarianteEnFirestore;

// ===== REGISTRO DEL SERVICE WORKER =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/Club-Morphy/sw.js')
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
      .catch(err => console.error('❌ Error al registrar el Service Worker:', err));
  });
}
// === FIN DEL ARCHIVO ===
