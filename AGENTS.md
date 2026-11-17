EDITAR SIEMPRE EL AGENTS.MD CON EL FIN DE MANTENER EL CONTEXTO DEL PROYECTO ACTUALIZADO Y LO MAS ENTENDIBLE POSIBLE PARA QUE LAS DEMAS IA´S O AGENTES PUEDAN REVISARLO Y AHORRAR TIEMPO AVERIGUANDO PARA QUE ES, COMO FUNCIONA O COMO ESTA HECHO

# AGENTS.md — FinPoliza

## 1. Qué es FinPoliza

**FinPoliza** es una **DEMO funcional** de una aplicación móvil de una compañía de seguros.
Permite a un cliente:

- Iniciar sesión, registrarse y recuperar su contraseña.
- Explorar un catálogo de seguros y contratarlos (compra simulada).
- Consultar sus pólizas, cuotas, vencimientos y pagar cuotas (pago simulado).
- Aportar y retirar dinero de un **fondo solidario** con historial contable independiente.
- Consultar todos sus movimientos, notificaciones y datos de perfil.

Y permite a los administradores:

- Ver un dashboard financiero con gráficos y filtros por período.
- Gestionar usuarios, seguros, pagos, cuotas, fondo solidario, avisos y configuración global.
- Administrar roles/permisos y consultar una auditoría inmutable de acciones.

> **Importante:** no hay pagos reales, ni datos bancarios, ni integraciones financieras.
> Todos los datos son ficticios. La sección “Datos demo” permite restaurar el estado inicial.

- **Repositorio:** https://github.com/andrespar2/FinPoliza
- **Paquete Android:** `com.finpoliza.app`
- **Versión:** 1.0.0 (versionCode 1)
- **Credenciales de prueba:** ver `DEMO_CREDENTIALS.md`.

---

## 2. Tecnologías

| Capa | Tecnología |
|---|---|
| UI | React 19 + TypeScript 5.9 |
| Bundler | Vite 8 (target ES2020) |
| Enrutamiento | React Router 7 (`HashRouter`) |
| Persistencia | IndexedDB nativa (sin dependencias) |
| Iconos | `lucide-react` |
| Contenedor móvil | Capacitor 8 (Android) |
| Plugins nativos | `@capacitor/status-bar`, `@capacitor/splash-screen`, `@capacitor/app` |
| Gráficos | SVG propios (`src/components/charts/Charts.tsx`) |
| Android | Gradle 8.14.3, AGP, compileSdk 36, minSdk 24, targetSdk 36 |
| JDK requerido | **21** (Capacitor 8 compila con Java 21) |
| Utilidades de build | `sharp` (íconos/splash), scripts Node |

No hay backend: la demo es 100 % local y funciona sin internet.
Toda la lógica de negocio vive en `src/services`, separada de la UI.

---

## 3. Ejecutar en desarrollo

```powershell
npm install
npm run dev          # Vite en http://localhost:5173
npm run typecheck    # tsc --noEmit
npm run build        # typecheck + build a dist/
```

### Android

Requisitos:

- Android SDK con `platforms/android-36` (o dejar que Gradle lo descargue).
- JDK 21. En este equipo está en
  `C:\Users\Usuario\AppData\Local\Programs\jdk-21\jdk-21.0.13+9`.
- `android/local.properties` con `sdk.dir=...` (no se versiona).

El `gradle.properties` global del equipo puede apuntar a otro JDK; por eso **hay que pasar
`-Dorg.gradle.java.home`** al compilar:

```powershell
npm run build
npx cap sync android
cd android
.\gradlew.bat assembleDebug --no-daemon "-Dorg.gradle.java.home=C:\Users\Usuario\AppData\Local\Programs\jdk-21\jdk-21.0.13+9"

adb install -r app\build\outputs\apk\debug\app-debug.apk
adb shell am start -n com.finpoliza.app/.MainActivity
```

### Release firmada

La configuración de firma está en `android/app/build.gradle`. Usa
`android/keystore/finpoliza-release.jks` (ignorado por git).

```powershell
cd android
.\gradlew.bat assembleRelease --no-daemon "-Dorg.gradle.java.home=C:\...\jdk-21..."
```

Salida: `android/app/build/outputs/apk/release/app-release.apk`.

Credenciales del keystore de demo (se pueden sobrescribir con variables de entorno):

