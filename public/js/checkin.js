/**
 * MÓDULO CHECK-IN (TEXTO 1) - HOSTAL SOMNIS
 */

const CheckinModule = {
  currentLang: 'ca',

  texts: {
    ca: `Hola,
Pel que fa a la reserva per a avui, adjuntem l'enllaç per completar el check-in en línia abans de l'arribada.

Una vegada emplenat, us enviarem els codis d'accés a l'allotjament.

Per a qualsevol dubte o assistència, no dubteu a contactar amb nosaltres.

Hostal Somnis`,

    es: `Hola, 
sobre la reserva para hoy, adjuntamos el enlace para completar el check-in online antes de la llegada.

Una vez cumplimentado, enviaremos los códigos de acceso al alojamiento.

Para cualquier duda o asistencia, no duden en contactarnos.

Hostal Somnis`,

    en: `Hello,
Regarding your reservation for today, please find attached the link to complete the online check-in prior to arrival.

Once completed, we will send you the access codes for the accommodation.

If you have any questions or require assistance, please do not hesitate to contact us.

Hostal Somnis`,

    fr: `Bonjour,
Concernant votre réservation pour aujourd'hui, vous trouverez ci-joint le lien pour effectuer l'enregistrement 
en ligne avant votre arrivée.

Une fois rempli, nous vous enverrons les codes d'accès à l'hébergement.

Pour toute question ou assistance, n'hésitez pas à nous contacter.

Hostal Somnis`
  },

  init() {
    this.render();
  },

  setLang(lang) {
    this.currentLang = lang;
    this.render();
  },

  render() {
    const textContainer = document.getElementById('checkin-text-display');
    if (textContainer) {
      textContainer.innerText = this.texts[this.currentLang] || this.texts.ca;
    }

    // Actualizar apariencia de los botones de idioma
    document.querySelectorAll('.checkin-lang-btn').forEach(btn => {
      if (btn.getAttribute('data-lang') === this.currentLang) {
        btn.className = 'btn btn-primary checkin-lang-btn';
      } else {
        btn.className = 'btn btn-outline checkin-lang-btn';
      }
    });
  },

  async copyText() {
    const text = this.texts[this.currentLang] || this.texts.ca;
    try {
      await navigator.clipboard.writeText(text);
      alert('¡Mensaje de check-in copiado al portapapeles!');
    } catch (err) {
      const tempTextArea = document.createElement("textarea");
      tempTextArea.value = text;
      document.body.appendChild(tempTextArea);
      tempTextArea.select();
      document.execCommand("copy");
      document.body.removeChild(tempTextArea);
      alert('¡Mensaje de check-in copiado al portapapeles!');
    }
  }
};

window.CheckinModule = CheckinModule;
