/**
 * APLICACIÓN DE GESTIÓN SENCILLA - HOSTAL SOMNIS (SÚRIA)
 * Lógica principal, navegación y estado global
 */

const App = {
  settings: null,

  // Inicialización
  init() {
    Store.initDefaults(); // Asegurar defaults locales
    this.checkAuth();
  },

  // Configuració de seguretat criptogràfica (sense contrasenyes visibles a GitHub)
  AUTH_SALT: 'hostal_somnis_suria_salt_2026',
  AUTH_HASH: '7a442fa2731403f2390c1679d37a9dd733f9016e5cca9866542ecb923186ea37',

  async computeHash(text) {
    if (window.crypto && window.crypto.subtle) {
      const enc = new TextEncoder();
      const data = enc.encode(this.AUTH_SALT + text);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    return null;
  },

  checkAuth() {
    // Revisar si ya ha iniciado sesión antes
    const isAuthed = Store.get('auth_granted', false);
    if (isAuthed) {
      this.showApp();
    } else {
      document.getElementById('login-screen').style.display = 'flex';
      document.getElementById('main-app').style.display = 'none';
    }
  },

  async handleLogin(e) {
    if (e && e.preventDefault) e.preventDefault();
    const pwdInput = document.getElementById('login-password');
    const pwd = pwdInput ? pwdInput.value : '';
    const err = document.getElementById('login-error');

    try {
      const hash = await this.computeHash(pwd);
      if (hash && hash === this.AUTH_HASH) {
        Store.set('auth_granted', true);
        Store.set('auth_token', hash);
        if (err) err.style.display = 'none';
        this.showApp();
      } else {
        if (err) err.style.display = 'block';
        if (pwdInput) pwdInput.value = '';
      }
    } catch (errCatch) {
      console.error('Error verificant credencials:', errCatch);
      if (err) err.style.display = 'block';
    }
  },

  showApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('main-app').style.display = 'flex';
    
    this.setupNavigation();
    
    // Inicializar submódulos si existen
    if (window.MailsModule) MailsModule.init();
    if (window.CheckinModule) CheckinModule.init();
    if (window.CodesModule) CodesModule.init();
    if (window.SettingsModule) SettingsModule.init();
    if (window.CalendarModule) CalendarModule.init();
    
    // Cargar la vista por defecto (calendari primero)
    this.switchView('calendari');
  },

  // Gestión del sidebar responsivo
  toggleSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    if (sidebar) {
      sidebar.classList.toggle('collapsed');
    }
  },

  // Gestión de pestañas de navegación
  setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        const viewId = e.currentTarget.getAttribute('data-view');
        this.switchView(viewId);
        
        // En móvil, cerrar el sidebar automáticamente tras hacer clic en un enlace
        if (window.innerWidth <= 768) {
          const sidebar = document.getElementById('app-sidebar');
          if (sidebar && !sidebar.classList.contains('collapsed')) {
            sidebar.classList.add('collapsed');
          }
        }
      });
    });
  },

  switchView(viewName) {
    // Desactivar todas las pestañas y secciones
    document.querySelectorAll('.nav-item').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));

    // Activar la seleccionada
    const activeTab = document.querySelector(`.nav-item[data-view="${viewName}"]`);
    const activeSection = document.getElementById(`view-${viewName}`);

    if (activeTab) activeTab.classList.add('active');
    if (activeSection) activeSection.classList.add('active');

    // Refrescar contenido según vista
    if (viewName === 'mails' && window.MailsModule) {
      MailsModule.render();
    } else if (viewName === 'finanzas' && window.FinancesModule) {
      FinancesModule.render();
    } else if (viewName === 'codigos' && window.CodesModule) {
      CodesModule.render();
    } else if (viewName === 'checkin' && window.CheckinModule) {
      CheckinModule.render();
    } else if (viewName === 'ajustes' && window.SettingsModule) {
      SettingsModule.render();
    } else if (viewName === 'calendari' && window.CalendarModule) {
      CalendarModule.render();
    }

    // Scroll arriba
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  // Formateador de moneda en Euros
  formatMoney(amount) {
    const num = parseFloat(amount) || 0;
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(num);
  },

  // Formateador de fechas para humanos
  formatDateReadable(dateStr) {
    if (!dateStr) return '-';
    try {
      const [y, m, d] = dateStr.split('-');
      const date = new Date(y, parseInt(m) - 1, d);
      return new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(date);
    } catch {
      return dateStr;
    }
  }
};

/**
 * PANTALLA DE CARGA CON VÍDEO (SPLASH INTRO)
 */
const SplashModule = {
  dismissed: false,

  init() {
    const splash = document.getElementById('splash-screen');
    const video = document.getElementById('splash-video');
    if (!splash) return;

    if (!video) {
      this.dismiss();
      return;
    }

    // Al finalizar el vídeo normalmente
    video.addEventListener('ended', () => {
      this.dismiss();
    });

    // En caso de error de reproducción o carga del archivo
    video.addEventListener('error', () => {
      this.dismiss();
    });

    // Permitir saltar con la tecla Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.dismiss();
      }
    });

    // Sincronizar dinámicamente el color de fondo exacto renderizado por el reproductor
    const handleSyncBg = () => this.syncBgColor();
    video.addEventListener('loadeddata', handleSyncBg);
    video.addEventListener('play', handleSyncBg);
    video.addEventListener('timeupdate', handleSyncBg, { once: true });

    // Iniciar reproducción (muted para garantizar autoplay en todos los navegadores móviles y escritorio)
    video.muted = true;
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Autoplay bloqueado o demorado:', err);
        // Fallback de seguridad si no puede reproducir
        setTimeout(() => this.dismiss(), 2000);
      });
    }

    // Temporitzador de seguretat màxim (2.6s) després d'escurçar el vídeo a 2s
    setTimeout(() => {
      this.dismiss();
    }, 2600);
  },

  syncBgColor() {
    try {
      const video = document.getElementById('splash-video');
      const splash = document.getElementById('splash-screen');
      const container = document.querySelector('.splash-container');
      if (!video || !splash) return;

      const canvas = document.createElement('canvas');
      canvas.width = 16;
      canvas.height = 16;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, 16, 16);
      const p = ctx.getImageData(2, 2, 1, 1).data;
      if (p && p.length >= 3 && p[0] > 200) {
        const color = `rgb(${p[0]}, ${p[1]}, ${p[2]})`;
        splash.style.backgroundColor = color;
        if (container) container.style.backgroundColor = color;
        video.style.backgroundColor = color;
      }
    } catch (e) {}
  },

  toggleAudio() {
    const video = document.getElementById('splash-video');
    const label = document.getElementById('splash-sound-label');
    const icon = document.getElementById('splash-sound-icon');
    if (!video) return;
    video.muted = !video.muted;
    if (icon) {
      icon.textContent = video.muted ? '🔇' : '🔊';
    }
    if (label) {
      label.textContent = video.muted ? 'Activar sonido' : 'Silenciar';
    }
  },

  dismiss() {
    if (this.dismissed) return;
    this.dismissed = true;

    const splash = document.getElementById('splash-screen');
    const video = document.getElementById('splash-video');
    if (splash) {
      splash.classList.add('splash-fade-out');
      setTimeout(() => {
        splash.style.display = 'none';
        if (video) {
          try { video.pause(); } catch(e) {}
        }
      }, 600);
    }
  }
};

window.SplashModule = SplashModule;

document.addEventListener('DOMContentLoaded', () => {
  SplashModule.init();
  App.init();
});