- Alias: `finpoliza`
- Store/key password: `FinPoliza2026!`
- Variables: `FINPOLIZA_STORE_PASSWORD`, `FINPOLIZA_KEY_ALIAS`, `FINPOLIZA_KEY_PASSWORD`.

Si se regenera el keystore, la app instalada con la firma anterior debe desinstalarse.

### Íconos y splash

```powershell
node scripts/generate-icons.mjs
```

Toma `Icono/Icono de la app FinPoliza.png` y escribe:

- `mipmap-*/ic_launcher.png`, `ic_launcher_round.png`, `ic_launcher_foreground.png`.
- Splash negro con el logo centrado en todos los `drawable-*`.

---

## 4. Estructura del proyecto

```
FinPoliza/
├── AGENTS.md                      ← este archivo
├── DEMO_CREDENTIALS.md            ← cuentas de prueba
├── README.md
├── capacitor.config.ts
├── index.html                     ← loader estático + meta viewport/safe-area
├── vite.config.ts
├── Icono/                         ← logo maestro
├── public/                        ← favicon / apple-touch-icon
├── scripts/generate-icons.mjs
├── android/                       ← proyecto nativo Capacitor
│   ├── app/build.gradle           ← versión, firma release
│   ├── app/src/main/res/          ← íconos, splash, estilos AMOLED
│   └── keystore/                  ← keystore local (gitignored)
└── src/
    ├── main.tsx                   ← bootstrap React
    ├── App.tsx                    ← rutas, guards y providers
    ├── index.css                  ← (no existe; usar styles/global.css)
    ├── styles/global.css          ← sistema de diseño completo
    ├── types/index.ts             ← modelo de datos
    ├── data/
    │   ├── defaults.ts            ← configuración inicial
    │   ├── permissions.ts         ← catálogo de permisos y roles del sistema
    │   └── seed.ts                ← datos de demostración realistas
    ├── lib/
    │   ├── db.ts                  ← IndexedDB + transacciones atómicas
    │   ├── dates.ts               ← fechas, periodicidad, rangos
    │   ├── format.ts              ← moneda, fechas, textos
    │   ├── crypto.ts              ← hash de contraseñas (demo) y fortaleza
    │   └── id.ts                  ← IDs y códigos
    ├── hooks/useApp.ts            ← `useSyncExternalStore`
    ├── services/
    │   ├── store.ts               ← estado global, init, sesión, permisos
    │   ├── auth.ts                ← login, registro, perfil, contraseñas
    │   ├── usersAdmin.ts          ← CRUD admin de usuarios
    │   ├── insurances.ts          ← CRUD de seguros
    │   ├── policies.ts            ← compra, pagos, cuotas, cancelaciones
    │   ├── fund.ts                ← aportes, retiros, ajustes
    │   ├── notifications.ts       ← avisos, recordatorios, lectura
    │   ├── settings.ts            ← configuración y roles
    │   ├── audit.ts               ← construcción de auditoría
    │   └── selectors.ts           ← cálculos derivados y estadísticas
    ├── components/
    │   ├── ui/                    ← Button styles, Sheet, Feedback, forms, common
    │   ├── app/                   ← PolicyCard, MovementRow
    │   ├── charts/Charts.tsx      ← barras, dona, sparkline
    │   ├── layout/                ← AppShell, TabBar, AdminLayout
    │   └── admin/AdminUI.tsx      ← cabeceras, permisos, filtros
    └── screens/
        ├── auth/                  ← Welcome, Login, Register, ForgotPassword
        ├── app/                   ← Inicio, Seguros, Catálogo, Fondo, Movimientos,
        │                             Perfil, Notificaciones, Ayuda, Empresa…
        ├── admin/                 ← Dashboard, Usuarios, Seguros, Pagos, Fondo,
        │                             Configuración, Roles, Auditoría, Avisos
        └── NotFoundScreen.tsx
```

---

## 5. Arquitectura y estado

### 5.1 Flujo de datos

```
Pantallas React
   │ usan useAppState() / servicios
   ▼
src/services (reglas de negocio + validaciones + permisos)
   │ commit() → una transacción IndexedDB
   ▼
src/lib/db.ts  (stores: users, roles, products, policies, installments,
                payments, fundMovements, notifications, audit, settings, meta)
   │ tras escribir: store.refresh() relee todo
   ▼
AppStore (estado en memoria + useSyncExternalStore) → re-render
```

