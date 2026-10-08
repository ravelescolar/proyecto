# Especificación de Seguridad Firestore (Phase 0: Payload-First Security TDD)

## 1. Invariantes de Datos (Data Invariants)

1. **Aislamiento Estricto por Propietario (Zero-Trust Ownership & PII Isolation):**
   - Cada documento en `/settings/{userId}`, `/drivers/{driverId}`, `/cuentas/{cuentaId}` y `/cuentas/{cuentaId}/services/{serviceId}` contiene un campo inmutable `ownerId` que debe coincidir exactamente con `request.auth.uid`.
   - Ningún usuario puede leer (`get` o `list`), crear, actualizar o eliminar documentos pertenecientes a otro `ownerId`.
2. **Verificación de Identidad (Email Verified Guard):**
   - Todas las operaciones de escritura (`create`, `update`, `delete`) exigen `request.auth != null && request.auth.token.email_verified == true`.
3. **Compuerta Maestra Relacional (Master Gate & Atomicidad):**
   - Ningún documento en `/cuentas/{cuentaId}/services/{serviceId}` puede existir de forma huérfana: al crearse o actualizarse se verifica mediante `existsAfter` y `getAfter` que el documento padre `/cuentas/{cuentaId}` exista, pertenezca a `request.auth.uid` y no esté en estado terminal `'anulada'`.
4. **Bloqueo de Estado Terminal (Terminal State Locking):**
   - Una vez que una cuenta de cobro en `/cuentas/{cuentaId}` alcanza el estado `'anulada'`, queda bloqueada contra cualquier actualización posterior (`existing().status != 'anulada'`).
5. **Integridad Temporal e Inmutabilidad (Temporal & Immortal Fields):**
   - En `create`: `createdAt == request.time && updatedAt == request.time`.
   - En `update`: `createdAt == existing().createdAt && ownerId == existing().ownerId && updatedAt == request.time`.
6. **Guardia de Variables de Ruta y Tamaños (ID Poisoning & Denial-of-Wallet Guard):**
   - Todos los IDs de ruta (`userId`, `driverId`, `cuentaId`, `serviceId`) en operaciones de documento individual cumplen `^[a-zA-Z0-9_\-]+$` con longitud `1..128`.
   - Todas las cadenas y listas tienen cotas estrictas de tamaño (`.size() <= maxLength`).

---

## 2. Los 12 Payloads Adversarios ("The Dirty Dozen")

1. **Payload 1 (Identity Spoofing en Creación de Cuenta):**
   - Intenta crear `/cuentas/cc-101` con `ownerId: "victim-uid"` mientras está autenticado como `"attacker-uid"`. -> `PERMISSION_DENIED`.
2. **Payload 2 (Unverified Email Write Attack):**
   - Usuario con `email_verified: false` intenta crear `/drivers/drv-1`. -> `PERMISSION_DENIED`.
3. **Payload 3 (Shadow Field / Ghost Key Injection en Update):**
   - Intenta actualizar `/cuentas/cc-101` inyectando un campo no autorizado `isApprovedByAdmin: true`. -> `PERMISSION_DENIED`.
4. **Payload 4 (Terminal State Bypass):**
   - Intenta actualizar `totalAmount` o `status` de `/cuentas/cc-101` cuando `existing().status == 'anulada'`. -> `PERMISSION_DENIED`.
5. **Payload 5 (Orphaned Subcollection Write):**
   - Intenta crear `/cuentas/cc-nonexistent/services/srv-1` sin que exista la cuenta padre `/cuentas/cc-nonexistent`. -> `PERMISSION_DENIED`.
6. **Payload 6 (Cross-Tenant Subcollection Hijack):**
   - Atacante intenta crear `/cuentas/cc-victim/services/srv-1` con `ownerId: "attacker-uid"` bajo una cuenta padre que pertenece a `"victim-uid"`. -> `PERMISSION_DENIED`.
7. **Payload 7 (Immortal Field Mutation - `createdAt` / `ownerId`):**
   - Intenta modificar `createdAt` o `ownerId` durante un `update` en `/drivers/drv-1`. -> `PERMISSION_DENIED`.
8. **Payload 8 (Client Timestamp Forgery):**
   - Intenta enviar un `updatedAt` en el pasado o futuro distinto de `request.time` al actualizar `/settings/user-1`. -> `PERMISSION_DENIED`.
9. **Payload 9 (Denial-of-Wallet Oversized String / Array Overflow):**
   - Intenta guardar un `DriverProfile` con `frequentClients` de 15 elementos (límite máximo: 10) o `driverName` de 500 caracteres (límite: 150). -> `PERMISSION_DENIED`.
10. **Payload 10 (Path ID Poisoning):**
    - Intenta crear `/drivers/invalid$id!with*special*chars` que viola el patrón `^[a-zA-Z0-9_\-]+$`. -> `PERMISSION_DENIED`.
11. **Payload 11 (Value Poisoning on Whitelisted Key):**
    - Intenta actualizar únicamente la clave permitida `status` en `/cuentas/cc-101` pero con el valor inválido `"hacked_status"` fuera del enum `['emitida', 'pagada', 'anulada']`. -> `PERMISSION_DENIED`.
12. **Payload 12 (PII Blanket Read / Unauthorized List Scraping):**
    - Usuario autenticado `"attacker-uid"` intenta ejecutar `get` o `list` sobre `/drivers` o `/cuentas` donde `resource.data.ownerId == "victim-uid"`. -> `PERMISSION_DENIED`.

---

## 3. Runner de Pruebas (`firestore.rules.test.ts`)

El archivo `firestore.rules.test.ts` implementa la verificación automatizada de los 12 payloads adversarios contra las invariantes de `firestore.rules`.
