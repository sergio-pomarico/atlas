# Testing Backend - Developer Guide

## Objetivo

Esta guia define como escribir, ejecutar y mantener tests para `apps/api`. El foco es ayudar a decidir que tipo de test crear, donde ubicarlo y que dependencias usar o mockear.

El proyecto usa tres capas principales de testing:

- **Tests unitarios:** validan logica aislada.
- **Tests de integracion:** validan implementaciones reales de infraestructura o servicios.
- **Tests e2e:** validan flujos HTTP completos desde la API hasta la persistencia.

---

## Capas De Testing

| Capa        | Que valida                                                                                            | Dependencias                                          | Ejemplos                                                                                                                        |
| ----------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Unitario    | Reglas de negocio, entidades, casos de uso y servicios aislados                                       | Mocks o datos en memoria                              | `src/modules/auth/domain/__test__/user.test.ts`, `src/modules/auth/application/__test__/login-usescase.test.ts`                 |
| Integracion | Repositorios, servicios reales, Prisma, PostgreSQL, Redis e implementaciones concretas                | Testcontainers o implementaciones reales controladas  | `src/modules/auth/infrastructure/__test__/reporitory-impl.test.ts`, `src/shared/infrastructure/services/__test__/redis.test.ts` |
| E2E         | Flujo HTTP completo, validacion de request, controllers, casos de uso, persistencia y respuesta final | Express, Supertest, DB real de test y mocks puntuales | `src/modules/auth/presentation/__test__/login.e2e.test.ts`                                                                      |

---

## Como Elegir El Tipo De Test

Usa esta regla practica antes de crear un test:

| Necesidad                                                                    | Tipo de test recomendado                                               |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Probar una entidad, metodo de dominio o regla de negocio sin infraestructura | Unitario                                                               |
| Probar un caso de uso con repositorios o servicios mockeados                 | Unitario                                                               |
| Probar que un repositorio funciona contra PostgreSQL                         | Integracion                                                            |
| Probar que un servicio se comunica correctamente con Redis                   | Integracion                                                            |
| Probar una implementacion concreta como password hashing, JWT o email        | Unitario o integracion, segun si requiere dependencias externas reales |
| Probar que un endpoint responde correctamente para un flujo real             | E2E                                                                    |
| Probar validacion de payload, status HTTP y body final                       | E2E                                                                    |

Evita duplicar la misma validacion en todas las capas. Si una regla ya esta cubierta de forma exhaustiva en unit tests, el e2e solo necesita validar que el flujo principal conecta correctamente las piezas.

---

## Tests Unitarios

Los tests unitarios deben ser rapidos, deterministas y no deben levantar contenedores ni conectarse a servicios externos.

Usalos para validar:

- Entidades de dominio.
- Reglas de negocio.
- Casos de uso con dependencias mockeadas.
- Servicios cuando sus dependencias externas puedan ser reemplazadas por mocks.

Ejemplos actuales:

- `src/modules/auth/domain/__test__/user.test.ts`
- `src/modules/auth/application/__test__/login-usescase.test.ts`
- `src/shared/infrastructure/services/__test__/jwt.test.ts`

Buenas practicas:

- Mockea repositorios, servicios externos y adaptadores.
- Valida resultados exitosos y errores esperados.
- Mantiene los datos de prueba cerca del test que los usa.
- Usa `beforeEach` para limpiar mocks con `jest.clearAllMocks()` cuando aplique.
- No pruebes detalles internos que no representen comportamiento observable.

Ejemplo de dependencias que normalmente se mockean en unit tests:

- Repositories como `AuthRepository`.
- Servicios como `PasswordHasher` o `JWTService` cuando el foco es el caso de uso.
- Servicios de secretos como `SecretManagerService` cuando el foco no es leer secretos reales.

---

## Tests De Integracion

Los tests de integracion validan que una implementacion concreta funciona contra una dependencia real o una version controlada de esa dependencia.

Usalos para validar:

- Repositorios contra PostgreSQL.
- Servicios contra Redis.
- Integracion con Prisma y migraciones reales.
- Implementaciones de infraestructura donde el comportamiento depende de librerias externas.

Ejemplos actuales:

- `src/modules/auth/infrastructure/__test__/reporitory-impl.test.ts`
- `src/shared/infrastructure/services/__test__/redis.test.ts`
- `src/modules/auth/infrastructure/__test__/password-hasher-impl.test.ts`
- `src/shared/infrastructure/services/__test__/email.test.ts`