- **Fuente de verdad:** IndexedDB. La copia en memoria solo acelera la UI.
- **Atomicidad:** operaciones financieras usan `commit([stores], fn)`; si algo falla,
  rollback completo.
- **Sesión:** `localStorage['finpoliza.session.v1']` con el `userId`. Se valida que el usuario
  exista y esté activo al iniciar.
- **Formato:** `configureFormat()` aplica moneda, locale y formato de fecha desde la configuración.
- **Escala de texto:** `localStorage['finpoliza.textScale']` (normal/large/xlarge) sobreescribe
  la preferencia global.

### 5.2 Al inicializar (`store.init`)

1. Abre IndexedDB versión **2**.
2. Si no existe la marca `seed_v2` en `meta`, ejecuta `buildSeedData()` y limpia/escribe todo.
3. Carga todas las colecciones y la configuración.
4. Restaura la sesión si existe y el usuario está activo.
5. `App.tsx` ejecuta `syncReminders()` para generar recordatorios de cuotas (una vez por cuota,
   estado y día, guardado en `meta.reminderKeys`).

### 5.3 Permisos

Los permisos se comprueban **en los servicios** (`requirePermission`) y además en la UI
(`hasPermission`, `NoPermission`, `AdminRoutes`). Un usuario normal no puede acceder a
`/admin`: el guard redirige a `/inicio`.

Permisos disponibles:

`dashboard.view`, `users.view`, `users.manage`, `insurances.view`, `insurances.manage`,
`payments.view`, `payments.manage`, `fund.view`, `fund.manage`, `settings.manage`,
`roles.manage`, `audit.view`, `notifications.manage`.

Roles del sistema:

| Rol | Nivel | Permisos |
|---|---|---|
| Administrador principal | `owner` | Todos (inmutable) |
| Administrador | `admin` | Todos excepto `roles.manage` |
| Personal administrativo | `staff` | dashboard, users.view, insurances.view, payments.view/manage, fund.view, notifications.manage |
| Usuario | `user` | Ninguno (solo sus propios datos) |

Los roles personalizados se crean con nivel `staff` y permisos seleccionables.

---

## 6. Modelo de datos

Todas las entidades están tipadas en `src/types/index.ts`.

### `User`
`id`, nombres, apellidos, `docType` (CC/CE/PA/NIT), `docNumber`, `email` único,
`phone`, `address`, `city`, `birthDate`, `roleId`, `status` (`active|suspended|inactive`),
`passwordHash`, `createdAt`, `updatedAt`, `lastLoginAt`, `notes`, `mustChangePassword`.

### `Role`
`id`, `name`, `description`, `level`, `permissions[]`, `system`, `createdAt`.

### `InsuranceProduct`
`id`, `name`, `category`, `icon` (nombre lucide), `color`, descripciones, `benefits[]`,
`coverage[{label, amount, detail}]`, `conditions[]`, `durationMonths`, `basePrice`,
`modalities[{id,label,installments,periodicity,surchargePct}]`, `featured`, `active`,
`archived`, timestamps.

### `Policy`
`id`, `code` (`POL-AAAA-####`), `userId`, `productId`, **`snapshot`** del producto
(nombre, icono, color, coberturas, beneficios, condiciones), `modalityId/label`,
`periodicity`, `installmentsCount`, `installmentAmount`, `totalAmount`, `status`
(`active|overdue|completed|cancelled|pending`), `purchasedAt`, `startDate`,
`cancelledAt`, `cancelReason`, `createdBy`.

El **snapshot** es clave: cambiar un seguro en el catálogo **no altera** pólizas existentes.

### `Installment`
`id`, `policyId`, `userId`, `number`, `amount`, `dueDate`, `status` (`pending|paid|cancelled`),
`paidAt`, `paymentId`.

### `Payment`
`id`, `code`, `userId`, `policyId`, `installmentId`, `installmentNumber`, `amount`, `date`,
`time`, `status` (`paid|pending|cancelled`), `method`
(`tarjeta_simulada|pse_simulado|efectivo|transferencia_simulada`), `reference`,
`registeredBy`, `notes`, `createdAt`, `concept`.

### `FundMovement`
`id`, `userId`, `type` (`deposit|withdrawal|adjustment_credit|adjustment_debit`), `amount`,
`date`, `time`, `description`, **`balanceAfter`**, `justification` (obligatoria en ajustes),
`createdBy`, `createdAt`.

