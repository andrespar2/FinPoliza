import type {
  AppNotification,
  AppSettings,
  FundMovement,
  Installment,
  InsuranceProduct,
  Payment,
  Policy,
  Role,
  User,
} from '../types'
import { DEFAULT_SETTINGS } from './defaults'
import { createSystemRoles } from './permissions'
import { addDays, addMonths, nowISO, timeFromISO, todayISO, toISODate } from '../lib/dates'
import { hashPassword } from '../lib/crypto'
import { uid } from '../lib/id'

export interface SeedData {
  users: User[]
  roles: Role[]
  products: InsuranceProduct[]
  policies: Policy[]
  installments: Installment[]
  payments: Payment[]
  fundMovements: FundMovement[]
  notifications: AppNotification[]
  settings: AppSettings
}

const now = nowISO()
const today = todayISO()

const monthsAgo = (n: number, dayOffset = 0) => addDays(addMonths(today, -n), dayOffset)
const daysAgoIso = (iso: string, days: number) => `${addDays(iso, days)}T10:30:00.000Z`
const randRef = () => `${Math.floor(100000 + Math.random() * 899999)}`

function product(
  data: Omit<InsuranceProduct, 'createdAt' | 'updatedAt' | 'archived'> & { archived?: boolean },
): InsuranceProduct {
  return { ...data, archived: data.archived ?? false, createdAt: now, updatedAt: now }
}

