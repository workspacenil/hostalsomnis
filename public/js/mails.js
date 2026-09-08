/**
 * MÓDULO DE MAILS CON ASISTENTE IA (GOOGLE GEMINI)
 * - Generador de respuestas con IA para Hostal Somnis
 * - Correos de entrenamiento de la madre integrados fijos en el código (protegidos contra modificaciones accidentales)
 * - Configuración modificable de la Google API Key desde la UI
 */

// =========================================================================
// BASE DE ENTRENAMIENTO INTEGRADA (CORREOS Y RESPUESTAS DE TU MADRE)
// Estos correos están integrados en la aplicación para que la IA aprenda su tono y no se puedan borrar ni tocar desde la app.
// =========================================================================
const MOTHER_TRAINING_MAILS = [
  {
    tema: 'Aparcamiento y cuna para bebé',
    correo_recibido: 'Hola, tenemos una reserva para este fin de semana. ¿Hay sitio para aparcar el coche cerca? Y querríamos saber si tenéis cuna para nuestro bebé de 8 meses.',
    respuesta_madre: 'Hola! Encantada de saludarte. Sí, justo delante del hostal y en las calles contiguas hay aparcamiento público gratuito y muy tranquilo donde siempre se encuentra sitio fácilmente. En cuanto a la cuna, sí que tenemos cuna de viaje disponible y os la podemos dejar montada y lista en la habitación sin ningún suplemento. Avisadnos si necesitáis cualquier otra cosita. ¡Hasta pronto!'
  },
  {
    tema: 'Llegada tarde por la noche (check-in tardío)',
    correo_recibido: 'Hola, llegaremos tarde el viernes, probablemente hacia las 23:30h. ¿Habrá problema para hacer el check-in a esa hora?',
    respuesta_madre: 'Hola! No hay ningún problema. Nuestro sistema de entrada es totalmente autónomo mediante códigos de seguridad para la puerta y la cajita de llaves. El mismo día de vuestra llegada os mandamos las instrucciones detalladas para que podáis entrar tranquilamente a la hora que lleguéis sin prisas. ¡Buen viaje!'
  },
  {
    tema: 'Desayuno y horarios',
    correo_recibido: 'Buenos días, nos gustaría saber si el desayuno está incluido o cómo funciona, y los horarios que tenéis.',
    respuesta_madre: 'Hola! El desayuno es tipo buffet continental con embutidos de la zona, tostadas, bollería, café y zumo, y se sirve habitualmente de 08:00 a 10:00. Si no lo teníais contratado en la reserva, podéis contratarlo a la llegada por 13€ por persona. ¡Cualquier duda nos decís!'
  }
];