Buenas practicas:

- Usa Testcontainers cuando necesites PostgreSQL o Redis reales.
- Crea el contenedor en `beforeAll` y detenlo en `afterAll`.
- Limpia tablas, keys o estado compartido en `beforeEach`.
- No dependas del orden de ejecucion de los tests.
- No compartas datos entre casos de prueba.
- Evita mockear la dependencia principal que estas intentando validar.

Cuando un test de integracion usa base de datos, debe dejar claro que datos crea y que comportamiento espera observar en la persistencia.

---

## Tests E2E

Los tests e2e validan un flujo completo desde HTTP hasta la respuesta final del API.

Usalos para validar:

- Rutas y controllers.
- Validacion de request.
- Serializacion del response body.
- Status codes.
- Integracion entre presentation, application, infrastructure y persistencia.
- Flujos criticos del producto.

Ejemplo actual:

- `src/modules/auth/presentation/__test__/login.e2e.test.ts`

Buenas practicas:

- Usa `supertest` para ejecutar requests contra la app Express.
- Levanta una base de datos real de test cuando el flujo depende de persistencia.
- Mockea solo dependencias externas no deterministas, costosas o fuera del alcance del flujo.
- Verifica tanto el response HTTP como los efectos persistidos importantes.
- Mantiene los e2e enfocados en flujos criticos; no conviertas cada caso unitario en un e2e.

Ejemplos de dependencias que pueden mockearse en e2e:

- Firma de JWT si el objetivo no es validar criptografia real.
- Secret manager si el test no debe depender de secretos externos.
- Servicios externos de terceros.

---

## Ubicacion Y Nombres

Los tests viven junto al codigo que validan, dentro de carpetas `__test__`.

Convenciones recomendadas:

- Usa archivos `*.test.ts` para unitarios e integracion.
- Usa archivos `*.e2e.test.ts` para e2e.
- Nombra la suite con la unidad bajo prueba: `describe("LoginUserUseCase", ...)`, `describe("AuthRepositoryImpl integration", ...)`.
- Agrupa escenarios con `describe` cuando ayude a leer el comportamiento.
- Usa nombres de tests que describan el resultado esperado.

Ejemplos:

```text
src/modules/auth/domain/__test__/user.test.ts
src/modules/auth/application/__test__/login-usescase.test.ts
src/modules/auth/infrastructure/__test__/reporitory-impl.test.ts
src/modules/auth/presentation/__test__/login.e2e.test.ts
```

---

## Setup Del Entorno De Tests

La configuracion principal esta en:

- `apps/api/jest.config.ts`
- `apps/api/setup-tests.ts`
- `apps/api/package.json`

Detalles importantes:

- El comando de test ejecuta Jest con `NODE_ENV=test`.
- Se usa `NODE_OPTIONS=--experimental-vm-modules` porque el proyecto usa ESM.
- `setup-tests.ts` importa `reflect-metadata`, necesario para Inversify y decoradores.
- Jest usa `ts-jest` para transformar TypeScript.
- La cobertura se recolecta con el provider `v8`.

Aliases disponibles en tests:

| Alias        | Ruta            |
| ------------ | --------------- |
| `@helpers/*` | `helpers/*`     |
| `@modules/*` | `src/modules/*` |
| `@shared/*`  | `src/shared/*`  |

---

## Testcontainers

El proyecto usa Testcontainers para levantar dependencias reales durante tests de integracion y e2e.

Helpers existentes:

- `helpers/test/postgres.ts`
- `helpers/test/redis.ts`

Responsabilidades de `helpers/test/postgres.ts`:

- Levantar un contenedor `postgres:16-alpine`.
- Construir un `DATABASE_URL` dinamico.
- Ejecutar migraciones con `pnpm prisma migrate deploy`.
- Inicializar `PrismaService` con un secret manager de test.
- Exponer `prismaService` y `prisma` para los tests.
- Desconectar Prisma y detener el contenedor al finalizar.

Responsabilidades de `helpers/test/redis.ts`:

- Levantar un contenedor `redis:8`.
- Construir un `redisUrl` dinamico.
- Inicializar y conectar `RedisService`.
- Desconectar Redis y detener el contenedor al finalizar.

Patron recomendado:

