// RedDoc landing — i18n dictionaries (es / en)
// Operations Console voice: technical, precise, ERP-flavored.

import { getPlanDescription, getPlanFeatures } from '@reddoc/core';
import type { PlanFeature as CorePlanFeature } from '@reddoc/core';

export type Lang = 'es' | 'en';

export interface Module {
  key: string;
  eyebrow: string;
  title: string;
  italic?: string;
  body: string;
  bullets: string[];
  closing?: string;
  image: string;
}

export type PlanFeature = CorePlanFeature;

export interface Plan {
  id: string;
  name: string;
  price: string;
  description: string;
  features: readonly PlanFeature[];
  highlight?: boolean;
}

export interface Step {
  index: string;
  title: string;
  body: string;
}

export interface Quote {
  body: string;
  author: string;
  role: string;
}

export interface Dict {
  nav: {
    how: string;
    product: string;
    pricing: string;
    contact: string;
    login: string;
    register: string;
    langLabel: string;
  };
  hero: {
    headline_1: string;
    headline_italic: string;
    headline_2: string;
    subtitle: string;
    lede: string;
    primary: string;
    secondary: string;
    invoice: {
      title: string;
      number: string;
      fromLabel: string;
      from: string;
      toLabel: string;
      to: string;
      items: { label: string; amount: string }[];
      subtotalLabel: string;
      subtotalAmount: string;
      taxLabel: string;
      taxAmount: string;
      totalLabel: string;
      totalAmount: string;
      stamp: string;
      statusNote: string;
      cufeLabel: string;
      cufeValue: string;
    };
  };
  marquee: string[];
  how: {
    section: string;
    title: string;
    italic: string;
    lede: string;
    steps: Step[];
  };
  modules: {
    section: string;
    title: string;
    italic: string;
    lede: string;
    items: Module[];
    detailsCta: string;
  };
  pricing: {
    section: string;
    title: string;
    italic: string;
    lede: string;
    track_billing: string;
    track_erp: string;
    note: string;
    timestamp: string;
    perMonth: string;
    cta: string;
    plans_billing: Plan[];
    plans_erp: Plan[];
    footnote: string;
  };
  testimonials: {
    section: string;
    title: string;
    italic: string;
    quotes: Quote[];
  };
  contact: {
    section: string;
    title: string;
    italic: string;
    lede: string;
    address_label: string;
    address: string;
    phone_label: string;
    phone: string;
    email_label: string;
    email: string;
    form_name: string;
    form_email: string;
    form_phone: string;
    form_company: string;
    form_message: string;
    form_submit: string;
    form_required: string;
  };
  cta: {
    eyebrow: string;
    title: string;
    italic: string;
    lede: string;
    primary: string;
    secondary: string;
  };
  footer: {
    tagline: string;
    docs: string;
    docs_links: string[];
    company: string;
    company_links: string[];
    legal: string;
    legal_links: string[];
    rights: string;
    masthead: string;
  };
}

