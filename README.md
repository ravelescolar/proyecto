# Cuentas de Cobro - TRANSPORTES RAVEL

Sistema web corporativo para la gestión, emisión, cálculo automático y descarga en PDF de cuentas de cobro para **TRANSPORTES RAVEL** (NIT: 900.388.163-2).

---

## 🔐 Credenciales de Acceso Inicial

El sistema cuenta con pantalla de autenticación protegida con usuario y contraseña:

| Parámetro | Valor Inicial Predeterminado |
| :--- | :--- |
| **Usuario** | `admin` *(o `ravel`)* |
| **Contraseña** | `Ravel2026*` *(o `admin123`)* |

> 💡 **Nota:** Una vez dentro del sistema, puedes cambiar el usuario y la contraseña en cualquier momento desde el botón de **Configuración ⚙️ > Seguridad y Credenciales de Acceso**.

---

## 🚀 Despliegue en Vercel

Esta aplicación está completamente optimizada y lista para desplegarse en **Vercel** en un solo paso:

### Opción 1: Conectar Repositorio Git en Vercel
1. Ve a [vercel.com](https://vercel.com) e inicia sesión.
2. Haz clic en **"Add New Project"** e importa tu repositorio.
3. Vercel detectará automáticamente que es un proyecto **Next.js**:
   - **Framework Preset:** `Next.js`
   - **Build Command:** `next build`
   - **Output Directory:** `.next`
4. Haz clic en **Deploy**. ¡Listo, despliegue con zero-config!

### Opción 2: Despliegue directo mediante Vercel CLI
```bash
npm i -g vercel
vercel
```

El archivo `vercel.json` está configurado con `"framework": "nextjs"`.