**El saldo del fondo nunca se escribe directamente:** se calcula sumando todos los
movimientos (`fundSummary`). `balanceAfter` es una foto histórica informativa.

### `AppNotification`
`id`, `userId` (o `'all'`), `type`, `title`, `body`, `createdAt`, `read`,
`readBy[]` (para avisos globales), `link`, `critical`.

### `AuditLog`
`id`, `actorId`, `actorName`, `action`, `entity`, `entityId`, `description`,
`before`, `after`, `createdAt`.

### `AppSettings` (registro único `settings/global`)
`company`, `regional`, `texts` (incluye FAQs), `fund`, `insurance`, `notifications`,
`features`, `appearance`, `updatedAt`.

### `meta`
Registro clave-valor con marca de seed y claves de recordatorios ya notificados.

---

## 7. Reglas de negocio

### 7.1 Compra de un seguro (`purchasePolicy`)

- Verifica catálogo habilitado, producto activo/no archivado y compra permitida.
- Evita duplicar una póliza activa del mismo producto para el mismo usuario.
- `totalBase = round(basePrice * (1 + surchargePct/100))`
- `installmentAmount = max(1, round(totalBase / installments))`
- `totalAmount = installmentAmount * installments` (así la suma de cuotas coincide).
- Calendario: cuota `n` vence en `startDate + n períodos` (`weekly` +7d, `biweekly` +15d,
  `monthly` +1 mes, `annual` +12 meses); pago único vence el día de compra.
- Crea póliza, cuotas y notificación en una sola transacción.

### 7.2 Pago de cuota (`payInstallment`)

- Solo el dueño o quien tenga `payments.manage`.
- Dentro de la transacción se **relee** la cuota y se rechaza si ya no está `pending`
  (evita doble pago por doble toque).
- Actualiza la cuota a `paid`, crea el `Payment` y una notificación; si lo registra un
  administrador, genera auditoría `payment.register`.
- Los totales de la póliza se **calculan** desde las cuotas, nunca se editan a mano.

### 7.3 Morosidad y estados

- La mora es **derivada** de la fecha, no se persiste:
  `overdue` si `dueDate < hoy`; `due-soon` si faltan ≤ `reminderDays`.
- Estado efectivo de póliza:
  `cancelled` → cancelada; sin cuotas pendientes → `completed`; con vencidas → `overdue`;
  en otro caso → `active`.
- Las cuotas vencidas se muestran en rojo y los recordatorios se crean automáticamente.

### 7.4 Cancelación de pago

`cancelPayment` (admin) marca el pago como `cancelled`, devuelve la cuota a `pending`
y conserva el registro histórico (nunca se borra). Notifica al usuario y audita.

### 7.5 Cancelación de póliza

`cancelPolicy` (admin) marca la póliza como cancelada, anula las cuotas pendientes,
notifica al usuario y deja auditoría. Los pagos ya realizados se conservan.

### 7.6 Fondo solidario

- `depositToFund`: valida fondo habilitado, monto mínimo y usuario activo. Calcula el saldo
  dentro de la transacción y registra `balanceAfter`.
- `withdrawFromFund`: valida retiros habilitados, mínimo y **saldo disponible real**.
- `adminFundAdjustment`: exige justificación ≥ 10 caracteres y permiso `fund.manage`;
  crea un movimiento nuevo (crédito/débito) y una entrada de auditoría.
- El saldo consolidado del fondo **no es ingreso de la compañía**; el dashboard lo separa.

### 7.7 Ajuste de calendario

`updateInstallment` permite a `payments.manage` cambiar valor y fecha de una cuota no pagada;
recalcula el total de la póliza y audita los valores anterior/nuevo.

### 7.8 Contraseñas

- Hash SHA-256 con sal de aplicación (WebCrypto, con fallback FNV).
- Política: mínimo 8 caracteres, al menos una letra y un número.
- Restablecimiento administrativo marca `mustChangePassword` y notifica.
- Recuperación de demo valida correo + documento y permite fijar una nueva contraseña.
- **Limitación:** en producción debe reemplazarse por un backend con bcrypt/argon2.

---

## 8. Pantallas y rutas

Rutas con `HashRouter` (compatible con WebView):

