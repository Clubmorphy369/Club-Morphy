/* ============================================================
   SCRIPT CORE — Club Morphy
   
   Contiene:
   - Configuración de Firebase (init, auth, db)
   - Constantes globales
   - Variables globales mutables (estado)
   - Referencias a DOM
   - Escapes y sanitización
   - Utilidades generales
   - Modo zen
   - Persistencia de navegación
   - UI helpers (toast, confirm)
   - Estado del juego vs IA
   
   Depende de: firebase (compat), chess.js
   Expone: window.CMScriptCore + getters/setters en window.*
   Cargado ANTES de script-curso.js
   ============================================================ */

(function () {
    'use strict';

    const Core = window.CMScriptCore = window.CMScriptCore || {};

    // ============================================================
    // CONFIGURACIÓN DE FIREBASE
    // ⚠️ La apiKey es PÚBLICA por diseño en Firebase Web.
    //    La seguridad real está en las Firestore Rules y en los
    //    dominios autorizados en Firebase Console.
    // ============================================================
    const firebaseConfig = {
        apiKey: "AIzaSyBEd81JSPeJLyEiTwoafyMqVHmFGPtNC2w",
        authDomain: "club-morphy-6aa5c.firebaseapp.com",
        projectId: "club-morphy-6aa5c",
        storageBucket: "club-morphy-6aa5c.firebasestorage.app",
        messagingSenderId: "162434548834",
        appId: "1:162434548834:web:e2fa127c7738f211c33d3b"
    };

    firebase.initializeApp(firebaseConfig);
    Core.auth = firebase.auth();
    Core.db = firebase.firestore();

    Core.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
        .catch(err => console.warn('No se pudo configurar persistencia', err));

    Core.db.enablePersistence({ synchronizeTabs: true }).catch(err => console.warn('Offline:', err));

    // ============================================================
    // CONSTANTES GLOBALES
    // ============================================================
    Core.ADMIN_UID = 'FVnX1NOVgvavWnwnad75zBsRpBU2';
    Core.STORAGE_KEY = 'clubMorphy_navegacion';
    Core.MODO_ZEN_KEY = 'clubMorphy_modoZen';

    Core.TIEMPOS_PARTIDA_MAP = {
        'libre': 'Sin límite',
        '3+0': '3 min',
        '5+0': '5 min',
        '10+0': '10 min',
        '15+10': '15 min + 10s'
    };

    // ============================================================
    // ESTADO GLOBAL MUTABLE
    // ============================================================
    Core.state = {
        currentUser: null,
        userProfile: null,
        curso: { clases: [] },
        temaAbiertoGlobal: null,
        claseActivaId: null,
        modoAdmin: false,
        confirmCallback: null,
        accesosEspeciales: {},
        accesosTema: {},
        datosClub: {},
        notificaciones: [],
        solicitudesPendientes: [],
        misSolicitudes: [],
        unsubscribeNotificaciones: null,
        unsubscribeSolicitudesAdmin: null,
        unsubscribeMisSolicitudes: null,
        unsubscribeAccesos: null,
        unsubscribeAccesosTema: null,
        unsubscribeClub: null,
        unsubscribeCurso: null,
        migracionRealizada: false,
        terminoBusqueda: '',
        modalCompletarPerfilYaMostrado: false,
        _guardandoCursoContador: 0,
        modoZen: false,
        progresoTableros: {},
        modoRegistro: false,
        claseActualGestion: null,
        // ⭐ FASE 3: cuando migremos a Lozza, `nivelSF` se renombrará a `nivelMotor`.
        //    De momento se deja `nivelSF` para no romper el código actual.
        juegoIAConfig: {
            nivelSF: 5,
            colorHumano: 'w',
            tiempo: 'libre'
        },
        juegoIAInstancia: null,
        juegoIAEsperandoStockfish: false,
        debounceScrollTimer: null,
        _debounceGuardarCursoTimer: null,
        activeTextEditor: null,
        activeTextEditorIds: { claseId: null, temaId: null, bloqueId: null }
    };

    // ============================================================
    // REFERENCIAS A DOM (las que se usan en muchos sitios)
    // ============================================================
    Core.dom = {
        modalLogin: document.getElementById('modal-login'),
        modalConfirmLogout: document.getElementById('modal-confirm-logout'),
        modalConfirm: document.getElementById('modal-confirm'),
        modalAccesos: document.getElementById('modal-accesos'),
        modalSolicitudesAdmin: document.getElementById('modal-solicitudes-admin'),
        modalNotificaciones: document.getElementById('modal-notificaciones'),
        modalDatosClub: document.getElementById('modal-datos-club'),
        modalConfigClub: document.getElementById('modal-config-club'),
        modalDonacion: document.getElementById('modal-donacion'),
        modalJuegoIA: document.getElementById('modal-juego-ia'),
        btnLogin: document.getElementById('btn-login'),
        btnLogout: document.getElementById('btn-logout'),
        btnAdmin: document.getElementById('btn-admin'),
        userInfo: document.getElementById('user-info'),
        sidebar: document.getElementById('sidebar'),
        sidebarOverlay: document.getElementById('sidebar-overlay'),
        hamburgerBtn: document.getElementById('hamburger-btn')
    };

    // ============================================================
    // FUNCIONES DE ESCAPE (SEGURIDAD)
    // ============================================================
    Core.escapeHtml = function (str) {
        if (!str) return '';
        return String(str).replace(/[&<>"']/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            if (m === '"') return '&quot;';
            if (m === "'") return '&#39;';
            return m;
        });
    };

    Core.escapeAttr = function (str) {
        if (!str) return '';
        return String(str).replace(/["']/g, function(m) {
            if (m === '"') return '&quot;';
            if (m === "'") return '&#39;';
            return m;
        });
    };

    Core.esUrlSegura = function (url) {
        if (!url || typeof url !== 'string') return false;
        return /^(https?:\/\/|mailto:)/i.test(url.trim());
    };

    Core.escapeOnclick = function (str) {
        if (!str) return '';
        return String(str).replace(/\\/g, '\\\\')
                  .replace(/'/g, "\\'")
                  .replace(/"/g, '&quot;');
    };

    Core.sanitizeHtml = function (html) {
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

    // ============================================================
    // UTILIDADES GENERALES
    // ============================================================
    Core.generarId = function () {
        return Date.now().toString(36) + Math.random().toString(36).slice(2);
    };

    Core.extraerYouTubeID = function (url) {
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
    };

    Core.esUrlYouTubeValida = function (url) {
        return Core.extraerYouTubeID(url) !== null;
    };

    Core.getNombreMostrar = function (user, perfil) {
        user = user !== undefined ? user : Core.state.currentUser;
        perfil = perfil !== undefined ? perfil : Core.state.userProfile;
        if (!user) return '';
        if (perfil && perfil.nombre && perfil.apellidos) {
            return `${perfil.nombre} ${perfil.apellidos}`;
        }
        if (perfil && perfil.nombre) {
            return perfil.nombre;
        }
        return user.email;
    };

    Core.getInicial = function (user, perfil) {
        user = user !== undefined ? user : Core.state.currentUser;
        perfil = perfil !== undefined ? perfil : Core.state.userProfile;
        if (perfil && perfil.nombre) return perfil.nombre.charAt(0).toUpperCase();
        if (user && user.email) return user.email.charAt(0).toUpperCase();
        return '?';
    };

    Core.traducirErrorFirebase = function (codigo) {
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
    };

    // ============================================================
    // MODO ZEN
    // ============================================================
    Core.cargarModoZen = function () {
        try {
            Core.state.modoZen = localStorage.getItem(Core.MODO_ZEN_KEY) === 'true';
        } catch (e) { Core.state.modoZen = false; }
    };

    Core.aplicarModoZen = function () {
        document.body.classList.toggle('modo-zen', Core.state.modoZen);
        const btn = document.getElementById('btn-zen');
        if (btn) {
            btn.classList.toggle('activo', Core.state.modoZen);
            btn.setAttribute('title', Core.state.modoZen ? 'Salir del modo zen' : 'Modo zen (sin distracciones)');
            const label = btn.querySelector('.btn-label');
            if (label) label.textContent = Core.state.modoZen ? 'Salir' : 'Zen';
        }
    };

    Core.toggleModoZen = function () {
        Core.state.modoZen = !Core.state.modoZen;
        try {
            localStorage.setItem(Core.MODO_ZEN_KEY, Core.state.modoZen ? 'true' : 'false');
        } catch (e) { /* ignorar */ }
        Core.aplicarModoZen();
        if (typeof Core.mostrarToast === 'function') {
            Core.mostrarToast(Core.state.modoZen ? '🎯 Modo zen activado' : '👁️ Modo zen desactivado', 'success');
        }
    };

    // ============================================================
    // PERSISTENCIA DE NAVEGACIÓN
    // ============================================================
    Core.guardarEstadoNavegacion = function () {
        try {
            const estado = {
                claseActivaId: Core.state.claseActivaId,
                temaAbiertoId: Core.state.temaAbiertoGlobal,
                scrollTop: document.getElementById('main-content')?.scrollTop || 0
            };
            sessionStorage.setItem(Core.STORAGE_KEY, JSON.stringify(estado));
        } catch (e) { /* ignorar */ }
    };

    Core.cargarEstadoNavegacion = function () {
        try {
            const raw = sessionStorage.getItem(Core.STORAGE_KEY);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) { return null; }
    };

    Core.onContentScroll = function () {
        if (Core.state.debounceScrollTimer) clearTimeout(Core.state.debounceScrollTimer);
        Core.state.debounceScrollTimer = setTimeout(() => {
            Core.guardarEstadoNavegacion();
        }, 200);
    };

    // ============================================================
    // UI HELPERS
    // ============================================================
    Core.mostrarToast = function (mensaje, tipo = 'success') {
        const toast = document.getElementById('toast');
        if (!toast) return;
        // Mantenemos la clase base "toast" siempre y añadimos tipo + show
        toast.classList.remove('success', 'error');
        if (tipo === 'success' || tipo === 'error') {
            toast.classList.add(tipo);
        }
        toast.textContent = mensaje;
        toast.classList.add('show');
        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(() => toast.classList.remove('show'), 3000);
    };

    Core.mostrarConfirmacion = function (titulo, mensaje, callback) {
        const modalConfirm = Core.dom.modalConfirm;
        if (!modalConfirm) return;
        document.getElementById('confirm-title').textContent = titulo;
        document.getElementById('confirm-message').textContent = mensaje;
        Core.state.confirmCallback = callback;
        modalConfirm.classList.add('active');
        document.getElementById('confirm-ok').onclick = () => {
            if (Core.state.confirmCallback) Core.state.confirmCallback();
            Core.closeConfirm();
        };
    };

    Core.closeConfirm = function () {
        const modalConfirm = Core.dom.modalConfirm;
        if (!modalConfirm) return;
        modalConfirm.classList.remove('active');
        Core.state.confirmCallback = null;
    };

    // ============================================================
    // EXPOSICIÓN DE VARIABLES DEL STATE COMO GLOBALES
    // ============================================================
    // Usamos getters/setters para que `window.currentUser` refleje
    // automáticamente `Core.state.currentUser`.
    // Así el resto de archivos (script-curso, script-render, script-main)
    // puede seguir usando las variables como antes.
    // ============================================================
    const _stateGettersSetters = [
        'currentUser', 'userProfile', 'curso', 'temaAbiertoGlobal',
        'claseActivaId', 'modoAdmin', 'confirmCallback', 'accesosEspeciales',
        'accesosTema', 'datosClub', 'notificaciones', 'solicitudesPendientes',
        'misSolicitudes', 'unsubscribeNotificaciones', 'unsubscribeSolicitudesAdmin',
        'unsubscribeMisSolicitudes', 'unsubscribeAccesos', 'unsubscribeAccesosTema',
        'unsubscribeClub', 'unsubscribeCurso', 'migracionRealizada', 'terminoBusqueda',
        'modalCompletarPerfilYaMostrado', '_guardandoCursoContador', 'modoZen',
        'progresoTableros', 'modoRegistro', 'claseActualGestion',
        'juegoIAConfig', 'juegoIAInstancia', 'juegoIAEsperandoStockfish',
        'activeTextEditor', 'activeTextEditorIds',
        'debounceScrollTimer', '_debounceGuardarCursoTimer'
    ];

    _stateGettersSetters.forEach(name => {
        Object.defineProperty(window, name, {
            get() { return Core.state[name]; },
            set(v) { Core.state[name] = v; },
            configurable: true
        });
    });

    // ============================================================
    // EXPOSICIÓN DE CONSTANTES Y REFERENCIAS
    // ============================================================
    window.ADMIN_UID = Core.ADMIN_UID;
    window.STORAGE_KEY = Core.STORAGE_KEY;
    window.MODO_ZEN_KEY = Core.MODO_ZEN_KEY;
    window.TIEMPOS_PARTIDA_MAP = Core.TIEMPOS_PARTIDA_MAP;

    // Firebase
    window.auth = Core.auth;
    window.db = Core.db;

    // Referencias DOM (las más usadas)
    window.modalLogin = Core.dom.modalLogin;
    window.modalConfirmLogout = Core.dom.modalConfirmLogout;
    window.modalConfirm = Core.dom.modalConfirm;
    window.modalAccesos = Core.dom.modalAccesos;
    window.modalSolicitudesAdmin = Core.dom.modalSolicitudesAdmin;
    window.modalNotificaciones = Core.dom.modalNotificaciones;
    window.modalDatosClub = Core.dom.modalDatosClub;
    window.modalConfigClub = Core.dom.modalConfigClub;
    window.modalDonacion = Core.dom.modalDonacion;
    window.modalJuegoIA = Core.dom.modalJuegoIA;
    window.btnLogin = Core.dom.btnLogin;
    window.btnLogout = Core.dom.btnLogout;
    window.btnAdmin = Core.dom.btnAdmin;
    window.userInfo = Core.dom.userInfo;
    window.sidebar = Core.dom.sidebar;
    window.sidebarOverlay = Core.dom.sidebarOverlay;
    window.hamburgerBtn = Core.dom.hamburgerBtn;

    // Funciones de escape/utilidades (expuestas globalmente)
    window.escapeHtml = Core.escapeHtml;
    window.escapeAttr = Core.escapeAttr;
    window.esUrlSegura = Core.esUrlSegura;
    window.escapeOnclick = Core.escapeOnclick;
    window.sanitizeHtml = Core.sanitizeHtml;
    window.convertirUrlImagen = Core.convertirUrlImagen;
    window.generarId = Core.generarId;
    window.extraerYouTubeID = Core.extraerYouTubeID;
    window.esUrlYouTubeValida = Core.esUrlYouTubeValida;
    window.getNombreMostrar = Core.getNombreMostrar;
    window.getInicial = Core.getInicial;
    window.traducirErrorFirebase = Core.traducirErrorFirebase;

    // Modo zen
    window.cargarModoZen = Core.cargarModoZen;
    window.aplicarModoZen = Core.aplicarModoZen;
    window.toggleModoZen = Core.toggleModoZen;

    // Persistencia de navegación
    window.guardarEstadoNavegacion = Core.guardarEstadoNavegacion;
    window.cargarEstadoNavegacion = Core.cargarEstadoNavegacion;
    window.onContentScroll = Core.onContentScroll;

    // UI helpers
    window.mostrarToast = Core.mostrarToast;
    window.mostrarConfirmacion = Core.mostrarConfirmacion;
    window.closeConfirm = Core.closeConfirm;

    // ============================================================
    // LOG FINAL
    // ============================================================
    console.log('✅ CMScriptCore cargado (Firebase + utilidades + estado global + UI helpers)');

})();
