# Base de Datos - Atlas API

## Introducción

La API de Atlas utiliza **PostgreSQL** como motor de base de datos relacional, gestionado a través de **Prisma ORM**. Los schemas están organizados en archivos `.prisma` separados por entidad dentro de `src/shared/infrastructure/data/schema/`.

---

## Tecnologías

| Tecnología | Versión | Propósito                                 |
| ---------- | ------- | ----------------------------------------- |
| PostgreSQL | >= 14   | Motor de base de datos relacional         |
| Prisma ORM | latest  | Gestión de schemas, migraciones y cliente |

---

## Estructura de Archivos

```
apps/api/src/shared/infrastructure/data/schema/
├── schema.prisma   # Configuración global (datasource y generator)
├── user.prisma     # Modelo User y enum UserStatus
├── session.prisma  # Modelo Session
└── password-reset-request.prisma # Modelo PasswordResetRequest
```

---

## Diagrama Entidad-Relación

```mermaid
erDiagram
    User {
        String  id                  PK  "UUID autogenerado"
        String  email               UK  "Único, requerido"
        String  phone               UK  "Único, opcional"
        Boolean is_verified             "Default: false"
        Enum    status                  "Default: INACTIVE"
        String  password                "Hash de la contraseña"
        Int     failed_login_attempts   "Default: 0"
        DateTime password_reset_requested_at "Opcional"
        DateTime created_at             "Default: now()"
        DateTime updated_at             "Default: now()"
    }

    Session {
        String   id              PK  "UUID autogenerado"
        String   user_id         FK  "Único, referencia a User"
        Boolean  active              "Default: false"
        DateTime last_login          "Default: now()"
        String   last_login_ip       "Opcional"
        String   user_agent          "Opcional"
        DateTime created_at          "Default: now()"
        DateTime updated_at          "Default: now()"
    }

    PasswordResetRequest {
        String   id          PK  "UUID autogenerado"
        String   user_id     FK  "Referencia a User"
        String   hash        UK  "Único, requerido"
        DateTime expires_at      "Requerido"
        Int      attempts        "Default: 0"
        DateTime used_at         "Opcional"
        DateTime invalidated_at  "Opcional"
        DateTime created_at      "Default: now()"
        DateTime updated_at      "Default: now()"
    }

    User ||--o| Session : "1 : 1"
    User ||--o{ PasswordResetRequest : "1 : N"
```

---

## Tablas

### `User`

Representa a un usuario registrado en el sistema. Almacena credenciales de acceso, estado de la cuenta y metadatos de seguridad.

| Columna                 | Tipo            | Restricciones      | Default    | Descripción                            |
| ----------------------- | --------------- | ------------------ | ---------- | -------------------------------------- |
| `id`                    | `String (UUID)` | `PK`               | `uuid()`   | Identificador único del usuario        |
| `email`                 | `String`        | `UNIQUE, NOT NULL` | —          | Correo electrónico del usuario         |
| `phone`                 | `String`        | `UNIQUE, NULLABLE` | `NULL`     | Teléfono del usuario                   |
| `is_verified`           | `Boolean`       | `NOT NULL`         | `false`    | Indica si el correo fue verificado     |
| `status`                | `UserStatus`    | `NOT NULL`         | `INACTIVE` | Estado actual de la cuenta             |
| `password`              | `String`        | `NOT NULL`         | —          | Hash de la contraseña                  |
| `failed_login_attempts` | `Int`           | `NOT NULL`         | `0`        | Contador de intentos fallidos de login |
| `password_reset_requested_at` | `DateTime`  | `NULLABLE`         | `NULL`     | Fecha de la última solicitud de restablecimiento |
| `created_at`            | `DateTime`      | `NOT NULL`         | `now()`    | Fecha de creación del registro         |
| `updated_at`            | `DateTime`      | `NOT NULL`         | `now()`    | Fecha de última actualización          |