const products: InsuranceProduct[] = [
  product({
    id: 'prod_vida',
    name: 'Seguro de Vida Familiar',
    category: 'Vida',
    icon: 'HeartPulse',
    color: '#4F8BFF',
    shortDescription: 'Protección económica para tu familia cuando más lo necesita.',
    description:
      'Un respaldo para los tuyos. Si llegaras a faltar, tu familia recibe un capital que le permite mantener su calidad de vida, cubrir deudas y cumplir sus proyectos. Incluye acompañamiento en caso de enfermedad grave.',
    benefits: [
      'Capital asegurado para tus beneficiarios',
      'Cobertura por incapacidad total y permanente',
      'Auxilio funerario sin trámites adicionales',
      'Asistencia psicológica para tu familia',
    ],
    coverage: [
      { label: 'Muerte por cualquier causa', amount: 120000000, detail: 'Capital para beneficiarios' },
      { label: 'Incapacidad total y permanente', amount: 60000000 },
      { label: 'Enfermedades graves', amount: 30000000, detail: 'Diagnóstico cubierto' },
      { label: 'Auxilio funerario', amount: 8000000 },
    ],
    conditions: [
      'Edad de ingreso entre 18 y 70 años.',
      'No requiere examen médico para capitales menores a $150.000.000.',
      'Carencia de 30 días para enfermedades graves.',
      'Pago mensual, semestral o de contado.',
    ],
    durationMonths: 12,
    basePrice: 1200000,
    modalities: [
      { id: 'mod_12m', label: '12 cuotas mensuales', installments: 12, periodicity: 'monthly', surchargePct: 0 },
      { id: 'mod_6m', label: '6 cuotas mensuales', installments: 6, periodicity: 'monthly', surchargePct: 2 },
      { id: 'mod_single', label: 'Pago de contado', installments: 1, periodicity: 'single', surchargePct: -3 },
    ],
    featured: true,
    active: true,
  }),
  product({
    id: 'prod_salud',
    name: 'Seguro de Salud Integral',
    category: 'Salud',
    icon: 'Stethoscope',
    color: '#34D399',
    shortDescription: 'Consultas, exámenes y hospitalización con respaldo completo.',
    description:
      'Complementa tu atención médica con acceso a especialistas, exámenes diagnósticos y hospitalización en una red de más de 300 clínicas aliadas en todo el país.',
    benefits: [
      'Consultas con especialistas sin filas',
      'Exámenes de laboratorio e imágenes',
      'Hospitalización y cirugía cubiertas',
      'Orientación médica telefónica 24/7',
    ],
    coverage: [
      { label: 'Hospitalización', amount: 50000000, detail: 'Por evento' },
      { label: 'Cirugías', amount: 40000000 },
      { label: 'Consultas y exámenes', amount: 6000000, detail: 'Anual' },
      { label: 'Medicamentos ambulatorios', amount: 4000000 },
    ],
    conditions: [
      'Vigencia de 12 meses renovable.',
      'Periodo de carencia de 30 días.',
      'Red de clínicas aliadas FinPoliza.',
      'Copago del 10% en consultas.',
    ],
    durationMonths: 12,
    basePrice: 2400000,
    modalities: [
      { id: 'mod_12m', label: '12 cuotas mensuales', installments: 12, periodicity: 'monthly', surchargePct: 0 },
      { id: 'mod_6m', label: '6 cuotas mensuales', installments: 6, periodicity: 'monthly', surchargePct: 2 },
      { id: 'mod_single', label: 'Pago de contado', installments: 1, periodicity: 'single', surchargePct: -3 },
    ],
    featured: true,
    active: true,
  }),
  product({
    id: 'prod_accidentes',
    name: 'Seguro de Accidentes Personales',
    category: 'Accidentes',
    icon: 'ShieldCheck',
    color: '#F2C230',
    shortDescription: 'Respaldo inmediato ante lesiones y accidentes del día a día.',
    description:
      'Cubre gastos médicos, incapacidades y fallecimiento accidental. Ideal para quienes trabajan, viajan o realizan actividades físicas y quieren protección adicional a bajo costo.',
    benefits: [
      'Atención inmediata por accidente',
      'Indemnización diaria por incapacidad',
      'Cobertura nacional sin importar la ciudad',
      'Sin exámenes médicos',
    ],
    coverage: [
      { label: 'Muerte accidental', amount: 50000000 },
      { label: 'Gastos médicos por accidente', amount: 10000000 },
      { label: 'Incapacidad temporal', amount: 1500000, detail: 'Por mes' },
      { label: 'Renta diaria hospitalaria', amount: 150000, detail: 'Por día' },
    ],
    conditions: [
      'Edad entre 18 y 75 años.',
      'Activación inmediata tras el pago.',
      'No cubre accidentes por deportes extremos.',
      'Vigencia anual.',
    ],
    durationMonths: 12,
    basePrice: 480000,
    modalities: [
      { id: 'mod_12m', label: '12 cuotas mensuales', installments: 12, periodicity: 'monthly', surchargePct: 0 },
      { id: 'mod_single', label: 'Pago de contado', installments: 1, periodicity: 'single', surchargePct: -5 },
    ],
    featured: false,
    active: true,
  }),
  product({
    id: 'prod_hogar',
    name: 'Seguro de Hogar Protegido',
    category: 'Hogar',
    icon: 'House',
    color: '#A78BFA',
    shortDescription: 'Tu casa y todo lo que hay en ella, siempre protegidos.',
    description:
      'Protege tu vivienda y tus bienes frente a incendios, robos, inundaciones y daños eléctricos. Incluye asistencia para reparaciones menores y hogar de paso.',
    benefits: [
      'Cobertura de estructura y contenidos',
      'Asistencia de plomería y electricidad',
      'Hogar de paso en caso de emergencia',
      'Responsabilidad civil familiar',
    ],
    coverage: [
      { label: 'Estructura de la vivienda', amount: 200000000 },
      { label: 'Contenidos y electrodomésticos', amount: 40000000 },
      { label: 'Robo de bienes', amount: 15000000 },
      { label: 'Asistencia domiciliaria', amount: 4000000, detail: 'Anual' },
    ],
    conditions: [
      'La vivienda debe estar habitada por el asegurado.',
      'Vigencia de 12 meses renovable.',
      'Deducible del 10% por evento.',
      'No cubre bienes fuera del inmueble.',
    ],
    durationMonths: 12,
    basePrice: 960000,
    modalities: [
      { id: 'mod_12m', label: '12 cuotas mensuales', installments: 12, periodicity: 'monthly', surchargePct: 0 },
      { id: 'mod_6m', label: '6 cuotas mensuales', installments: 6, periodicity: 'monthly', surchargePct: 2 },
      { id: 'mod_single', label: 'Pago de contado', installments: 1, periodicity: 'single', surchargePct: -3 },
    ],
    featured: false,
    active: true,
  }),
  product({
    id: 'prod_vehiculo',
    name: 'Seguro de Vehículo Total',
    category: 'Vehículo',
    icon: 'Car',
    color: '#38BDF8',
    shortDescription: 'Protección completa para tu carro o moto, dentro y fuera de la vía.',
    description:
      'Cobertura todo riesgo con asistencia en carretera, grúa, vehículo de reemplazo y responsabilidad civil ante terceros. Mantén tu movilidad sin preocupaciones.',
    benefits: [
      'Todo riesgo: pérdida total, hurto y daños',
      'Grúa y asistencia en carretera 24/7',
      'Vehículo de reemplazo hasta por 15 días',
      'Conductor elegido sin costo',
    ],
    coverage: [
      { label: 'Pérdida total por hurto o daño', amount: 85000000 },
      { label: 'Responsabilidad civil extracontractual', amount: 150000000 },
      { label: 'Asistencia en carretera', amount: 5000000, detail: 'Por evento' },
      { label: 'Vehículo de reemplazo', amount: 2000000, detail: 'Hasta 15 días' },
    ],
    conditions: [
      'Vehículo con menos de 15 años de fabricación.',
      'Deducible del 10% o 5 salarios mínimos.',
      'Conductor entre 18 y 75 años.',
      'Requiere revisión de inspección previa.',
    ],
    durationMonths: 12,
    basePrice: 1800000,
    modalities: [
      { id: 'mod_12m', label: '12 cuotas mensuales', installments: 12, periodicity: 'monthly', surchargePct: 0 },
      { id: 'mod_6m', label: '6 cuotas mensuales', installments: 6, periodicity: 'monthly', surchargePct: 2 },
      { id: 'mod_single', label: 'Pago de contado', installments: 1, periodicity: 'single', surchargePct: -4 },
    ],
    featured: true,
    active: true,
  }),
  product({
    id: 'prod_funerario',
    name: 'Seguro de Gastos Funerarios',
    category: 'Vida',
    icon: 'Flower2',
    color: '#F472B6',
    shortDescription: 'Acompañamiento y cobertura para despedir a los tuyos con dignidad.',
    description:
      'Cubre los gastos funerarios del asegurado y su grupo familiar con servicios completos, trámites incluidos y acompañamiento permanente a los familiares.',
    benefits: [
      'Servicio funerario completo',
      'Traslados nacionales incluidos',
      'Trámites legales gestionados',
      'Cobertura para todo el grupo familiar',
    ],
    coverage: [
      { label: 'Servicio funerario', amount: 12000000 },
      { label: 'Traslado nacional', amount: 4000000 },
      { label: 'Acompañamiento familiar', amount: 2000000 },
    ],
    conditions: [
      'Sin límite de edad de ingreso.',
      'Cobertura desde el primer día.',
      'Cubre al asegurado y hasta 4 familiares.',
      'Vigencia anual renovable.',
    ],
    durationMonths: 12,
    basePrice: 720000,
    modalities: [
      { id: 'mod_12m', label: '12 cuotas mensuales', installments: 12, periodicity: 'monthly', surchargePct: 0 },
      { id: 'mod_single', label: 'Pago de contado', installments: 1, periodicity: 'single', surchargePct: -2 },
    ],
    featured: false,
    active: true,
  }),
  product({
    id: 'prod_educativo',
    name: 'Seguro Educativo Futuro',
    category: 'Ahorro',
    icon: 'GraduationCap',
    color: '#FBBF24',
    shortDescription: 'Asegura hoy la educación de tus hijos y nietos.',
    description:
      'Combina protección de vida con un ahorro programado que garantiza el pago de la matrícula y la manutención académica cuando tu beneficiario lo necesite.',
    benefits: [
      'Ahorro programado para estudios',
      'Protección de vida incluida',
      'Pago directo a la universidad',
      'Beneficiario adicional sin costo',
    ],
    coverage: [
      { label: 'Fondo educativo', amount: 60000000 },
      { label: 'Protección de vida del pagador', amount: 80000000 },
      { label: 'Manutención escolar', amount: 12000000 },
    ],
    conditions: [
      'Permanencia mínima de 12 meses.',
      'Beneficiario entre 0 y 17 años.',
      'Retiro parcial después del año 5.',
      'Vigencia anual renovable.',
    ],
    durationMonths: 12,
    basePrice: 1500000,
    modalities: [
      { id: 'mod_12m', label: '12 cuotas mensuales', installments: 12, periodicity: 'monthly', surchargePct: 0 },
      { id: 'mod_6m', label: '6 cuotas mensuales', installments: 6, periodicity: 'monthly', surchargePct: 2 },
      { id: 'mod_single', label: 'Pago de contado', installments: 1, periodicity: 'single', surchargePct: -3 },
    ],
    featured: false,
    active: true,
  }),
  product({
    id: 'prod_mascotas',
    name: 'Seguro de Mascotas',
    category: 'Mascotas',
    icon: 'PawPrint',
    color: '#FB923C',
    shortDescription: 'Cuidado veterinario para el miembro más peludo de la familia.',
    description:
      'Cubre consultas veterinarias, vacunas, cirugías y hospitalización de perros y gatos. Incluye orientación veterinaria telefónica y descuentos en tiendas aliadas.',
    benefits: [
      'Consultas veterinarias ilimitadas',
      'Vacunas y desparasitación',
      'Cirugías y hospitalización',
      'Asistencia veterinaria telefónica',
    ],
    coverage: [
      { label: 'Tratamientos y cirugías', amount: 8000000 },
      { label: 'Consultas y vacunas', amount: 1200000 },
      { label: 'Hospitalización', amount: 4000000 },
    ],
    conditions: [
      'Mascotas entre 2 meses y 10 años.',
      'Carencia de 15 días para cirugías.',
      'No cubre enfermedades preexistentes.',
      'Vigencia anual.',
    ],
    durationMonths: 12,
    basePrice: 360000,
    modalities: [
      { id: 'mod_12m', label: '12 cuotas mensuales', installments: 12, periodicity: 'monthly', surchargePct: 0 },
      { id: 'mod_single', label: 'Pago de contado', installments: 1, periodicity: 'single', surchargePct: -2 },
    ],
    featured: false,
    active: true,
  }),
  product({
    id: 'prod_empresarial',
    name: 'Seguro Empresarial Pyme',
    category: 'Empresas',
    icon: 'Briefcase',
    color: '#60A5FA',
    shortDescription: 'Protege tu negocio, tus empleados y tu operación.',
    description:
      'Un solo seguro para cubrir instalaciones, inventario, responsabilidad civil y accidentes laborales de tu pequeña o mediana empresa.',
    benefits: [
      'Cobertura de instalaciones e inventario',
      'Responsabilidad civil comercial',
      'Accidentes laborales del equipo',
      'Asesoría en prevención de riesgos',
    ],
    coverage: [
      { label: 'Instalaciones y contenidos', amount: 150000000 },
      { label: 'Responsabilidad civil', amount: 200000000 },
      { label: 'Lucro cesante', amount: 30000000 },
    ],
    conditions: [
      'Empresas con hasta 50 empleados.',
      'Inspección de riesgos previa.',
      'Vigencia anual renovable.',
      'Deducible según cobertura.',
    ],
    durationMonths: 12,
    basePrice: 3200000,
    modalities: [
      { id: 'mod_12m', label: '12 cuotas mensuales', installments: 12, periodicity: 'monthly', surchargePct: 0 },
      { id: 'mod_6m', label: '6 cuotas mensuales', installments: 6, periodicity: 'monthly', surchargePct: 2 },
    ],
    featured: false,
    active: true,
  }),
]

