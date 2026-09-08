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

    if (!this.get('mail_trainings')) {
      this.set('mail_trainings', [
        {
          id: 'train-1',
          date: '2025-01-10',
          title: 'Aparcamiento y cuna para bebé',
          incoming: 'Hola, tenemos una reserva para este fin de semana. ¿Hay sitio para aparcar el coche cerca? Y querríamos saber si tenéis cuna para nuestro bebé de 8 meses.',
          reply: 'Hola! Encantada de saludarte. Sí, justo delante del hostal y en las calles contiguas hay aparcamiento público gratuito y muy tranquilo donde siempre se encuentra sitio fácilmente. En cuanto a la cuna, sí que tenemos cuna de viaje disponible y os la podemos dejar montada y lista en la habitación sin ningún suplemento. Avisadnos si necesitáis cualquier otra cosita. ¡Hasta pronto!'
        },
        {
          id: 'train-2',
          date: '2025-01-15',
          title: 'Llegada tarde por la noche',
          incoming: 'Hola, llegaremos tarde el viernes, probablemente hacia las 23:30h. ¿Habrá problema para hacer el check-in a esa hora?',
          reply: 'Hola! No hay ningún problema. Nuestro sistema de entrada es totalmente autónomo mediante códigos de seguridad para la puerta y la cajita de llaves. El mismo día de vuestra llegada os mandamos las instrucciones detalladas para que podáis entrar tranquilamente a la hora que lleguéis sin prisas. ¡Buen viaje!'
        }
      ]);
    }

    if (!this.get('gemini_config')) {
      this.set('gemini_config', {
        apiKey: '',
        model: 'gemini-2.5-flash',
        customTone: 'Responde siempre con el tono amable, cercano, educado y hospitalario de mi madre para Hostal Somnis en Súria. Sé clara, servicial y transmite calidez familiar.'
      });
    }
  }
};

window.Store = Store;
