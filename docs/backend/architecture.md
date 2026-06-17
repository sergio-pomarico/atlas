# Arquitectura de la API Atlas

## Introducción

La API de Atlas está diseñada como un **monolito modular** que implementa principios de **arquitectura limpia**. Esta aproximación permite mantener la simplicidad operacional de un monolito mientras se preserva la modularidad y escalabilidad del código.

## Visión General de la Arquitectura

### 1. Monolito Modular

La aplicación está estructurada como un único artefacto deployable, pero internamente organizada en módulos independientes que pueden evolucionar de forma autónoma.

**Beneficios:**

- Simplicidad operacional (un solo deploy, un solo proceso)
- Facilita transacciones distribuidas y consistencia de datos
- Menor complejidad de red y comunicación
- Debugging y testing más simples

### 2. Arquitectura

Cada módulo implementa el principio de responsabilidad única y se organiza en capas:

```mermaid
graph TB
    Client[Cliente HTTP] --> Router[Express Router]
    Router --> Controller[Controllers]
    Controller --> UseCase[Casos de Uso]
    UseCase --> Domain[Dominio]
    UseCase --> Repository[Repositorios]
    Repository --> Database[(Base de Datos)]

    subgraph "Capa de Presentación"
        Router
        Controller
    end

    subgraph "Capa de Aplicación"
        UseCase
    end

    subgraph "Capa de Dominio"
        Domain
    end

    subgraph "Capa de Infraestructura"
        Repository
        Database
    end
```

## Estructura de Módulos

### Organización de carpetas

Cada módulo funcional sigue la misma estructura de capas:

```
modules/{module-name}/
├── domain/          # Reglas de negocio puras
│   ├── entities/    # Entidades de dominio
│   ├── repository/  # Interfaces de repositorios
│   └── errors/      # Errores específicos del dominio
├── application/     # Casos de uso y orchestación
│   └── usecases/    # Implementación de casos de uso
├── infrastructure/  # Implementaciones concretas
│   ├── repository/  # Implementación de repositorios
│   ├── services/    # Servicios externos
│   └── container.ts # Configuración de dependencias
└── presentation/    # Capa de presentación HTTP
    ├── controller.ts
    └── routes.ts
```

### Flujo de Dependencias

```mermaid
graph TD
    Presentation --> Application
    Application --> Domain
    Application --> Infrastructure
    Infrastructure -.-> Domain

    classDef domain fill:#e1f5fe
    classDef application fill:#f3e5f5
    classDef infrastructure fill:#e8f5e8
    classDef presentation fill:#fff3e0

    class Domain domain
    class Application application
    class Infrastructure infrastructure
    class Presentation presentation
```

**Reglas de Dependencia:**

- Las capas internas no conocen las capas externas
- La capa de dominio es independiente de frameworks
- Las dependencias apuntan hacia el centro (dominio)

## Shared Kernel

El código compartido entre módulos se organiza en `src/shared/`:

```mermaid
graph TB
    subgraph "Shared Kernel"
        SD[Shared Domain<br/>- Result Types<br/>- Common Errors]
        SI[Shared Infrastructure<br/>- Server<br/>- Routes<br/>- Middlewares<br/>- Services]
        SU[Shared Utils<br/>- Configuration<br/>- Helpers]
    end

    subgraph "Módulos"
        M1[Auth Module]
        M2[Otros Módulos]
    end

    M1 --> SD
    M1 --> SI
    M1 --> SU
    M2 --> SD
    M2 --> SI
    M2 --> SU
```

## Gestión de Dependencias

### Inversión de Control

Utilizamos **Inversify** para implementar inversión de dependencias:

```mermaid
graph LR
    subgraph "Container IoC"
        C[Inversify Container]
    end

    Controller --> C
    C --> UseCase
    C --> Repository
    C --> Services

    UseCase -.defines interface.-> IRepository[Repository Interface]
    Repository -.implements.-> IRepository
```

Escalabilidad del Diseño

### Adición de Nuevos Módulos

Para agregar un nuevo módulo:

1. Crear estructura de carpetas siguiendo la convención
2. Implementar las cuatro capas (domain, application, infrastructure, presentation)
3. Registrar dependencias en el contenedor IoC
4. Agregar rutas al router principal

## Consideraciones de Diseño

### Ventajas del Enfoque Actual

- **Simplicidad operacional**: Un solo artefacto para desplegar
- **Consistencia transaccional**: Fácil manejo de transacciones
- **Performance**: Sin latencia de red entre módulos
- **Testing**: Pruebas de integración más simples
- **Debugging**: Trazabilidad completa en un solo proceso

### Trade-offs

- **Escalabilidad independiente**: Los módulos no pueden escalarse por separado
- **Tecnología homogénea**: Todos los módulos deben usar el mismo stack
- **Despliegue acoplado**: Cambios en cualquier módulo requieren redeploy completo

## Patrones Implementados

- **Repository Pattern**: Abstracción de acceso a datos
- **Use Case Pattern**: Encapsulación de lógica de negocio
- **Dependency Injection**: Inversión de control
- **Result Pattern**: Manejo de errores sin excepciones
- **Module Pattern**: Organización modular del código