interface UserSeed {
  id: string
  firstName: string
  lastName: string
  docType: User['docType']
  docNumber: string
  email: string
  phone: string
  address: string
  city: string
  birthDate: string
  roleId: string
  status: User['status']
  password: string
  createdAt: string
  notes?: string
}

const userSeeds: UserSeed[] = [
  {
    id: 'usr_admin_principal',
    firstName: 'Andrés',
    lastName: 'Pardo Rueda',
    docType: 'CC',
    docNumber: '1020304050',
    email: 'admin@finpoliza.com',
    phone: '+57 310 555 0101',
    address: 'Calle 93 # 15-20',
    city: 'Bogotá',
    birthDate: '1981-03-12',
    roleId: 'role_owner',
    status: 'active',
    password: 'Admin123*',
    createdAt: '2024-02-05T09:00:00.000Z',
    notes: 'Administrador principal de la compañía.',
  },
  {
    id: 'usr_gerencia',
    firstName: 'Camila',
    lastName: 'Restrepo Vélez',
    docType: 'CC',
    docNumber: '1015487963',
    email: 'gerencia@finpoliza.com',
    phone: '+57 315 442 7788',
    address: 'Carrera 11 # 85-40',
    city: 'Bogotá',
    birthDate: '1988-07-22',
    roleId: 'role_admin',
    status: 'active',
    password: 'Admin123*',
    createdAt: '2024-03-18T09:00:00.000Z',
    notes: 'Gerente de operaciones.',
  },
  {
    id: 'usr_asesor',
    firstName: 'Julián',
    lastName: 'Gómez Salazar',
    docType: 'CC',
    docNumber: '1098765432',
    email: 'asesor@finpoliza.com',
    phone: '+57 320 331 9090',
    address: 'Calle 45 # 23-11',
    city: 'Medellín',
    birthDate: '1994-11-08',
    roleId: 'role_staff',
    status: 'active',
    password: 'Asesor123*',
    createdAt: '2024-06-01T09:00:00.000Z',
    notes: 'Asesor de servicio al cliente.',
  },
  {
    id: 'usr_maria',
    firstName: 'María Fernanda',
    lastName: 'López Herrera',
    docType: 'CC',
    docNumber: '51789456',
    email: 'maria@demo.com',
    phone: '+57 312 480 1122',
    address: 'Carrera 45 # 12-30, apto 302',
    city: 'Bogotá',
    birthDate: '1957-05-14',
    roleId: 'role_user',
    status: 'active',
    password: 'Demo123*',
    createdAt: '2024-09-12T09:00:00.000Z',
    notes: 'Clienta con tres pólizas y fondo solidario activo.',
  },
  {
    id: 'usr_carlos',
    firstName: 'Carlos Andrés',
    lastName: 'Ramírez Ospina',
    docType: 'CC',
    docNumber: '79456123',
    email: 'carlos@demo.com',
    phone: '+57 301 220 3344',
    address: 'Avenida 68 # 40-12',
    city: 'Bogotá',
    birthDate: '1983-09-30',
    roleId: 'role_user',
    status: 'active',
    password: 'Demo123*',
    createdAt: '2025-01-20T09:00:00.000Z',
  },
  {
    id: 'usr_rosa',
    firstName: 'Rosa Elena',
    lastName: 'Martínez Cifuentes',
    docType: 'CC',
    docNumber: '41522387',
    email: 'rosa@demo.com',
    phone: '+57 316 778 2211',
    address: 'Calle 12 # 8-45',
    city: 'Popayán',
    birthDate: '1951-01-19',
    roleId: 'role_user',
    status: 'active',
    password: 'Demo123*',
    createdAt: '2024-11-05T09:00:00.000Z',
  },
  {
    id: 'usr_jorge',
    firstName: 'Jorge Enrique',
    lastName: 'Silva Mora',
    docType: 'CC',
    docNumber: '19334455',
    email: 'jorge@demo.com',
    phone: '+57 318 556 7788',
    address: 'Carrera 30 # 55-09',
    city: 'Cali',
    birthDate: '1964-06-02',
    roleId: 'role_user',
    status: 'active',
    password: 'Demo123*',
    createdAt: '2025-03-02T09:00:00.000Z',
  },
  {
    id: 'usr_lucia',
    firstName: 'Lucía Fernanda',
    lastName: 'Torres Peña',
    docType: 'CC',
    docNumber: '66887744',
    email: 'lucia@demo.com',
    phone: '+57 305 112 4455',
    address: 'Carrera 7 # 22-18',
    city: 'Bucaramanga',
    birthDate: '1970-12-11',
    roleId: 'role_user',
    status: 'suspended',
    password: 'Demo123*',
    createdAt: '2025-02-14T09:00:00.000Z',
    notes: 'Cuenta suspendida temporalmente por validación de datos.',
  },
]

