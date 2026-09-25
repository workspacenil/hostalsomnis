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
  },

  saveSettings(e) {
    e.preventDefault();
    
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

    Store.set('settings', currentSettings);
    
    alert('Ajustes guardados correctamente.');
    
    // Actualizar nombre en la UI
    const headerName = document.querySelector('.sidebar-title');
    if (headerName) headerName.textContent = nameInput;
  }
};

window.SettingsModule = SettingsModule;
