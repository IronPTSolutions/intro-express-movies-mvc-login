# LAB | Express Movies — Manejo de Errores

## Introducción

Has heredado una API REST de películas construida con **Express 5**. La API funciona… pero tiene un problema importante: **no gestiona los errores de forma adecuada**. Si un usuario pide una película que no existe, la API responde con `null`. Si una ruta no existe, Express devuelve un HTML genérico. Y si ocurre cualquier error inesperado, la aplicación puede comportarse de forma impredecible.

Tu misión es **añadir un sistema robusto de manejo de errores** siguiendo las buenas prácticas de Express.

## Requisitos

- Tener [Node.js](https://nodejs.org/) instalado (v22 o superior).

## Punto de partida

El proyecto ya tiene un CRUD funcional de películas con la siguiente estructura:

```
app.js                          ← Servidor Express
app.test.js                     ← Tests (tu guía para saber si vas bien)
config/routes.config.js         ← Definición de rutas
controllers/movie.controller.js ← Lógica de cada endpoint
models/movie.model.js           ← Modelo de datos
middlewares/                    ← 📂 Aquí crearás el middleware de errores
docs/error-handling.md          ← 📖 Guía de referencia sobre manejo de errores
```

### Endpoints existentes

| Método   | Ruta          | Descripción                 |
| -------- | ------------- | --------------------------- |
| `GET`    | `/movies`     | Listar todas las películas  |
| `GET`    | `/movies/:id` | Obtener una película por ID |
| `POST`   | `/movies`     | Crear una nueva película    |
| `PATCH`  | `/movies/:id` | Actualizar una película     |
| `DELETE` | `/movies/:id` | Eliminar una película       |

## Instrucciones

### Configuración inicial

```bash
npm install
```

### Ejecutar los tests

Los tests son tu guía principal. Al principio, varios tests fallarán porque el manejo de errores no está implementado. Tu objetivo es hacer que **todos los tests pasen**.

```bash
npm test
```

Para lanzar el servidor en modo desarrollo:

```bash
npm run dev
```

> 📖 **Antes de empezar**, lee la guía [docs/error-handling.md](docs/error-handling.md). Ahí encontrarás toda la teoría y los ejemplos que necesitas para completar este lab.

---

### Iteración 1: Instalar `http-errors`

La librería [`http-errors`](https://www.npmjs.com/package/http-errors) permite crear objetos de error con un código de estado HTTP asociado. Instálala como dependencia del proyecto:

```bash
npm install http-errors
```

Uso básico:

```js
import createError from "http-errors";

// Lanza un error 404 que será capturado por el middleware de errores
throw createError(404, "Película no encontrada");
```

---

### Iteración 2: Gestionar el 404 en los controladores

Abre `controllers/movie.controller.js` y modifica los endpoints que reciben `:id` para que devuelvan un **error 404** cuando la película no existe.

Actualmente, si buscas una película con un ID que no existe, el controlador responde con `null` o no gestiona el caso. Debes:

1. Importar `createError` de `http-errors`.
2. En las funciones `detail`, `update` y `delete`, comprobar si la película devuelta es `null` o `undefined`.
3. Si no existe, lanzar un error con `throw createError(404, "Movie not found")`.

> 💡 **Recuerda:** Estamos usando **Express 5**, que captura automáticamente las excepciones en handlers `async`. No necesitas `try/catch` ni llamar a `next(error)` manualmente. Basta con hacer `throw`.

**Pista — Ejemplo para `detail`:**

```js
async function detail(req, res) {
  const movie = await Movie.findById(req.params.id);

  if (!movie) {
    throw createError(404, "Movie not found");
  }

  res.json(movie);
}
```

Aplica el mismo patrón en `update` y `delete`.

---

### Iteración 3: Crear el middleware centralizado de manejo de errores

Crea el archivo `middlewares/error-handler.middleware.js`. Este middleware será el encargado de interceptar **todos** los errores de la aplicación y devolver respuestas HTTP apropiadas.

Debe exportar una función `errorHandler` con **4 parámetros** `(err, req, res, next)` — así es como Express reconoce que es un middleware de errores.

El middleware debe gestionar los siguientes tipos de error, **en este orden**:

#### 1. Error de validación de Mongoose (`ValidationError`)

Cuando Mongoose detecta que faltan campos obligatorios o los datos no cumplen el esquema, lanza un error con `err.name === "ValidationError"`. Responde con **400 Bad Request** y devuelve directamente `err.errors` (el objeto con el detalle de cada campo que falló).

#### 2. Error con status definido (`http-errors`)

Los errores creados con `http-errors` (o similares) ya traen una propiedad `.status`. Responde con ese código de estado y un JSON con la clave `message`.

#### 3. Error de cast de Mongoose (`CastError`)

Cuando se recibe un ID con formato inválido (por ejemplo, un ObjectId mal formado), Mongoose lanza un error con `err.name === "CastError"`. Responde con **404 Not Found** y el mensaje `"Resource not found"`.

#### 4. Error de clave duplicada en MongoDB (`E11000`)

Cuando se intenta crear un recurso con un valor único que ya existe (por ejemplo, un ISBN duplicado), MongoDB lanza un error cuyo mensaje incluye `"E11000"`. Comprueba con `err.message?.includes("E11000")` y responde con **409 Conflict** y el mensaje `"Resource already exist"`.

#### 5. Cualquier otro error

Para cualquier error no contemplado, imprime el error en consola con `console.error(err)` y responde con **500 Internal Server Error** y el mensaje `"Internal server error"`.

**Estructura esperada del middleware:**

```js
export function errorHandler(err, req, res, next) {
  // 1. ValidationError → 400 con err.errors
  // 2. err.status      → responder con ese status y su mensaje
  // 3. CastError       → 404 "Resource not found"
  // 4. E11000          → 409 "Resource already exist"
  // 5. Cualquier otro  → 500 "Internal server error"
}
```

> 💡 **Pista:** Usa `return` (o `return` implícito) después de cada `res.status().json()` para que no se ejecuten los bloques siguientes.

El formato de la respuesta JSON debe ser:

```json
{
  "message": "Mensaje del error"
}
```

> La excepción es `ValidationError`, que devuelve `err.errors` directamente.

---

### Iteración 4: Registrar el middleware en `app.js`

Importa la función `errorHandler` desde `middlewares/error-handler.middleware.js` y regístrala en `app.js` **después** de las rutas:

```js
import { errorHandler } from "./middlewares/error-handler.middleware.js";

// ... rutas ...

app.use(errorHandler);
```

> ⚠️ **Importante:** El middleware de errores debe ir **después** de `app.use(router)`, es decir, al final de la cadena de middlewares.

---

### Iteración 5: Ejecutar los tests

Ejecuta los tests para comprobar que todo funciona correctamente:

```bash
npm test
```

Todos los tests deberían pasar. Si alguno falla, revisa:

- ¿Estás lanzando `createError(404, ...)` cuando la película no existe?
- ¿El middleware de errores está **después** de las rutas en `app.js`?
- ¿El middleware de errores tiene exactamente **4 parámetros**?
- ¿La respuesta JSON tiene la clave `message` con el mensaje?
- ¿Estás comprobando los tipos de error en el orden correcto?

---

### Bonus: Ruta no encontrada (catch-all 404)

Añade un middleware **antes** del middleware de errores pero **después** de las rutas que capture cualquier petición a una ruta no definida y genere un error 404:

```js
app.use((req, res, next) => {
  next(createError(404, "Route not found"));
});
```

Esto hará que peticiones como `GET /peliculas` o `GET /foo` devuelvan un JSON con error 404 en lugar del HTML por defecto de Express.

---

## Resultado esperado

Cuando hayas terminado:

- `GET /movies` → 200 con array de películas.
- `GET /movies/1` → 200 con la película.
- `GET /movies/999` → **404** con `{ "message": "Movie not found" }`.
- `POST /movies` con body válido → 201 con la película creada.
- `POST /movies` con datos inválidos → **400** con los errores de validación.
- `POST /movies` con valor duplicado → **409** con `{ "message": "Resource already exist" }`.
- `GET /movies/id-mal-formado` → **404** con `{ "message": "Resource not found" }`.
- `PATCH /movies/999` → **404** con `{ "message": "Movie not found" }`.
- `DELETE /movies/999` → **404** con `{ "message": "Movie not found" }`.
- Cualquier error inesperado → **500** con `{ "message": "Internal server error" }`.

Happy coding! 💙