interface PolicySeed {
  userId: string
  productId: string
  modalityId: string
  monthsAgo: number
  paidCount: number
  createdBy: string
}

const policySeeds: PolicySeed[] = [
  { userId: 'usr_maria', productId: 'prod_vida', modalityId: 'mod_12m', monthsAgo: 4, paidCount: 4, createdBy: 'usr_maria' },
  { userId: 'usr_maria', productId: 'prod_hogar', modalityId: 'mod_12m', monthsAgo: 3, paidCount: 2, createdBy: 'usr_maria' },
  { userId: 'usr_maria', productId: 'prod_accidentes', modalityId: 'mod_12m', monthsAgo: 3, paidCount: 1, createdBy: 'usr_asesor' },
  { userId: 'usr_carlos', productId: 'prod_vehiculo', modalityId: 'mod_12m', monthsAgo: 6, paidCount: 6, createdBy: 'usr_carlos' },
  { userId: 'usr_carlos', productId: 'prod_salud', modalityId: 'mod_12m', monthsAgo: 1, paidCount: 1, createdBy: 'usr_carlos' },
  { userId: 'usr_rosa', productId: 'prod_vida', modalityId: 'mod_12m', monthsAgo: 10, paidCount: 10, createdBy: 'usr_asesor' },
  { userId: 'usr_rosa', productId: 'prod_funerario', modalityId: 'mod_single', monthsAgo: 11, paidCount: 1, createdBy: 'usr_asesor' },
  { userId: 'usr_jorge', productId: 'prod_educativo', modalityId: 'mod_12m', monthsAgo: 2, paidCount: 2, createdBy: 'usr_jorge' },
  { userId: 'usr_jorge', productId: 'prod_mascotas', modalityId: 'mod_12m', monthsAgo: 1, paidCount: 0, createdBy: 'usr_jorge' },
  { userId: 'usr_lucia', productId: 'prod_salud', modalityId: 'mod_6m', monthsAgo: 5, paidCount: 2, createdBy: 'usr_asesor' },
]

