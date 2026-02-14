# LAB | Express Movies — Relaciones con Mongoose

## Introducción

Tienes una API REST de películas construida con **Express 5** y **Mongoose**. La API ya tiene un CRUD completo de películas y un sistema de manejo de errores.

Tu misión es **añadir un sistema de valoraciones (ratings)** que esté relacionado con las películas, aprendiendo a usar **referencias entre modelos**, **populate** y **virtual populate** de Mongoose.

## Requisitos

- Tener [Node.js](https://nodejs.org/) instalado (v22 o superior).
- Tener [MongoDB](https://www.mongodb.com/) corriendo en local.

## Punto de partida

El proyecto ya tiene un CRUD funcional de películas con la siguiente estructura:

```
app.js                              ← Servidor Express
app.test.js                         ← Tests (tu guía para saber si vas bien)
config/
  db.config.js                      ← Conexión a MongoDB
  routes.config.js                  ← Definición de rutas
controllers/
  movie.controller.js               ← Controlador de películas
models/
  movie.model.js                    ← Modelo de película
middlewares/
  error-handler.middleware.js        ← Middleware de errores
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

Los tests son tu guía principal. Al principio, muchos tests fallarán porque las valoraciones no están implementadas. Tu objetivo es hacer que **todos los tests pasen**.

```bash
npm test
```

Para lanzar el servidor en modo desarrollo:

```bash
npm run dev
```

### Colección Postman

El proyecto incluye el archivo `postman_collection.json` con todas las peticiones de la API (movies y ratings) ya configuradas. Puedes importarlo en [Postman](https://www.postman.com/) para probar los endpoints manualmente mientras desarrollas:

1. Abre Postman → **Import** → selecciona `postman_collection.json`.
2. Crea una película con `POST /movies` y copia el `id` de la respuesta.
3. Edita la variable `movieId` de la colección con ese valor.
4. Usa las peticiones de la carpeta **Ratings** para probar tu implementación.
5. Cuando crees un rating, copia su `id` y actualiza la variable `ratingId`.

> 💡 Combina los tests (`npm test`) con Postman: los tests te dicen **qué falla**, Postman te ayuda a ver **las respuestas reales** y depurar.

---

### Iteración 1: Crear el modelo `Rating`

Crea el archivo `models/rating.model.js` con el siguiente esquema:

| Campo   | Tipo       | Validaciones                                      |
| ------- | ---------- | ------------------------------------------------- |
| `movie` | `ObjectId` | Obligatorio. Referencia al modelo `"Movie"`.      |
| `text`  | `String`   | Obligatorio. Mínimo 10 caracteres. Con `trim`.    |
| `score` | `Number`   | Obligatorio. Mínimo `1`, máximo `5`.              |

**Puntos clave:**

1. El campo `movie` debe usar `Schema.Types.ObjectId` con `ref: "Movie"` para establecer la **relación** con el modelo de película.
2. Configura el esquema con `toJSON: { virtuals: true }` para que el campo `id` aparezca en las respuestas JSON.

**Pista:**

```js
import { Schema, model } from "mongoose";

const ratingSchema = new Schema(
  {
    movie: {
      type: Schema.Types.ObjectId,
      ref: "Movie",
      required: true,
    },
    // ... define text y score con sus validaciones
  },
  {
    toJSON: {
      virtuals: true,
    },
  },
);

const Rating = model("Rating", ratingSchema);

export default Rating;
```

---

### Iteración 2: Crear el controlador y las rutas de Rating

#### 2a. Controlador

Crea el archivo `controllers/rating.controller.js` con las siguientes funciones:

- **`list(req, res)`** — Devuelve todas las valoraciones. Debe usar `.populate("movie")` para incluir los datos de la película relacionada (no solo su ID).
- **`detail(req, res)`** — Devuelve una valoración por ID. Debe usar `.populate("movie")`. Si no existe, lanza un error 404.
- **`create(req, res)`** — Crea una nueva valoración. Antes de crear, verifica que la película referenciada existe (busca por `req.body.movie`); si no existe, lanza un error 404 con el mensaje `"Movie not found"`. Devuelve 201.
- **`update(req, res)`** — Actualiza una valoración por ID. Si no existe, lanza un error 404.
- **`delete(req, res)`** — Elimina una valoración por ID. Si no existe, lanza un error 404. Devuelve 204.

**Pista — Ejemplo de `list` con populate:**

```js
async function list(req, res) {
  const ratings = await Rating.find().populate("movie");
  res.json(ratings);
}
```

> 💡 **¿Qué hace `.populate("movie")`?** Sustituye el ObjectId almacenado en el campo `movie` por el documento completo de la película. Sin populate, verías `"movie": "6789abc..."`. Con populate, verías `"movie": { "id": "6789abc...", "title": "Inception", ... }`.

#### 2b. Rutas

Abre `config/routes.config.js` y añade las rutas para el CRUD de valoraciones:

| Método   | Ruta           | Controlador              |
| -------- | -------------- | ------------------------ |
| `GET`    | `/ratings`     | `ratingController.list`   |
| `GET`    | `/ratings/:id` | `ratingController.detail` |
| `POST`   | `/ratings`     | `ratingController.create` |
| `PATCH`  | `/ratings/:id` | `ratingController.update` |
| `DELETE` | `/ratings/:id` | `ratingController.delete` |

---

### Iteración 3: Virtual Populate — Ratings desde la película

Hasta ahora, puedes obtener la película desde un rating (gracias a `populate`). Pero, ¿cómo obtienes todos los ratings de una película?

La relación está definida **solo** en el modelo `Rating` (el campo `movie`). El modelo `Movie` no tiene ningún campo que apunte a `Rating`. Aquí entra el **virtual populate**.

#### 3a. Configurar el virtual en `Movie`

Abre `models/movie.model.js` y añade un **campo virtual** llamado `ratings`:

```js
movieSchema.virtual("ratings", {
  ref: "Rating",        // Modelo de donde vienen los datos
  localField: "_id",    // Campo local (Movie._id)
  foreignField: "movie", // Campo en Rating que apunta a Movie
});
```

> 💡 **¿Qué hace esto?** Crea un campo virtual `ratings` en el modelo `Movie`. No se guarda en la base de datos, pero cuando hagas `.populate("ratings")`, Mongoose buscará todos los documentos de `Rating` donde `movie === Movie._id` y los incluirá como un array.

#### 3b. Usar populate en el controlador de películas

Modifica la función `detail` en `controllers/movie.controller.js` para que incluya las valoraciones de la película:

```js
const movie = await Movie.findById(req.params.id).populate("ratings");
```

Ahora, al consultar `GET /movies/:id`, la respuesta incluirá un array `ratings` con todas las valoraciones de esa película.

---

### Iteración 4: Ejecutar los tests

Ejecuta los tests para comprobar que todo funciona correctamente:

```bash
npm test
```

Todos los tests deberían pasar. Si alguno falla, revisa:

- ¿El modelo `Rating` tiene `ref: "Movie"` en el campo `movie`?
- ¿Estás usando `.populate("movie")` en el controlador de ratings?
- ¿Has configurado el `virtual` en el modelo `Movie` con los campos correctos (`localField`, `foreignField`)?
- ¿Estás usando `.populate("ratings")` en el `detail` del controlador de películas?
- ¿Has verificado que la película existe antes de crear un rating?

---

## Resultado esperado

Cuando hayas terminado:

**Ratings CRUD:**

- `GET /ratings` → 200 con array de ratings, cada uno con la película populada.
- `GET /ratings/:id` → 200 con el rating y la película populada.
- `POST /ratings` con body válido → 201 con el rating creado.
- `POST /ratings` con película inexistente → 404.
- `POST /ratings` con datos inválidos (score fuera de rango, text corto) → 400.
- `PATCH /ratings/:id` → 200 con el rating actualizado.
- `DELETE /ratings/:id` → 204.

**Populate en películas:**

- `GET /movies/:id` → 200 con la película y un array `ratings` con todas sus valoraciones.

**Ejemplo de respuesta `GET /movies/:id`:**

```json
{
  "id": "abc123",
  "title": "Inception",
  "year": "2010",
  "director": "Christopher Nolan",
  "ratings": [
    {
      "id": "def456",
      "movie": "abc123",
      "text": "Una película extraordinaria con un concepto brillante",
      "score": 5
    }
  ]
}
```

**Ejemplo de respuesta `GET /ratings/:id`:**

```json
{
  "id": "def456",
  "text": "Una película extraordinaria con un concepto brillante",
  "score": 5,
  "movie": {
    "id": "abc123",
    "title": "Inception",
    "year": "2010",
    "director": "Christopher Nolan"
  }
}
```

Happy coding! 💙
