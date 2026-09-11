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

  handleLogin(e) {
    e.preventDefault();
    const pwd = document.getElementById('login-password').value;
    if (pwd === 'N2530g..35') {
      Store.set('auth_granted', true);
      this.showApp();
    } else {
      const err = document.getElementById('login-error');
      if (err) err.style.display = 'block';
      document.getElementById('login-password').value = '';
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
    
    // Cargar la vista por defecto (checkin primero)
    this.switchView('checkin');
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

    // Temporizador de seguridad máximo (4.6s) para garantizar que nunca se quede bloqueada
    setTimeout(() => {
      this.dismiss();
    }, 4600);
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

