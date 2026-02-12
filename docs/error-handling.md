# Manejo de Errores en APIs con Express

## Objetivos de aprendizaje

- Entender qué son los **middlewares** en Express y cómo funcionan.
- Comprender el rol del parámetro **`next`** en el ciclo de vida de una petición.
- Identificar los **errores controlados** que pueden ocurrir en cada endpoint de un CRUD.
- Entender cómo **Express 5 captura automáticamente** las excepciones en handlers `async`.
- Crear un **middleware centralizado de manejo de errores** en `app.js`.
- Utilizar la librería **`http-errors`** (`createError`) para generar errores HTTP semánticos.

---

## Introducción

Cuando construimos una API REST con Express y MongoDB (usando Mongoose), muchas cosas pueden salir mal: el cliente puede enviar un ID con formato inválido, un campo obligatorio puede faltar en el body, o la base de datos puede no estar disponible. Si no gestionamos estos errores de forma adecuada, nuestra API devolverá respuestas incoherentes o, peor aún, se caerá.

En esta guía partimos de un **CRUD básico de películas** y lo reforzamos paso a paso con un sistema robusto de manejo de errores.

> **Nota:** Esta guía utiliza **Express 5**, que captura automáticamente las excepciones en handlers `async` y las pasa al middleware de errores. Esto simplifica mucho el código comparado con Express 4, donde era necesario envolver cada handler en `try/catch` manualmente.

---

## 1. Middlewares y el parámetro `next`

### ¿Qué es un middleware?

Un **middleware** en Express es una función que tiene acceso a tres elementos:

| Parámetro | Descripción                                                              |
| --------- | ------------------------------------------------------------------------ |
| `req`     | El objeto de la petición (_request_)                                     |
| `res`     | El objeto de la respuesta (_response_)                                   |
| `next`    | Una función que pasa el control al **siguiente middleware** de la cadena |

```js
// Ejemplo de middleware simple
const logger = (req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next(); // ← pasa al siguiente middleware o ruta
};

app.use(logger);
```

Cada petición HTTP en Express recorre una **cadena de middlewares** en orden hasta que uno de ellos envía una respuesta (`res.json()`, `res.send()`, etc.) o se produce un error.

### ¿Para qué sirve `next()`?

- **`next()`** — Pasa el control al siguiente middleware o ruta.
- **`next(error)`** — Cuando le pasamos un argumento, Express **salta todos los middlewares normales** y busca el primer **middleware de manejo de errores** (uno con 4 parámetros).

```
Petición → middleware 1 → middleware 2 → ruta → respuesta

         Si ocurre un error en cualquier punto:
           next(error) → middleware de errores → respuesta de error
```

> **Regla clave:** Cuando llamamos a `next()` con un argumento, Express entiende que se ha producido un error y busca el primer middleware con la firma `(err, req, res, next)`.

---

## 2. El CRUD base (sin manejo de errores)

Partimos de este CRUD de películas:

```js
const express = require("express");
const Movie = require("../models/Movie.model");

const router = express.Router();

// 1. GET /movies - Obtener todas las películas
router.get("/movies", async (req, res) => {
  const movies = await Movie.find();
  res.json(movies);
});

// 2. GET /movies/:id - Obtener una película por su ID
router.get("/movies/:id", async (req, res) => {
  const movie = await Movie.findById(req.params.id);
  res.json(movie);
});

// 3. POST /movies - Crear una nueva película
router.post("/movies", async (req, res) => {
  const movie = await Movie.create(req.body);
  res.status(201).json(movie);
});

// 4. PATCH /movies/:id - Actualizar una película existente
router.patch("/movies/:id", async (req, res) => {
  const movie = await Movie.findByIdAndUpdate(req.params.id, req.body);
  res.json(movie);
});

// 5. DELETE /movies/:id - Eliminar una película
router.delete("/movies/:id", async (req, res) => {
  await Movie.findByIdAndDelete(req.params.id);
  res.status(204).send();
});

module.exports = router;
```

### ¿Qué problemas tiene este código?

1. **No se comprueba si el documento existe**: si hacemos `GET /movies/507f1f77bcf86cd799439011` y esa película no existe, `findById` devuelve `null` y enviamos `null` como respuesta en lugar de un error 404.
2. **No hay un middleware de errores**: aunque Express 5 captura las excepciones de los handlers `async` automáticamente, sin un middleware de errores personalizado Express devuelve un HTML genérico en lugar de una respuesta JSON estructurada.
3. **No se usa `next()` ni `throw` para errores controlados**: no tenemos forma de lanzar errores HTTP semánticos (como un 404) que lleguen al middleware centralizado.