const es: Dict = {
  nav: {
    how: 'Cómo funciona',
    product: 'Módulos',
    pricing: 'Precios',
    contact: 'Contacto',
    login: 'Iniciar sesión',
    register: 'Registrarse',
    langLabel: 'Idioma',
  },
  hero: {
    headline_1: 'Tu empresa cambia,',
    headline_italic: 'nosotros evolucionamos',
    headline_2: 'contigo.',
    subtitle: 'Un ERP flexible, moderno y fácil de usar.',
    lede: 'RedDoc unifica compras, ventas, tesorería, inventario, POS, nómina y contabilidad — más facturación electrónica DIAN — en una sola plataforma operativa. Datos en vivo, una sola fuente de verdad, cero hojas de cálculo perdidas.',
    primary: 'Empezar ahora',
    secondary: 'Ver módulos',
    invoice: {
      title: 'Factura electrónica',
      number: 'FE-2841',
      fromLabel: 'De',
      from: 'Mi Empresa S.A.S',
      toLabel: 'Para',
      to: 'Distribuidora Andina',
      items: [
        { label: 'Asesoría mensual', amount: '890.000' },
        { label: 'Plan de inventario', amount: '620.000' },
        { label: 'Soporte técnico', amount: '410.000' },
      ],
      subtotalLabel: 'Subtotal',
      subtotalAmount: '1.920.000',
      taxLabel: 'IVA 19%',
      taxAmount: '364.800',
      totalLabel: 'Total',
      totalAmount: '2.284.800',
      stamp: 'DIAN',
      statusNote: 'firmada y enviada · hace 14s',
      cufeLabel: 'CUFE',
      cufeValue: '8a2f9c41…e9f2',
    },
  },
  marquee: [
    'DIAN · FACTURACIÓN ELECTRÓNICA',
    'NÓMINA ELECTRÓNICA · PILA',
    'BANCOLOMBIA · DAVIVIENDA · BBVA',
    'NEQUI · DAVIPLATA',
    'NIIF · CONTABILIDAD',
    'POS · MULTIBODEGA',
    'API ABIERTA',
    'CLOUD-NATIVE',
  ],
  how: {
    section: '01 / SETUP',
    title: 'Tres pasos.',
    italic: 'Cero fricción.',
    lede: 'De la apertura de cuenta al primer documento electrónico, todo en una mañana.',
    steps: [
      {
        index: '01',
        title: 'Regístrate',
        body: 'Crea tu cuenta con correo y contraseña. Sin tarjeta de crédito, sin compromisos al inicio.',
      },
      {
        index: '02',
        title: 'Selecciona tu plan',
        body: 'Pagas solo por lo que usas. Empezamos chico y escalamos contigo a medida que crece la operación.',
      },
      {
        index: '03',
        title: 'Empieza a operar',
        body: 'Tu equipo entra a una plataforma operativa: módulos conectados, datos en vivo, decisiones más rápidas.',
      },
    ],
  },
  modules: {
    section: '02 / MÓDULOS',
    title: 'Seis módulos,',
    italic: 'una sola plataforma.',
    lede: 'Cada módulo conecta con los demás: comparten datos en tiempo real, sin sincronizaciones manuales ni hojas de cálculo.',
    items: [
      {
        key: 'compraventa',
        eyebrow: 'MOD/01',
        title: 'Compras y ventas',
        italic: '',
        body: 'Mantener en orden las compras y ventas es esencial para que tu negocio funcione sin problemas. Con RedDoc, este proceso se vuelve mucho más sencillo: podrás llevar un control eficiente de lo que adquieres, lo que vendes y cómo manejas tu inventario, evitando pérdidas y mejorando la rentabilidad.',
        bullets: [
          'Registra tus compras y ventas de manera rápida y sencilla.',
          'Automatiza tu proceso con las facturas recurrentes.',
          'Genera documentos electrónicos sin complicaciones.',
          'Accede a informes en tiempo real para tomar mejores decisiones.',
        ],
        closing:
          'Así, en lugar de preocuparte por los números, puedes enfocarte en lo más importante: hacer crecer tu negocio.',
        image: '/landing/compraventa.png',
      },
      {
        key: 'tesoreria',
        eyebrow: 'MOD/02',
        title: 'Tesorería y cartera',
        italic: '',
        body: 'Llevar el control de la cartera y la tesorería es clave para que tu negocio esté siempre en orden. La cartera se encarga de los cobros y pagos, asegurando un flujo de efectivo constante, mientras que la tesorería te ayuda a organizar recursos, optimizar fondos y mantener liquidez. Con RedDoc, puedes automatizar estos procesos, simplificando la gestión financiera y asegurando un control total y sin complicaciones.',
        bullets: [
          'Gestiona tus pagos y tus cobros.',
          'Controla los vencimientos.',
          'Obtén informes detallados sobre estados de cuenta.',
        ],
        image: '/landing/tesoreria.png',
      },
      {
        key: 'inventario',
        eyebrow: 'MOD/03',
        title: 'Inventario',
        italic: '',
        body: 'Con RedDoc, llevar el control de tu inventario es más fácil. Podrás registrar entradas y salidas en tiempo real, asegurarte de que tu stock esté siempre actualizado y generar informes para entender mejor el movimiento de tus productos y tomar decisiones estratégicas. Todo se integra con tu negocio, desde compras y ventas hasta contabilidad y POS, para que tomes decisiones más inteligentes y tu empresa sea más eficiente.',
        bullets: [
          'Control de existencias.',
          'Actualización del inventario en tiempo real.',
          'Seguimiento de movimientos.',
          'Control de costos.',
          'Informes detallados y análisis sobre el movimiento de inventarios.',
        ],
        image: '/landing/inventario.png',
      },
      {
        key: 'pos',
        eyebrow: 'MOD/04',
        title: 'POS+',
        italic: '',
        body: 'Vender nunca había sido tan fácil. Con el módulo POS de RedDoc, puedes procesar transacciones de manera rápida y sin complicaciones, manteniendo todo sincronizado con tu inventario y contabilidad.',
        bullets: [
          'Registra ventas en segundos.',
          'Acepta múltiples métodos de pago.',
          'Genera facturas electrónicas al instante.',
          'Mantén tu inventario actualizado automáticamente.',
          'Accede a reportes de ventas en tiempo real.',
        ],
        closing:
          'Ya sea en tu tienda física o en línea, RedDoc POS te ayuda a mejorar la experiencia de tus clientes y a optimizar la gestión de tu negocio.',
        image: '/landing/pos.png',
      },
      {
        key: 'nomina',
        eyebrow: 'MOD/05',
        title: 'Nómina',
        italic: '',
        body: 'Manejar la nómina puede parecer complicado, pero con RedDoc es fácil y sin estrés. Podrás administrar pagos, generar nóminas electrónicas automáticamente y asegurarte de cumplir con las normativas vigentes. Todo está organizado para que ahorres tiempo y te enfoques en lo realmente importante: tu equipo y tu negocio.',
        bullets: [
          'Genera la nómina fácilmente.',
          'Liquida seguridad social sin errores.',
          'Accede a informes detallados en tiempo real.',
          'Cumple con la normativa sin complicaciones.',
        ],
        image: '/landing/nomina.png',
      },
      {
        key: 'contabilidad',
        eyebrow: 'MOD/06',
        title: 'Contabilidad',
        italic: '',
        body: 'Sabemos que lidiar con números, facturas e impuestos puede ser todo un desafío, pero es fundamental para mantener la estabilidad de tu negocio. Con RedDoc, llevar tu contabilidad será pan comido. Tendrás una visión clara de tus compras, ventas e inventario para tomar decisiones con confianza, además de un registro detallado de tus transacciones para una auditoría sin complicaciones.',
        bullets: [
          'Accesibilidad remota.',
          'Intuitivo y fácil de usar.',
          'Automatización de documentos.',
          'Variedad de informes financieros.',
          'Simplificación del cumplimiento de obligaciones fiscales.',
        ],
        closing:
          'Así, en lugar de perder tiempo con papeleo, puedes enfocarte en hacer crecer tu negocio con la tranquilidad de que tus finanzas están en orden.',
        image: '/landing/contabilidad.png',
      },
    ],
    detailsCta: 'Ver detalle del módulo',
  },
  pricing: {
    section: '03 / PRECIOS',
    title: 'Pagas solo',
    italic: 'por lo que usas.',
    lede: 'Sin costos anticipados, sin sorpresas. Tarifa transparente, en pesos, sin contratos a largo plazo.',
    track_billing: 'Facturación',
    track_erp: 'ERP completo',
    note: 'Precios mensuales en COP · IVA no incluido',
    timestamp: 'Tarifa Q2 2026 · COP',
    perMonth: '/ mes',
    cta: 'Seleccionar plan',
    plans_billing: [
      {
        id: 'impulso',
        name: 'Impulso',
        price: '$16.900',
        description: getPlanDescription('es', 'impulso'),
        features: getPlanFeatures('es', 'facturacion', 'impulso'),
      },
      {
        id: 'crecimiento',
        name: 'Crecimiento',
        price: '$49.900',
        description: getPlanDescription('es', 'crecimiento'),
        highlight: true,
        features: getPlanFeatures('es', 'facturacion', 'crecimiento'),
      },
      {
        id: 'expansion',
        name: 'Expansión',
        price: '$95.900',
        description: getPlanDescription('es', 'expansion'),
        features: getPlanFeatures('es', 'facturacion', 'expansion'),
      },
      {
        id: 'exito',
        name: 'Éxito',
        price: '$172.900',
        description: getPlanDescription('es', 'exito'),
        features: getPlanFeatures('es', 'facturacion', 'exito'),
      },
    ],
    plans_erp: [
      {
        id: 'impulso-erp',
        name: 'Impulso ERP',
        price: '$22.900',
        description: getPlanDescription('es', 'impulso'),
        features: getPlanFeatures('es', 'erp', 'impulso'),
      },
      {
        id: 'crecimiento-erp',
        name: 'Crecimiento ERP',
        price: '$74.900',
        description: getPlanDescription('es', 'crecimiento'),
        features: getPlanFeatures('es', 'erp', 'crecimiento'),
      },
      {
        id: 'expansion-erp',
        name: 'Expansión ERP',
        price: '$149.900',
        description: getPlanDescription('es', 'expansion'),
        highlight: true,
        features: getPlanFeatures('es', 'erp', 'expansion'),
      },
      {
        id: 'exito-erp',
        name: 'Éxito ERP',
        price: '$229.900',
        description: getPlanDescription('es', 'exito'),
        features: getPlanFeatures('es', 'erp', 'exito'),
      },
    ],
    footnote: 'Migración asistida sin cargo extra · cancela cuando quieras · datos siempre tuyos.',
  },
  testimonials: {
    section: '04 / CLIENTES',
    title: 'Lo que dicen las',
    italic: 'empresas que ya operan con RedDoc.',
    quotes: [
      {
        body: 'RedDoc nos devolvió las tardes. Antes cerrábamos mes a las nueve de la noche; ahora a las cinco ya está liquidada la nómina y conciliada la cartera.',
        author: 'María Camila Restrepo',
        role: 'CEO · Distribuidora Andina',
      },
      {
        body: 'La interfaz es honesta — no esconde números detrás de menús. Eso nos ayudó a tomar decisiones mejores y más rápidas con los socios.',
        author: 'Andrés Felipe Gómez',
        role: 'Consultor financiero',
      },
      {
        body: 'Implementamos POS, inventario y contabilidad en una semana. El soporte respondió cada duda y el equipo dejó de pelear con tres softwares distintos.',
        author: 'Laura Quintero',
        role: 'Gerente · Tienda Mariposa',
      },
    ],
  },
  contact: {
    section: '05 / CONTACTO',
    title: 'Hablemos de',
    italic: 'tu operación.',
    lede: 'Cuéntanos qué procesos te quitan el sueño. Te respondemos en menos de 24 horas hábiles.',
    address_label: 'Oficina',
    address: 'Cll 34 N.º 66 A 33 · Of. 201 · Conquistadores · Medellín, Colombia',
    phone_label: 'Teléfono',
    phone: '+57 333 259 0639',
    email_label: 'Correo',
    email: 'asesor@reddoc.co',
    form_name: 'Nombre completo',
    form_email: 'Correo electrónico',
    form_phone: 'Teléfono',
    form_company: 'Empresa',
    form_message: 'Cuéntanos sobre tu operación',
    form_submit: 'Enviar mensaje',
    form_required: 'Campo obligatorio',
  },
  cta: {
    eyebrow: 'EMPIEZA HOY · DEMO 5 MINUTOS',
    title: 'Operación más ordenada,',
    italic: 'desde el primer día.',
    lede: 'Treinta minutos para configurarlo. Una vida operativa más tranquila después.',
    primary: 'Empezar ahora',
    secondary: 'Hablar con un asesor',
  },
  footer: {
    tagline:
      'El ERP modular para PYMEs colombianas. Operaciones, facturación electrónica y contabilidad en una sola plataforma.',
    docs: 'Documentación',
    docs_links: ['Centro de ayuda', 'Videos', 'Changelog', 'API', 'Status'],
    company: 'Compañía',
    company_links: ['Nosotros', 'Clientes', 'Blog', 'Trabaja con nosotros'],
    legal: 'Legal',
    legal_links: ['Términos', 'Privacidad', 'Cookies', 'Cumplimiento'],
    rights: '© 2026 Semantica Digital S.A.S · Todos los derechos reservados.',
    masthead: 'Hecho en Medellín · Colombia · operando en LATAM.',
  },
};

