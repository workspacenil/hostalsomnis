/**
 * MÒDUL DE SINCRONITZACIÓ AL NÚVOL (SUPABASE) - HOSTAL SOMNIS
 * Connecta mòbil i ordinador per sincronitzar reserves en temps real.
 */

const CloudSync = {
  client: null,
  isSyncing: false,
  isConnected: false,
  channel: null,

  init() {
    try {
      const settings = (window.Store && Store.get('settings')) || {};
      const config = settings.supabase || {};
      const url = config.url ? config.url.trim() : '';
      const key = (config.anonKey || config.key) ? (config.anonKey || config.key).trim() : '';

      if (!url || !key) {
        this.isConnected = false;
        this.updateStatusUI(false, 'Desconnectat (falten dades de Supabase)');
        return;
      }

      if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
        console.warn('Supabase JS SDK no està disponible.');
        this.isConnected = false;
        this.updateStatusUI(false, 'Error: SDK Supabase no carregat');
        return;
      }

      this.client = window.supabase.createClient(url, key, {
        auth: { persistSession: false }
      });

      this.isConnected = true;
      this.updateStatusUI(true, 'Connectat al núvol');

      // Configurar subscripció Realtime
      this.setupRealtime();

      // Descarregar reserves inicials del núvol
      this.pullBookings();
    } catch (err) {
      console.error('Error inicialitzant CloudSync:', err);
      this.isConnected = false;
      this.updateStatusUI(false, 'Error al inicialitzar: ' + (err.message || err));
    }
  },

  async testConnection(url, key) {
    if (!url || !key) {
      return { success: false, message: 'Cal indicar l\'URL del projecte i la Clau Anònima de Supabase.' };
    }
    if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
      return { success: false, message: 'La llibreria de Supabase no s\'ha carregat. Revisa la connexió a internet.' };
    }

    try {
      const testClient = window.supabase.createClient(url.trim(), key.trim(), {
        auth: { persistSession: false }
      });

      // Prova de consulta a la taula bookings
      const { data, error } = await testClient.from('bookings').select('id').limit(1);

      if (error) {
        if (error.code === '42P01' || (error.message && error.message.includes('bookings'))) {
          return {
            success: false,
            message: 'Connexió amb Supabase correcta, però la taula "bookings" encara no s\'ha creat. Executa el codi SQL de creació de taula a l\'editor de Supabase.'
          };
        }
        return {
          success: false,
          message: 'Error de Supabase: ' + (error.message || JSON.stringify(error))
        };
      }

      return {
        success: true,
        message: 'Connexió correcta amb Supabase! La taula "bookings" està activa i sincronitzada.'
      };
    } catch (err) {
      return {
        success: false,
        message: 'Error en connectar: ' + (err.message || 'Comprova que l\'adreça URL sigui vàlida.')
      };
    }
  },

  async pullBookings() {
    if (!this.client) return;
    if (this.isSyncing) return;

    this.isSyncing = true;
    try {
      const { data, error } = await this.client
        .from('bookings')
        .select('*');

      if (error) {
        console.warn('Error en descarregar reserves de Supabase:', error);
        return;
      }

      if (data && Array.isArray(data)) {
        const cloudBookings = data.map(row => row.data || row);
        const localBookings = (window.Store && Store.get('bookings')) || [];

        // Si el núvol té dades, actualitzem el Store local
        if (cloudBookings.length > 0) {
          Store.set('bookings', cloudBookings);
        } else if (localBookings.length > 0 && cloudBookings.length === 0) {
          // Si el núvol és nou i buit, pujem les reserves locals existents
          console.log('Núvol buit, enviant reserves locals...');
          await this.syncLocalBookingsToCloud();
        }

        // Refrescar el calendari si està disponible i actiu
        if (window.CalendarModule && typeof CalendarModule.render === 'function') {
          CalendarModule.render();
        }
      }
    } catch (err) {
      console.error('Error a pullBookings:', err);
    } finally {
      this.isSyncing = false;
    }
  },

  async pushBooking(booking) {
    if (!this.client || !booking || !booking.id) return;

    try {
      const payload = {
        id: String(booking.id),
        data: booking,
        updated_at: new Date().toISOString()
      };

      const { error } = await this.client
        .from('bookings')
        .upsert(payload);

      if (error) {
        console.warn('Error pujant reserva al núvol:', error);
      } else {
        console.log('Reserva sincronitzada al núvol:', booking.id);
      }
    } catch (err) {
      console.warn('Error a pushBooking:', err);
    }
  },

  async removeBooking(bookingId) {
    if (!this.client || !bookingId) return;

    try {
      const { error } = await this.client
        .from('bookings')
        .delete()
        .eq('id', String(bookingId));

      if (error) {
        console.warn('Error eliminant reserva de Supabase:', error);
      } else {
        console.log('Reserva eliminada del núvol:', bookingId);
      }
    } catch (err) {
      console.warn('Error a removeBooking:', err);
    }
  },

  async syncLocalBookingsToCloud() {
    if (!this.client) return;
    const localBookings = (window.Store && Store.get('bookings')) || [];
    if (localBookings.length === 0) return;

    const rows = localBookings.map(b => ({
      id: String(b.id),
      data: b,
      updated_at: new Date().toISOString()
    }));

    try {
      const { error } = await this.client
        .from('bookings')
        .upsert(rows);

      if (error) {
        console.warn('Error en pujar totes les reserves locals:', error);
      } else {
        console.log('Totes les reserves locals s\'han pujat al núvol amb èxit.');
      }
    } catch (err) {
      console.warn('Error a syncLocalBookingsToCloud:', err);
    }
  },

  setupRealtime() {
    if (!this.client) return;

    try {
      if (this.channel) {
        this.client.removeChannel(this.channel);
        this.channel = null;
      }

      this.channel = this.client
        .channel('public:bookings')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, (payload) => {
          console.log('Canvi detectat a Supabase en temps real:', payload);
          CloudSync.pullBookings();
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Subscripció Realtime activa per a taula bookings.');
            this.updateStatusUI(true, 'Connectat al núvol (Temps real actiu ⚡)');
          }
        });
    } catch (err) {
      console.warn('Error configurant Realtime:', err);
    }
  },

  saveBooking(booking) {
    return this.pushBooking(booking);
  },

  deleteBooking(bookingId) {
    return this.removeBooking(bookingId);
  },

  updateStatusUI(isConnected, text) {
    this.isConnected = isConnected;

    // 1. Indicador a la pantalla d'Ajustes (#supabase-status-indicator i #supabase-status-badge)
    const el = document.getElementById('supabase-status-indicator');
    if (el) {
      el.style.display = 'inline-flex';
      el.style.alignItems = 'center';
      el.style.gap = '6px';
      el.style.fontWeight = '500';
      el.style.fontSize = '13px';
      if (isConnected) {
        el.style.color = '#059669';
        el.innerHTML = '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#059669;"></span> ' + (text || 'Connectat al núvol');
      } else {
        el.style.color = '#6B7280';
        el.innerHTML = '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#9CA3AF;"></span> ' + (text || 'Desconnectat');
      }
    }

    const badge = document.getElementById('supabase-status-badge');
    if (badge) {
      badge.textContent = text || (isConnected ? 'Connectat al núvol ✓' : 'No configurat (mode local)');
      if (isConnected) {
        badge.style.background = '#ECFDF5';
        badge.style.color = '#059669';
        badge.style.borderColor = '#A7F3D0';
      } else {
        badge.style.background = '#F3F4F6';
        badge.style.color = '#6B7280';
        badge.style.borderColor = '#E5E7EB';
      }
    }

    // 2. Indicador a la barra superior (Top-bar)
    const dot = document.getElementById('cloud-sync-status-dot');
    const topText = document.getElementById('cloud-sync-topbar-text');
    if (dot && topText) {
      if (isConnected) {
        dot.style.background = '#10B981';
        topText.textContent = 'Núvol en temps real ✓';
        topText.style.color = '#059669';
      } else {
        dot.style.background = '#9CA3AF';
        topText.textContent = 'Mode local';
        topText.style.color = '#6B7280';
      }
    }
  },

  showSyncToast(message, isWarning = false) {
    let toast = document.getElementById('cloud-sync-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'cloud-sync-toast';
      toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 99999;
        padding: 10px 16px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 8px;
        transition: opacity 0.3s ease, transform 0.3s ease;
        opacity: 0;
        transform: translateY(10px);
        pointer-events: none;
      `;
      document.body.appendChild(toast);
    }

    if (isWarning) {
      toast.style.background = '#FFFBEB';
      toast.style.color = '#B45309';
      toast.style.border = '1px solid #FCD34D';
    } else {
      toast.style.background = '#111827';
      toast.style.color = '#FFFFFF';
      toast.style.border = '1px solid #374151';
    }

    toast.textContent = message;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';

    if (this._toastTimeout) clearTimeout(this._toastTimeout);
    this._toastTimeout = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
    }, 3500);
  },

  async connect(url, key, save = true) {
    const test = await this.testConnection(url, key);
    if (!test.success) {
      return test;
    }

    try {
      this.client = window.supabase.createClient(url.trim(), key.trim(), {
        auth: { persistSession: false }
      });
      this.isConnected = true;
      this.updateStatusUI(true, 'Connectat al núvol');
      this.setupRealtime();
      await this.pullBookings();
      return { success: true, message: 'Connectat amb èxit!' };
    } catch (err) {
      return { success: false, message: err.message || 'Error inicialitzant connexió' };
    }
  },

  disconnect() {
    try {
      if (this.channel && this.client) {
        this.client.removeChannel(this.channel);
        this.channel = null;
      }
      this.client = null;
      this.isConnected = false;

      const settings = (window.Store && Store.get('settings')) || {};
      delete settings.supabase;
      Store.set('settings', settings);

      this.updateStatusUI(false, 'Desconnectat');
      alert('Sincronització al núvol desconnectada. L\'app continua en mode local.');
    } catch (err) {
      console.error('Error desconnectant Supabase:', err);
    }
  }
};

window.CloudSync = CloudSync;