| Ruta | Pantalla |
|---|---|
| `/bienvenida` | Bienvenida + cuentas demo |
| `/ingresar` | Inicio de sesión |
| `/registro` | Registro de usuarios |
| `/recuperar` | Recuperación de contraseña |
| `/inicio` | Inicio del cliente |
| `/seguros` | Mis seguros + filtros |
| `/seguros/:policyId` | Detalle, calendario y pago de cuotas |
| `/catalogo` | Catálogo con categorías y destacados |
| `/catalogo/:productId` | Detalle/compra guiada |
| `/fondo` | Fondo solidario, aportes, retiros e historial |
| `/movimientos` | Movimientos con filtros y detalle |
| `/notificaciones` | Bandeja de notificaciones |
| `/perfil` | Perfil, accesos, tamaño de texto, logout |
| `/perfil/editar` | Datos de contacto |
| `/perfil/password` | Cambio de contraseña |
| `/perfil/empresa` | Información institucional y legales |
| `/perfil/ayuda` | FAQ y contacto |
| `/admin` | Dashboard administrativo |
| `/admin/usuarios` | Gestión de usuarios |
| `/admin/usuarios/nuevo` | Crear usuario |
| `/admin/usuarios/:id` | Ficha 360° del usuario |
| `/admin/usuarios/:id/editar` | Editar usuario |
| `/admin/seguros` | Gestión del catálogo |
| `/admin/seguros/nuevo` | Crear seguro |
| `/admin/seguros/:id/editar` | Editar seguro |
| `/admin/pagos` | Pagos, cuotas pendientes y vencidas |
| `/admin/fondo` | Fondo consolidado y ajustes |
| `/admin/avisos` | Publicar/eliminar avisos |
| `/admin/configuracion` | Configuración global (8 pestañas) |
| `/admin/roles` | Roles y permisos |
| `/admin/auditoria` | Historial de acciones |

### Compra (flujo)

Modalidad → resumen → confirmación con checkbox → éxito con código de póliza → acceso a
“Ver mi seguro”. Todo persiste antes de mostrar el éxito.

### Pago (flujo)

Cuota → método (tarjeta/PSE/transferencia simulados) → confirmar → comprobante con código y
referencia → aparece en Movimientos.

### Fondo (flujo)

Monto (o chip sugerido) → previsualización del nuevo saldo → confirmación → éxito con saldo
actualizado → movimiento en historial. Retiro valida saldo y mínimos.

---

## 9. Panel administrativo

- **Dashboard:** KPIs por período (mes/trimestre/año/histórico), recaudo, cartera, mora,
  fondo, usuarios, pólizas, gráfico de barras de 6 meses, dona de estados, top de seguros,
  pagos recientes y cartera próxima. Separa ingresos de la compañía y recursos del fondo.
- **Usuarios:** búsqueda por nombre/documento/correo, filtros, ficha con pólizas, pagos,
  fondo y movimientos, edición, suspensión, reset de contraseña, cambio de rol y eliminación
  solo si no tiene historial.
- **Seguros:** crear/editar con modalidades dinámicas, coberturas, beneficios, condiciones,
  precio, color, icono, disponibilidad, destacado y archivado. Los cambios no alteran pólizas.
- **Pagos:** listado con búsqueda/estado, cuotas pendientes y vencidas, registro manual,
  edición de valor/fecha, detalle y anulación con motivo.
- **Fondo:** saldo consolidado, saldos por usuario, movimientos, ajustes con justificación,
  configuración vigente.
- **Configuración:** empresa, moneda/fechas, textos y FAQs, fondo, reglas de seguros,
  funcionalidades, plantillas de mensajes y datos demo.
- **Roles:** editar/crear roles y seleccionar permisos por grupo; roles del sistema protegidos.
- **Auditoría:** búsqueda/filtros, detalle con valores anteriores/nuevos (máx. 500 registros).
- **Avisos:** publicar notificación global con enlace interno, listar y eliminar.

---

## 10. Diseño visual y accesibilidad

- **AMOLED:** negro `#000` de fondo; superficies `#0a0d12` → `#1f2733`; bordes translúcidos.
- **Azul institucional** `#3b82f6` (gradiente `#16368f → #1d4ed8`), **esmeralda** `#2fe0a4`
  para positivo, **rojo** `#ff6b6b` para negativo/mora, **dorado** `#f2c230` como acento de
  marca (logo “FP”).