---

## 3. Tipos de errores controlados en cada endpoint

Antes de escribir código, identifiquemos **qué puede fallar** en cada ruta:

### GET `/movies` (listar todas)

| Error                  | Causa                                        | Código HTTP |
| ---------------------- | -------------------------------------------- | :---------: |
| Error de base de datos | MongoDB no disponible o fallo en la consulta |     500     |

### GET `/movies/:id` (obtener una)

| Error                   | Causa                                                    | Código HTTP |
| ----------------------- | -------------------------------------------------------- | :---------: |
| ID con formato inválido | El `:id` no es un ObjectId válido de Mongo (`CastError`) |     400     |
| Película no encontrada  | No existe un documento con ese ID                        |     404     |
| Error de base de datos  | Fallo genérico de MongoDB                                |     500     |

### POST `/movies` (crear)

| Error                  | Causa                                                                    | Código HTTP |
| ---------------------- | ------------------------------------------------------------------------ | :---------: |
| Error de validación    | Faltan campos requeridos o tienen formato incorrecto (`ValidationError`) |     400     |
| Error de base de datos | Fallo genérico de MongoDB                                                |     500     |

### PATCH `/movies/:id` (actualizar)

| Error                   | Causa                                   | Código HTTP |
| ----------------------- | --------------------------------------- | :---------: |
| ID con formato inválido | `CastError`                             |     400     |
| Película no encontrada  | No existe un documento con ese ID       |     404     |
| Error de validación     | Los datos enviados no cumplen el schema |     400     |
| Error de base de datos  | Fallo genérico de MongoDB               |     500     |

### DELETE `/movies/:id` (eliminar)

| Error                   | Causa                             | Código HTTP |
| ----------------------- | --------------------------------- | :---------: |
| ID con formato inválido | `CastError`                       |     400     |
| Película no encontrada  | No existe un documento con ese ID |     404     |
| Error de base de datos  | Fallo genérico de MongoDB         |     500     |

---

## 4. Instalación de `http-errors`

