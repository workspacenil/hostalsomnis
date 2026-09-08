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
  // GESTIÓN DE API KEYS (MULTI-IA: GEMINI, GROQ, OPENROUTER, MISTRAL)
  // =========================================================================
  getConfig() {
    let config = Store.get('ai_keys_config');
    if (!config) {
      // Migrar de la configuración previa si existía
      const oldGemini = Store.get('gemini_config', {});
      config = {
        geminiKeys: oldGemini.apiKey ? [oldGemini.apiKey] : [],
        groqKey: '',
        openRouterKey: '',
        mistralKey: '',
        customTone: oldGemini.customTone || 'Responde siempre con el tono familiar, cercano, muy educado y hospitalario de mi madre para Hostal Somnis en Súria. Sé clara, amable y resolutiva.'
      };
      Store.set('ai_keys_config', config);
    }
    return config;
  },

  renderApiKeyStatus() {
    const config = this.getConfig();
    const statusBadge = document.getElementById('mail-api-status-badge');
    const geminiTextarea = document.getElementById('mail-gemini-keys-input');
    const groqInput = document.getElementById('mail-groq-key-input');
    const openRouterInput = document.getElementById('mail-openrouter-key-input');
    const mistralInput = document.getElementById('mail-mistral-key-input');
    const customToneInput = document.getElementById('mail-custom-tone-input');

    if (geminiTextarea) {
      geminiTextarea.value = (config.geminiKeys || []).join('\n');
    }
    if (groqInput) groqInput.value = config.groqKey || '';
    if (openRouterInput) openRouterInput.value = config.openRouterKey || '';
    if (mistralInput) mistralInput.value = config.mistralKey || '';
    if (customToneInput) customToneInput.value = config.customTone || '';

    // Contar total de claves disponibles
    const geminiCount = (config.geminiKeys || []).filter(k => k.trim().length > 10).length;
    const groqCount = config.groqKey && config.groqKey.trim().length > 10 ? 1 : 0;
    const openRouterCount = config.openRouterKey && config.openRouterKey.trim().length > 10 ? 1 : 0;
    const mistralCount = config.mistralKey && config.mistralKey.trim().length > 10 ? 1 : 0;
    const totalCount = geminiCount + groqCount + openRouterCount + mistralCount;

    if (statusBadge) {
      if (totalCount > 0) {
        statusBadge.innerHTML = `
          <span style="display: inline-flex; align-items: center; gap: 6px; color: var(--success); font-size: 12px; font-weight: 600; background: #ECFDF5; border: 1px solid #A7F3D0; padding: 4px 10px; border-radius: 16px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            ${totalCount} IA${totalCount === 1 ? '' : 's'} / Clave${totalCount === 1 ? '' : 's'} lista${totalCount === 1 ? '' : 's'} (Fallback activo)
          </span>`;
      } else {
        statusBadge.innerHTML = `
          <span style="display: inline-flex; align-items: center; gap: 5px; color: #D97706; font-size: 12px; font-weight: 500; background: #FFFBEB; border: 1px solid #FDE68A; padding: 4px 10px; border-radius: 16px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            Configurar API Keys
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
    const geminiTextarea = document.getElementById('mail-gemini-keys-input');
    const groqInput = document.getElementById('mail-groq-key-input');
    const openRouterInput = document.getElementById('mail-openrouter-key-input');
    const mistralInput = document.getElementById('mail-mistral-key-input');
    const customToneInput = document.getElementById('mail-custom-tone-input');

    const geminiRaw = geminiTextarea ? geminiTextarea.value : '';
    const geminiKeys = geminiRaw
      .split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 5);

    const newConfig = {
      geminiKeys: geminiKeys,
      groqKey: groqInput ? groqInput.value.trim() : '',
      openRouterKey: openRouterInput ? openRouterInput.value.trim() : '',
      mistralKey: mistralInput ? mistralInput.value.trim() : '',
      customTone: customToneInput ? customToneInput.value.trim() : ''
    };

    Store.set('ai_keys_config', newConfig);
    this.renderApiKeyStatus();
    alert(`Configuración guardada correctamente con ${geminiKeys.length} clave(s) de Google Gemini y proveedores de respaldo.`);
    this.toggleConfigDrawer();
  },

  // =========================================================================
  // CLIENTES DE API INDIVIDUALES (HTTP DIRECTO)
  // =========================================================================
  async callGemini(apiKey, systemPrompt, userMessage) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { temperature: 0.35, topP: 0.95 }
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err.error?.message || `HTTP ${res.status}`;
      throw new Error(`Google Gemini (${res.status}): ${msg}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Google Gemini no devolvió contenido.');
    return text.trim();
  },

  async callGroq(apiKey, systemPrompt, userMessage) {
    const url = 'https://api.groq.com/openai/v1/chat/completions';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.35
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err.error?.message || `HTTP ${res.status}`;
      throw new Error(`Groq (${res.status}): ${msg}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('Groq no devolvió contenido.');
    return text.trim();
  },

  async callOpenRouter(apiKey, systemPrompt, userMessage) {
    const url = 'https://openrouter.ai/api/v1/chat/completions';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.35
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err.error?.message || `HTTP ${res.status}`;
      throw new Error(`OpenRouter (${res.status}): ${msg}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('OpenRouter no devolvió contenido.');
    return text.trim();
  },

  async callMistral(apiKey, systemPrompt, userMessage) {
    const url = 'https://api.mistral.ai/v1/chat/completions';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.35
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err.error?.message || `HTTP ${res.status}`;
      throw new Error(`Mistral (${res.status}): ${msg}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('Mistral no devolvió contenido.');
    return text.trim();
  },

  // =========================================================================
  // GENERACIÓN CON FALLBACK EN CASCADA INTELIGENTE
  // =========================================================================
  buildQueue(config) {
    const queue = [];

    // 1º Prioridad: Claves de Google Gemini (gemini-2.5-flash)
    if (config.geminiKeys && Array.isArray(config.geminiKeys)) {
      config.geminiKeys.forEach((k, idx) => {
        const cleanKey = k.trim();
        if (cleanKey.length > 8) {
          queue.push({
            name: `Google Gemini (Clave #${idx + 1})`,
            fn: (sys, usr) => this.callGemini(cleanKey, sys, usr)
          });
        }
      });
    }

    // 2º Prioridad: Groq Llama 3.3 70B (ultra rápida)
    if (config.groqKey && config.groqKey.trim().length > 8) {
      queue.push({
        name: 'Groq (Llama 3.3 70B - Ultra Rápida)',
        fn: (sys, usr) => this.callGroq(config.groqKey.trim(), sys, usr)
      });
    }

    // 3º Prioridad: OpenRouter (modelos free)
    if (config.openRouterKey && config.openRouterKey.trim().length > 8) {
      queue.push({
        name: 'OpenRouter (Llama 3.3 Free)',
        fn: (sys, usr) => this.callOpenRouter(config.openRouterKey.trim(), sys, usr)
      });
    }

    // 4º Prioridad: Mistral
    if (config.mistralKey && config.mistralKey.trim().length > 8) {
      queue.push({
        name: 'Mistral AI',
        fn: (sys, usr) => this.callMistral(config.mistralKey.trim(), sys, usr)
      });
    }

    return queue;
  },

  showLoadingMessage(msg, isFallbackWarning = false) {
    const textEl = document.getElementById('mail-loading-status-text');
    const warningBox = document.getElementById('mail-fallback-warning');
    
    if (textEl) textEl.textContent = msg;
    if (warningBox) {
      if (isFallbackWarning) {
        warningBox.innerHTML = `
          <div style="background: #FEF3C7; border: 1px solid #F59E0B; color: #92400E; padding: 8px 12px; border-radius: 6px; font-size: 12px; margin-top: 8px; line-height: 1.4; display: flex; align-items: center; gap: 8px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            <span><strong>Aviso:</strong> ${msg}</span>
          </div>`;
        warningBox.style.display = 'block';
      } else {
        warningBox.style.display = 'none';
      }
    }
  },

  async generateResponse() {
    const config = this.getConfig();
    const queue = this.buildQueue(config);

    if (queue.length === 0) {
      alert('No tienes ninguna API Key configurada.\n\nPulsa en "Configurar API Keys" arriba a la derecha para añadir tus claves gratuitas de Google Gemini o Groq.');
      this.toggleConfigDrawer();
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
    const providerBadge = document.getElementById('mail-provider-used-badge');

    if (generateBtn) generateBtn.disabled = true;
    if (loadingState) loadingState.style.display = 'flex';
    if (resultBox) resultBox.style.display = 'none';

    const systemPrompt = this.buildSystemPrompt(MOTHER_TRAINING_MAILS, config.customTone);
    const userMessage = this.buildUserMessage(incomingMail, lang, notes);

    let successResponse = null;
    let usedProviderName = null;
    const failedErrors = [];

    // Bucle en cascada (fallback)
    for (let i = 0; i < queue.length; i++) {
      const current = queue[i];

      if (i > 0) {
        // Informar al usuario de que se agotaron los tokens de la anterior y tardará unos segundos más
        this.showLoadingMessage(
          `La IA anterior agotó su cuota de tokens o no respondió. Cambiando de inteligencia artificial a "${current.name}"... Tardará un poco más en redactar.`,
          true
        );
        // Pequeña pausa para que el navegador renderice la advertencia
        await new Promise(resolve => setTimeout(resolve, 800));
      } else {
        this.showLoadingMessage(`Conectando con ${current.name} para redactar la respuesta...`, false);
      }

      try {
        console.log(`Intentando generar respuesta con: ${current.name}`);
        successResponse = await current.fn(systemPrompt, userMessage);
        usedProviderName = current.name;
        break; // Éxito! Salir del bucle
      } catch (err) {
        console.warn(`Error con ${current.name}:`, err.message);
        failedErrors.push(`${current.name}: ${err.message}`);
      }
    }

    if (generateBtn) generateBtn.disabled = false;
    if (loadingState) loadingState.style.display = 'none';

    if (successResponse) {
      if (resultText) resultText.value = successResponse;
      if (providerBadge) {
        providerBadge.textContent = `Generado con: ${usedProviderName}`;
      }
      if (resultBox) {
        resultBox.style.display = 'block';
        resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    } else {
      // Si fallaron todas las claves
      const errorDetails = failedErrors.join('\n• ');
      alert(`No se pudo generar la respuesta con ninguna de las IAs configuradas.\n\nDetalles:\n• ${errorDetails}\n\nPor favor revisa tus claves o añade claves adicionales en la configuración.`);
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
  },

  // =========================================================================
  // ACORDEÓN (MINIMIZAR / EXPANDIR CON FLECHITA)
  // =========================================================================
  toggleAccordion(name) {
    const body = document.getElementById(`accordion-${name}-body`);
    const arrow = document.getElementById(`arrow-${name}`);
    if (!body) return;

    const isHidden = body.style.display === 'none';
    body.style.display = isHidden ? 'block' : 'none';
    if (arrow) {
      arrow.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(-90deg)';
    }
  },

  // =========================================================================
  // GENERACIÓN DE CONFIRMACIÓN DE RESERVA CON PLANTILLA E IA
  // =========================================================================
  async generateConfirmation() {
    const input = document.getElementById('confirmacio-input-text').value.trim();
    if (!input) {
      alert('Si us plau, enganxa les dades o el correu de la reserva.');
      document.getElementById('confirmacio-input-text').focus();
      return;
    }

    const lang = document.getElementById('confirmacio-lang').value;
    const config = this.getConfig();
    const queue = this.buildQueue(config);

    if (queue.length === 0) {
      alert('No tens cap API Key configurada. Configura-la a dalt a la dreta.');
      this.toggleConfigDrawer();
      return;
    }

    const btn = document.getElementById('btn-generate-confirmacio');
    const loading = document.getElementById('confirmacio-loading');
    const resultText = document.getElementById('confirmacio-result-text');

    if (btn) btn.disabled = true;
    if (loading) loading.style.display = 'flex';

    try {
      const systemPrompt = `Ets l'assistent oficial d'atenció al client d'Hostal Somnis a Súria (Barcelona).
La teva tasca és extreure les dades de reserva que t'indica l'usuari i redactar la confirmació oficial de reserva de forma coherent, amable, impecable i elegant, omplint cada camp (nom de l'hoste, dates d'arribada i sortida, habitacions, imports, informació d'arribada i esmorzar).
Si es reserven diverses habitacions o una sola, adapta la redacció de manera natural i professional.`;

      const userMessage = `Redacta la confirmació de reserva oficial en idioma "${lang}" per a aquestes dades:\n\n"""\n${input}\n"""`;

      let text = null;
      for (let i = 0; i < queue.length; i++) {
        try {
          text = await queue[i].fn(systemPrompt, userMessage);
          break;
        } catch (e) {
          console.warn(`Error confirmació amb ${queue[i].name}:`, e);
        }
      }

      if (text) {
        if (resultText) resultText.value = text;
      } else {
        alert('No s\'ha pogut generar la confirmació amb cap de les IAs.');
      }
    } finally {
      if (btn) btn.disabled = false;
      if (loading) loading.style.display = 'none';
    }
  },

  copyConfirmation() {
    const textEl = document.getElementById('confirmacio-result-text');
    if (!textEl || !textEl.value) return;

    navigator.clipboard.writeText(textEl.value).then(() => {
      const btn = document.getElementById('btn-copy-confirmacio');
      if (btn) {
        const originalHtml = btn.innerHTML;
        btn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          ¡Copiat!
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
      alert('Error al copiar');
    });
  }
};

window.MailsModule = MailsModule;


