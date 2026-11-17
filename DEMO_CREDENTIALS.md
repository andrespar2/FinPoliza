# Credenciales de demostración — FinPoliza

> Todos los datos, cuentas y operaciones son **ficticios**. La aplicación es una DEMO:
> ninguna operación mueve dinero real ni envía correos o notificaciones push.

## Cuentas de cliente

| Nombre | Correo | Contraseña | Perfil de prueba |
|---|---|---|---|
| María Fernanda López Herrera | `maria@demo.com` | `Demo123*` | 3 seguros (uno en mora), fondo con aportes y retiros, historial amplio |
| Carlos Andrés Ramírez Ospina | `carlos@demo.com` | `Demo123*` | 2 seguros (vehículo y salud), fondo solidario |
| Rosa Elena Martínez Cifuentes | `rosa@demo.com` | `Demo123*` | 2 seguros (uno completado), fondo con el saldo más alto |
| Jorge Enrique Silva Mora | `jorge@demo.com` | `Demo123*` | 2 seguros (educativo y mascotas, este último en mora) |
| Lucía Fernanda Torres Peña | `lucia@demo.com` | `Demo123*` | Cuenta **suspendida** con cuotas vencidas |

## Cuentas administrativas

| Nombre | Correo | Contraseña | Rol | Acceso |
|---|---|---|---|---|
| Andrés Pardo Rueda | `admin@finpoliza.com` | `Admin123*` | Administrador principal | Control total, incluido roles y configuración |
| Camila Restrepo Vélez | `gerencia@finpoliza.com` | `Admin123*` | Administrador | Todo excepto administrar roles |
| Julián Gómez Salazar | `asesor@finpoliza.com` | `Asesor123*` | Personal administrativo | Consulta de usuarios/seguros, registro de pagos, fondo y avisos |

> Las contraseñas administrativas **no se muestran en la interfaz pública** de la app.
> La pantalla de bienvenida solo ofrece acceso rápido a cuentas de cliente.

## Cómo probar los roles

1. Ingrese con `asesor@finpoliza.com` y abra el panel desde **Mi perfil → Panel administrativo**.
   Verá que no existen las secciones Configuración, Roles ni Auditoría.
2. Escriba directamente `/#/admin/roles` en la barra de direcciones del navegador de pruebas:
   la pantalla muestra “No tienes permisos”, y los servicios también rechazan la operación.
3. Con `gerencia@finpoliza.com` puede gestionar usuarios, seguros, pagos, fondo y avisos,
   pero no modificar roles.
4. Con `admin@finpoliza.com` tiene acceso completo.

## Notas

- La sesión se conserva al cerrar y volver a abrir la aplicación.
- En **Configuración → Datos demo** se pueden restaurar los datos iniciales (se cierra la sesión).
- Para reiniciar desde cero en Android: `adb shell pm clear com.finpoliza.app`.
