# Secret Management con Infisical

Este proyecto utiliza [Infisical](https://infisical.com/) como plataforma centralizada para la gestión de secretos (claves de API, credenciales de base de datos, configuraciones, etc.). Esto nos permite mantener un entorno seguro y evitar exponer información sensible en el código o en archivos `.env` locales más de lo estrictamente necesario.

## ⚙️ Configuración Inicial

Para que tu aplicación pueda comunicarse con Infisical, necesitas definir únicamente dos variables en el archivo `.env` de tu proyecto (por ejemplo, en `apps/api/.env`):

```env
SECRET_MANAGER_TOKEN="tu_infisical_access_token"
INFISICAL_PROJECT_ID="el_id_de_tu_proyecto"
```

Estas variables permiten al SDK de Infisical autenticarse y extraer los secretos correctos del entorno en el que esté ejecutándose la aplicación (dev, prod, etc., definido por la variable `NODE_ENV`).

---

## 💻 Uso de Secretos en el Código

Para obtener secretos en el código fuente de la aplicación, el proyecto provee un servicio Singleton llamado `SecretMangerService`.

**Ubicación:** `apps/api/src/shared/infrastructure/services/secret-manager.ts`

### Ejemplo de uso

Para obtener un secreto, simplemente obtén la instancia del servicio y llama al método `getSecret(key)`:

```typescript
import { SecretMangerService } from "@shared/infrastructure/services/secret-manager.ts";

async function doSomethingWithSecret() {
  const secretService = SecretMangerService.getInstance();
  
  // Obtiene el secreto desde Infisical
  const apiKeySecret = await secretService.getSecret("API_KEY");
  
  // El valor del secreto se encuentra en la propiedad secretValue
  console.log("Mi API Key es:", apiKeySecret.secretValue);
}
```

> **Nota:** El servicio lee automáticamente el entorno actual a partir de `NODE_ENV` (ej. "dev", "prod") para extraer los valores correspondientes del entorno en Infisical.

---

## 🗄️ Prisma y Base de Datos (`DATABASE_URL`)

Por motivos de seguridad, la URL de la base de datos no se almacena en el archivo `.env` local, sino que se inyecta dinámicamente desde Infisical antes de ejecutar los comandos de Prisma. 

Para lograr esto, existe un script especializado (`apps/api/scripts/migrate.ts`) que envuelve la ejecución de los comandos de Prisma:
1. Autentica con Infisical.
2. Obtiene el secreto `DATABASE_URL`.
3. Lo inyecta de forma temporal en las variables de entorno (`process.env.DATABASE_URL`).
4. Ejecuta el comando de Prisma de forma transparente.

### Comandos Disponibles

En el `package.json` existen scripts definidos para facilitar esta tarea. Para interactuar con la base de datos debes utilizar siempre estos scripts en lugar de ejecutar los comandos directos de `prisma`. 

Desde el directorio correspondiente (ej: `apps/api`), puedes ejecutar:

- **Generar y aplicar migraciones en desarrollo:**
  ```bash
  pnpm run db:migrate
  ```

- **Aplicar migraciones en producción:**
  ```bash
  pnpm run db:migrate:deploy
  ```

- **Hacer un push rápido a la BD (solo en desarrollo):**
  ```bash
  pnpm run db:push
  ```

- **Abrir Prisma Studio:**
  ```bash
  pnpm run db:studio
  ```

### Seguridad en los Scripts

El script contenedor (`migrate.ts`) implementa una lista blanca de comandos permitidos y prohíbe explícitamente comandos destructivos en entornos de producción (como `db push`). Además, bloquea de forma predeterminada el comando `migrate reset` para evitar pérdidas de datos accidentales, el cual solo debe ejecutarse intencionadamente sin el uso de este contenedor.