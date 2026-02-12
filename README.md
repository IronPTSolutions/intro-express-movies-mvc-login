# LAB | Express Movies — Manejo de Errores

## Introducción

Has heredado una API REST de películas construida con **Express 5**. La API funciona… pero tiene un problema importante: **no gestiona los errores de forma adecuada**. Si un usuario pide una película que no existe, la API responde con `null`. Si una ruta no existe, Express devuelve un HTML genérico. Y si ocurre cualquier error inesperado, la aplicación puede comportarse de forma impredecible.

Tu misión es **añadir un sistema robusto de manejo de errores** siguiendo las buenas prácticas de Express.

## Requisitos

- Tener [Node.js](https://nodejs.org/) instalado (v22 o superior).

## Punto de partida

El proyecto ya tiene un CRUD funcional de películas con la siguiente estructura:

```
app.js                        ← Servidor Express
app.test.js                   ← Tests (tu guía para saber si vas bien)
config/routes.config.js       ← Definición de rutas
controllers/movie.controller.js ← Lógica de cada endpoint
models/movie.model.js         ← Modelo de datos
docs/error-handling.md        ← 📖 Guía de referencia sobre manejo de errores
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

### Iteración 3: Middleware centralizado de manejo de errores

Abre `app.js` y añade un **middleware de manejo de errores** después de las rutas. Este middleware debe:

1. Recibir **4 parámetros**: `(err, req, res, next)` — así es como Express reconoce que es un middleware de errores.
2. Comprobar si el error tiene la propiedad `.status` (errores creados con `http-errors`) y responder con el código y mensaje correspondientes.
3. Para cualquier otro error no controlado, responder con un **500** genérico.

**Estructura esperada del middleware:**

```js
app.use((err, req, res, next) => {
  // 1. Si el error tiene .status (creado con http-errors)
  //    → responder con ese status y su mensaje
  // 2. Cualquier otro error
  //    → responder con 500 y un mensaje genérico
});
```

> ⚠️ **Importante:** El middleware de errores debe ir **después** de `app.use(router)`, es decir, al final de la cadena de middlewares.

El formato de la respuesta JSON debe ser:

```json
{
  "error": "Mensaje del error"
}
```

---

### Iteración 4: Ejecutar los tests

Ejecuta los tests para comprobar que todo funciona correctamente:

```bash
npm test
```

Todos los tests deberían pasar. Si alguno falla, revisa:

- ¿Estás lanzando `createError(404, ...)` cuando la película no existe?
- ¿El middleware de errores está **después** de las rutas en `app.js`?
- ¿El middleware de errores tiene exactamente **4 parámetros**?
- ¿La respuesta JSON tiene la clave `error` con el mensaje?

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
- `GET /movies/999` → **404** con `{ "error": "Movie not found" }`.
- `POST /movies` con body válido → 201 con la película creada.
- `PATCH /movies/999` → **404** con `{ "error": "Movie not found" }`.
- `DELETE /movies/999` → **404** con `{ "error": "Movie not found" }`.
- Cualquier error inesperado → **500** con `{ "error": "Internal server error" }`.

Happy coding! 💙