export async function buildSeedData(): Promise<SeedData> {
  const roles = createSystemRoles(now)
  const users: User[] = []
  for (const seed of userSeeds) {
    users.push({
      id: seed.id,
      firstName: seed.firstName,
      lastName: seed.lastName,
      docType: seed.docType,
      docNumber: seed.docNumber,
      email: seed.email,
      phone: seed.phone,
      address: seed.address,
      city: seed.city,
      birthDate: seed.birthDate,
      roleId: seed.roleId,
      status: seed.status,
      passwordHash: await hashPassword(seed.password),
      createdAt: seed.createdAt,
      updatedAt: seed.createdAt,
      notes: seed.notes,
    })
  }

  const policies: Policy[] = []
  const installments: Installment[] = []
  const payments: Payment[] = []
  const paymentMethods: Payment['method'][] = [
    'tarjeta_simulada',
    'pse_simulado',
    'transferencia_simulada',
    'efectivo',
  ]

  policySeeds.forEach((seed, index) => {
    const prod = products.find((p) => p.id === seed.productId)!
    const modality = prod.modalities.find((m) => m.id === seed.modalityId) ?? prod.modalities[0]
    const base = Math.round(prod.basePrice * (1 + modality.surchargePct / 100))
    const installmentAmount = Math.max(1, Math.round(base / modality.installments))
    const totalAmount = installmentAmount * modality.installments
    const startDate = monthsAgo(seed.monthsAgo)
    const policyId = `pol_${String(index + 1).padStart(3, '0')}`
    const purchasedAt = `${startDate}T14:20:00.000Z`

    const policy: Policy = {
      id: policyId,
      code: `POL-${2025}${String(1000 + index)}`,
      userId: seed.userId,
      productId: prod.id,
      snapshot: {
        name: prod.name,
        category: prod.category,
        icon: prod.icon,
        color: prod.color,
        description: prod.description,
        benefits: [...prod.benefits],
        coverage: prod.coverage.map((c) => ({ ...c })),
        conditions: [...prod.conditions],
      },
      modalityId: modality.id,
      modalityLabel: modality.label,
      periodicity: modality.periodicity,
      installmentsCount: modality.installments,
      installmentAmount,
      totalAmount,
      status: 'active',
      purchasedAt,
      startDate,
      createdBy: seed.createdBy,
    }
    policies.push(policy)

    for (let i = 1; i <= modality.installments; i += 1) {
      const dueDate =
        modality.periodicity === 'single' ? startDate : addMonths(startDate, i)
      const isPaid = i <= seed.paidCount
      const instId = `ins_${policyId}_${i}`
      const paidDate = addDays(dueDate, -2)
      const paymentId = isPaid ? `pay_${policyId}_${i}` : undefined
      const inst: Installment = {
        id: instId,
        policyId,
        userId: seed.userId,
        number: i,
        amount: installmentAmount,
        dueDate,
        status: isPaid ? 'paid' : 'pending',
        paidAt: isPaid ? `${paidDate}T10:15:00.000Z` : undefined,
        paymentId,
      }
      installments.push(inst)
      if (isPaid && paymentId) {
        const method = paymentMethods[(index + i) % paymentMethods.length]
        payments.push({
          id: paymentId,
          code: `PG-${String(240000 + index * 20 + i)}`,
          userId: seed.userId,
          policyId,
          installmentId: instId,
          installmentNumber: i,
          amount: installmentAmount,
          date: paidDate,
          time: `${String(8 + ((index + i) % 9)).padStart(2, '0')}:${String((i * 7) % 60).padStart(2, '0')}`,
          status: 'paid',
          method,
          reference: `REF-${randRef()}`,
          registeredBy: seed.createdBy,
          createdAt: `${paidDate}T10:15:00.000Z`,
          concept: `Cuota ${i} de ${modality.installments} · ${prod.name}`,
        })
      }
    }
    const allPaid = seed.paidCount >= modality.installments
    if (allPaid) policy.status = 'completed'
  })

  // Fondo solidario: movimientos cronológicos por usuario.
  const fundMovements: FundMovement[] = []
  const balances = new Map<string, number>()
  const pushFund = (
    userId: string,
    type: FundMovement['type'],
    amount: number,
    date: string,
    description: string,
    createdBy: string,
    justification?: string,
  ) => {
    const current = balances.get(userId) ?? 0
    const next = type === 'deposit' || type === 'adjustment_credit' ? current + amount : current - amount
    balances.set(userId, next)
    fundMovements.push({
      id: uid('fnd'),
      userId,
      type,
      amount,
      date,
      time: '09:30',
      description,
      balanceAfter: next,
      justification,
      createdBy,
      createdAt: `${date}T09:30:00.000Z`,
    })
  }

  pushFund('usr_maria', 'deposit', 100000, monthsAgo(5, 3), 'Aportación voluntaria al fondo solidario', 'usr_maria')
  pushFund('usr_maria', 'deposit', 50000, monthsAgo(4, 4), 'Aportación mensual programada', 'usr_maria')
  pushFund('usr_maria', 'deposit', 200000, monthsAgo(3, 2), 'Aportación para imprevistos familiares', 'usr_maria')
  pushFund('usr_maria', 'withdrawal', 150000, monthsAgo(2, 6), 'Retiro para gastos de salud', 'usr_maria')
  pushFund('usr_maria', 'deposit', 100000, monthsAgo(1, 8), 'Aportación voluntaria al fondo solidario', 'usr_maria')
  pushFund('usr_maria', 'deposit', 150000, daysAgoIso(today, -5), 'Aportación voluntaria al fondo solidario', 'usr_maria')

  pushFund('usr_rosa', 'deposit', 500000, monthsAgo(8, 1), 'Aportación inicial al fondo solidario', 'usr_rosa')
  pushFund('usr_rosa', 'deposit', 300000, monthsAgo(6, 1), 'Aportación voluntaria al fondo solidario', 'usr_rosa')
  pushFund('usr_rosa', 'deposit', 400000, monthsAgo(3, 1), 'Aportación voluntaria al fondo solidario', 'usr_rosa')

  pushFund('usr_carlos', 'deposit', 200000, monthsAgo(4, 2), 'Aportación voluntaria al fondo solidario', 'usr_carlos')
  pushFund('usr_carlos', 'deposit', 100000, monthsAgo(2, 1), 'Aportación voluntaria al fondo solidario', 'usr_carlos')

  pushFund('usr_jorge', 'deposit', 50000, monthsAgo(2, 5), 'Aportación voluntaria al fondo solidario', 'usr_jorge')

  pushFund(
    'usr_lucia',
    'deposit',
    120000,
    monthsAgo(3, 3),
    'Aportación voluntaria al fondo solidario',
    'usr_lucia',
  )
  pushFund(
    'usr_lucia',
    'adjustment_credit',
    30000,
    monthsAgo(1, 2),
    'Ajuste administrativo por reintegro',
    'usr_gerencia',
    'Reintegro de aportación registrada dos veces en la migración de datos.',
  )

  fundMovements.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))

  const notifications: AppNotification[] = [
    {
      id: uid('ntf'),
      userId: 'usr_maria',
      type: 'welcome',
      title: '¡Bienvenida a FinPoliza, María!',
      body: 'Tu cuenta está activa. Ya puedes consultar tus seguros y tu fondo solidario.',
      createdAt: monthsAgo(4, 1) + 'T08:00:00.000Z',
      read: true,
    },
    {
      id: uid('ntf'),
      userId: 'usr_maria',
      type: 'payment_due',
      title: 'Tu próxima cuota está cerca',
      body: 'Recuerda pagar la cuota de tu Seguro de Hogar Protegido.',
      createdAt: daysAgoIso(today, -2),
      read: false,
      link: '/seguros',
    },
    {
      id: uid('ntf'),
      userId: 'usr_maria',
      type: 'fund_deposit',
      title: 'Aportación registrada',
      body: 'Recibimos tu aportación de $150.000 al Fondo Solidario.',
      createdAt: daysAgoIso(today, -5),
      read: true,
      link: '/fondo',
    },
    {
      id: uid('ntf'),
      userId: 'all',
      type: 'announcement',
      title: 'Nueva cobertura de salud',
      body: 'Ya está disponible el Seguro de Salud Integral con atención en más de 300 clínicas. Conócelo en el catálogo.',
      createdAt: daysAgoIso(today, -3),
      read: false,
      link: '/catalogo',
    },
    {
      id: uid('ntf'),
      userId: 'all',
      type: 'announcement',
      title: 'Actualización de la aplicación',
      body: 'Mejoramos la visualización de tus cuotas y del fondo solidario.',
      createdAt: monthsAgo(1, 2) + 'T12:00:00.000Z',
      read: true,
    },
  ]

  const settings: AppSettings = {
    ...DEFAULT_SETTINGS,
    updatedAt: now,
    texts: { ...DEFAULT_SETTINGS.texts, faqs: DEFAULT_SETTINGS.texts.faqs.map((f) => ({ ...f })) },
    fund: {
      ...DEFAULT_SETTINGS.fund,
      suggestedAmounts: [...DEFAULT_SETTINGS.fund.suggestedAmounts],
      rules: [...DEFAULT_SETTINGS.fund.rules],
    },
  }

  // Orden estable por fecha para los pagos.
  payments.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))

  return { users, roles, products, policies, installments, payments, fundMovements, notifications, settings }
}

export function seedMeta() {
  return {
    seededAt: nowISO(),
    version: 1,
    today: toISODate(new Date()),
  }
}

export { timeFromISO }
