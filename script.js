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
    return str.replace(/[&<>"']/g, function(m) {
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
    return str.replace(/["']/g, function(m) {
        if (m === '"') return '&quot;';
        if (m === "'") return '&#39;';
        return m;
    });
}

// Nuevas funciones de seguridad
function esUrlSegura(url) {
    if (!url || typeof url !== 'string') return false;
    return /^(https?:\/\/|mailto:)/i.test(url.trim());
}

function escapeOnclick(str) {
    if (!str) return '';
    return str.replace(/\\/g, '\\\\')
              .replace(/'/g, "\\'")
              .replace(/"/g, '&quot;');
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
async function registrarUsuarioEnColeccion(user) {
    if (!user) return;
    const userRef = db.collection('usuarios').doc(user.uid);
    const doc = await userRef.get();
    if (!doc.exists) {
        await userRef.set({
            uid: user.uid,
            email: user.email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } else {
        if (doc.data().email !== user.email) {
            await userRef.update({ email: user.email });
        }
    }
}

async function obtenerListaUsuarios() {
    try {
        const snapshot = await db.collection('usuarios').get();
        const users = [];
        snapshot.forEach(doc => { users.push({ uid: doc.id, email: doc.data().email }); });
        users.sort((a, b) => (a.email || '').localeCompare(b.email || ''));
        return users;
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        return [];
    }
}

function mostrarLogin() {
    if (currentUser) {
        document.getElementById('modal-title').textContent = 'Tu cuenta';
        document.getElementById('current-session').style.display = 'block';
        document.getElementById('auth-form').style.display = 'none';
        document.getElementById('extra-controls').style.display = 'none';
        document.getElementById('session-email').textContent = currentUser.email;
        document.getElementById('session-avatar').textContent = currentUser.email.charAt(0).toUpperCase();
    } else {
        document.getElementById('modal-title').textContent = 'Iniciar sesión';
        document.getElementById('current-session').style.display = 'none';
        document.getElementById('auth-form').style.display = 'block';
        document.getElementById('extra-controls').style.display = 'block';
        document.getElementById('btn-auth').textContent = 'Ingresar';
        modoRegistro = false;
        limpiarCampos();
    }
    modalLogin.classList.add('active');
}

function limpiarCampos() {
    document.getElementById('email').value = '';
    document.getElementById('password').value = '';
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
            actualizarUI(); // para refrescar botones de solicitud
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
        logoImg.src = datosClub.logoURL.trim();
        logoImg.classList.add('visible');
    } else {
        logoImg.src = '';
        logoImg.classList.remove('visible');
    }
}

function actualizarBotonDatosClub() {
    const btn = document.getElementById('btn-datos-club');
    if (!currentUser) {
        btn.style.display = 'none';
        return;
    }
    const tieneDatos = datosClub.telefono || datosClub.direccion || datosClub.emailContacto || datosClub.horarios || datosClub.web;
    btn.style.display = tieneDatos ? 'inline-flex' : 'none';
}

// ------------------------------------------------
// GESTIÓN DEL CURSO (CRUD) – ahora con escucha en tiempo real
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
        
        // Migración única (solo admin)
        if (currentUser && currentUser.esAdmin && !migracionRealizada) {
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
            migracionRealizada = true;
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
// FUNCIONES DE BÚSQUEDA RECURSIVA Y REORDENAMIENTO
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

    // Si está bloqueado, verificar en accesosTema (Firestore)
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

    // Asegurar que tiene un doc en accesosTema
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
            return `
                <div class="user-access-item">
                    <span class="user-email">${escapeHtml(user.email)}</span>
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

// ------------------------------------------------
// ADMIN: BLOQUEAR/DESBLOQUEAR TEMA
// ------------------------------------------------
async function toggleBloqueoTema(claseId, temaId) {
    if (!currentUser?.esAdmin) return;
    const clase = curso.clases.find(c => c.id === claseId);
    const tema = buscarTemaRecursivo(clase.temas, temaId);
    if (!tema) return;

    tema.bloqueado = !tema.bloqueado;

    if (tema.bloqueado && !tema.accesosTemaId) {
        const docRef = await db.collection('accesosTema').doc();
        await docRef.set({ uids: [] });
        tema.accesosTemaId = docRef.id;
    }

    await guardarCurso();
    actualizarUI();
    mostrarToast(tema.bloqueado ? 'Tema bloqueado' : 'Tema desbloqueado', 'success');
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
// ADMIN: ELIMINAR TEMA (RECURSIVO)
// ------------------------------------------------
async function eliminarTema(claseId, temaId) {
    if (!currentUser?.esAdmin) return;
    const clase = curso.clases.find(c => c.id === claseId);
    if (!clase) return;

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
    mostrarToast('Tema eliminado', 'success');
}

// ------------------------------------------------
// ADMIN: MOVER TEMA ARRIBA/ABAJO (CON JERARQUÍA)
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
    const clase = curso.clases.find(c => c.id === id);
    if (!clase) return;
    const nombre = nuevoNombre || prompt('Nuevo nombre de la clase:', clase.titulo);
    if (!nombre || !nombre.trim()) return;
    clase.titulo = nombre.trim();
    await guardarCurso();
    actualizarUI();
    mostrarToast('Clase renombrada', 'success');
}

async function renombrarTema(claseId, temaId, nuevoNombre = null) {
    if (!currentUser?.esAdmin) return;
    const clase = curso.clases.find(c => c.id === claseId);
    const tema = buscarTemaRecursivo(clase.temas, temaId);
    if (!tema) return;
    const nombre = nuevoNombre || prompt('Nuevo nombre del tema:', tema.titulo);
    if (!nombre || !nombre.trim()) return;
    tema.titulo = nombre.trim();
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
            estado: 'pendiente',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        await db.collection('notificaciones').add({
            paraUid: ADMIN_UID,
            mensaje: `${currentUser.email} solicita acceso a "${clase.titulo}"`,
            leida: false,
            tipo: 'solicitud',
            claseId: claseId,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        mostrarToast('Solicitud enviada. El administrador la revisará pronto.', 'success');
        actualizarUI();
    } catch (error) {
        mostrarToast('Error al enviar solicitud', 'error');
        console.error(error);
    }
}

async function aprobarSolicitud(solicitudId, claseId, uid, email) {
    if (!currentUser?.esAdmin) return;
    try {
        await db.collection('solicitudesAcceso').doc(solicitudId).update({ estado: 'aprobada' });

        const uidsActual = accesosEspeciales[claseId] || [];
        if (!uidsActual.includes(uid)) {
            uidsActual.push(uid);
            await db.collection('accesosEspeciales').doc(claseId).set({ uids: uidsActual }, { merge: true });
        }

        const clase = curso.clases.find(c => c.id === claseId);
        await db.collection('notificaciones').add({
            paraUid: uid,
            mensaje: `Tu solicitud de acceso a "${clase?.titulo || 'la clase'}" ha sido aprobada`,
            leida: false,
            tipo: 'aprobada',
            claseId: claseId,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        mostrarToast('Solicitud aprobada y acceso concedido', 'success');
    } catch (error) {
        mostrarToast('Error al aprobar solicitud', 'error');
        console.error(error);
    }
}

async function rechazarSolicitud(solicitudId, uid, claseId) {
    if (!currentUser?.esAdmin) return;
    try {
        await db.collection('solicitudesAcceso').doc(solicitudId).update({ estado: 'rechazada' });

        const clase = curso.clases.find(c => c.id === claseId);
        await db.collection('notificaciones').add({
            paraUid: uid,
            mensaje: `Tu solicitud de acceso a "${clase?.titulo || 'la clase'}" ha sido rechazada`,
            leida: false,
            tipo: 'rechazada',
            claseId: claseId,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        mostrarToast('Solicitud rechazada', 'success');
    } catch (error) {
        mostrarToast('Error al rechazar solicitud', 'error');
        console.error(error);
    }
}

function abrirSolicitudesAdmin() {
    if (!currentUser?.esAdmin) return;
    const listaDiv = document.getElementById('solicitudes-lista');
    if (solicitudesPendientes.length === 0) {
        listaDiv.innerHTML = '<div class="no-users-msg">📭 No hay solicitudes pendientes.</div>';
    } else {
        listaDiv.innerHTML = solicitudesPendientes.map(s => `
            <div class="solicitud-item">
                <div>
                    <strong>${escapeHtml(s.email)}</strong><br>
                    <span style="font-size:0.85rem; color:var(--texto-suave);">Clase: ${escapeHtml(s.claseTitulo || 'Desconocida')}</span>
                    <br><span class="estado-pendiente">⏳ Pendiente</span>
                </div>
                <div style="display:flex; gap:6px;">
                    <button class="btn btn-exito btn-small" onclick="aprobarSolicitud('${s.id}','${s.claseId}','${s.uid}','${escapeOnclick(s.email)}')">✅ Aprobar</button>
                    <button class="btn btn-peligro btn-small" onclick="rechazarSolicitud('${s.id}','${s.uid}','${s.claseId}')">❌ Rechazar</button>
                </div>
            </div>
        `).join('');
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
    } catch (error) {
        console.warn('Error al marcar leída:', error);
    }
}

async function marcarTodasNotificacionesLeidas() {
    const noLeidas = notificaciones.filter(n => !n.leida);
    const batch = db.batch();
    noLeidas.forEach(n => batch.update(db.collection('notificaciones').doc(n.id), { leida: true }));
    try {
        await batch.commit();
        mostrarToast('Todas las notificaciones marcadas como leídas', 'success');
    } catch (error) {
        mostrarToast('Error al actualizar', 'error');
        console.error(error);
    }
}

async function eliminarNotificacion(notifId) {
    try {
        await db.collection('notificaciones').doc(notifId).delete();
    } catch (error) {
        console.warn('Error al eliminar:', error);
    }
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
    tema.bloques.push(nuevo);
    guardarCurso().then(() => actualizarUI());
}

function eliminarBloque(claseId, temaId, bloqueId) {
    const clase = curso.clases.find(c => c.id === claseId);
    const tema = buscarTemaRecursivo(clase.temas, temaId);
    if (!tema || !tema.bloques) return;
    tema.bloques = tema.bloques.filter(b => b.id !== bloqueId);
    guardarCurso().then(() => actualizarUI());
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
    
    // Reaplicar filtro después de regenerar la lista
    if (terminoBusqueda) {
        setTimeout(() => filtrarClases(), 0);
    }
}

// Función de filtrado de clases
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
            return `
                <div class="user-access-item">
                    <span class="user-email">${escapeHtml(user.email)}</span>
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
        // Renderizar bloques del tema
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
                        const est = bloque.estilo || {};
                        const textoSanitizado = escapeHtml(bloque.contenido);
                        const textoConSaltos = textoSanitizado.replace(/\n/g, '<br>');
                        html = `<div class="bloque-texto" style="font-size:${escapeHtml(est.fontSize)||'inherit'}; color:${escapeHtml(est.color)||'inherit'}; text-align:${escapeHtml(est.textAlign)||'left'};">${textoConSaltos}</div>`;
                        break;
                    }
                    case 'imagen': {
                        if (!bloque.contenido) return '';
                        // Validar URL segura
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
                }
                if (bloque.nota) html += `<div class="nota-debajo">${escapeHtml(bloque.nota)}</div>`;
                return html;
            }).filter(Boolean).join('');
        }

        // Renderizar subtemas (recursivo)
        if (tema.subtemas && tema.subtemas.length > 0) {
            contenidoHTML += `<div class="subtemas-container">`;
            tema.subtemas.forEach(st => {
                contenidoHTML += renderizarTemaRecursivo(st, claseId, nivel + 1);
            });
            contenidoHTML += `</div>`;
        }
    } else {
        contenidoHTML = `<div style="color:var(--texto-suave); padding:10px;">🔒 Tema bloqueado</div>`;
    }

    // Editor de bloques (solo admin y si el tema es accesible)
    const adminEditorHTML = (esAdmin && accesible) ? `
    <div class="solo-admin" style="margin-top:15px; padding-top:15px; border-top:1px solid var(--borde);">
        <p style="color:var(--acento-claro); font-weight:bold;">🛠️ Editor de bloques</p>
        <div id="bloques-editor-${tema.id}">
            ${(tema.bloques || []).map(bloque => {
                const escape = escapeHtml;
                return `
                <div class="bloque-editor" data-bloque-id="${bloque.id}">
                    <div class="bloque-campos">
                        <select onchange="cambiarTipoBloque('${claseId}','${tema.id}','${bloque.id}', this.value)">
                            <option value="video" ${bloque.tipo==='video'?'selected':''}>Video</option>
                            <option value="texto" ${bloque.tipo==='texto'?'selected':''}>Texto</option>
                            <option value="iframe" ${bloque.tipo==='iframe'?'selected':''}>Iframe</option>
                            <option value="imagen" ${bloque.tipo==='imagen'?'selected':''}>Imagen</option>
                            <option value="enlace" ${bloque.tipo==='enlace'?'selected':''}>Enlace</option>
                        </select>
                        ${bloque.tipo === 'enlace' ? `
                            <input placeholder="Etiqueta" value="${escape(bloque.label||'')}" onchange="actualizarBloqueEnlace('${claseId}','${tema.id}','${bloque.id}', this.value, this.nextElementSibling.value)">
                            <input placeholder="URL" value="${escape(bloque.url||'')}" onchange="actualizarBloqueEnlace('${claseId}','${tema.id}','${bloque.id}', this.previousElementSibling.value, this.value)">
                        ` : `
                            <input placeholder="Contenido" value="${escape(bloque.contenido||'')}" onchange="actualizarBloqueContenido('${claseId}','${tema.id}','${bloque.id}', this.value)">
                        `}
                        <button class="btn-reorder" onclick="moverBloqueArriba('${claseId}','${tema.id}','${bloque.id}')">↑</button>
                        <button class="btn-reorder" onclick="moverBloqueAbajo('${claseId}','${tema.id}','${bloque.id}')">↓</button>
                        <button class="btn btn-peligro btn-small" onclick="eliminarBloque('${claseId}','${tema.id}','${bloque.id}')">🗑️</button>
                    </div>
                    ${bloque.tipo === 'texto' ? `
                        <div class="estilo-controls">
                            <label>Tamaño: <input type="text" value="${escape(bloque.estilo?.fontSize||'')}" placeholder="1rem" onchange="actualizarBloqueEstilo('${claseId}','${tema.id}','${bloque.id}', 'fontSize', this.value)"></label>
                            <label>Color: <input type="color" value="${escape(bloque.estilo?.color||'#000000')}" onchange="actualizarBloqueEstilo('${claseId}','${tema.id}','${bloque.id}', 'color', this.value)"></label>
                            <label>Alineación:
                                <select onchange="actualizarBloqueEstilo('${claseId}','${tema.id}','${bloque.id}', 'textAlign', this.value)">
                                    <option value="left" ${bloque.estilo?.textAlign==='left'?'selected':''}>Izquierda</option>
                                    <option value="center" ${bloque.estilo?.textAlign==='center'?'selected':''}>Centro</option>
                                    <option value="right" ${bloque.estilo?.textAlign==='right'?'selected':''}>Derecha</option>
                                </select>
                            </label>
                        </div>
                    ` : ''}
                    <input placeholder="Nota al pie (opcional)" value="${escape(bloque.nota||'')}" onchange="actualizarBloqueNota('${claseId}','${tema.id}','${bloque.id}', this.value)">
                </div>`;
            }).join('')}
        </div>
        <button class="btn btn-azul btn-small" onclick="agregarBloque('${claseId}','${tema.id}','texto')">➕ Texto</button>
        <button class="btn btn-azul btn-small" onclick="agregarBloque('${claseId}','${tema.id}','video')">➕ Video</button>
        <button class="btn btn-azul btn-small" onclick="agregarBloque('${claseId}','${tema.id}','iframe')">➕ Iframe</button>
        <button class="btn btn-azul btn-small" onclick="agregarBloque('${claseId}','${tema.id}','imagen')">➕ Imagen</button>
        <button class="btn btn-azul btn-small" onclick="agregarBloque('${claseId}','${tema.id}','enlace')">➕ Enlace</button>
    </div>` : '';

    const html = `
    <div class="tema ${completado ? 'abierto' : ''} ${!accesible ? 'bloqueado' : ''}" data-tema-id="${tema.id}" style="margin-left: ${nivel * 20}px;">
        <div class="tema-header" data-accion="toggle-tema" data-tema-id="${tema.id}">
            <span class="titulo-editable" data-accion="renombrarTema" data-clase="${claseId}" data-tema="${tema.id}">${tema.numero}. ${tema.titulo}</span>
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
        // Ocultar elementos de búsqueda y progreso
        document.getElementById('search-input').style.display = 'none';
        document.getElementById('btn-progreso').style.display = 'none';
        return;
    }
    renderizarSidebar();
    
    // Mostrar búsqueda y botón de progreso
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
        });
    });
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
// EDICIÓN POR LONG PRESS (RENOMBRAR)
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
   input.style.cssText = 'font-size: inherit; font-weight: inherit; color: inherit; background: var(--bg); border: 2px solid var(--acento); padding: 4px 8px; border-radius: 6px; width: 100%; box-sizing: border-box; max-width: 100%;';        for (let attr of span.attributes) { if (attr.name.startsWith('data-')) input.setAttribute(attr.name, attr.value); }
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
// EVENTOS DE AUTENTICACIÓN Y CARGA INICIAL
// ------------------------------------------------
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = { uid: user.uid, email: user.email, esAdmin: user.uid === ADMIN_UID };
        await registrarUsuarioEnColeccion(user);
        btnLogin.style.display = 'none';
        btnLogout.style.display = 'inline-flex';
        userInfo.textContent = `👤 ${user.email}`;
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
    } else {
        currentUser = null;
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

document.getElementById('toggle-password').addEventListener('click', function() {
    const passInput = document.getElementById('password');
    const type = passInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passInput.setAttribute('type', type);
    this.textContent = type === 'password' ? '👁️' : '🙈';
});

document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const pass = document.getElementById('password').value.trim();
    if (!email || !pass) return mostrarToast('Falta tu correo o contraseña', 'error');
    const btnAuth = document.getElementById('btn-auth');
    btnAuth.disabled = true;
    btnAuth.innerHTML = '<span class="loader"></span> Procesando...';
    try {
        if (modoRegistro) {
            const credencial = await auth.createUserWithEmailAndPassword(email, pass);
            await registrarUsuarioEnColeccion(credencial.user);
            mostrarToast('¡Cuenta creada! Ya tienes acceso.', 'success');
            modoRegistro = false;
            document.getElementById('modal-title').textContent = 'Iniciar sesión';
            document.getElementById('btn-auth').textContent = 'Ingresar';
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
    limpiarCampos();
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
hamburgerBtn.addEventListener('click', () => { sidebar.classList.toggle('open'); sidebarOverlay.classList.toggle('active'); });
sidebarOverlay.addEventListener('click', () => { sidebar.classList.remove('open'); sidebarOverlay.classList.remove('active'); });
document.getElementById('main-content').addEventListener('click', () => {
    if (window.innerWidth <= 768) { sidebar.classList.remove('open'); sidebarOverlay.classList.remove('active'); }
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

// Evento para búsqueda
document.getElementById('search-input').addEventListener('input', (e) => {
    terminoBusqueda = e.target.value;
    filtrarClases();
});

// ------------------------------------------------
// INICIALIZACIÓN
// ------------------------------------------------
configurarDeteccionAutofill();
suscribirDatosClub();
console.log('✅ Club Morphy – Mejoras de UX aplicadas');

// Exponer funciones globales
window.mostrarLogin = mostrarLogin;
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

// ===== REGISTRO DEL SERVICE WORKER =====
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
      .catch(err => console.error('❌ Error al registrar el Service Worker:', err));
  });
}