**Relaciones:**

- `session` → `Session` (1 a 0..1): Un usuario puede tener una sesión activa.
- `password_reset_requests` → `PasswordResetRequest` (1 a N): Un usuario puede tener varias solicitudes de restablecimiento.

---

### `Session`

Almacena la sesión de autenticación de un usuario. Registra información de seguridad como IP y user agent del último acceso.

| Columna         | Tipo            | Restricciones          | Default  | Descripción                               |
| --------------- | --------------- | ---------------------- | -------- | ----------------------------------------- |
| `id`            | `String (UUID)` | `PK`                   | `uuid()` | Identificador único de la sesión          |
| `user_id`       | `String`        | `FK, UNIQUE, NOT NULL` | —        | Referencia al usuario dueño de la sesión  |
| `active`        | `Boolean`       | `NOT NULL`             | `false`  | Indica si la sesión está activa           |
| `last_login`    | `DateTime`      | `NOT NULL`             | `now()`  | Fecha y hora del último inicio de sesión  |
| `last_login_ip` | `String`        | `NULLABLE`             | `NULL`   | Dirección IP del último login             |
| `user_agent`    | `String`        | `NULLABLE`             | `NULL`   | User agent del cliente en el último login |
| `created_at`    | `DateTime`      | `NOT NULL`             | `now()`  | Fecha de creación del registro            |
| `updated_at`    | `DateTime`      | `NOT NULL`             | `now()`  | Fecha de última actualización             |

**Relaciones:**

- `user` → `User` (N a 1): Cada sesión pertenece a exactamente un usuario.

---

### `PasswordResetRequest`

Registra solicitudes de restablecimiento de contraseña y su estado de uso.

| Columna | Tipo | Restricciones | Default | Descripción |
| --- | --- | --- | --- | --- |
| `id` | `String (UUID)` | `PK` | `uuid()` | Identificador único de la solicitud |
| `user_id` | `String` | `FK, NOT NULL` | — | Usuario que solicitó el restablecimiento |
| `code_hash` | `String` | `UNIQUE, NOT NULL` | — | Hash del código de restablecimiento |
| `expires_at` | `DateTime` | `NOT NULL` | — | Fecha de expiración |
| `attempts` | `Int` | `NOT NULL` | `0` | Intentos de uso |
| `used_at` | `DateTime` | `NULLABLE` | `NULL` | Fecha de uso exitoso |
| `invalidated_at` | `DateTime` | `NULLABLE` | `NULL` | Fecha de invalidación |
| `created_at` | `DateTime` | `NOT NULL` | `now()` | Fecha de creación |
| `updated_at` | `DateTime` | `NOT NULL` | `now()` | Fecha de última actualización |

**Relaciones:**

- `user` → `User` (N a 1): Cada solicitud pertenece a exactamente un usuario.

**Índices:**

- `user_id, created_at`
- `expires_at`

---

## Enums

### `UserStatus`

Define el estado de la cuenta de un usuario.

| Valor      | Descripción                                                   |
| ---------- | ------------------------------------------------------------- |
| `ACTIVE`   | La cuenta está activa y puede iniciar sesión                  |
| `INACTIVE` | La cuenta fue creada pero aún no fue activada                 |
| `BLOCKED`  | La cuenta fue bloqueada (ej. por múltiples intentos fallidos) |
| `DELETED`  | La cuenta fue eliminada lógicamente                           |

---

## Convenciones

- **Identificadores:** Todos los modelos usan `UUID` generado automáticamente como clave primaria.
- **Nombres de columnas:** Se usa `snake_case` en la base de datos y `camelCase` en el código TypeScript. La correspondencia se declara con `@map` en Prisma.
- **Timestamps:** Todos los modelos incluyen `created_at` y `updated_at` para auditoría.
- **Campos opcionales:** Los campos que pueden ser `NULL` se declaran con `?` en el schema de Prisma.