- Tipografía del sistema (SF Pro/Segoe/Roboto), base 17 px, escalable a 18.5/20 px.
- Botones ≥ 52 px de alto, campos ≥ 53 px, textos secundarios ≥ 13 px.
- Radio de tarjetas 1.35 rem, héroes 1.75 rem; sombras suaves; blur en tabbar/sheets.
- Barra inferior de 5 pestañas: Inicio, Mis seguros, Fondo, Historial, Mi perfil.
- En pantallas grandes (≥ 64 rem de ancho y 44 rem de alto) los sheets se centran;
  en móvil son hojas inferiores. El tabbar se vuelve flotante a partir de 56 rem.
- Se respetan `env(safe-area-inset-*)`, `100dvh`, `viewport-fit=cover` y el teclado
  (`adjustResize`), con formularios desplazables.
- Preferencia de movimiento reducido respetada con `prefers-reduced-motion`.
- Microanimaciones: entrada de página, sheets, toasts, éxito y barras de progreso.

El CSS completo está en `src/styles/global.css`; no usar estilos inline salvo ajustes puntuales.

---

## 11. Pruebas realizadas

### Automatizadas (Playwright, navegador)

- Login de cliente/administrador/staff y redirecciones de guards.
- Registro de nuevo usuario y recuperación de contraseña.
- Compra de seguro, aparición en “Mis seguros”, cálculo de cuotas.
- Pago de cuota y actualización de totales; anulación y reversión por admin.
- Aportación y retiro del fondo con validación de saldo.
- Edición de usuario, creación de rol, ajuste de fondo, cambio de configuración y auditoría.
- Permisos: staff recibe “No tienes permisos” en Roles; usuario es redirigido fuera de `/admin`.
- Overflow horizontal en 320, 360, 412, 768 y 1024 px (incluido texto “Muy grande”):
  `scrollWidth === innerWidth` en Inicio, Catálogo, Fondo, Movimientos, Perfil, Ayuda,
  Empresa y Notificaciones.
- Persistencia tras recargar (IndexedDB + sesión).

### En dispositivo Android real

Dispositivo: **Lenovo TB-7104F**, Android 8.1 (API 27), 600×1024 px, densidad 160 con override
120 (≈800×1365 CSS px), WebView 138.

Probado con ADB:

- Instalación/arranque, login, teclado abierto sin tapar campos, tabbar y navegación.
- Aportación al fondo ($100.000) con teclado numérico y saldo actualizado.
- Dashboard, usuarios, configuración y scroll horizontal del menú admin.
- Rotación a horizontal (1024×600) y regreso a vertical.
- Botón físico Atrás dentro del panel.
- Persistencia de sesión y datos tras `am force-stop` y reapertura.

### Limitaciones de las pruebas

- No se dispone de emuladores adicionales; los tamaños se validaron con Playwright y
  mediciones de `scrollWidth`.
- La escala de fuente del sistema Android no se propaga necesariamente al WebView;
  para eso existe el ajuste interno “Tamaño del texto”.
- El primer arranque en el dispositivo de prueba tarda varios segundos (WebView/JS en un
  equipo antiguo). En equipos modernos es notablemente más rápido.

---

## 12. Problemas conocidos y decisiones

1. **Sin backend:** toda la persistencia es local (IndexedDB). Limpiar datos de la app borra
   la demo. Para producción se debe migrar `services` a una API sin cambiar la UI.
2. **Contraseñas:** hash de demo; no usar en producción.
3. **Notificaciones:** son internas (bandeja), no push reales. La arquitectura ya separa
   `notifications` para conectar FCM/APNs después.
4. **Correos:** la recuperación de contraseña no envía correos reales.
5. **Fondo:** no genera rendimientos ni intereses; es un ahorro simulado.
6. **Pagos:** métodos simulados, sin pasarela ni datos bancarios.
7. **Auditoría:** visible/exportable desde el panel, sin firma criptográfica.
8. **Seed dependiente de la fecha:** las pólizas se generan relativas al día de instalación
   para que siempre haya cuotas próximas/vencidas.
9. **`npm` bloquea scripts de instalación:** si `sharp` no carga, ejecutar
   `npm install-scripts approve sharp`.
10. **JDK global:** usar siempre `-Dorg.gradle.java.home` con JDK 21; el equipo tiene un
    `org.gradle.java.home` global apuntando a JDK 17.
11. **WebView debugging:** `webContentsDebuggingEnabled: true` en `capacitor.config.ts`
    (útil para soporte de la demo). Desactivar para producción.
12. **iOS:** no se generó plataforma iOS en esta entrega.

---

## 13. Historial de cambios

