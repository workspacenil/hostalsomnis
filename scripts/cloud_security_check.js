#!/usr/bin/env node

/**
 * SISTEMA DE VIGILÀNCIA I REVISIÓ DE SEGURETAT 24/7 - HOSTAL SOMNIS
 * Execució 100% autònoma al núvol de GitHub Actions.
 * Audita l'estat de la web, la base de dades Supabase, la integritat dels preus
 * i la seguretat sense dependre de cap equip encès en local.
 */

const CONFIG = {
  webUrl: 'https://workspacenil.github.io/hostalsomnis/',
  supabaseBaseUrl: 'https://jzehbzjcwbahldmattbt.supabase.co',
  supabaseApiKey: 'sb_publishable_AKIgnEw9PT2Sknj4WnaqoQ_dC1z7zNv',
  expectedPrices: {
    roomPrice: 89,
    breakfastPrice: 8,
    touristTax: 0.99
  },
  maxWebResponseTimeMs: 2000,
  maxDbResponseTimeMs: 2500
};

async function measureFetch(url, options = {}) {
  const t0 = performance.now();
  const res = await fetch(url, options);
  const duration = Math.round(performance.now() - t0);
  return { res, duration };
}

async function runAudit() {
  const startTime = new Date();
  console.log('======================================================================');
  console.log('🛡️  HOSTAL SOMNIS - SISTEMA DE VIGILÀNCIA I SEGURETAT 24/7 (NÚVOL)');
  console.log(`📅 Data d\'execució: ${startTime.toISOString()} (UTC)`);
  console.log(`📍 Web objectiu:   ${CONFIG.webUrl}`);
  console.log(`☁️  Supabase BD:    ${CONFIG.supabaseBaseUrl}`);
  console.log('======================================================================\n');

  let passed = true;
  const issues = [];

  // -------------------------------------------------------------------------
  // CHECK A: Estat de la Web a GitHub Pages
  // -------------------------------------------------------------------------
  console.log('1️⃣ [WEB] Comprovant disponibilitat a GitHub Pages...');
  let webText = '';
  try {
    const { res, duration } = await measureFetch(CONFIG.webUrl, {
      headers: { 'User-Agent': 'HostalSomnis-CloudMonitor/1.0' }
    });

    if (res.status !== 200) {
      throw new Error(`Codi HTTP inesperat: ${res.status} (esperat 200)`);
    }

    if (duration > CONFIG.maxWebResponseTimeMs) {
      console.warn(`   ⚠️ Alerta: Temps de resposta web alt: ${duration}ms (límit: ${CONFIG.maxWebResponseTimeMs}ms)`);
    }

    webText = await res.text();
    if (!webText.includes('Hostal Somnis')) {
      throw new Error('La pàgina no conté el títol ni la referència a "Hostal Somnis".');
    }

    console.log(`   ✅ Web accessible: HTTP ${res.status} en ${duration}ms.`);
    console.log(`   ✅ Títol i contingut essencial verificat (${webText.length} bytes rebuts).`);
  } catch (err) {
    passed = false;
    const msg = `Fallada a la web de GitHub Pages: ${err.message}`;
    issues.push(msg);
    console.error(`   ❌ ${msg}`);
  }

  // -------------------------------------------------------------------------
  // CHECK B: Connexió amb Supabase (Taula 'bookings')
  // -------------------------------------------------------------------------
  console.log('\n2️⃣ [BASE DE DADES] Comprovant connexió i estat de la taula "bookings"...');
  let bookingsList = [];
  try {
    const bookingsEndpoint = `${CONFIG.supabaseBaseUrl}/rest/v1/bookings?select=id`;
    const { res, duration } = await measureFetch(bookingsEndpoint, {
      headers: {
        'apikey': CONFIG.supabaseApiKey,
        'Authorization': `Bearer ${CONFIG.supabaseApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (res.status !== 200) {
      throw new Error(`Supabase ha respost amb codi HTTP ${res.status}`);
    }

    if (duration > CONFIG.maxDbResponseTimeMs) {
      console.warn(`   ⚠️ Alerta: Temps de resposta de Supabase alt: ${duration}ms`);
    }

    bookingsList = await res.json();
    if (!Array.isArray(bookingsList)) {
      throw new Error('La resposta de Supabase no és una llista vàlida.');
    }

    console.log(`   ✅ Supabase connectat correctament: HTTP 200 en ${duration}ms.`);
    console.log(`   ✅ Taula "bookings" activa amb ${bookingsList.length} registres trobats.`);
  } catch (err) {
    passed = false;
    const msg = `Fallada de connexió amb Supabase: ${err.message}`;
    issues.push(msg);
    console.error(`   ❌ ${msg}`);
  }

  // -------------------------------------------------------------------------
  // CHECK C: Integritat dels Preus i Ajustes ('app_settings')
  // -------------------------------------------------------------------------
  console.log('\n3️⃣ [AJUSTES I PREUS] Verificant paràmetres de l\'establiment ("app_settings")...');
  try {
    const settingsEndpoint = `${CONFIG.supabaseBaseUrl}/rest/v1/bookings?id=eq.app_settings&select=*`;
    const { res, duration } = await measureFetch(settingsEndpoint, {
      headers: {
        'apikey': CONFIG.supabaseApiKey,
        'Authorization': `Bearer ${CONFIG.supabaseApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (res.status !== 200) {
      throw new Error(`Codi HTTP ${res.status} al consultar "app_settings"`);
    }

    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error('El registre de configuració "app_settings" no s\'ha trobat a la base de dades.');
    }

    const settingsRecord = rows[0];
    const data = settingsRecord.data || {};

    const roomPrice = Number(data.defaultRoomPrice);
    const breakfastPrice = Number(data.defaultBreakfastPrice);
    const touristTax = Number(data.touristTaxRate);

    console.log(`   ℹ️ Preus actuals a la base de dades:`);
    console.log(`      - Habitació:      ${roomPrice}€ (esperat: ${CONFIG.expectedPrices.roomPrice}€)`);
    console.log(`      - Esmorzar:       ${breakfastPrice}€ (esperat: ${CONFIG.expectedPrices.breakfastPrice}€)`);
    console.log(`      - Taxa turística: ${touristTax}€ (esperat: ${CONFIG.expectedPrices.touristTax}€)`);

    if (roomPrice !== CONFIG.expectedPrices.roomPrice) {
      throw new Error(`Incoherència de preu habitació: ${roomPrice}€ en comptes de ${CONFIG.expectedPrices.roomPrice}€.`);
    }

    if (breakfastPrice !== CONFIG.expectedPrices.breakfastPrice) {
      throw new Error(`Incoherència de preu esmorzar: ${breakfastPrice}€ en comptes de ${CONFIG.expectedPrices.breakfastPrice}€.`);
    }

    if (Math.abs(touristTax - CONFIG.expectedPrices.touristTax) > 0.001) {
      throw new Error(`Incoherència de taxa turística: ${touristTax}€ en comptes de ${CONFIG.expectedPrices.touristTax}€.`);
    }

    console.log(`   ✅ Integritat dels ajustos i tarifes confirmada al 100% en ${duration}ms.`);
  } catch (err) {
    passed = false;
    const msg = `Fallada en la verificació de paràmetres/preus: ${err.message}`;
    issues.push(msg);
    console.error(`   ❌ ${msg}`);
  }

  // -------------------------------------------------------------------------
  // CHECK D: Auditoria bàsica de seguretat
  // -------------------------------------------------------------------------
  console.log('\n4️⃣ [AUDITORIA DE SEGURETAT] Verificant protocols xifrats i absència de fuites...');
  try {
    // 4.1 HTTPS forçat
    if (!CONFIG.webUrl.startsWith('https://') || !CONFIG.supabaseBaseUrl.startsWith('https://')) {
      throw new Error('Les connexions no utilitzen protocol segur HTTPS!');
    }
    console.log('   ✅ Totes les connexions utilitzen protocols segurs xifrats (HTTPS/TLS).');

    // 4.2 Verificació d'absència de fuites de service_role a l'aplicació pública
    if (webText && (webText.includes('service_role') || webText.includes('SUPABASE_SERVICE_ROLE_KEY'))) {
      throw new Error('Alerta crítica de seguretat: possible exposició de claus administratives al codi web!');
    }
    console.log('   ✅ No s\'ha detectat cap exposició de claus administratives (service_role) al frontend públic.');

    // 4.3 Integritat de les reserves registrades
    const fullBookingsEndpoint = `${CONFIG.supabaseBaseUrl}/rest/v1/bookings?select=id,data,updated_at`;
    const { res: bookingsRes } = await measureFetch(fullBookingsEndpoint, {
      headers: {
        'apikey': CONFIG.supabaseApiKey,
        'Authorization': `Bearer ${CONFIG.supabaseApiKey}`
      }
    });

    if (bookingsRes.status === 200) {
      const records = await bookingsRes.json();
      let malformedCount = 0;
      for (const rec of records) {
        if (!rec.id || typeof rec.data !== 'object' || rec.data === null) {
          malformedCount++;
        }
      }
      if (malformedCount > 0) {
        throw new Error(`S'han detectat ${malformedCount} registres amb format danyat o incomplet a la base de dades.`);
      }
      console.log(`   ✅ Integritat estructural de les reserves verificada (${records.length} registres vàlids).`);
    } else {
      throw new Error(`No s'ha pogut verificar la integritat estructural de les reserves (HTTP ${bookingsRes.status}).`);
    }

  } catch (err) {
    passed = false;
    const msg = `Fallada en l'auditoria de seguretat: ${err.message}`;
    issues.push(msg);
    console.error(`   ❌ ${msg}`);
  }

  // -------------------------------------------------------------------------
  // RESUM FINAL I RESULTAT D'EXECUCIÓ
  // -------------------------------------------------------------------------
  const elapsedSec = ((Date.now() - startTime.getTime()) / 1000).toFixed(2);
  console.log('\n======================================================================');
  if (passed) {
    console.log(`✨ AUDITORIA SUPERADA AMB ÈXIT (Temps total: ${elapsedSec}s)`);
    console.log('🔒 El sistema funciona a la perfecció de forma 100% autònoma al núvol.');
    console.log('======================================================================\n');
    process.exit(0);
  } else {
    console.error(`❌ AUDITORIA FALLADA AMB ${issues.length} ERROR(S) (Temps total: ${elapsedSec}s):`);
    issues.forEach((err, idx) => console.error(`   ${idx + 1}. ${err}`));
    console.error('\n⚠️ Es genera un codi de sortida 1 perquè GitHub Actions alerti per correu.');
    console.log('======================================================================\n');
    process.exit(1);
  }
}

runAudit().catch(err => {
  console.error('Error fatal no controlat al monitor:', err);
  process.exit(1);
});
