import { BUSINESS, LEGAL_UPDATED_LABEL } from './business';

export type LegalTab = 'terms' | 'privacy' | 'cookies' | 'refunds';

export interface LegalSection {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  table?: { head: string[]; rows: string[][] };
}

export interface LegalDoc {
  id: LegalTab;
  label: string;
  title: string;
  sections: LegalSection[];
}

const contact = `${BUSINESS.email} · WhatsApp ${BUSINESS.whatsappDisplay}`;

export const LEGAL_DOCS: LegalDoc[] = [
  // ───────────────────────── TÉRMINOS Y CONDICIONES ─────────────────────────
  {
    id: 'terms',
    label: 'Términos',
    title: 'Términos y Condiciones del Servicio',
    sections: [
      {
        title: '1. Aceptación del Servicio APS INTELLIGENCE',
        paragraphs: [
          'Al acceder y utilizar la plataforma de inteligencia artificial APS INTELLIGENCE, el usuario acepta de forma vinculante los presentes Términos y Condiciones, así como el tratamiento de sus datos descrito en la Política de Privacidad.',
        ],
      },
      {
        title: '2. Modelos Cognitivos y Uso de Cómputo',
        paragraphs: [
          'Los modelos APS INSTANT, APS PRO y APS HARD WORK son provistos con fines analíticos, creativos y de ingeniería de software. El usuario se compromete a no emplear el generador de código CLI ni el razonamiento heurístico para actividades perjudiciales, desarrollo de software malicioso ni vulneración de sistemas informáticos.',
        ],
      },
      {
        title: '3. Privacidad y Tratamiento de Archivos e Imágenes',
        paragraphs: [
          'Los archivos, imágenes y código cargados en la interfaz para su procesamiento en tiempo real son tratados exclusivamente para la inferencia de la sesión solicitada por el usuario, sin almacenamiento no consentido ni venta a terceros. El detalle completo está en la Política de Privacidad.',
        ],
      },
      {
        title: '4. Propiedad Intelectual del Código Generado',
        paragraphs: [
          'Todo código, artefacto o script producido dentro de la consola CLI de APS HARD WORK es propiedad del usuario que originó el comando, concediendo plena libertad para su compilación, integración o despliegue comercial.',
        ],
      },
      {
        title: '5. Personalización y Almacenamiento Local',
        paragraphs: [
          'Las configuraciones visuales (fondos, física de liquid glass, colores de globos de texto) se guardan localmente en el dispositivo del usuario, y solo si lo permite en el aviso de almacenamiento. Más información en la Política de Cookies.',
        ],
      },
      {
        title: '6. Cuenta, Datos y Proveedores de IA',
        paragraphs: [
          'Para usar APS creás una cuenta con tu correo electrónico, que debés confirmar. Guardamos los datos de tu cuenta, tu perfil, tus recuerdos y tu contador de uso en nuestra base de datos. Los mensajes y archivos que enviás se transmiten a proveedores externos de modelos de IA (por ejemplo Google, Groq o NVIDIA) únicamente para generar la respuesta. No ingreses contraseñas, datos bancarios ni información sensible que no quieras compartir con esos proveedores.',
        ],
      },
      {
        title: '7. Versión Beta, Límites y Pagos',
        paragraphs: [
          'APS se ofrece en versión beta, tal cual está y sin garantía de disponibilidad. Cada plan tiene un límite de usos (APS Basic: 15 por día) que puede modificarse. Los planes pagos son suscripciones mensuales que se renuevan solas hasta que las canceles desde la pantalla de planes; el cobro lo procesa Mercado Pago y no guardamos los datos de tu tarjeta. Mientras los pagos no estén habilitados, los planes pagos figuran como próximamente. Podemos suspender cuentas que abusen del servicio. Las respuestas de la IA pueden contener errores: verificá la información importante antes de usarla. Las condiciones de cancelación y devolución están en la Política de Reembolsos.',
        ],
      },
      {
        title: '8. Edad mínima',
        paragraphs: [
          'APS está destinado a personas de 18 años o más. Al crear tu cuenta declarás tener esa edad. Si sos menor de 18, no podés crear una cuenta ni usar el servicio. Si sos madre, padre o tutor y creés que un menor a tu cargo creó una cuenta, escribinos y la eliminamos.',
        ],
      },
      {
        title: '9. Eliminación de la cuenta',
        paragraphs: [
          'Podés eliminar tu cuenta y tus datos en cualquier momento desde Perfil → "Eliminar mi cuenta y mis datos". La eliminación es inmediata y no se puede deshacer. También podés pedirla escribiéndonos a los medios de contacto indicados abajo. Podemos suspender o eliminar cuentas que incumplan estos términos.',
        ],
      },
      {
        title: '10. Responsable, contacto y ley aplicable',
        paragraphs: [
          `APS INTELLIGENCE es un producto de ${BUSINESS.name} (${BUSINESS.country}). Contacto: ${contact}.`,
          'Estos términos se rigen por las leyes de la República Argentina.',
        ],
      },
    ],
  },

  // ───────────────────────── POLÍTICA DE PRIVACIDAD ─────────────────────────
  {
    id: 'privacy',
    label: 'Privacidad',
    title: 'Política de Privacidad',
    sections: [
      {
        title: '1. Quién es responsable de tus datos',
        paragraphs: [
          `${BUSINESS.name} (${BUSINESS.country}) es responsable del tratamiento de los datos de APS INTELLIGENCE. Contacto para temas de privacidad: ${contact}.`,
        ],
      },
      {
        title: '2. Qué datos recopilamos',
        bullets: [
          'Cuenta: correo electrónico, nombre o alias y contraseña. La contraseña la gestiona el servicio de autenticación y no se guarda en texto legible.',
          'Foto de perfil, solo si la subís (es opcional).',
          'Perfil: plan contratado e instrucciones personalizadas que escribas.',
          'Memorias de la IA (espacio PERSONAL): hechos que vos guardás o que el asistente propone recordar. Podés verlos y borrarlos.',
          'Datos de tu MARCA (espacio MARCA): nombre, rubro, productos, público, tono, logo y datos de contacto que cargues. Están separados del espacio PERSONAL.',
          'Uso: contadores diario y mensual de consultas, para aplicar los límites del plan.',
          'Suscripción: estado del plan e identificadores del pago cuando los pagos estén habilitados. No guardamos datos de tarjeta.',
          'Mensajes y archivos del chat: se envían al proveedor de IA para generar la respuesta. El historial de tus chats se guarda en tu propio dispositivo (almacenamiento del navegador), no en nuestra base de datos.',
          'Datos técnicos: los proveedores de infraestructura pueden registrar datos como la dirección IP y errores para operar y proteger el servicio.',
        ],
      },
      {
        title: '3. Para qué los usamos',
        bullets: [
          'Crear y mantener tu cuenta y darte acceso al servicio.',
          'Generar las respuestas de la IA que pedís.',
          'Aplicar los límites de uso de cada plan y prevenir abusos.',
          'Procesar suscripciones y brindarte soporte.',
        ],
        paragraphs: [
          'No vendemos tus datos, no los usamos para publicidad y no armamos perfiles para terceros.',
        ],
      },
      {
        title: '4. Servicios y SDK de terceros',
        paragraphs: [
          'Revisamos las dependencias de la aplicación. Estos son los servicios de terceros con los que se comunica APS y qué reciben:',
        ],
        table: {
          head: ['Servicio', 'Para qué', 'Qué recibe'],
          rows: [
            ['Supabase', 'Cuenta, autenticación y base de datos', 'Correo, nombre, perfil, memorias, marca, uso'],
            ['Vercel', 'Alojamiento y servidor de la app', 'Solicitudes a la app (incluye IP y datos técnicos)'],
            ['Google (Gemini)', 'Modelos de IA', 'Mensajes y archivos que enviás en el chat'],
            ['Groq / NVIDIA', 'Modelos de IA alternativos, solo si están habilitados', 'Mensajes y archivos que enviás en el chat'],
            ['Mercado Pago', 'Cobro de planes, cuando se habiliten', 'Datos de pago que ingresás en su plataforma'],
            ['Google Fonts', 'Tipografías de la interfaz', 'Tu dirección IP al cargar las fuentes'],
          ],
        },
        bullets: [
          'No usamos herramientas de analítica (como Google Analytics), píxeles de publicidad ni SDK de redes sociales.',
          'Cada proveedor trata los datos según sus propias condiciones y políticas.',
        ],
      },
      {
        title: '5. Transferencias internacionales',
        paragraphs: [
          'Algunos de estos proveedores operan servidores fuera de Argentina. Al usar APS aceptás que tus datos puedan procesarse en otros países para prestar el servicio.',
        ],
      },
      {
        title: '6. Cuánto tiempo los conservamos',
        paragraphs: [
          'Conservamos los datos de tu cuenta mientras esté activa. Si eliminás tu cuenta, se borran la cuenta y los datos asociados (perfil, memorias, marca, uso y suscripción), salvo lo que una norma nos obligue a conservar. El historial de chats lo controlás vos desde tu dispositivo: lo borrás eliminando cada chat o limpiando los datos del navegador.',
        ],
      },
      {
        title: '7. Tus derechos y cómo ejercerlos',
        paragraphs: [
          'La Ley 25.326 de Protección de Datos Personales te da derecho a acceder a tus datos, rectificarlos, actualizarlos y pedir su supresión.',
        ],
        bullets: [
          'Desde la app podés editar tu nombre, foto, instrucciones, memorias y datos de marca.',
          'Para eliminar tu cuenta y tus datos usá Perfil → "Eliminar mi cuenta y mis datos": se borran de inmediato. Para acceder a tus datos escribinos a los contactos de abajo.',
          'Según la ley, el acceso se responde en 10 días corridos y la rectificación o supresión en 5 días hábiles.',
        ],
      },
      {
        title: '8. Seguridad',
        paragraphs: [
          'Cada cuenta solo puede leer y modificar sus propios datos mediante reglas de acceso en la base de datos. Las claves de los servicios de IA y de la base se guardan en el servidor y no se exponen en tu navegador. Ningún sistema es infalible: no podemos garantizar seguridad absoluta.',
        ],
      },
      {
        title: '9. Menores de edad',
        paragraphs: [
          'APS está destinado a mayores de 18 años y no recopilamos datos de menores de forma intencional. Si sos madre, padre o tutor y creés que un menor creó una cuenta, escribinos y la eliminamos.',
        ],
      },
      {
        title: '10. Autoridad de control',
        paragraphs: [
          'La AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, en su carácter de Órgano de Control de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de protección de datos personales. Contacto: datospersonales@aaip.gob.ar',
        ],
      },
      {
        title: '11. Cambios en esta política',
        paragraphs: [
          `Si modificamos esta política actualizaremos la fecha y te avisaremos dentro de la app. Última actualización: ${LEGAL_UPDATED_LABEL}.`,
        ],
      },
    ],
  },

  // ───────────────────────── POLÍTICA DE COOKIES ─────────────────────────
  {
    id: 'cookies',
    label: 'Cookies',
    title: 'Política de Cookies y Almacenamiento',
    sections: [
      {
        title: '1. Qué usamos',
        paragraphs: [
          'APS no instala cookies propias de publicidad ni de analítica. Para funcionar guarda información en tu navegador mediante almacenamiento local (localStorage y sessionStorage) y la caché del navegador. Funcionan de forma parecida a las cookies, por eso te pedimos tu elección.',
        ],
      },
      {
        title: '2. Qué guardamos y para qué',
        table: {
          head: ['Dato guardado', 'Para qué', 'Tipo'],
          rows: [
            ['Sesión de la cuenta (Supabase) y aps_current_user', 'Mantenerte conectado y mostrar tu perfil', 'Esencial'],
            ['aps_cookies', 'Recordar lo que elegiste en este aviso', 'Esencial'],
            ['aps_chat_*, aps_sessions*, aps_workspace, aps_mode', 'Tu historial de chats y el espacio de trabajo activo', 'Esencial'],
            ['Caché de tu marca', 'Cargar rápido los datos de MARCA', 'Esencial'],
            ['Caché de archivos de la app (aps-v1)', 'Abrir la app más rápido y mostrar una pantalla sin conexión', 'Esencial'],
            ['aps_3d', 'Recordar si activaste o no la escena 3D', 'Esencial (ajuste que elegís)'],
            ['aps_customization, aps_logo_*', 'Tus colores, fondos y logos personalizados', 'Opcional: personalización'],
          ],
        },
      },
      {
        title: '3. Servicios de terceros',
        paragraphs: [
          'La app carga las tipografías desde Google Fonts. Para eso tu navegador se conecta a servidores de Google, que reciben tu dirección IP. No usamos analítica, publicidad ni redes sociales de terceros.',
        ],
      },
      {
        title: '4. Cómo cambiar tu elección',
        paragraphs: [
          'Podés cambiar tu elección cuando quieras con el botón de abajo. Si rechazás la personalización, borramos tus colores, fondos y logos guardados y dejamos de guardarlos. También podés borrar todos los datos guardados desde la configuración de tu navegador.',
        ],
      },
    ],
  },

  // ───────────────────────── POLÍTICA DE REEMBOLSOS ─────────────────────────
  {
    id: 'refunds',
    label: 'Reembolsos',
    title: 'Política de Cancelación y Reembolsos',
    sections: [
      {
        title: '1. Estado actual',
        paragraphs: [
          'Hoy los pagos no están habilitados y el plan APS Basic es gratuito, así que no hay cobros. Esta política rige desde que se habiliten los planes pagos.',
        ],
      },
      {
        title: '2. Cómo funcionan los planes pagos',
        paragraphs: [
          'Los planes pagos son suscripciones mensuales que se renuevan solas hasta que las canceles. El precio se muestra en la pantalla de planes antes de que confirmes. El cobro lo procesa Mercado Pago y no guardamos los datos de tu tarjeta.',
        ],
      },
      {
        title: '3. Cancelar',
        paragraphs: [
          'Podés cancelar cuando quieras desde la pantalla de planes. Al cancelar, tu cuenta vuelve al plan APS Basic y no se realizan nuevos cobros.',
        ],
      },
      {
        title: '4. Derecho de arrepentimiento',
        paragraphs: [
          'Si contratás desde Argentina como consumidor, tenés 10 días corridos desde la contratación para arrepentirte y recibir la devolución del importe pagado, sin costo ni justificación (art. 34 de la Ley 24.240 y Resolución 424/2020 de la Secretaría de Comercio Interior). Para ejercerlo escribinos a los contactos de abajo desde el correo de tu cuenta.',
        ],
      },
      {
        title: '5. Otros reembolsos',
        paragraphs: [
          'Pasado ese plazo no se reintegra el período ya cobrado, salvo que haya un cobro duplicado o un error nuestro. En esos casos lo devolvemos completo.',
        ],
      },
      {
        title: '6. Cómo se devuelve el dinero',
        paragraphs: [
          'La devolución se hace por el mismo medio de pago a través de Mercado Pago. El tiempo en que lo veas acreditado depende de tu medio de pago.',
        ],
      },
    ],
  },
];

export const LEGAL_DOC_BY_ID: Record<LegalTab, LegalDoc> = Object.fromEntries(
  LEGAL_DOCS.map((d) => [d.id, d])
) as Record<LegalTab, LegalDoc>;
