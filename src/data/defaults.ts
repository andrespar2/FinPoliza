import type { AppSettings } from '../types'
import { nowISO } from '../lib/dates'

export const DEFAULT_SETTINGS: AppSettings = {
  company: {
    name: 'FinPoliza Seguros',
    legalName: 'FinPoliza Seguros S.A.S.',
    appName: 'FinPoliza',
    tagline: 'Protección que crece contigo',
    description:
      'Compañía colombiana especializada en seguros de vida, salud, hogar y vehículo. Acompañamos a las familias con soluciones claras, cercanas y confiables.',
    mission:
      'Proteger el patrimonio y la tranquilidad de las familias colombianas con seguros sencillos, accesibles y un servicio humano.',
    vision:
      'Ser la compañía de seguros preferida por las familias, reconocida por su transparencia y su cercanía.',
    phone: '+57 601 742 8800',
    email: 'contacto@finpoliza.com',
    address: 'Calle 93 # 15-20, oficina 501',
    city: 'Bogotá D.C., Colombia',
    website: 'www.finpoliza.com',
    schedule: 'Lunes a viernes, 8:00 a.m. a 6:00 p.m.',
    logoUrl: '',
  },
  regional: {
    currency: 'COP',
    locale: 'es-CO',
    dateFormat: 'dd/MM/yyyy',
    timezone: 'America/Bogota',
  },
  texts: {
    welcomeMessage:
      'Bienvenido a FinPoliza, el lugar donde puedes cuidar de tu familia, revisar tus pagos y hacer crecer tu fondo solidario.',
    helpIntro:
      'Aquí encuentras respuestas a las preguntas más frecuentes. Si necesitas más ayuda, comunícate con nosotros.',
    faqs: [
      {
        id: 'faq_1',
        question: '¿Cómo pago la cuota de mi seguro?',
        answer:
          'Ingresa a Mis seguros, abre la póliza y selecciona la cuota pendiente. Elige un método de pago simulado y confirma. El pago queda registrado de inmediato en tus movimientos.',
      },
      {
        id: 'faq_2',
        question: '¿Qué es el fondo solidario?',
        answer:
          'Es un ahorro voluntario administrado por FinPoliza. Puedes aportar cuando quieras y retirar tu saldo disponible sin restricciones, dejando registro de cada movimiento.',
      },
      {
        id: 'faq_3',
        question: '¿Las operaciones mueven dinero real?',
        answer:
          'No. Esta es una demostración: todos los datos y las operaciones son simulados y no generan cargos ni transferencias reales.',
      },
      {
        id: 'faq_4',
        question: '¿Puedo cambiar mis datos personales?',
        answer:
          'Sí. En Mi perfil puedes actualizar tu teléfono, correo y dirección. Tu documento de identidad solo lo puede modificar un asesor.',
      },
      {
        id: 'faq_5',
        question: '¿Qué pasa si mi cuota está vencida?',
        answer:
          'La verás marcada en rojo. Puedes pagarla en cualquier momento desde el detalle de tu seguro. Si tienes dudas, contáctanos y te ayudamos.',
      },
      {
        id: 'faq_6',
        question: '¿Cómo recupero mi contraseña?',
        answer:
          'En la pantalla de inicio de sesión selecciona "Olvidé mi contraseña" y sigue los pasos. En esta demostración el cambio se realiza de forma inmediata.',
      },
    ],
    terms:
      'Este aplicativo es una demostración con fines comerciales. Los seguros, precios, coberturas y movimientos presentados son ficticios y no constituyen una oferta comercial vinculante. Las coberturas definitivas se rigen por la póliza y sus condiciones generales.',
    privacy:
      'FinPoliza protege tus datos personales. La información suministrada se utiliza únicamente para la administración de tu cuenta y tus pólizas. En esta demostración todos los datos son ficticios y se almacenan localmente en tu dispositivo.',
    demoDisclaimer:
      'Estás en una DEMO de FinPoliza. Ninguna operación mueve dinero real.',
    homeBanner: 'Este mes proteges a tu familia con 3 seguros activos',
    loginMessage: 'Ingresa para consultar tus seguros y tu fondo solidario.',
  },
  fund: {
    enabled: true,
    title: 'Fondo Solidario',
    description:
      'Un ahorro voluntario que crece contigo y con tu familia. Aporta cuando quieras y retira tu saldo cuando lo necesites.',
    rules: [
      'Puedes aportar desde cualquier valor superior a $10.000.',
      'Tu saldo está disponible en todo momento.',
      'Cada aportación y retiro queda registrado en tu historial.',
      'FinPoliza administra el fondo y garantiza su trazabilidad contable.',
    ],
    suggestedAmounts: [50000, 100000, 200000, 500000],
    minDeposit: 10000,
    minWithdrawal: 10000,
    allowWithdrawals: true,
    conditions:
      'El fondo solidario es un producto de ahorro voluntario de la DEMO. Los valores son simulados y no generan rendimientos financieros.',
  },
  insurance: {
    allowPurchase: true,
    defaultPeriodicity: 'monthly',
    graceDays: 5,
    reminderDays: 7,
    showCatalogToGuests: false,
  },
  notifications: {
    enabled: true,
    templates: {
      welcome: 'Tu cuenta en FinPoliza está lista. Explora el catálogo y protege lo que más quieres.',
      paymentReceived: 'Recibimos tu pago. Gracias por mantener tus seguros al día.',
      deposit: 'Recibimos tu aportación al fondo solidario. Tu nuevo saldo está actualizado.',
      withdrawal: 'Procesamos tu retiro del fondo solidario. El dinero simulado ya está disponible.',
      announcement: 'Tenemos novedades para ti en FinPoliza.',
    },
    announcementTitle: 'Nueva cobertura de salud',
    announcementBody:
      'Ya está disponible el Seguro de Salud Integral con atención en más de 300 clínicas del país. Conócelo en nuestro catálogo.',
    announcementActive: false,
  },
  features: {
    fundEnabled: true,
    catalogEnabled: true,
    paymentsEnabled: true,
    registrationEnabled: true,
    notificationsEnabled: true,
  },
  appearance: {
    textScale: 'normal',
  },
  updatedAt: nowISO(),
}

export const APP_VERSION = '1.0.0'
