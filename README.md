# Movies API - Express.js

## 📋 Descripción del Proyecto

Este proyecto es una API RESTful para la gestión de películas construida con Express.js. El objetivo de este ejercicio es refactorizar la aplicación actual hacia una arquitectura **MVC (Modelo-Vista-Controlador)** para mejorar la organización, mantenibilidad y escalabilidad del código.

## 🎯 Objetivo de la Refactorización

Actualmente, toda la lógica de la aplicación se encuentra en el archivo `app.js`. El objetivo es separar las responsabilidades en diferentes capas siguiendo el patrón arquitectónico MVC.

## 🏗️ Estructura del Proyecto

Después de la refactorización, el proyecto debe tener la siguiente estructura:

```
intro-express-movies/
├── app.js
├── package.json
├── data/
│   └── movies.json
├── models/
│   └── movie.model.js
├── controllers/
│   └── movie.controller.js
└── config/
    └── routes.config.js
```

## 📝 Instrucciones de Refactorización

### Paso 1: Crear la Estructura de Carpetas

Crea las siguientes carpetas en la raíz del proyecto:

```bash
mkdir models controllers config
```

### Paso 2: Implementar el Modelo (Model)

**Archivo:** `models/movie.model.js`

- Mueve la lógica de acceso a datos desde `movies.js` a este archivo
- El modelo debe exportar las siguientes funciones:
  - `find()` - Obtener todas las películas
  - `findById(id)` - Obtener una película por ID
  - `create(data)` - Crear una nueva película
  - `findByIdAndUpdate(id, data)` - Actualizar una película existente
  - `delete(id)` - Eliminar una película

**Responsabilidad:** Gestionar el acceso y manipulación de los datos de películas.

### Paso 3: Implementar el Controlador (Controller)

**Archivo:** `controllers/movie.controller.js`

El controlador debe importar el modelo y exportar las siguientes funciones:

- `list(req, res)` - Manejar GET /movies
- `detail(req, res)` - Manejar GET /movies/:id
- `create(req, res)` - Manejar POST /movies
- `update(req, res)` - Manejar PATCH /movies/:id
- `delete(req, res)` - Manejar DELETE /movies/:id

**Responsabilidad:** Procesar las peticiones HTTP, coordinar con el modelo y enviar las respuestas.

### Paso 4: Configurar las Rutas

**Archivo:** `config/routes.config.js`

- Crear un `express.Router()`
- Definir todas las rutas del CRUD:
  - GET `/movies` → `movieController.list`
  - GET `/movies/:id` → `movieController.detail`
  - POST `/movies` → `movieController.create`
  - PATCH `/movies/:id` → `movieController.update`
  - DELETE `/movies/:id` → `movieController.delete`
- Exportar el router configurado

**Responsabilidad:** Centralizar la definición de todas las rutas de la API.

### Paso 5: Actualizar app.js

El archivo `app.js` debe simplificarse para:

1. Crear la aplicación Express
2. Cargar los middlewares necesarios (express.json, morgan)
3. Importar el router desde `config/routes.config.js`
4. Montar el router en la aplicación
5. Iniciar el servidor

**Responsabilidad:** Punto de entrada de la aplicación y configuración general.

## ✅ Criterios de Éxito

- [ ] Estructura de carpetas creada correctamente
- [ ] Código organizado según el patrón MVC
- [ ] Separación clara de responsabilidades
- [ ] Todos los tests pasan exitosamente (`npm test`)
- [ ] La API funciona correctamente con la nueva estructura

## 🚀 Instalación y Ejecución

### Prerrequisitos

- Node.js >= 18.x
- npm o yarn

### Instalación

```bash
npm install
```

### Modo Desarrollo

```bash
npm run dev
```

El servidor se iniciará con auto-reload en los cambios de archivos.

### Ejecutar Tests

```bash
npm test
```

**Importante:** Después de la refactorización, todos los tests deben seguir pasando sin modificaciones.

## 🔌 Endpoints de la API

| Método | Endpoint      | Descripción                       |
| ------ | ------------- | --------------------------------- |
| GET    | `/movies`     | Obtener todas las películas       |
| GET    | `/movies/:id` | Obtener una película por ID       |
| POST   | `/movies`     | Crear una nueva película          |
| PATCH  | `/movies/:id` | Actualizar una película existente |
| DELETE | `/movies/:id` | Eliminar una película             |

## 💡 Beneficios del Patrón MVC

- **Separación de responsabilidades:** Cada capa tiene un propósito específico
- **Mantenibilidad:** Código más fácil de entender y modificar
- **Escalabilidad:** Facilita añadir nuevas funcionalidades
- **Reusabilidad:** Los modelos y controladores pueden reutilizarse
- **Testabilidad:** Cada componente puede probarse de forma independiente

## 📚 Recursos Adicionales

- [Express.js Documentation](https://expressjs.com/)
- [RESTful API Design Best Practices](https://restfulapi.net/)
- [MVC Pattern Explained](https://developer.mozilla.org/en-US/docs/Glossary/MVC)

---

**¡Buena suerte con la refactorización! 🎬**
