/**
 * ALMACENAMIENTO DE LA PWA (Local Storage)
 * Permite que la app funcione 100% en GitHub Pages sin necesidad de servidor backend.
 */

const Store = {
  get(key, defaultValue = null) {
    try {
      const data = localStorage.getItem(`hostalsomnis_${key}`);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      console.error('Error leyendo del LocalStorage', e);
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(`hostalsomnis_${key}`, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Error guardando en LocalStorage', e);
      return false;
    }
  },

  // Inicializar con datos de prueba si está vacío
  initDefaults() {
    if (!this.get('settings')) {
      this.set('settings', {
        hostalName: 'Hostal Somnis',
        city: 'Súria',
        postalCode: '08260',
        rooms: [
          { id: 'hab-1', name: 'Habitación 1 - Doble' },
          { id: 'hab-2', name: 'Habitación 2 - Matrimonial' },
          { id: 'hab-3', name: 'Habitación 3 - Doble' },
          { id: 'hab-4', name: 'Habitación 4 - Individual' }
        ],
        icloud: { enabled: false }
      });
    }

    if (!this.get('bookings')) {
      const today = new Date();
      const tmrw = new Date(today); tmrw.setDate(tmrw.getDate() + 2);
      this.set('bookings', [
        {
          id: 'res-ejemplo-1',
          guestName: 'Marta Soler (Ejemplo)',
          room: 'Habitación 1 - Doble',
          checkIn: today.toISOString().split('T')[0],
          checkOut: tmrw.toISOString().split('T')[0],
          price: 120,
          paymentMethod: 'Pendiente',
          status: 'confirmada'
        }
      ]);
    }

    if (!this.get('finances')) {
      this.set('finances', []);
    }
  }
};

window.Store = Store;
