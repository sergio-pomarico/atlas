# Guía para Agregar Nuevos Endpoints a la Aplicación

Esta guía te ayudará a entender el proceso completo para agregar un nuevo endpoint a la aplicación Atlas, siguiendo la arquitectura implementada.

## Estructura del Proyecto

La aplicación sigue una arquitectura (Clean Architecture) organizada en las siguientes capas:

```
apps/api/src/modules/[module]/
├── domain/           # Entidades de negocio, interfaces y errores
├── application/      # Casos de uso (Use Cases)
├── infrastructure/   # Implementaciones concretas y contenedor DI
└── presentation/     # Controladores y rutas (Adaptadores de entrada)
```

## Pasos para Agregar un Nuevo Endpoint

### 1. Definir el Schema de Validación

**Ubicación:** `packages/schemas/lib/[module]/`

Crea el schema de validación usando Zod para el payload del endpoint.

**Ejemplo:**

```typescript
// packages/schemas/lib/auth/register.ts
import { z } from "zod";
import passwordSchema from "../password.ts";

export const registerSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  name: z.string().min(2).max(50),
});

export type RegisterPayload = z.infer<typeof registerSchema>;
```

### 2. Definir Entidades y Errores del Dominio

**Ubicación:** `apps/api/src/modules/[module]/domain/`

#### 2.1. Definir errores específicos del dominio (si es necesario)

```typescript
// apps/api/src/modules/auth/domain/error.ts
export default class AuthenticationError extends Error {
  // Métodos estáticos para diferentes tipos de errores
  static userAlreadyExists(
    message: string,
    detail: string,
  ): AuthenticationError {
    // Implementación
  }
}
```

#### 2.2. Extender interfaces del repositorio (si es necesario)

```typescript
// apps/api/src/modules/auth/domain/repository.ts
export interface AuthRepository {
  findByEmail: (email: string) => Promise<Result<User, AuthenticationError>>;
  create: (
    userData: CreateUserData,
  ) => Promise<Result<User, AuthenticationError>>;
  // Agregar nuevos métodos según necesidades
}
```

### 3. Implementar el Caso de Uso

**Ubicación:** `apps/api/src/modules/[module]/application/`

Crea el caso de uso que contendrá la lógica de negocio del endpoint.

**Ejemplo:**

```typescript
// apps/api/src/modules/auth/application/register-usecase.ts
import type { RegisterPayload } from "@atlas/schemas/lib/auth/register.ts";
import { inject, injectable } from "inversify";
import type { AuthRepository } from "../domain/repository.ts";
import { Result } from "@shared/domain/result.ts";

export interface RegisterResult {
  userId: string;
  message: string;
}

@injectable()
export class RegisterUserUseCase {
  private readonly repository: AuthRepository;

  constructor(@inject("AuthRepository") repository: AuthRepository) {
    this.repository = repository;
  }

  run = async (
    dto: RegisterPayload,
  ): Promise<Result<RegisterResult, Error>> => {
    // Verificar si el usuario ya existe
    const existingUser = await this.repository.findByEmail(dto.email);
    if (existingUser.isSuccess) {
      return Result.fail(new Error("User already exists"));
    }

    // Crear nuevo usuario
    const result = await this.repository.create({
      email: dto.email,
      password: dto.password,
      name: dto.name,
    });

    if (!result.isSuccess) {
      return Result.fail(result.getError());
    }

    const user = result.getData();
    return Result.success({
      userId: user.id,
      message: "User registered successfully",
    });
  };
}
```

### 4. Actualizar la Implementación del Repositorio

**Ubicación:** `apps/api/src/modules/[module]/infrastructure/`

Implementa los métodos necesarios en el repositorio concreto.

```typescript
// apps/api/src/modules/auth/infrastructure/reporitory-impl.ts
export class AuthRepositoryImpl implements AuthRepository {
  // Implementar nuevos métodos requeridos por el caso de uso
  async create(
    userData: CreateUserData,
  ): Promise<Result<User, AuthenticationError>> {
    // Implementación usando Prisma, base de datos, etc.
  }
}
```

### 5. Agregar el Método al Controlador

**Ubicación:** `apps/api/src/modules/[module]/presentation/controller.ts`

Agrega el método del controlador que manejará la petición HTTP.