### 2026-11-16 — Versión 1.0.0 (entrega inicial completa)

- Creación del proyecto React + TypeScript + Vite + Capacitor desde cero.
- Sistema de diseño AMOLED completo (azul/esmeralda/rojo/dorado), tipografía accesible,
  tabbar de 5 secciones, hojas modales, toasts, confirmaciones y gráficos SVG.
- Persistencia IndexedDB v2 con 11 stores y transacciones atómicas.
- Seed realista: 8 usuarios (3 administrativos), 9 productos, 10 pólizas, cuotas,
  pagos, fondo, notificaciones y configuración.
- Autenticación: login, registro, recuperación, cambio de contraseña, sesión persistente.
- Catálogo y compra de seguros con modalidades, calendario de cuotas y éxito.
- Pago de cuotas simulado, comprobantes y anulación administrativa.
- Fondo solidario con aportes, retiros, historial y validaciones.
- Movimientos unificados con filtros por tipo/período y detalle.
- Perfil editable, tamaño de texto, ayuda, empresa y condiciones.
- Panel administrativo: dashboard, usuarios, seguros, pagos, fondo, configuración,
  roles/permisos, auditoría y avisos.
- Motor de auditoría con valores anteriores/nuevos y justificaciones.
- Íconos/splash Android generados desde el logo; tema AMOLED y safe areas.
- APK debug instalada y probada en Lenovo TB-7104F vía ADB.
- Correcciones durante pruebas:
  - Esquema de `meta` en IndexedDB (clave `id`) para permitir el seed.
  - Textos de listas en una sola línea (títulos/subtítulos ahora en bloque).
  - Hojas modales ancladas al fondo en móvil y centradas solo en pantallas grandes.
  - Toasts movidos al pie para no tapar encabezados.
  - Confirmaciones por encima de las hojas (`overlay--top`, portal al `body`).
  - Cálculo de mora con fecha local (antes comparaba con UTC).
  - Hora local en movimientos/pagos (antes UTC).
  - Formato monetario compacto consistente.
  - Input de dinero sin reformateo mientras se escribe (evita saltos de cursor).
  - Ajustes responsive para 320 px y texto “Muy grande” (tabbar, perfil, fondo, encabezados).
  - Fecha de compra de la póliza de accidentes ajustada para mostrar mora en la demo.
  - Cancelación de pólizas añadida a la ficha administrativa del usuario.
  - Endurecimiento de permisos en notificaciones (solo el dueño o un aviso global puede
    marcarse como leído; solo administradores pueden eliminarlos).
  - Grid del dashboard en 3 columnas para evitar tarjetas huérfanas en tablet.
  - Favicon e íconos web, capturas en `docs/screenshots` y README con vista previa.
  - El logo configurable por el administrador ahora se usa en la marca de la app
    (`BrandMark`), con fallback a “FP” si la URL falla.
  - El aviso destacado (`announcementActive`) y el banner de inicio (`homeBanner`) se muestran
    en Inicio; las plantillas de notificación se usan en pagos y operaciones del fondo.
  - La periodicidad predeterminada preselecciona la modalidad al comprar un seguro.
  - Se retiraron de la configuración los campos sin efecto (`graceDays`,
    `showCatalogToGuests`) para que toda opción visible tenga funcionalidad.
  - Corrección de arranque: `settings` usa la configuración por defecto durante la carga,
    evitando el error de `BrandMark` antes de inicializar IndexedDB.
- Documentación: `AGENTS.md`, `DEMO_CREDENTIALS.md`, `README.md`, `.gitignore`.
- Firma release configurada con keystore local.
- APK release 1.0.0 compilada y verificada con `apksigner`; instalada en el dispositivo
  Lenovo TB-7104F y validada (login, datos y persistencia tras cierre forzado).
- Certificado de firma SHA-256:
  `945aefa4a018f9ad52afc30a92c614b611345bd91c6f580f4eeae7675dc0281c`.
- APK final SHA-256:
  `07913FF658000F80C293A0C0EA7D5FD64D5C269712BA90A0496270BC2D03069A`.

### Próximos pasos sugeridos

1. Backend real (API REST) y migración de `services` a repositorios remotos.
2. Push notifications (FCM/APNs) y correos transaccionales.
3. Pasarela de pagos y conciliación.
4. Exportación de comprobantes/pólizas en PDF.
5. Pruebas E2E automatizadas en CI y emuladores múltiples.