```ts
let postgres: StartedPostgresTestDatabase;

beforeAll(async () => {
  postgres = await startPostgresTestDatabase();
}, 60_000);

beforeEach(async () => {
  await postgres.prisma.session.deleteMany();
  await postgres.prisma.user.deleteMany();
});

afterAll(async () => {
  await postgres?.stop();
}, 60_000);
```

---

## Base De Datos En Tests

Cuando un test usa PostgreSQL:

- La base de datos debe levantarse aislada mediante Testcontainers.
- Las migraciones reales deben aplicarse antes de ejecutar asserts.
- Cada test debe crear explicitamente sus datos.
- El estado debe limpiarse en `beforeEach`.
- Las tablas relacionadas deben limpiarse en orden seguro para respetar relaciones.

Ejemplo actual:

```ts
beforeEach(async () => {
  await postgres.prisma.session.deleteMany();
  await postgres.prisma.user.deleteMany();
});
```

No dependas de datos seed globales para tests automatizados. Si un caso necesita un usuario activo, bloqueado o no verificado, crealo dentro del propio test o mediante un helper local claro.

---

## Mocks

Los mocks deben reducir ruido sin ocultar el comportamiento que se quiere validar.

Guia practica:

| Contexto                   | Que mockear                                           | Que no mockear                                            |
| -------------------------- | ----------------------------------------------------- | --------------------------------------------------------- |
| Unitario de caso de uso    | Repositories, hashers, JWT, servicios externos        | El caso de uso bajo prueba                                |
| Unitario de entidad        | Normalmente nada                                      | La propia entidad                                         |
| Integracion de repositorio | Secret manager de test si solo entrega `DATABASE_URL` | Prisma, PostgreSQL o el repositorio bajo prueba           |
| Integracion de Redis       | Nada relacionado con Redis                            | `RedisService` si es la unidad bajo prueba                |
| E2E de endpoint            | Servicios externos no deterministas                   | Routing, controller, caso de uso y persistencia principal |

Para modulos ESM se puede usar `jest.unstable_mockModule` antes de importar dinamicamente el modulo que depende del mock.

Ejemplo de uso actual:

```ts
jest.unstable_mockModule(
  "@shared/infrastructure/services/secret-manager.ts",
  () => ({
    SecretManagerService: {
      getInstance: jest.fn(() => ({
        getSecret: mockGetSecret,
      })),
    },
  }),
);
```

---

## Comandos Utiles

Ejecutar todos los tests del API:

```bash
pnpm --filter @atlas/api test
```

Ejecutar type-check del API:

```bash
pnpm --filter @atlas/api type-check
```

Generar Prisma Client:

```bash
pnpm --filter @atlas/api db:generate
```

El script de test definido en `apps/api/package.json` es:

```bash
NODE_ENV=test NODE_OPTIONS=--experimental-vm-modules jest --passWithNoTests
```

---

## CI

El workflow de tests del backend esta en:

- `.github/workflows/backend-tests.yml`

Se ejecuta en pull requests hacia `main` cuando cambian archivos relevantes del backend, packages o configuracion del workspace.

Pasos principales:

- Checkout del repositorio.
- Setup de `pnpm`.
- Setup de Node.js.
- Instalacion de dependencias con lockfile congelado.
- Generacion de Prisma Client.
- Type-check del API.
- Ejecucion de tests del API.

Si agregas una dependencia necesaria para tests, asegúrate de que el workflow pueda instalarla y ejecutarla sin configuracion manual local.

---

## Checklist Para Nuevos Tests

Antes de abrir un PR, valida:

- El test esta en la capa correcta.
- El nombre del archivo deja claro el alcance del test.
- El test no depende del orden de ejecucion.
- Los mocks se limpian entre casos cuando aplica.
- Los contenedores se detienen en `afterAll`.
- La base de datos, Redis o cualquier estado externo se limpia entre casos.
- El test cubre comportamiento observable, no detalles internos accidentales.
- El test falla si se rompe el comportamiento que intenta proteger.
- `pnpm --filter @atlas/api test` pasa localmente.
- `pnpm --filter @atlas/api type-check` pasa localmente.

---

## Regla Final

Prefiere el test mas pequeño que entregue confianza real.

Si una regla puede validarse con un unit test, no la subas a e2e sin necesidad. Si el riesgo esta en la integracion con infraestructura, usa integracion. Si el riesgo esta en el contrato HTTP final, usa e2e.
