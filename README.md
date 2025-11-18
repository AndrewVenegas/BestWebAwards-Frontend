# BestWebAwards Frontend

Frontend de la aplicación BestWebAwards construido con React, Vite y React Router.

## Instalación

1. Instalar dependencias:
```bash
npm install
```

2. (Opcional) Configurar variables de entorno:
```bash
cp .env.example .env
```

Editar `.env` si necesitas cambiar la URL del backend (por defecto usa `http://localhost:3001`).

3. Iniciar servidor de desarrollo:
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

**Nota:** En desarrollo local, no es necesario crear el archivo `.env` ya que el proxy de Vite está configurado para usar `http://localhost:3001` por defecto. Solo necesitas el `.env` si quieres cambiar la URL del backend o desplegar en producción.

## Estructura

- `src/components/` - Componentes reutilizables
- `src/pages/` - Páginas principales
- `src/contexts/` - Contextos de React (Auth)
- `src/services/` - Servicios API
- `src/` - Archivos principales

## Características

- Autenticación con JWT
- Dashboard para estudiantes, ayudantes y administradores
- Sistema de votación con límite de 3 votos
- Countdown de cierre de votaciones
- Podio de resultados
- Subida de imágenes con Cloudinary
- Diseño moderno y responsive