```typescript
// apps/api/src/modules/auth/presentation/controller.ts
import type { RegisterPayload } from "@atlas/schemas/lib/auth/register.ts";
import type {
  RegisterUserUseCase,
  RegisterResult,
} from "../application/register-usecase.ts";

@injectable()
export class AuthController {
  private readonly registerUserUseCase: RegisterUserUseCase;

  constructor(
    @inject("LoginUserUseCase") loginUserUseCase: LoginUserUseCase,
    @inject("RegisterUserUseCase") registerUserUseCase: RegisterUserUseCase,
  ) {
    this.loginUserUseCase = loginUserUseCase;
    this.registerUserUseCase = registerUserUseCase;
  }

  register = async (
    req: Request<unknown, unknown, RegisterPayload>,
    res: Response<ApiSuccessResponse<RegisterResult>>,
    next: NextFunction,
  ) => {
    const result = await this.registerUserUseCase.run(req.body);

    if (!result.isSuccess) {
      next(result.getError());
      return;
    }

    const data = result.getData();
    res.status(201).json({
      status: "success",
      mensage: "User registered successfully",
      data: data,
    });
  };
}
```

### 6. Registrar la Ruta

**Ubicación:** `apps/api/src/modules/[module]/presentation/route.ts`

Agrega la nueva ruta al router del módulo.

```typescript
// apps/api/src/modules/auth/presentation/route.ts
export class AuthRoutes {
  routes(): void {
    this.router.post("/login", this.controller.login);
    this.router.post("/register", this.controller.register); // Nueva ruta
  }
}
```

### 7. Configurar el Contenedor de Dependencias

**Ubicación:** `apps/api/src/modules/[module]/infrastructure/container.ts`

Registra las nuevas dependencias en el contenedor de inversión de control.

```typescript
// apps/api/src/modules/auth/infrastructure/container.ts
import { RegisterUserUseCase } from "@modules/auth/application/register-usecase.ts";

const container = new Container();

// Registros existentes...
container
  .bind<RegisterUserUseCase>("RegisterUserUseCase")
  .to(RegisterUserUseCase);

export default container;
```

### 8. Agregar Rutas del Módulo (Para Módulos Nuevos)

Si estás creando un módulo completamente nuevo, necesitas registrarlo en las rutas principales.

**Ubicación:** `apps/api/src/shared/infrastructure/routes.ts`

```typescript
// apps/api/src/shared/infrastructure/routes.ts
import { AuthRoutes } from "@modules/auth/presentation/route.ts";
import { NewModuleRoutes } from "@modules/new-module/presentation/route.ts";

export class AppRoutes {
  routes(): void {
    this.router.use("/auth", new AuthRoutes().router);
    this.router.use("/new-module", new NewModuleRoutes().router); // Nuevo módulo
  }
}
```

## Checklist para Nuevos Endpoints

- [ ] ✅ Schema de validación creado en `packages/schemas`
- [ ] ✅ Caso de uso implementado en `application/`
- [ ] ✅ Método agregado al controlador en `presentation/controller.ts`
- [ ] ✅ Ruta registrada en `presentation/route.ts`
- [ ] ✅ Dependencias configuradas en `infrastructure/container.ts`
- [ ] ✅ Implementación del repositorio actualizada (si es necesario)
- [ ] ✅ Tipos y interfaces definidos correctamente
- [ ] ✅ Manejo de errores implementado
- [ ] ✅ Pruebas unitarias creadas
- [ ] ✅ Documentación actualizada

## Buenas Prácticas

1. **Consistencia en Nombres**: Usa nombres descriptivos y consistentes en todos los archivos.

2. **Validación**: Siempre valida los datos de entrada usando los schemas de Zod.

3. **Manejo de Errores**: Usa el patrón Result para manejo de errores y propaga errores específicos del dominio.

4. **Separación de Responsabilidades**: Mantén la lógica de negocio en los casos de uso, no en los controladores.

5. **Inyección de Dependencias**: Usa el contenedor de DI para mantener el bajo acoplamiento.

6. **Tipado Fuerte**: Aprovecha TypeScript para tener tipado fuerte en toda la aplicación.

7. **Documentación**: Documenta APIs complejas y comportamientos no obvios.
