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

  // Habitacions oficials reals de Hostal Somnis (Súria)
  DEFAULT_ROOMS: [
    { id: '101', name: 'Habitació 101' },
    { id: '102', name: 'Habitació 102' },
    { id: '201', name: 'Habitació 201' },
    { id: '202', name: 'Habitació 202' },
    { id: '301', name: 'Habitació 301' },
    { id: '302', name: 'Habitació 302' }
  ],

  // Inicializar con datos de prueba si está vacío
  initDefaults() {
    const currentSettings = this.get('settings');
    if (!currentSettings) {
      this.set('settings', {
        hostalName: 'Hostal Somnis',
        city: 'Súria',
        postalCode: '08260',
        defaultRoomPrice: 89,
        defaultBreakfastPrice: 8,
        touristTaxRate: 0.99,
        rooms: this.DEFAULT_ROOMS,
        icloud: { enabled: false },
        supabase: {
          url: 'https://jzehbzjcwbahldmattbt.supabase.co',
          anonKey: 'sb_publishable_AKIgnEw9PT2Sknj4WnaqoQ_dC1z7zNv',
          key: 'sb_publishable_AKIgnEw9PT2Sknj4WnaqoQ_dC1z7zNv'
        }
      });
    } else {
      let updated = false;
      if (!currentSettings.rooms || currentSettings.rooms.length !== 6 || (currentSettings.rooms[0] && currentSettings.rooms[0].name && currentSettings.rooms[0].name.includes('(Planta')) || (currentSettings.rooms[0] && currentSettings.rooms[0].id === 'hab-1')) {
        currentSettings.rooms = this.DEFAULT_ROOMS;
        updated = true;
      }
      if (!currentSettings.defaultRoomPrice) {
        currentSettings.defaultRoomPrice = 89;
        updated = true;
      }
      if (!currentSettings.defaultBreakfastPrice) {
        currentSettings.defaultBreakfastPrice = 8;
        updated = true;
      }
      if (!currentSettings.touristTaxRate) {
        currentSettings.touristTaxRate = 0.99;
        updated = true;
      }
      if (!currentSettings.supabase || !currentSettings.supabase.url || !(currentSettings.supabase.anonKey || currentSettings.supabase.key)) {
        currentSettings.supabase = {
          url: 'https://jzehbzjcwbahldmattbt.supabase.co',
          anonKey: 'sb_publishable_AKIgnEw9PT2Sknj4WnaqoQ_dC1z7zNv',
          key: 'sb_publishable_AKIgnEw9PT2Sknj4WnaqoQ_dC1z7zNv'
        };
        updated = true;
      }
      if (updated) {
        this.set('settings', currentSettings);
      }
    }

    if (!this.get('bookings')) {
      const today = new Date();
      const tmrw = new Date(today); tmrw.setDate(tmrw.getDate() + 2);
      const past = new Date(today); past.setDate(past.getDate() - 1);
      const future = new Date(today); future.setDate(future.getDate() + 3);
      this.set('bookings', [
        {
          id: 'res-101',
          guestName: 'Marta Soler i Vila',
          guestPhone: '+34 612 345 678',
          room: '101',
          checkIn: today.toISOString().split('T')[0],
          checkOut: tmrw.toISOString().split('T')[0],
          price: 130,
          paymentMethod: 'Targeta',
          status: 'confirmada'
        },
        {
          id: 'res-201',
          guestName: 'Carles Puiggròs',
          guestPhone: '+34 689 112 233',
          room: '201',
          checkIn: past.toISOString().split('T')[0],
          checkOut: future.toISOString().split('T')[0],
          price: 240,
          paymentMethod: 'Bizum',
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
