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

    if (nameInput) nameInput.value = settings.hostalName || 'Hostal Somnis';
    if (cityInput) cityInput.value = settings.city || 'Súria';
  },

  saveSettings(e) {
    e.preventDefault();
    
    const nameInput = document.getElementById('settings-name').value;
    const cityInput = document.getElementById('settings-city').value;

    const currentSettings = Store.get('settings', {});
    
    currentSettings.hostalName = nameInput;
    currentSettings.city = cityInput;

    Store.set('settings', currentSettings);
    
    alert('Ajustes guardados correctamente.');
    
    // Actualizar nombre en la UI
    const headerName = document.querySelector('.sidebar-title');
    if (headerName) headerName.textContent = nameInput;
  }
};

window.SettingsModule = SettingsModule;
