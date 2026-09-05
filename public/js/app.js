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
    if (window.FinancesModule) FinancesModule.init();
    if (window.CodesModule) CodesModule.init();
    if (window.SettingsModule) SettingsModule.init();
    
    // Cargar la vista por defecto (finanzas)
    this.switchView('finanzas');
  },

  // Gestión de pestañas de navegación
  setupNavigation() {
    const tabs = document.querySelectorAll('.nav-item');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetView = tab.getAttribute('data-view');
        this.switchView(targetView);
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
    if (viewName === 'finanzas' && window.FinancesModule) {
      FinancesModule.render();
    } else if (viewName === 'codigos' && window.CodesModule) {
      CodesModule.render();
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

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
