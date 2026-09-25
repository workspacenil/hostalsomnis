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

    // Supabase
    const supabaseConfig = settings.supabase || {};
    const urlInput = document.getElementById('settings-supabase-url');
    const keyInput = document.getElementById('settings-supabase-key');
    if (urlInput) urlInput.value = supabaseConfig.url || '';
    if (keyInput) keyInput.value = supabaseConfig.anonKey || supabaseConfig.key || '';

    if (window.CloudSync) {
      CloudSync.updateStatusUI(CloudSync.isConnected, CloudSync.isConnected ? 'Connectat al núvol (Temps real actiu ⚡)' : 'Desconnectat');
    }
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
  }
};

window.SettingsModule = SettingsModule;
