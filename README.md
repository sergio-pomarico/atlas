# Atlas

## 📋 Descripción

Atlas es un sistema de planificación de recursos empresariales (ERP) construido específicamente para distribuidoras de medicamentos. Optimiza las operaciones mediante funciones integradas para la gestión de inventario, seguimiento de ventas y gestión de relaciones con los clientes (CRM).

## 🏗️ Arquitectura

Este proyecto utiliza una **estructura de monorepo** con Turbo para la orquestación de tareas:

```
atlas/
├── apps/              # Aplicaciones de Backend y Frontend
├── packages/          # Paquetes y librerías compartidas
├── docs/              # Documentación
└── turbo.json         # Configuración del monorepo
```

### Tecnologías

**Backend:**

- Node.js con Express.js
- TypeScript para tipado estático
- Prisma ORM para el manejo de base de datos
- PostgreSQL

**Frontend:**

- React.js con TypeScript
- Tailwind CSS y shadcn/ui
- Zustand
- TanStack query
- TanStack Router

**DevOps & Build:**

- pnpm para la gestión de paquetes
- Turbo para la orquestación del monorepo
- Soporte para Docker (opcional)

## 🚀 Empezando

### Prerrequisitos

- Node.js >= 20.x
- pnpm >= 10.8.1

### Instalación

1. **Clonar el repositorio**

   ```bash
   git clone <url-del-repositorio>
   cd atlas
   ```

2. **Instalar dependencias**

   ```bash
   pnpm install
   ```

### Gestión de Secretos

Este proyecto utiliza **Infisical** para gestionar de forma segura los secretos (como la conexión a la base de datos y otras API keys). Para saber cómo configurar tus credenciales y usar los comandos de Prisma sin exponer la `DATABASE_URL`, revisa la documentación detallada:

👉 **[Guía de Gestión de Secretos con Infisical](docs/backend/infisical-secrets.md)**

### Desarrollo

Inicia el servidor de desarrollo para todas las aplicaciones:

```bash
pnpm run dev
```

Este comando ejecuta el modo de desarrollo para las aplicaciones frontend y backend de forma concurrente utilizando Turbo.

### Build

Compila todas las aplicaciones y paquetes:

```bash
pnpm run build
```

### Testing

Ejecuta las pruebas:

```bash
pnpm run test
```

### Linting & Type Checking

```bash
pnpm run lint
pnpm run typecheck
```

## 🤝 Contribuir

¡Agradecemos las contribuciones! Por favor, sigue estas pautas:

1. Crea una rama de la característica (`git checkout -b feature/nueva-caracteristica`)
2. Haz commit de tus cambios usando Conventional Commits (ejemplos: `feat(api): agregar endpoint de stock`, `fix(ui): resolver error del modal`)
3. Sube la rama (`git push origin feature/nueva-caracteristica`)
4. Abre un Pull Request

### Conventional Commits

Los mensajes de los commits deben seguir este patrón:

```
<tipo>(alcance opcional): <descripción>

[cuerpo opcional]

[pie(s) de página opcional(es)]
```

Tipos comunes: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`, `build`, `perf`, `style`.

Husky + commitlint validarán los mensajes al momento de hacer el commit.

## 📝 Licencia

Este proyecto está bajo la Licencia GPL 3.0 - revisa el archivo [LICENSE](LICENSE) para más detalles.

## 👤 Autor

**Sergio Pomárico**

- Email: sergiodavid21@gmail.com

## 📞 Soporte

Para reportar problemas, solicitar nuevas características o hacer preguntas, por favor abre un _issue_ en el repositorio.