La librería [`http-errors`](https://www.npmjs.com/package/http-errors) nos permite crear objetos de error con un código de estado HTTP asociado. Esto hace que nuestro middleware de errores pueda leer `err.status` y responder adecuadamente.

```bash
npm install http-errors
```

### Uso básico

```js
const createError = require("http-errors");

// Crear un error 404
throw createError(404, "Película no encontrada");

// Crear un error 400
throw createError(400, "El ID proporcionado no es válido");
```

El objeto generado por `createError` tiene estas propiedades útiles:

| Propiedad | Ejemplo                    | Descripción                   |
| --------- | -------------------------- | ----------------------------- |
| `status`  | `404`                      | Código de estado HTTP         |
| `message` | `"Película no encontrada"` | Mensaje descriptivo del error |
| `name`    | `"NotFoundError"`          | Nombre del tipo de error      |

---

## 5. Express 5 y el manejo automático de errores en handlers `async`

Una de las mejoras más importantes de **Express 5** es que captura automáticamente las excepciones y promesas rechazadas dentro de handlers `async`. Esto significa que **no necesitamos `try/catch`** en cada ruta.

### ¿Cómo funciona?

Si un handler `async` lanza una excepción o un `await` falla, Express 5 captura ese error automáticamente y llama a `next(error)` por nosotros:

```js
// Express 5: si Movie.find() falla, Express captura la excepción
// y la pasa al middleware de errores automáticamente
router.get("/movies", async (req, res) => {
  const movies = await Movie.find(); // ← si esto falla, Express llama a next(error)
  res.json(movies);
});
```

Esto es equivalente a lo que en **Express 4** necesitaba un `try/catch` explícito:

```js
// Express 4: necesitábamos try/catch manualmente
router.get("/movies", async (req, res, next) => {
  try {
    const movies = await Movie.find();
    res.json(movies);
  } catch (error) {
    next(error); // ← en Express 4 teníamos que hacer esto manualmente
  }
});
```

> **💡 Resumen:** En Express 5, si un `await` falla o hacemos `throw` dentro de un handler `async`, el error llega automáticamente al middleware de errores. No necesitamos `try/catch` ni llamar a `next(error)` manualmente para las excepciones.

### Entonces… ¿para qué sirve `next(error)` en Express 5?

Aunque Express 5 captura **excepciones** automáticamente, seguimos necesitando `throw` (o `next(error)`) para los **errores controlados**. Por ejemplo, cuando Mongoose devuelve `null` porque no encuentra un documento — eso no es una excepción, es un resultado válido. Tenemos que detectarlo nosotros y lanzar el error:

```js
router.get("/movies/:id", async (req, res) => {
  const movie = await Movie.findById(req.params.id);

  if (!movie) {
    throw createError(404, "Película no encontrada");
    // Express 5 captura este throw y lo pasa al middleware de errores
  }

  res.json(movie);
});
```

Con esto ya tenemos cubiertas las excepciones que lanza Mongoose (CastError, ValidationError, errores de conexión…) gracias a Express 5. Pero **todavía nos falta gestionar un caso importante**: ¿qué pasa cuando el ID tiene formato válido pero no existe ninguna película con ese ID? Mongoose no lanza error, simplemente devuelve `null`. Lo resolvemos en el siguiente paso.

---

## 6. Paso 2: Gestionar el 404 (recurso no encontrado) con `createError`

Cuando hacemos `Movie.findById("507f1f77bcf86cd799439011")` y esa película no existe, Mongoose **no lanza ninguna excepción**. Devuelve `null` silenciosamente. Eso significa que nuestro `catch` no lo atrapa y el cliente recibe `null` como respuesta — lo cual no es nada útil.

Necesitamos **comprobar manualmente** si el resultado es `null` y, en ese caso, crear un error 404. Aquí es donde entra `createError`:

```js
const createError = require("http-errors");

// Si no encontramos la película, lanzamos un error 404
if (!movie) {
  throw createError(404, "Película no encontrada");
}
```

Como estamos en un handler `async` de Express 5, el `throw` es capturado automáticamente y enviado al middleware de errores.

> **Alternativa equivalente:** en lugar de `throw`, puedes usar directamente `next()` y hacer `return` para no seguir ejecutando código:
>
> ```js
> if (!movie) {
>   return next(createError(404, "Película no encontrada"));
> }
> ```
>
> Ambas formas son válidas. Usar `throw` es más directo porque no necesitas recibir `next` como parámetro ni hacer `return`.

### CRUD completo con gestión de 404

```js
const express = require("express");
const createError = require("http-errors");
const Movie = require("../models/Movie.model");

const router = express.Router();

// 1. GET /movies - Obtener todas las películas
router.get("/movies", async (req, res) => {
  const movies = await Movie.find();
  res.json(movies);
});

// 2. GET /movies/:id - Obtener una película por su ID
router.get("/movies/:id", async (req, res) => {
  const movie = await Movie.findById(req.params.id);

  if (!movie) {
    throw createError(404, "Película no encontrada");
  }

  res.json(movie);
});

// 3. POST /movies - Crear una nueva película
router.post("/movies", async (req, res) => {
  const movie = await Movie.create(req.body);
  res.status(201).json(movie);
});

// 4. PATCH /movies/:id - Actualizar una película existente
router.patch("/movies/:id", async (req, res) => {
  const movie = await Movie.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!movie) {
    throw createError(404, "Película no encontrada");
  }

  res.json(movie);
});

// 5. DELETE /movies/:id - Eliminar una película
router.delete("/movies/:id", async (req, res) => {
  const movie = await Movie.findByIdAndDelete(req.params.id);

  if (!movie) {
    throw createError(404, "Película no encontrada");
  }

  res.status(204).send();
});

module.exports = router;
```

Fíjate en lo limpio que queda el código gracias a Express 5: **sin `try/catch`, sin `next` como parámetro**. Solo hacemos `throw` cuando detectamos un error controlado y Express se encarga del resto.

### ¿Qué se añadió en las rutas que reciben `:id`?

- **GET, PATCH y DELETE** ahora comprueban si `movie` es `null` después de la consulta.
- Si lo es, lanzan `throw createError(404, "Película no encontrada")` y Express 5 lo pasa automáticamente al middleware de errores.
- **POST** no necesita esta comprobación porque siempre crea un documento nuevo.
- **GET /movies** (listar todas) tampoco, porque `find()` devuelve un array vacío `[]` si no hay películas, no `null`.
- Si `findById` o `create` lanzan una excepción (CastError, ValidationError…), Express 5 también la captura automáticamente.

---

## 7. Middleware centralizado de manejo de errores

Ahora creamos el **middleware de errores** en `app.js`. Este middleware se diferencia de los demás porque recibe **4 parámetros**: `(err, req, res, next)`.

> **⚠️ Importante:** Express reconoce un middleware de errores **exclusivamente** por tener 4 parámetros. Si le pones solo 3, Express no lo tratará como middleware de errores.

### `app.js`

```js
const express = require("express");
const createError = require("http-errors");
const moviesRouter = require("./routes/movies.routes");

const app = express();

// --- Middlewares generales ---
app.use(express.json());

// --- Rutas ---
app.use("/api", moviesRouter);

// --- Ruta no encontrada (404) ---
// Si ninguna ruta coincide, creamos un error 404
app.use((req, res, next) => {
  next(createError(404, "Ruta no encontrada"));
});

// --- Middleware centralizado de manejo de errores ---
app.use((err, req, res, next) => {
  console.error("ERROR:", err);

  // 1. Errores creados con http-errors (createError)
  //    → ya tienen .status y .message
  if (err.status) {
    return res.status(err.status).json({
      error: err.message,
    });
  }

  // 2. Error de validación de Mongoose (ValidationError)
  //    → ocurre cuando faltan campos requeridos o el formato es incorrecto
  if (err.name === "ValidationError") {
    return res.status(400).json({
      error: err.message,
    });
  }

  // 3. Error de cast de Mongoose (CastError)
  //    → ocurre cuando el ID no tiene un formato válido de ObjectId
  if (err.name === "CastError") {
    return res.status(400).json({
      error: `El valor "${err.value}" no es un ID válido`,
    });
  }

  // 4. Cualquier otro error no controlado → 500
  return res.status(500).json({
    error: "Error interno del servidor",
  });
});

module.exports = app;
```

### Flujo visual

```
  Cliente envía petición
         │
         ▼
  ┌─────────────────┐
  │  express.json()  │  ← parsea el body
  └────────┬────────┘
           ▼
  ┌─────────────────┐
  │  Router /api     │  ← busca la ruta correspondiente
  └────────┬────────┘
           │
     ┌─────┴─────┐
     │ ¿Ruta     │
     │ encontrada│
     │ ?         │
     └─────┬─────┘
       Sí  │   No
       ▼   │    ▼
   Handler │  next(createError(404))
       │   │         │
       │   │         ▼
       │   │  ┌──────────────────────┐
       │   └─►│  Middleware de        │
       │      │  manejo de errores   │
       │      │  (err, req, res, next)│
       │      └──────────┬───────────┘
       ▼                 ▼
   res.json()      res.status(xxx).json({ error })
```

---

## 8. Desglose del middleware de errores

Analicemos cada bloque del middleware:

### 8.1 Errores HTTP (creados con `createError`)

```js
if (err.status) {
  return res.status(err.status).json({
    error: err.message,
  });
}
```

Estos son los errores que **nosotros lanzamos explícitamente** en nuestros controladores con `throw createError(404, "...")`. La librería `http-errors` asigna automáticamente la propiedad `.status` al objeto de error.

**Ejemplo de respuesta:**

```json
// HTTP 404
{
  "error": "Película no encontrada"
}
```

### 8.2 Errores de validación de Mongoose

```js
if (err.name === "ValidationError") {
  return res.status(400).json({
    error: err.message,
  });
}
```

Ocurre cuando intentamos crear o actualizar un documento que **no cumple con el schema**. Por ejemplo, si `title` es un campo requerido y enviamos un body sin él.

**Ejemplo de respuesta:**

```json
// HTTP 400
{
  "error": "Movie validation failed: title: Path `title` is required."
}
```

### 8.3 Errores de cast de Mongoose

```js
if (err.name === "CastError") {
  return res.status(400).json({
    error: 'El valor "abc123" no es un ID válido',
  });
}
```

Ocurre cuando el cliente envía un `:id` que **no tiene el formato de ObjectId** de MongoDB (24 caracteres hexadecimales). Por ejemplo: `GET /movies/holamundo`.

**Ejemplo de respuesta:**

```json
// HTTP 400
{
  "error": "El valor \"holamundo\" no es un ID válido"
}
```

### 8.4 Errores no controlados (fallback)

```js
return res.status(500).json({
  error: "Error interno del servidor",
});
```

Cualquier otro error que no hayamos previsto. Siempre devolvemos un mensaje genérico para **no exponer detalles internos** al cliente.

---

## 9. Probando los errores

A continuación, algunos ejemplos de peticiones que disparan los distintos errores:

### Película no encontrada (404)

```bash
# ID válido pero no existe en la base de datos
GET /api/movies/507f1f77bcf86cd799439011
```

```json
{ "error": "Película no encontrada" }
```

### ID inválido (400 - CastError)

```bash
# "abc" no es un ObjectId válido
GET /api/movies/abc
```

```json
{ "error": "El valor \"abc\" no es un ID válido" }
```

### Error de validación (400 - ValidationError)

```bash
# Enviar un body vacío cuando title es requerido
POST /api/movies
Content-Type: application/json

{}
```

```json
{ "error": "Movie validation failed: title: Path `title` is required." }
```

### Ruta no encontrada (404)

```bash
GET /api/peliculas
```

```json
{ "error": "Ruta no encontrada" }
```

---

## 10. Resumen

| Concepto                           | Descripción                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------------- |
| **Middleware**                     | Función con acceso a `req`, `res` y `next`. Se ejecutan en cadena.              |
| **`next()`**                       | Pasa el control al siguiente middleware.                                        |
| **`next(error)`**                  | Salta a un middleware de error (4 parámetros).                                  |
| **Express 5 + `async`**            | Captura excepciones automáticamente, sin necesidad de `try/catch`.              |
| **`throw createError(...)`**       | Lanza un error HTTP controlado que Express 5 pasa al middleware de errores.     |
| **`createError(status, message)`** | Crea un error HTTP con código de estado y mensaje.                              |
| **Middleware de errores**          | Función con firma `(err, req, res, next)` que centraliza la gestión de errores. |

### Orden de evaluación en el middleware de errores

```
err llega al middleware
  │
  ├─ ¿Tiene .status? (http-errors)    → responder con err.status
  │
  ├─ ¿Es ValidationError? (Mongoose)  → responder con 400
  │
  ├─ ¿Es CastError? (Mongoose)        → responder con 400
  │
  └─ Cualquier otro error              → responder con 500
```

---

## 11. Extra: Versión mejorada con mensajes detallados de validación

Si quieres devolver los errores de validación de forma más estructurada, puedes extraer los mensajes individuales:

```js
if (err.name === "ValidationError") {
  // Extraer los mensajes de cada campo que falló
  const errors = Object.values(err.errors).map((e) => ({
    field: e.path,
    message: e.message,
  }));

  return res.status(400).json({
    error: "Error de validación",
    details: errors,
  });
}
```

**Ejemplo de respuesta:**

```json
{
  "error": "Error de validación",
  "details": [
    { "field": "title", "message": "Path `title` is required." },
    { "field": "year", "message": "Path `year` is required." }
  ]
}
```

---

## Express 4 vs Express 5

| Característica             | Express 4                                                                                       | Express 5                                                                                    |
| -------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Handlers `async`           | Las promesas rechazadas **no se capturan**. Necesitas `try/catch` + `next(error)` en cada ruta. | Las promesas rechazadas **se capturan automáticamente** y se pasan al middleware de errores. |
| `throw` en handler `async` | Solo funciona dentro de un `try/catch`                                                          | Express lo captura y llama a `next(error)` por ti.                                           |
| Código en rutas            | Más verboso (try/catch en cada ruta)                                                            | Más limpio, solo `throw` para errores controlados.                                           |

Si estás usando **Express 4**, necesitas envolver cada handler `async` en `try/catch`:

```js
// Express 4: try/catch obligatorio
router.get("/movies/:id", async (req, res, next) => {
  try {
    const movie = await Movie.findById(req.params.id);

    if (!movie) {
      throw createError(404, "Película no encontrada");
    }

    res.json(movie);
  } catch (error) {
    next(error);
  }
});
```

En **Express 5**, el mismo código queda así:

```js
// Express 5: sin try/catch
router.get("/movies/:id", async (req, res) => {
  const movie = await Movie.findById(req.params.id);

  if (!movie) {
    throw createError(404, "Película no encontrada");
  }

  res.json(movie);
});
```

---

## Recursos adicionales

- [Express 5 - Error handling](https://expressjs.com/en/guide/error-handling.html)
- [Express 5 - Migración desde Express 4](https://expressjs.com/en/guide/migrating-5.html)
- [http-errors en npm](https://www.npmjs.com/package/http-errors)
- [Mongoose - Validation](https://mongoosejs.com/docs/validation.html)
