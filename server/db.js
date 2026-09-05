const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

// Asegurar que existe el directorio de datos
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json');
const FINANCES_FILE = path.join(DATA_DIR, 'finances.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const TEMPLATES_FILE = path.join(DATA_DIR, 'templates.json');

// Valores por defecto
const DEFAULT_SETTINGS = {
  hostalName: 'Hostal Somnis',
  legalName: 'Hostal Somnis Súria',
  nif: 'B-12345678',
  address: 'Carrer Major, 12',
  city: 'Súria',
  postalCode: '08260',
  province: 'Barcelona',
  phone: '+34 600 000 000',
  email: 'info@hostalsomnis.cat',
  rooms: [
    { id: 'hab-1', name: 'Habitación 1 - Doble' },
    { id: 'hab-2', name: 'Habitación 2 - Matrimonial' },
    { id: 'hab-3', name: 'Habitación 3 - Doble' },
    { id: 'hab-4', name: 'Habitación 4 - Individual' }
  ],
  icloud: {
    enabled: false,
    appleId: '',
    appPassword: '',
    calendarName: 'Hostal Somnis',
    calendarUrl: '',
    lastSync: null
  }
};

const DEFAULT_TEMPLATES = [
  {
    id: 'tmpl-welcome-es',
    category: 'bienvenida',
    title: 'Instrucciones de Llegada y Bienvenida (Castellano)',
    language: 'es',
    content: `¡Hola {nombre_huesped}! Te damos la bienvenida a Hostal Somnis en Súria. 
Tu reserva es para la {habitacion}, con llegada el {fecha_entrada} y salida el {fecha_salida}.

Ubicación: Súria (08260), comarca del Bages.
Hora recomendada de llegada: a partir de las 14:00h. Si tienes previsto llegar a otra hora, avísanos con un mensaje.
Si necesitas indicaciones para aparcar o llegar sin problema, no dudes en escribirnos o llamarnos al {telefono_hostal}.

¡Te esperamos con los brazos abiertos!`
  },
  {
    id: 'tmpl-welcome-ca',
    category: 'bienvenida',
    title: 'Instruccions d\'Arribada i Benvinguda (Català)',
    language: 'ca',
    content: `Hola {nombre_huesped}! Et donem la benvinguda a l'Hostal Somnis a Súria.
La teva reserva és per a l'habitació {habitacion}, amb entrada el {fecha_entrada} i sortida el {fecha_salida}.

Ubicació: Súria (08260), comarca del Bages.
Hora recomanada d'arribada: a partir de les 14:00h. Si arribes més tard o necessites flexibilitat, avisa'ns amb un missatge.
Per a qualsevol dubte o per trobar aparcament fàcilment, pots trucar-nos o escriure'ns al {telefono_hostal}.

T'esperem!`
  },
  {
    id: 'tmpl-during-es',
    category: 'estancia',
    title: 'Información durante la Estancia (Castellano)',
    language: 'es',
    content: `Hola {nombre_huesped}, esperamos que estés descansando muy bien en Hostal Somnis.
Si necesitas cualquier cosa (toallas extra, recomendaciones de restaurantes en Súria o visitas al Poble Vell y el Cardener), estamos a tu entera disposición.

Teléfono directo de contacto: {telefono_hostal}. ¡Que disfrutes de tu estancia!`
  },
  {
    id: 'tmpl-during-ca',
    category: 'estancia',
    title: 'Informació durant l\'Estada (Català)',
    language: 'ca',
    content: `Hola {nombre_huesped}, esperem que estiguis descansant molt bé a l'Hostal Somnis.
Si necessites qualsevol cosa (tovalloles addicionals, recomanacions de restaurants a Súria o rutes pel Poble Vell), estem a la teva disposició.

Telèfon directe de contacte: {telefono_hostal}. Que gaudeixis molt de la teva estada!`
  },
  {
    id: 'tmpl-thanks-es',
    category: 'despedida',
    title: 'Agradecimiento tras la Estancia (Castellano)',
    language: 'es',
    content: `Muchas gracias por haberte alojado con nosotros en Hostal Somnis, {nombre_huesped}. 
Ha sido un placer recibirte en Súria. Deseamos que hayas tenido una estancia tranquila y un buen viaje de vuelta.

¡Esperamos volver a verte pronto!`
  },
  {
    id: 'tmpl-thanks-ca',
    category: 'despedida',
    title: 'Agraïment després de l\'Estada (Català)',
    language: 'ca',
    content: `Moltes gràcies per haver-te allotjat amb nosaltres a l'Hostal Somnis, {nombre_huesped}.
Ha estat un plaer tenir-te a Súria. Esperem que hagis gaudit d'una estada relaxant i tinguis un molt bon viatge de tornada.

Esperem retrobar-nos aviat!`
  },
  {
    id: 'tmpl-welcome-en',
    category: 'bienvenida',
    title: 'Welcome & Arrival Instructions (English)',
    language: 'en',
    content: `Hello {nombre_huesped}! Welcome to Hostal Somnis in Súria.
Your booking is for {habitacion}, check-in on {fecha_entrada} and check-out on {fecha_salida}.

Location: Súria (08260), Barcelona province.
Check-in time: from 14:00h onwards. If you expect to arrive at a different time, please let us know.
Feel free to contact us anytime at {telefono_hostal}.

Looking forward to welcoming you!`
  }
];

// Funciones de lectura y escritura seguras
function readFile(filePath, defaultValue) {
  try {
    if (!fs.existsSync(filePath)) {
      writeFile(filePath, defaultValue);
      return defaultValue;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`Error leyendo ${filePath}:`, err.message);
    return defaultValue;
  }
}

function writeFile(filePath, data) {
  try {
    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
    return true;
  } catch (err) {
    console.error(`Error guardando ${filePath}:`, err.message);
    return false;
  }
}

// Inicialización de ficheros si no existen
function initDb() {
  readFile(SETTINGS_FILE, DEFAULT_SETTINGS);
  readFile(TEMPLATES_FILE, DEFAULT_TEMPLATES);
  readFile(BOOKINGS_FILE, []);
  readFile(FINANCES_FILE, []);
}

initDb();

module.exports = {
  // Configuración
  getSettings: () => readFile(SETTINGS_FILE, DEFAULT_SETTINGS),
  saveSettings: (settings) => writeFile(SETTINGS_FILE, settings),

  // Reservas
  getBookings: () => readFile(BOOKINGS_FILE, []),
  saveBookings: (bookings) => writeFile(BOOKINGS_FILE, bookings),

  // Finanzas
  getFinances: () => readFile(FINANCES_FILE, []),
  saveFinances: (finances) => writeFile(FINANCES_FILE, finances),

  // Plantillas
  getTemplates: () => readFile(TEMPLATES_FILE, DEFAULT_TEMPLATES),
  saveTemplates: (templates) => writeFile(TEMPLATES_FILE, templates)
};
