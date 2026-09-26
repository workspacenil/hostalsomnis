/**
 * MÓDULO DE AJUSTES - HOSTAL SOMNIS
 */

const SettingsModule = {
  init() {
    this.render();
  },

  render() {
    const settings = Store.get('settings', {});
    
    const nameInput = document.getElementById('settings-name');
    const cityInput = document.getElementById('settings-city');
    const roomPriceInput = document.getElementById('settings-default-room-price');
    const breakfastPriceInput = document.getElementById('settings-default-breakfast-price');
    const taxPriceInput = document.getElementById('settings-tourist-tax');

    if (nameInput) nameInput.value = settings.hostalName || 'Hostal Somnis';
    if (cityInput) cityInput.value = settings.city || 'Súria';
    if (roomPriceInput) roomPriceInput.value = settings.defaultRoomPrice ?? 89;
    if (breakfastPriceInput) breakfastPriceInput.value = settings.defaultBreakfastPrice ?? 8;
    if (taxPriceInput) taxPriceInput.value = settings.touristTax ?? settings.touristTaxRate ?? 0.99;

    // Outlook de la mare
    const outlookConfig = settings.outlook || {};
    const motherOutlookInput = document.getElementById('settings-mother-outlook');
    const outlookProviderSelect = document.getElementById('settings-outlook-provider');
    if (motherOutlookInput) motherOutlookInput.value = outlookConfig.motherEmail || settings.email || 'info@hostalsomnis.cat';
    if (outlookProviderSelect) outlookProviderSelect.value = outlookConfig.provider || 'web';

    // Supabase
    const supabaseConfig = settings.supabase || {};
    const urlInput = document.getElementById('settings-supabase-url');
    const keyInput = document.getElementById('settings-supabase-key');
    const defUrl = (window.CloudSync && CloudSync.DEFAULT_URL) || 'https://jzehbzjcwbahldmattbt.supabase.co';
    const defKey = (window.CloudSync && CloudSync.DEFAULT_KEY) || 'sb_publishable_AKIgnEw9PT2Sknj4WnaqoQ_dC1z7zNv';
    if (urlInput) urlInput.value = supabaseConfig.url || defUrl;
    if (keyInput) keyInput.value = supabaseConfig.anonKey || supabaseConfig.key || defKey;

    if (window.CloudSync) {
      CloudSync.updateStatusUI(CloudSync.isConnected, CloudSync.isConnected ? 'Connectat al núvol (Supabase ⚡)' : 'Desconnectat');
    }

    // Renderitzar configuració OTA (Booking.com & Airbnb)
    this.renderOtaRooms();
  },

  saveSettings(e) {
    if (e && e.preventDefault) e.preventDefault();
    
    const nameInput = document.getElementById('settings-name').value;
    const cityInput = document.getElementById('settings-city').value;
    const roomPrice = parseFloat(document.getElementById('settings-default-room-price').value) || 89;
    const breakfastPrice = parseFloat(document.getElementById('settings-default-breakfast-price').value) || 8;
    const touristTax = parseFloat(document.getElementById('settings-tourist-tax').value) || 0.99;

    const currentSettings = Store.get('settings', {});
    
    currentSettings.hostalName = nameInput;
    currentSettings.city = cityInput;
    currentSettings.defaultRoomPrice = roomPrice;
    currentSettings.defaultBreakfastPrice = breakfastPrice;
    currentSettings.touristTax = touristTax;
    currentSettings.touristTaxRate = touristTax;

    const motherOutlookInput = document.getElementById('settings-mother-outlook');
    const outlookProviderSelect = document.getElementById('settings-outlook-provider');
    currentSettings.outlook = {
      motherEmail: motherOutlookInput ? motherOutlookInput.value.trim() : (currentSettings.outlook?.motherEmail || currentSettings.email || 'info@hostalsomnis.cat'),
      provider: outlookProviderSelect ? outlookProviderSelect.value : (currentSettings.outlook?.provider || 'web')
    };

    const urlInput = document.getElementById('settings-supabase-url');
    const keyInput = document.getElementById('settings-supabase-key');
    if (urlInput && keyInput && urlInput.value.trim() && keyInput.value.trim()) {
      currentSettings.supabase = {
        url: urlInput.value.trim(),
        anonKey: keyInput.value.trim(),
        key: keyInput.value.trim()
      };
      if (window.CloudSync && !CloudSync.isConnected) {
        CloudSync.init();
      }
    }

    Store.set('settings', currentSettings);

    if (window.CloudSync && typeof CloudSync.pushSettings === 'function') {
      CloudSync.pushSettings(currentSettings);
    }
    
    alert('Ajustes guardados correctamente.');
    
    // Actualizar nombre en la UI
    const headerName = document.querySelector('.sidebar-title');
    if (headerName) headerName.textContent = nameInput;
  },

  async testAndSaveSupabase() {
    const urlInput = document.getElementById('settings-supabase-url');
    const keyInput = document.getElementById('settings-supabase-key');
    const testBtn = document.getElementById('btn-test-supabase');

    const url = urlInput ? urlInput.value.trim() : '';
    const key = keyInput ? keyInput.value.trim() : '';

    if (!url || !key) {
      alert('Si us plau, omple la URL del projecte Supabase i la Clau Pública (anon key).');
      return;
    }

    if (testBtn) {
      testBtn.disabled = true;
      testBtn.innerHTML = '🔄 Provant connexió...';
    }

    if (window.CloudSync) {
      const res = await CloudSync.connect(url, key, true);
      if (res.success) {
        // Desar a la configuració
        const currentSettings = Store.get('settings', {});
        currentSettings.supabase = { url, anonKey: key };
        Store.set('settings', currentSettings);
        alert('✓ Connexió amb el núvol Supabase establerta i desada correctament!\nAra les reserves se sincronitzaran en temps real entre tots els dispositius.');
      } else {
        alert('❌ Error de connexió amb Supabase:\n\n' + res.message + '\n\nRevisa que la URL i la clau siguin correctes i que hagis executat l\'script SQL a Supabase.');
      }
    }

    if (testBtn) {
      testBtn.disabled = false;
      testBtn.innerHTML = '⚡ Provar i Connectar Núvol';
    }
  },

  disconnectSupabase() {
    if (!confirm('Vols desconnectar la sincronització al núvol? L\'app continuarà funcionant en mode local.')) {
      return;
    }

    const urlInput = document.getElementById('settings-supabase-url');
    const keyInput = document.getElementById('settings-supabase-key');
    if (urlInput) urlInput.value = '';
    if (keyInput) keyInput.value = '';

    if (window.CloudSync) {
      CloudSync.disconnect();
    }
  },

  copySupabaseSql(btnEl) {
    const sql = `-- 1. Taula de reserves amb suport JSONB (ultra-resilient)
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilitar Row Level Security (RLS) amb accés lliure per a la PWA de l'Hostal
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Accés lliure Hostal" ON bookings FOR ALL USING (true) WITH CHECK (true);

-- 3. Habilitar Supabase Realtime per a notificacions instantànies mòbil <-> ordinador
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;`;

    const handleCopied = () => {
      const target = btnEl || document.getElementById('btn-copy-supabase-sql');
      if (target) {
        const orig = target.innerHTML;
        target.innerHTML = '✓ Script SQL copiat!';
        target.style.background = '#ECFDF5';
        target.style.color = '#059669';
        target.style.borderColor = '#10B981';
        setTimeout(() => {
          target.innerHTML = orig;
          target.style.background = '';
          target.style.color = '';
          target.style.borderColor = '';
        }, 3000);
      } else {
        alert('Script SQL copiat al porta-retalls!');
      }
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(sql).then(handleCopied).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = sql;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch(e){}
        document.body.removeChild(ta);
        handleCopied();
      });
    } else {
      const ta = document.createElement('textarea');
      ta.value = sql;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch(e){}
      document.body.removeChild(ta);
      handleCopied();
    }
  },

  async syncLocalToCloud() {
    if (!window.CloudSync || !CloudSync.isConnected) {
      alert('Primer has de connectar-te correctament a Supabase.');
      return;
    }
    if (confirm('Vols sincronitzar i pujar totes les reserves locals d\'aquest dispositiu cap a Supabase?')) {
      await CloudSync.syncLocalBookingsToCloud();
      alert('Reserves locals sincronitzades amb Supabase amb èxit!');
    }
  },

  renderOtaRooms() {
    const grid = document.getElementById('ota-rooms-config-grid');
    if (!grid) return;

    const settings = Store.get('settings', {});
    const otaSync = settings.ota_sync || {};
    const rooms = [
      { id: '101', name: 'Habitació 101', floor: '1a Planta' },
      { id: '102', name: 'Habitació 102', floor: '1a Planta' },
      { id: '201', name: 'Habitació 201', floor: '2a Planta' },
      { id: '202', name: 'Habitació 202', floor: '2a Planta' },
      { id: '301', name: 'Habitació 301', floor: '3a Planta' },
      { id: '302', name: 'Habitació 302', floor: '3a Planta' }
    ];

    const lastSyncEl = document.getElementById('ota-last-sync-badge');
    if (lastSyncEl) {
      if (settings.ota_last_sync) {
        const d = new Date(settings.ota_last_sync);
        const timeStr = d.toLocaleDateString('ca-ES') + ' a les ' + d.toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' });
        lastSyncEl.innerHTML = `🟢 Darrera sincronització: <strong>${timeStr}</strong>`;
        lastSyncEl.style.color = '#059669';
      } else {
        lastSyncEl.innerHTML = 'Sense sincronitzar encara';
        lastSyncEl.style.color = 'var(--text-muted)';
      }
    }

    grid.innerHTML = rooms.map(room => {
      const roomConf = otaSync[room.id] || { airbnbUrl: '', bookingUrl: '' };
      const exportUrl = `${window.location.origin}/api/calendar/export/${room.id}.ics`;

      return `
        <div class="ota-room-card" style="background: #FFF; border: 1px solid var(--border-color); border-radius: 8px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border-color);">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="room-num-badge" style="background: #1E293B; color: #FFF; padding: 2px 8px; border-radius: 6px; font-weight: 700; font-size: 13px;">${room.id}</span>
              <strong style="font-size: 14px; color: var(--text-main);">${room.name}</strong>
            </div>
            <span style="font-size: 11px; color: var(--text-muted); background: var(--bg-element); padding: 2px 6px; border-radius: 4px;">${room.floor}</span>
          </div>

          <!-- Airbnb iCal -->
          <div class="form-group" style="margin-bottom: 12px;">
            <label class="form-label" style="font-size: 12px; font-weight: 600; color: #E11D48; display: flex; align-items: center; gap: 6px;">
              <span>🔴 Enllaç iCal d'Airbnb</span>
            </label>
            <input type="url" id="ota-airbnb-${room.id}" class="form-input ota-airbnb-input" data-room="${room.id}" value="${roomConf.airbnbUrl || ''}" placeholder="https://www.airbnb.com/calendar/ical/...ics" style="font-size: 12px; font-family: monospace;">
          </div>

          <!-- Booking.com iCal -->
          <div class="form-group" style="margin-bottom: 14px;">
            <label class="form-label" style="font-size: 12px; font-weight: 600; color: #2563EB; display: flex; align-items: center; gap: 6px;">
              <span>🔵 Enllaç iCal de Booking.com</span>
            </label>
            <input type="url" id="ota-booking-${room.id}" class="form-input ota-booking-input" data-room="${room.id}" value="${roomConf.bookingUrl || ''}" placeholder="https://ical.booking.com/v1/export?..." style="font-size: 12px; font-family: monospace;">
          </div>

          <!-- Enllaç de sortida (Hostal Somnis -> Booking / Airbnb) -->
          <div style="padding-top: 10px; border-top: 1px dashed var(--border-color); display: flex; flex-direction: column; gap: 6px;">
            <div style="font-size: 11px; color: var(--text-muted);">
              Enllaç per posar a Booking i Airbnb:
            </div>
            <button type="button" class="btn btn-outline" onclick="SettingsModule.copyRoomIcalExportUrl('${room.id}', this)" style="display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 11.5px; padding: 6px 10px; background: #F8FAFC;">
              📋 Copiar enllaç iCal de l'Habitació ${room.id}
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  copyRoomIcalExportUrl(roomId, btnEl) {
    const exportUrl = `${window.location.origin}/api/calendar/export/${roomId}.ics`;
    const copyText = () => {
      if (btnEl) {
        const orig = btnEl.innerHTML;
        btnEl.innerHTML = '✓ Enllaç copiat!';
        btnEl.style.background = '#ECFDF5';
        btnEl.style.color = '#059669';
        setTimeout(() => {
          btnEl.innerHTML = orig;
          btnEl.style.background = '#F8FAFC';
          btnEl.style.color = '';
        }, 2500);
      }
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(exportUrl).then(copyText).catch(() => {
        prompt('Copia aquest enllaç iCal per a Booking/Airbnb:', exportUrl);
      });
    } else {
      prompt('Copia aquest enllaç iCal per a Booking/Airbnb:', exportUrl);
    }
  },

  saveOtaSettings() {
    const currentSettings = Store.get('settings', {});
    const otaSync = currentSettings.ota_sync || {};
    const rooms = ['101', '102', '201', '202', '301', '302'];

    rooms.forEach(id => {
      const airbnbInput = document.getElementById(`ota-airbnb-${id}`);
      const bookingInput = document.getElementById(`ota-booking-${id}`);
      otaSync[id] = {
        airbnbUrl: airbnbInput ? airbnbInput.value.trim() : '',
        bookingUrl: bookingInput ? bookingInput.value.trim() : ''
      };
    });

    currentSettings.ota_sync = otaSync;
    Store.set('settings', currentSettings);

    // Si hi ha backend, persistir a settings
    fetch('/api/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': Store.get('auth_token', '')
      },
      body: JSON.stringify({ ota_sync: otaSync })
    }).catch(err => console.warn('Ajustos desats localment (backend no accessible):', err.message));

    // Si tenim Supabase, sincronitzar també configuració
    if (window.CloudSync && typeof CloudSync.pushSettings === 'function') {
      CloudSync.pushSettings(currentSettings);
    }

    alert('✓ Enllaços de Booking.com i Airbnb desats correctament.');
  },

  async syncOtaNow() {
    this.saveOtaSettings();
    if (window.CalendarModule && typeof CalendarModule.syncOta === 'function') {
      await CalendarModule.syncOta();
      this.renderOtaRooms();
    } else {
      alert('Sincronització de calendaris completada.');
    }
  }
};

window.SettingsModule = SettingsModule;