const MailsModule = {
  init() {
    this.render();
  },

  render() {
    this.renderApiKeyStatus();
  },

  // =========================================================================
  // GESTIÓN DE GOOGLE GEMINI API KEY (MODIFICABLE DESDE LA APP)
  // =========================================================================
  getConfig() {
    return Store.get('gemini_config', {
      apiKey: '',
      model: 'gemini-2.5-flash',
      customTone: 'Responde siempre con el tono familiar, cercano, muy educado y hospitalario de mi madre para Hostal Somnis en Súria. Sé clara, amable y resolutiva.'
    });
  },

  renderApiKeyStatus() {
    const config = this.getConfig();
    const statusBadge = document.getElementById('mail-api-status-badge');
    const apiKeyInput = document.getElementById('mail-api-key-input');
    const customToneInput = document.getElementById('mail-custom-tone-input');

    if (apiKeyInput) {
      apiKeyInput.value = config.apiKey || '';
    }
    if (customToneInput) {
      customToneInput.value = config.customTone || '';
    }

    if (statusBadge) {
      if (config.apiKey && config.apiKey.trim().length > 10) {
        statusBadge.innerHTML = `
          <span style="display: inline-flex; align-items: center; gap: 5px; color: var(--success); font-size: 12px; font-weight: 600;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            Google API Conectada
          </span>`;
      } else {
        statusBadge.innerHTML = `
          <span style="display: inline-flex; align-items: center; gap: 5px; color: #D97706; font-size: 12px; font-weight: 500;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            API Key pendiente
          </span>`;
      }
    }
  },

  toggleConfigDrawer() {
    const drawer = document.getElementById('mail-config-drawer');
    if (drawer) {
      drawer.style.display = drawer.style.display === 'none' ? 'block' : 'none';
    }
  },

  saveConfig(e) {
    if (e) e.preventDefault();
    const keyInput = document.getElementById('mail-api-key-input');
    const toneInput = document.getElementById('mail-custom-tone-input');
    const current = this.getConfig();

    current.apiKey = keyInput ? keyInput.value.trim() : '';
    if (toneInput) current.customTone = toneInput.value.trim();

    Store.set('gemini_config', current);
    this.renderApiKeyStatus();
    alert('Configuración de Google Gemini guardada correctamente.');
    this.toggleConfigDrawer();
  },

  async testConnection() {
    const keyInput = document.getElementById('mail-api-key-input');
    const apiKey = keyInput ? keyInput.value.trim() : this.getConfig().apiKey;
    const testBtn = document.getElementById('btn-test-api');

    if (!apiKey) {
      alert('Por favor, introduce primero tu API Key de Google Gemini.');
      return;
    }

    if (testBtn) {
      testBtn.disabled = true;
      testBtn.textContent = 'Verificando con Google...';
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Hola, responde exactamente "OK".' }] }]
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Error HTTP ${res.status}`);
      }

      alert('¡Conexión exitosa con Google Gemini! Tu API Key funciona a la perfección.');
      // Auto-guardar la clave si funcionó
      const current = this.getConfig();
      current.apiKey = apiKey;
      Store.set('gemini_config', current);
      this.renderApiKeyStatus();
    } catch (err) {
      alert(`Error al conectar con Google Gemini:\n${err.message}\n\nAsegúrate de que la API Key es correcta.`);
    } finally {
      if (testBtn) {
        testBtn.disabled = false;
        testBtn.textContent = 'Verificar Conexión';
      }
    }
  },

  // =========================================================================
  // GENERACIÓN DE RESPUESTAS CON IA (GOOGLE GEMINI)
  // =========================================================================
  async generateResponse() {
    const config = this.getConfig();
    const apiKey = config.apiKey ? config.apiKey.trim() : '';

    if (!apiKey) {
      alert('Para usar la IA necesitas configurar tu API Key de Google.\n\nPuedes introducirla en "Google API Key" arriba a la derecha.');
      this.toggleConfigDrawer();
      const input = document.getElementById('mail-api-key-input');
      if (input) input.focus();
      return;
    }

    const incomingMail = document.getElementById('mail-incoming-text').value.trim();
    if (!incomingMail) {
      alert('Por favor, pega el correo o mensaje del cliente que deseas responder.');
      document.getElementById('mail-incoming-text').focus();
      return;
    }

    const lang = document.getElementById('mail-reply-lang').value;
    const notes = document.getElementById('mail-additional-notes').value.trim();

    const generateBtn = document.getElementById('btn-generate-mail');
    const loadingState = document.getElementById('mail-generating-loading');
    const resultBox = document.getElementById('mail-result-box');
    const resultText = document.getElementById('mail-generated-result');

    if (generateBtn) generateBtn.disabled = true;
    if (loadingState) loadingState.style.display = 'flex';

    try {
      const systemPrompt = this.buildSystemPrompt(MOTHER_TRAINING_MAILS, config.customTone);
      const userMessage = this.buildUserMessage(incomingMail, lang, notes);

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model || 'gemini-2.5-flash'}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: userMessage }]
            }
          ],
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          generationConfig: {
            temperature: 0.35,
            topP: 0.95
          }
        })
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error?.message || `Error del servidor de Google (${response.status})`);
      }

      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!generatedText) {
        throw new Error('Google no devolvió ningún texto.');
      }

      if (resultText) {
        resultText.value = generatedText.trim();
      }
      if (resultBox) {
        resultBox.style.display = 'block';
        resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    } catch (err) {
      console.error('Error generando respuesta:', err);
      alert(`No se pudo generar la respuesta con IA:\n${err.message}`);
    } finally {
      if (generateBtn) generateBtn.disabled = false;
      if (loadingState) loadingState.style.display = 'none';
    }
  },

  buildSystemPrompt(trainings, customTone) {
    let prompt = `Eres el asistente oficial de atención al cliente y redacción de correos para "Hostal Somnis", situado en Súria (Barcelona, comarca del Bages).
Tu misión es redactar la respuesta perfecta a cualquier correo o mensaje de un huésped o cliente, imitando exactamente la personalidad, el tono, la cercanía, la calidez y las expresiones de la dueña del hostal (la madre del usuario).

CARACTERÍSTICAS DEL TONO:
- Tono familiar, muy amable, educado, hospitalario, cercano y resolutivo.
- Da la bienvenida con calidez y despídete deseando un buen viaje o estancia.
- Transmite tranquilidad y confianza ante cualquier duda del cliente.
- ${customTone || ''}

INFORMACIÓN CLAVE DE HOSTAL SOMNIS (SÚRIA):
- Ubicación: Súria (Barcelona).
- Sistema de acceso: Entrada autónoma y flexible con cerradura de teclado numérico en la puerta principal y cajitas de llaves con código, sin límite de hora de llegada tras recibir los códigos.
- Desayuno (Esmorzar): Servicio disponible con opción de contratarlo (habitualmente de 08:00 a 10:00).
- Aparcamiento: Hay aparcamiento público gratuito y muy tranquilo justo delante y en las calles alrededor.
- Limpieza: Servicio disponible y sistema de cartel verde en la puerta.

BASE DE ENTRENAMIENTO - EJEMPLOS REALES DE MI MADRE:
A continuación tienes los ejemplos oficiales con correos reales recibidos y las respuestas exactas que redactó mi madre. Debes tomar estos ejemplos como guía suprema para tu redacción, vocabulario y tono:

`;

    trainings.forEach((item, index) => {
      prompt += `\n--- EJEMPLO OFICIAL #${index + 1} (${item.tema}) ---
[Correo del cliente]:
${item.correo_recibido}

[Respuesta exacta de mi madre]:
${item.respuesta_madre}
----------------------------------------\n`;
    });

    prompt += `\nINSTRUCCIÓN FINAL:
Genera ÚNICAMENTE el texto del correo de respuesta listo para enviar, sin preámbulos tipo "Aquí tienes la respuesta" ni comentarios meta. El texto debe empezar directamente con el saludo (ej: "Hola [Nombre]!", "Benvolgut/da...", etc.) y terminar con la firma cordial.`;

    return prompt;
  },

  buildUserMessage(incomingMail, lang, notes) {
    let msg = `Por favor redacta la respuesta al siguiente correo de un cliente:\n\n"""\n${incomingMail}\n"""\n`;

    if (lang === 'auto') {
      msg += `\n- Idioma: Responde en el mismo idioma en el que te escribe el cliente (Català, Castellano, English o Français).`;
    } else {
      const langNames = { ca: 'Català', es: 'Castellano (Español)', en: 'English', fr: 'Français' };
      msg += `\n- Idioma obligatorio: Redacta la respuesta en ${langNames[lang] || lang}.`;
    }

    if (notes) {
      msg += `\n- Puntos específicos o instrucciones que debes incluir en la respuesta:\n${notes}`;
    }

    return msg;
  },

  copyGeneratedMail() {
    const textEl = document.getElementById('mail-generated-result');
    if (!textEl || !textEl.value) return;

    navigator.clipboard.writeText(textEl.value).then(() => {
      const btn = document.getElementById('btn-copy-mail');
      if (btn) {
        const originalHtml = btn.innerHTML;
        btn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          ¡Copiado!
        `;
        btn.style.backgroundColor = 'var(--success)';
        btn.style.borderColor = 'var(--success)';
        setTimeout(() => {
          btn.innerHTML = originalHtml;
          btn.style.backgroundColor = '';
          btn.style.borderColor = '';
        }, 2000);
      }
    }).catch(err => {
      console.error('Error al copiar:', err);
      alert('No se pudo copiar automáticamente. Por favor selecciónalo y cópialo manualmente.');
    });
  },

  clearGenerated() {
    const textEl = document.getElementById('mail-generated-result');
    const resultBox = document.getElementById('mail-result-box');
    if (textEl) textEl.value = '';
    if (resultBox) resultBox.style.display = 'none';
  }
};

window.MailsModule = MailsModule;

