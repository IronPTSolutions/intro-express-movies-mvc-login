# LAB | Express Movies — Register & encrypt password

## Introducción

Tienes una API REST de películas construida con **Express 5** y **Mongoose**. La API ya tiene un CRUD completo de películas, un sistema de valoraciones (ratings) y un sistema de manejo de errores.

Tu misión es **añadir un sistema de usuarios con autenticación básica**, aprendiendo a usar **validaciones avanzadas**, **middleware pre-save** y **cifrado de contraseñas** con bcrypt.

## Requisitos

- Tener [Node.js](https://nodejs.org/) instalado (v22 o superior).
- Tener [MongoDB](https://www.mongodb.com/) corriendo en local.

## Punto de partida

El proyecto ya tiene un CRUD funcional de películas y valoraciones con la siguiente estructura:

```
app.js                              ← Servidor Express
app.test.js                         ← Tests (tu guía para saber si vas bien)
config/
  db.config.js                      ← Conexión a MongoDB
  routes.config.js                  ← Definición de rutas
controllers/
  movie.controller.js               ← Controlador de películas
  rating.controller.js              ← Controlador de valoraciones
models/
  movie.model.js                    ← Modelo de película
  rating.model.js                   ← Modelo de valoración
middlewares/
  error-handler.middleware.js        ← Middleware de errores
```

### Endpoints existentes

| Método   | Ruta           | Descripción                     |
| -------- | -------------- | ------------------------------- |
| `GET`    | `/movies`      | Listar todas las películas      |
| `GET`    | `/movies/:id`  | Obtener una película por ID     |
| `POST`   | `/movies`      | Crear una nueva película        |
| `PATCH`  | `/movies/:id`  | Actualizar una película         |
| `DELETE` | `/movies/:id`  | Eliminar una película           |
| `GET`    | `/ratings`     | Listar todas las valoraciones   |
| `GET`    | `/ratings/:id` | Obtener una valoración por ID   |
| `POST`   | `/ratings`     | Crear una nueva valoración      |
| `PATCH`  | `/ratings/:id` | Actualizar una valoración       |
| `DELETE` | `/ratings/:id` | Eliminar una valoración         |

## Instrucciones

### Configuración inicial

```bash
npm install
```

### Ejecutar los tests

Los tests son tu guía principal. Al principio, muchos tests fallarán porque los usuarios no están implementados. Tu objetivo es hacer que **todos los tests pasen**.

```bash
npm test
```

Para lanzar el servidor en modo desarrollo:

```bash
npm run dev
```

---

### Iteración 1: Crear el modelo `User`

Crea el archivo `models/user.model.js` con el siguiente esquema:

| Campo       | Tipo     | Validaciones                                                              |
| ----------- | -------- | ------------------------------------------------------------------------- |
| `email`     | `String` | Obligatorio. Único. Con `trim`. Regex: `/^\S+@\S+\.\S+$/`               |
| `password`  | `String` | Obligatorio. Mínimo 5 caracteres.                                        |
| `fullName`  | `String` | Obligatorio. Con `trim`.                                                 |
| `bio`       | `String` | Opcional. Con `trim`.                                                    |
| `birthDate` | `Date`   | Obligatorio. Validador custom: el usuario debe tener al menos 18 años.   |

**Puntos clave:**

1. Configura el esquema con `timestamps: true` para que Mongoose añada automáticamente los campos `createdAt` y `updatedAt`.
2. Configura `toJSON` con `virtuals: true` y una función `transform` que elimine los campos `password` y `_id` de las respuestas JSON. Esto es importante por seguridad: **nunca debes enviar la contraseña al cliente**.
3. El campo `email` debe tener `unique: true` para evitar registros duplicados.
4. El validador de `birthDate` debe calcular la edad del usuario comparando su fecha de nacimiento con la fecha actual.

**Pista:**

```js
import { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: /^\S+@\S+\.\S+$/,
    },
    // ... define password, fullName, bio y birthDate con sus validaciones
    birthDate: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          // Calcula la edad y devuelve true si es >= 18
        },
        message: "User must be at least 18 years old",
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        // Elimina password y _id del objeto JSON
        delete ret.password;
        delete ret._id;
        return ret;
      },
    },
  },
);

const User = model("User", userSchema);

export default User;
```

---

### Iteración 2: Cifrado de contraseña con bcrypt

Antes de guardar un usuario en la base de datos, necesitamos **cifrar su contraseña**. Nunca debemos almacenar contraseñas en texto plano.

#### ¿Qué es bcrypt?

**bcrypt** es una librería de hashing diseñada específicamente para contraseñas. A diferencia de algoritmos como MD5 o SHA, bcrypt es **intencionalmente lento** y añade un "salt" aleatorio a cada hash, haciendo que dos contraseñas iguales generen hashes diferentes.

Primero, instala la dependencia:

```bash
npm install bcrypt
```

#### Middleware `pre("save")`

Mongoose permite definir **middlewares** que se ejecutan antes o después de ciertas operaciones. El middleware `pre("save")` se ejecuta **antes de guardar** un documento en la base de datos.

Añade el siguiente middleware a tu esquema de usuario, **antes** de crear el modelo:

```js
import bcrypt from "bcrypt";

userSchema.pre("save", async function () {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});
```

#### ¿Por qué `this.isModified("password")`?

El middleware `pre("save")` se ejecuta **cada vez** que se llama a `.save()`, no solo al crear un usuario. Si un usuario actualiza su bio, no queremos re-cifrar la contraseña (que ya está cifrada). `isModified("password")` devuelve `true` solo si el campo `password` ha sido modificado, evitando cifrar un hash que ya estaba cifrado.

#### Implicación importante para el update

Esto significa que **no puedes usar `findByIdAndUpdate()`** para actualizar usuarios, porque este método **no dispara** el middleware `pre("save")`. En su lugar, deberás:

1. Buscar el usuario con `findById()`
2. Asignar los nuevos valores con `Object.assign()`
3. Guardar con `.save()` (esto sí dispara el `pre("save")`)

---

### Iteración 3: Crear el controlador CRUD de Users

Crea el archivo `controllers/user.controller.js` con las siguientes funciones:

- **`list(req, res)`** — Devuelve todos los usuarios.
- **`detail(req, res)`** — Devuelve un usuario por ID. Si no existe, lanza un error 404.
- **`create(req, res)`** — Crea un nuevo usuario. Devuelve 201.
- **`update(req, res)`** — Actualiza un usuario por ID. **Debe usar `findById` + `Object.assign` + `.save()`** para que el middleware `pre("save")` se ejecute y cifre la contraseña si fue modificada. Si no existe, lanza un error 404.
- **`delete(req, res)`** — Elimina un usuario por ID. Si no existe, lanza un error 404. Devuelve 204.

**Pista — La función `update` debe seguir este patrón:**

```js
async function update(req, res) {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw createError(404, "User not found");
  }

  Object.assign(user, req.body);
  await user.save();

  res.json(user);
}
```

> 💡 **¿Por qué `Object.assign`?** Este método copia las propiedades de `req.body` al documento `user` existente. Así, solo se modifican los campos que envía el cliente. Después, `.save()` dispara el middleware `pre("save")` que cifrará la contraseña si fue modificada.

---

### Iteración 4: Añadir las rutas

Abre `config/routes.config.js` y añade las rutas para el CRUD de usuarios:

| Método   | Ruta              | Controlador            |
| -------- | ----------------- | ---------------------- |
| `GET`    | `/api/users`      | `userController.list`   |
| `GET`    | `/api/users/:id`  | `userController.detail` |
| `POST`   | `/api/users`      | `userController.create` |
| `PATCH`  | `/api/users/:id`  | `userController.update` |
| `DELETE` | `/api/users/:id`  | `userController.delete` |

Recuerda importar el controlador al principio del archivo.

---

### Iteración 5: Ejecutar los tests

Ejecuta los tests para comprobar que todo funciona correctamente:

```bash
npm test
```

Todos los tests deberían pasar. Si alguno falla, revisa:

- ¿El modelo `User` tiene todas las validaciones (`required`, `unique`, `match`, `minlength`)?
- ¿Has configurado `toJSON` con `transform` para ocultar `password` y `_id`?
- ¿Has añadido el middleware `pre("save")` con `bcrypt`?
- ¿El controlador `update` usa `findById` + `Object.assign` + `.save()` en lugar de `findByIdAndUpdate`?
- ¿Has registrado las rutas en `routes.config.js` con el prefijo `/api/users`?
- ¿El validador de `birthDate` calcula correctamente si el usuario tiene al menos 18 años?

---

## Resultado esperado

Cuando hayas terminado:

**Users CRUD:**

- `POST /api/users` con body válido → 201 con el usuario creado (sin password en la respuesta).
- `POST /api/users` con datos inválidos → 400.
- `POST /api/users` con email duplicado → 409.
- `GET /api/users` → 200 con array de usuarios (sin password).
- `GET /api/users/:id` → 200 con el usuario (sin password).
- `PATCH /api/users/:id` → 200 con el usuario actualizado (sin password).
- `PATCH /api/users/:id` con nueva password → La contraseña se re-cifra en la BD.
- `DELETE /api/users/:id` → 204.

**Ejemplo de respuesta `POST /api/users`:**

```json
{
  "id": "abc123",
  "email": "ana@example.com",
  "fullName": "Ana García",
  "bio": "Desarrolladora full-stack",
  "birthDate": "1995-03-15T00:00:00.000Z",
  "createdAt": "2026-02-21T10:30:00.000Z",
  "updatedAt": "2026-02-21T10:30:00.000Z"
}
```

> Nota: el campo `password` **no aparece** en la respuesta gracias a la función `transform` del esquema.

**Ejemplo de respuesta `GET /api/users`:**

```json
[
  {
    "id": "abc123",
    "email": "ana@example.com",
    "fullName": "Ana García",
    "birthDate": "1995-03-15T00:00:00.000Z",
    "createdAt": "2026-02-21T10:30:00.000Z",
    "updatedAt": "2026-02-21T10:30:00.000Z"
  }
]
```

Happy coding! 💙
