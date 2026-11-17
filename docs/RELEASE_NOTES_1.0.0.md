# FinPoliza 1.0.0 — DEMO móvil

Primera entrega funcional de **FinPoliza**, una aplicación móvil de demostración para una
compañía de seguros. Incluye clientes, catálogo, pólizas, cuotas, pagos simulados, fondo
solidario y un panel administrativo completo.

## Incluye

- Inicio de sesión, registro, recuperación de contraseña y sesión persistente.
- Inicio con próximo pago, resumen de obligaciones y fondo solidario.
- Catálogo de 9 seguros, detalle, compra guiada y calendario de cuotas.
- Pago de cuotas simulado con comprobante y anulación administrativa.
- Fondo solidario con aportes, retiros, saldos e historial contable independiente.
- Movimientos unificados con filtros por tipo y período.
- Perfil editable, ayuda, información de la empresa y tamaño de texto accesible.
- Panel administrativo: dashboard contable con gráficos, usuarios, seguros, pagos, cartera,
  fondo consolidado, configuración global, roles/permisos, avisos y auditoría.
- Persistencia local real (IndexedDB) y operaciones financieras atómicas.
- Diseño AMOLED responsive, probado en Android 8.1 y en tamaños de 320 px a tablet.

## Credenciales de prueba

| Perfil | Correo | Contraseña |
|---|---|---|
| Cliente | `maria@demo.com` | `Demo123*` |
| Administrador principal | `admin@finpoliza.com` | `Admin123*` |
| Administrador | `gerencia@finpoliza.com` | `Admin123*` |
| Personal administrativo | `asesor@finpoliza.com` | `Asesor123*` |

Ver `DEMO_CREDENTIALS.md` para todas las cuentas.

## Instalación

1. Descarga `FinPoliza-1.0.0.apk`.
2. Habilita “Instalar apps de origen desconocido” para el explorador de archivos.
3. Abre la APK e instala. Requiere Android 7.0 o superior.

La APK está firmada. SHA-256:
`07913FF658000F80C293A0C0EA7D5FD64D5C269712BA90A0496270BC2D03069A`.

## Importante

Esta es una **DEMO**: no procesa pagos reales, no solicita datos bancarios, no envía correos
ni notificaciones push reales. Los datos se guardan en el dispositivo y se pueden restaurar
desde la configuración del panel administrativo.

Documentación técnica completa en `AGENTS.md`.
