# Especificación de Seguridad Firestore (Phase 0: Payload-First Security TDD)

## 1. Invariantes de Datos (Data Invariants)

1. **Control de Acceso Basado en Roles (RBAC: Empresa Administradora vs. Usuarios Conductores):**
   - El rol de Administrador (`isAdmin()`) se otorga exclusivamente cuando `request.auth.token.email_verified == true` y se cumple que el correo autenticado es la cuenta principal de la empresa (`ravelescolar@gmail.com`) o existe el documento verificado `/admins/$(request.auth.uid)`.
   - Los **Usuarios (Conductores/Contratistas)** solo pueden leer (`get`, `list`), crear y editar sus propios documentos (`resource.data.ownerId == request.auth.uid`).
   - El **Administrador (Empresa de Transporte)** puede leer (`get`, `list`), editar, cambiar el estado (`emitida`, `pagada`, `anulada`) y eliminar todas las cuentas de cobro (`/cuentas/{cuentaId}` y `/cuentas/{cuentaId}/services/{serviceId}`) y perfiles de conductores (`/drivers/{driverId}`), así como administrar la configuración corporativa global (`/settings/global`).
2. **Consecutivo Único e Irrepetible (Global Atomic Consecutive Reservation):**
   - Las cuentas de cobro nuevas utilizan como ID canónico `cc-{consecutive}` y el contador global reside en `/settings/global.nextConsecutive`.
   - Un usuario estándar no puede sobrescribir una cuenta de cobro existente que pertenezca a otro `ownerId` (regla `create` exige que el documento no exista previamente y que `incoming().ownerId == request.auth.uid`; regla `update` exige `existing().ownerId == request.auth.uid || isAdmin()`).
   - En `/settings/global`, un usuario estándar solo puede incrementar estrictamente `nextConsecutive` (`incoming().nextConsecutive > existing().nextConsecutive`) y actualizar `ownerId` y `updatedAt`, sin poder alterar la razón social, NIT, prefijo ni reducir el consecutivo.
3. **Verificación de Identidad (Email Verified Guard):**
   - Todas las operaciones de escritura (`create`, `update`, `delete`) y la validación de administrador exigen `request.auth != null && request.auth.token.email_verified == true`.
4. **Compuerta Maestra Relacional (Master Gate & Atomicidad):**
   - Ningún documento en `/cuentas/{cuentaId}/services/{serviceId}` puede existir de forma huérfana: al crearse o actualizarse se verifica mediante `existsAfter` y `getAfter` que el documento padre `/cuentas/{cuentaId}` exista y pertenezca a `request.auth.uid` (o que el operador sea `isAdmin()`), y que no esté en estado `'anulada'` para usuarios estándar.
5. **Bloqueo de Estado Terminal con Escape Hatch para Administrador:**
   - Una vez que una cuenta de cobro alcanza el estado `'anulada'`, ningún usuario estándar puede modificarla (`existing().status != 'anulada'`). Solo el Administrador (`isAdmin()`) puede reactivar o corregir una cuenta anulada.
6. **Integridad Temporal, Inmutabilidad y Cotas de Tamaño:**
   - En `create`: `createdAt == request.time && updatedAt == request.time`.
   - En `update`: `createdAt == existing().createdAt && ownerId == existing().ownerId && consecutive == existing().consecutive && updatedAt == request.time`.
   - Todos los IDs de ruta cumplen `^[a-zA-Z0-9_\-]+$` (máx. 128 caracteres) y todas las cadenas/listas tienen cotas estrictas de longitud.

---

## 2. Los 12 Payloads Adversarios ("The Dirty Dozen")

1. **Payload 1 (Identity Spoofing en Creación de Cuenta):**
   - Usuario estándar intenta crear `/cuentas/cc-105` con `ownerId: "victim-uid"` mientras está autenticado como `"attacker-uid"`. -> `PERMISSION_DENIED`.
2. **Payload 2 (Admin Email Spoofing sin Email Verificado):**
   - Atacante autenticado con `email: "ravelescolar@gmail.com"` pero `email_verified: false` intenta leer o modificar cuentas de otro usuario. -> `PERMISSION_DENIED`.
3. **Payload 3 (Shadow Field / Ghost Key Injection en Update):**
   - Usuario intenta actualizar `/cuentas/cc-101` inyectando un campo no autorizado `isApprovedByAdmin: true`. -> `PERMISSION_DENIED`.
4. **Payload 4 (Terminal State Bypass por Usuario Estándar):**
   - Usuario estándar propietario intenta actualizar `totalAmount` o `status` de `/cuentas/cc-101` cuando `existing().status == 'anulada'`. -> `PERMISSION_DENIED`.
5. **Payload 5 (Orphaned Subcollection Write):**
   - Intenta crear `/cuentas/cc-nonexistent/services/srv-1` sin que exista la cuenta padre `/cuentas/cc-nonexistent`. -> `PERMISSION_DENIED`.
6. **Payload 6 (Cross-Tenant Subcollection Hijack & Consecutive Collision):**
   - Atacante intenta sobrescribir o inyectar servicios en `/cuentas/cc-101/services/srv-1` bajo una cuenta padre que pertenece a `"victim-uid"`. -> `PERMISSION_DENIED`.
7. **Payload 7 (Immortal Field Mutation - `createdAt`, `ownerId` o `consecutive`):**
   - Usuario intenta cambiar el número `consecutive` o el `ownerId` de una cuenta ya creada durante un `update`. -> `PERMISSION_DENIED`.
8. **Payload 8 (Client Timestamp Forgery):**
   - Intenta enviar un `updatedAt` distinto de `request.time` al actualizar `/settings/global`. -> `PERMISSION_DENIED`.
9. **Payload 9 (Denial-of-Wallet Oversized String / Array Overflow):**
   - Intenta guardar un `DriverProfile` con `frequentClients` de 15 elementos (límite máximo: 10). -> `PERMISSION_DENIED`.
10. **Payload 10 (Path ID Poisoning):**
    - Intenta crear `/drivers/invalid$id!with*special*chars` que viola el patrón `^[a-zA-Z0-9_\-]+$`. -> `PERMISSION_DENIED`.
11. **Payload 11 (Global Consecutive Rollback / Corporate Tampering por Usuario Estándar):**
    - Usuario estándar intenta modificar `companyName` en `/settings/global` o intenta disminuir `nextConsecutive` a un número menor o igual al actual para repetir un consecutivo. -> `PERMISSION_DENIED`.
12. **Payload 12 (PII Blanket Read / Self-Admin Privilege Escalation):**
    - Usuario estándar `"attacker-uid"` intenta leer `/cuentas` de `"victim-uid"` o intenta escribirse a sí mismo en `/admins/attacker-uid`. -> `PERMISSION_DENIED`.

---

## 3. Runner de Pruebas (`firestore.rules.test.ts`)

El archivo `firestore.rules.test.ts` verifica que los 12 payloads adversarios retornen `PERMISSION_DENIED` y que las operaciones legítimas de Administrador y Usuario retornen `ALLOW`.