const en: Dict = {
  nav: {
    how: 'How it works',
    product: 'Modules',
    pricing: 'Pricing',
    contact: 'Contact',
    login: 'Sign in',
    register: 'Sign up',
    langLabel: 'Language',
  },
  hero: {
    headline_1: 'Your business changes,',
    headline_italic: 'we evolve',
    headline_2: 'with you.',
    subtitle: 'A flexible, modern, easy-to-use ERP.',
    lede: 'RedDoc unifies purchases, sales, treasury, inventory, POS, payroll, and accounting — plus DIAN e-invoicing — in a single operating platform. Live data, one source of truth, zero lost spreadsheets.',
    primary: 'Get started',
    secondary: 'See modules',
    invoice: {
      title: 'Electronic invoice',
      number: 'FE-2841',
      fromLabel: 'From',
      from: 'My Company LLC',
      toLabel: 'To',
      to: 'Andina Distributors',
      items: [
        { label: 'Monthly retainer', amount: '890,000' },
        { label: 'Inventory plan', amount: '620,000' },
        { label: 'Technical support', amount: '410,000' },
      ],
      subtotalLabel: 'Subtotal',
      subtotalAmount: '1,920,000',
      taxLabel: 'VAT 19%',
      taxAmount: '364,800',
      totalLabel: 'Total',
      totalAmount: '2,284,800',
      stamp: 'DIAN',
      statusNote: 'signed & sent · 14s ago',
      cufeLabel: 'CUFE',
      cufeValue: '8a2f9c41…e9f2',
    },
  },
  marquee: [
    'DIAN · E-INVOICING',
    'E-PAYROLL · PILA',
    'BANCOLOMBIA · DAVIVIENDA · BBVA',
    'NEQUI · DAVIPLATA',
    'IFRS · ACCOUNTING',
    'POS · MULTI-WAREHOUSE',
    'OPEN API',
    'CLOUD-NATIVE',
  ],
  how: {
    section: '01 / SETUP',
    title: 'Three steps.',
    italic: 'Zero friction.',
    lede: 'From account opening to your first electronic document, all in one morning.',
    steps: [
      {
        index: '01',
        title: 'Sign up',
        body: 'Create your account with email and password. No card needed, no upfront commitments.',
      },
      {
        index: '02',
        title: 'Pick your plan',
        body: 'Pay only for what you use. Start small and scale alongside your operation as it grows.',
      },
      {
        index: '03',
        title: 'Start operating',
        body: 'Your team logs into a working platform: connected modules, live data, faster decisions.',
      },
    ],
  },
  modules: {
    section: '02 / MODULES',
    title: 'Six modules,',
    italic: 'one platform.',
    lede: 'Each module connects to the others — sharing live data without manual sync or spreadsheets.',
    items: [
      {
        key: 'compraventa',
        eyebrow: 'MOD/01',
        title: 'Purchases & sales',
        italic: '',
        body: 'Keeping your purchases and sales in order is essential for a smooth-running business. With RedDoc, the process becomes much simpler: you can efficiently track what you buy, what you sell, and how you manage your inventory — avoiding losses and improving profitability.',
        bullets: [
          'Record purchases and sales quickly and easily.',
          'Automate your process with recurring invoices.',
          'Generate electronic documents without hassle.',
          'Access real-time reports to make better decisions.',
        ],
        closing:
          'Instead of worrying about the numbers, you can focus on what matters most: growing your business.',
        image: '/landing/compraventa.png',
      },
      {
        key: 'tesoreria',
        eyebrow: 'MOD/02',
        title: 'Treasury & receivables',
        italic: '',
        body: 'Keeping control of your receivables and treasury is key to running a healthy business. Receivables handle collections and payments to ensure a steady cash flow, while treasury helps you organize resources, optimize funds, and maintain liquidity. With RedDoc, you can automate these processes, simplifying financial management and ensuring complete, hassle-free control.',
        bullets: [
          'Manage your payments and collections.',
          'Track due dates.',
          'Get detailed account-statement reports.',
        ],
        image: '/landing/tesoreria.png',
      },
      {
        key: 'inventario',
        eyebrow: 'MOD/03',
        title: 'Inventory',
        italic: '',
        body: 'With RedDoc, keeping control of your inventory is easier. You can log inflows and outflows in real time, make sure your stock is always up to date, and generate reports to better understand product movement and make strategic decisions. Everything integrates with your business — from purchases and sales to accounting and POS — so you make smarter decisions and run a more efficient operation.',
        bullets: [
          'Stock control.',
          'Real-time inventory updates.',
          'Movement tracking.',
          'Cost control.',
          'Detailed reports and analysis of inventory movement.',
        ],
        image: '/landing/inventario.png',
      },
      {
        key: 'pos',
        eyebrow: 'MOD/04',
        title: 'POS+',
        italic: '',
        body: 'Selling has never been easier. With RedDoc POS, you can process transactions quickly and without friction, keeping everything in sync with your inventory and accounting.',
        bullets: [
          'Ring up sales in seconds.',
          'Accept multiple payment methods.',
          'Generate electronic invoices instantly.',
          'Keep your inventory updated automatically.',
          'Access real-time sales reports.',
        ],
        closing:
          'Whether in your physical store or online, RedDoc POS helps you improve customer experience and optimize business management.',
        image: '/landing/pos.png',
      },
      {
        key: 'nomina',
        eyebrow: 'MOD/05',
        title: 'Payroll',
        italic: '',
        body: 'Handling payroll can seem complicated, but with RedDoc it is easy and stress-free. You can manage payments, generate electronic payroll automatically, and ensure compliance with current regulations — all organized so you save time and focus on what really matters: your team and your business.',
        bullets: [
          'Generate payroll with ease.',
          'Settle social security without errors.',
          'Access detailed real-time reports.',
          'Stay compliant without hassle.',
        ],
        image: '/landing/nomina.png',
      },
      {
        key: 'contabilidad',
        eyebrow: 'MOD/06',
        title: 'Accounting',
        italic: '',
        body: 'We know that dealing with numbers, invoices, and taxes can be a real challenge, but it is essential for the stability of your business. With RedDoc, keeping your books will be a breeze. You will have a clear view of your purchases, sales, and inventory to make confident decisions, plus a detailed record of your transactions for a hassle-free audit.',
        bullets: [
          'Remote accessibility.',
          'Intuitive and easy to use.',
          'Document automation.',
          'Wide range of financial reports.',
          'Simplified tax-obligation compliance.',
        ],
        closing:
          'Instead of losing time on paperwork, you can focus on growing your business with the peace of mind that your finances are in order.',
        image: '/landing/contabilidad.png',
      },
    ],
    detailsCta: 'See module detail',
  },
  pricing: {
    section: '03 / PRICING',
    title: 'Pay only',
    italic: 'for what you use.',
    lede: 'No upfront costs, no surprises. Transparent pricing, in pesos, with no long-term contracts.',
    track_billing: 'Billing',
    track_erp: 'Full ERP',
    note: 'Monthly prices in COP · VAT excluded',
    timestamp: 'Pricing Q2 2026 · COP',
    perMonth: '/ mo',
    cta: 'Select plan',
    plans_billing: [
      {
        id: 'impulso',
        name: 'Impulse',
        price: '$16,900',
        description: getPlanDescription('en', 'impulso'),
        features: getPlanFeatures('en', 'facturacion', 'impulso'),
      },
      {
        id: 'crecimiento',
        name: 'Growth',
        price: '$49,900',
        description: getPlanDescription('en', 'crecimiento'),
        highlight: true,
        features: getPlanFeatures('en', 'facturacion', 'crecimiento'),
      },
      {
        id: 'expansion',
        name: 'Expansion',
        price: '$95,900',
        description: getPlanDescription('en', 'expansion'),
        features: getPlanFeatures('en', 'facturacion', 'expansion'),
      },
      {
        id: 'exito',
        name: 'Success',
        price: '$172,900',
        description: getPlanDescription('en', 'exito'),
        features: getPlanFeatures('en', 'facturacion', 'exito'),
      },
    ],
    plans_erp: [
      {
        id: 'impulso-erp',
        name: 'Impulse ERP',
        price: '$22,900',
        description: getPlanDescription('en', 'impulso'),
        features: getPlanFeatures('en', 'erp', 'impulso'),
      },
      {
        id: 'crecimiento-erp',
        name: 'Growth ERP',
        price: '$74,900',
        description: getPlanDescription('en', 'crecimiento'),
        features: getPlanFeatures('en', 'erp', 'crecimiento'),
      },
      {
        id: 'expansion-erp',
        name: 'Expansion ERP',
        price: '$149,900',
        description: getPlanDescription('en', 'expansion'),
        highlight: true,
        features: getPlanFeatures('en', 'erp', 'expansion'),
      },
      {
        id: 'exito-erp',
        name: 'Success ERP',
        price: '$229,900',
        description: getPlanDescription('en', 'exito'),
        features: getPlanFeatures('en', 'erp', 'exito'),
      },
    ],
    footnote: 'Assisted migration at no extra cost · cancel anytime · your data, always yours.',
  },
  testimonials: {
    section: '04 / CUSTOMERS',
    title: 'What companies',
    italic: 'already running on RedDoc say.',
    quotes: [
      {
        body: 'RedDoc gave us back our afternoons. We used to close month-end at nine in the evening; now by five payroll is settled and A/R is reconciled.',
        author: 'María Camila Restrepo',
        role: 'CEO · Distribuidora Andina',
      },
      {
        body: 'The interface is honest — it doesn’t hide numbers behind menus. That helped us make better, faster decisions with our partners.',
        author: 'Andrés Felipe Gómez',
        role: 'Financial consultant',
      },
      {
        body: 'We deployed POS, inventory, and accounting in one week. Support answered every question and the team stopped fighting three different tools.',
        author: 'Laura Quintero',
        role: 'Manager · Tienda Mariposa',
      },
    ],
  },
  contact: {
    section: '05 / CONTACT',
    title: 'Let’s talk about',
    italic: 'your operation.',
    lede: 'Tell us which processes are keeping you up at night. We reply in under 24 business hours.',
    address_label: 'Office',
    address: 'Cll 34 No. 66 A 33 · Of. 201 · Conquistadores · Medellín, Colombia',
    phone_label: 'Phone',
    phone: '+57 333 259 0639',
    email_label: 'Email',
    email: 'asesor@reddoc.co',
    form_name: 'Full name',
    form_email: 'Email',
    form_phone: 'Phone',
    form_company: 'Company',
    form_message: 'Tell us about your operation',
    form_submit: 'Send message',
    form_required: 'Required field',
  },
  cta: {
    eyebrow: 'GET STARTED · 5 MINUTE DEMO',
    title: 'A more orderly operation,',
    italic: 'from day one.',
    lede: 'Thirty minutes to set it up. A calmer operating life ever after.',
    primary: 'Get started',
    secondary: 'Talk to an advisor',
  },
  footer: {
    tagline:
      'The modular ERP for Colombian SMEs. Operations, e-invoicing, and accounting on one platform.',
    docs: 'Documentation',
    docs_links: ['Help center', 'Videos', 'Changelog', 'API', 'Status'],
    company: 'Company',
    company_links: ['About', 'Customers', 'Blog', 'Careers'],
    legal: 'Legal',
    legal_links: ['Terms', 'Privacy', 'Cookies', 'Compliance'],
    rights: '© 2026 Semantica Digital S.A.S · All rights reserved.',
    masthead: 'Made in Medellín · Colombia · operating across LATAM.',
  },
};

export const dictionaries: Record<Lang, Dict> = { es, en };
