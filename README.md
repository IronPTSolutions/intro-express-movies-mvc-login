# LAB | Express Movies — Registro, Login y Autenticación

## Introducción

Tienes una API REST de películas construida con **Express 5** y **Mongoose**. La API ya tiene un CRUD completo de películas y un sistema de valoraciones (ratings).

Tu misión es **añadir un sistema de autenticación completo** que incluya:

1. **Registro de usuarios** con contraseña cifrada usando bcrypt.
2. **Login** que verifique las credenciales y devuelva una cookie de sesión.
3. **Middleware de autenticación** que proteja todas las rutas excepto el registro y el login.

## Requisitos

- [Node.js](https://nodejs.org/) v22 o superior.
- [MongoDB](https://www.mongodb.com/) corriendo en local.

## Punto de partida

El proyecto ya tiene un CRUD funcional de películas y valoraciones:

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

## Configuración inicial

```bash
npm install
```

## Ejecutar los tests

Los tests son tu guía principal. Al principio muchos tests fallarán. Tu objetivo es hacer que **todos pasen**.

```bash
npm test
```

Para lanzar el servidor en modo desarrollo:

```bash
npm run dev
```

---

## Instrucciones

### Iteración 1: Crear el modelo `User`

Crea el archivo `models/user.model.js` con el siguiente esquema:

| Campo       | Tipo     | Validaciones                                                            |
| ----------- | -------- | ----------------------------------------------------------------------- |
| `email`     | `String` | Obligatorio. Único. Con `trim`. Regex: `/^\S+@\S+\.\S+$/`             |
| `password`  | `String` | Obligatorio. Mínimo 5 caracteres.                                      |
| `fullName`  | `String` | Obligatorio. Con `trim`.                                               |
| `bio`       | `String` | Opcional. Con `trim`.                                                  |
| `birthDate` | `Date`   | Obligatorio. Validador custom: el usuario debe tener al menos 18 años. |

**Puntos clave:**

1. Configura `timestamps: true` y `toJSON` con `virtuals: true` y una función `transform` que elimine `password` y `_id` de las respuestas JSON.
2. Añade un middleware `pre("save")` que cifre la contraseña con `bcrypt.hash(password, 10)` **solo si el campo ha sido modificado** (`this.isModified("password")`).
3. Añade un método de instancia `checkPassword(passwordToCheck)` que use `bcrypt.compare()` para comparar la contraseña en texto plano con el hash almacenado.

**Pista — Middleware pre-save y checkPassword:**

```js
import bcrypt from "bcrypt";

userSchema.pre("save", async function () {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

userSchema.methods.checkPassword = function (passwordToCheck) {
  return bcrypt.compare(passwordToCheck, this.password);
};
```

> `isModified("password")` evita re-cifrar un hash que ya estaba cifrado cuando se actualizan otros campos.

---

### Iteración 2: Registro de usuarios

Crea el controlador `controllers/user.controller.js` con las funciones CRUD:

- **`create(req, res)`** — Crea un usuario con `User.create(req.body)`. Devuelve **201**.
- **`list(req, res)`** — Devuelve todos los usuarios.
- **`detail(req, res)`** — Devuelve un usuario por ID. Lanza error 404 si no existe.
- **`update(req, res)`** — **Debe usar `findById` + `Object.assign` + `.save()`** (no `findByIdAndUpdate`) para que el middleware pre-save cifre la contraseña si fue modificada.
- **`delete(req, res)`** — Elimina un usuario. Devuelve **204**.

Añade las rutas en `config/routes.config.js`:

| Método   | Ruta              | Controlador            |
| -------- | ----------------- | ---------------------- |
| `POST`   | `/api/users`      | `userController.create` |
| `GET`    | `/api/users`      | `userController.list`   |
| `GET`    | `/api/users/:id`  | `userController.detail` |
| `PATCH`  | `/api/users/:id`  | `userController.update` |
| `DELETE` | `/api/users/:id`  | `userController.delete` |

---

### Iteración 3: Modelo `Session`

Crea el archivo `models/session.model.js`. Una sesión representa una conexión activa de un usuario:

| Campo  | Tipo         | Descripción                                        |
| ------ | ------------ | -------------------------------------------------- |
| `user` | `ObjectId`   | Referencia al modelo `User` (con `ref: "User"`).   |

Configura el esquema con `timestamps: true` y `toJSON` con `virtuals: true` (elimina `_id` en el transform).

---

### Iteración 4: Endpoint de Login

Añade la función `login` al controlador de usuarios y la ruta `POST /api/users/login`.

El login debe:

1. Validar que se envían `email` y `password`. Si falta alguno, lanzar error **400**.
2. Buscar el usuario por email. Si no existe, lanzar error **401**.
3. Verificar la contraseña con `user.checkPassword(password)`. Si no coincide, lanzar error **401**.
4. Crear una sesión (`Session.create({ user: user._id })`).
5. Establecer una cookie `sessionId` con el `_id` de la sesión:

```js
res.cookie("sessionId", session._id.toString(), {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
});
res.end();
```

> `httpOnly: true` impide que JavaScript del navegador acceda a la cookie. Esto protege contra ataques XSS.

---

### Iteración 5: Middleware de autenticación

Crea `middlewares/auth.middleware.js` con una función `checkAuth` que:

1. **Permita sin autenticación** las peticiones `POST /api/users` (registro) y `POST /api/users/login`.
2. Extraiga el `sessionId` de la cookie de la petición.
3. Busque la sesión en la base de datos y popule el campo `user`.
4. Si no hay cookie o la sesión no existe, lance error **401**.
5. Adjunte la sesión a `req.session` para que los controladores puedan acceder al usuario autenticado.

**Pista para extraer la cookie:**

```js
const sessionId = req.headers.cookie?.match(/sessionId=([^;]+)/)?.[1];
```

**Registra el middleware en `app.js`** antes del router:

```js
import { checkAuth } from "./middlewares/auth.middleware.js";

app.use(checkAuth);
app.use(router);
```

---

### Iteración 6: Profile y Logout

Añade dos endpoints más al controlador de usuarios:

**`GET /api/users/profile`** — Devuelve el usuario autenticado:

```js
res.json(req.session.user);
```

**`DELETE /api/users/logout`** — Cierra la sesión actual eliminándola de la base de datos y devuelve **204**.

Añade las rutas correspondientes en `routes.config.js`.

> Las rutas `/api/users/profile` y `/api/users/logout` deben ir **antes** de `/api/users/:id` para que Express no interprete "profile" o "logout" como un `:id`.

---

## Ejecutar los tests

```bash
npm test
```

Todos los tests deberían pasar. Si alguno falla, revisa:

- ¿El modelo `User` tiene todas las validaciones y el método `checkPassword`?
- ¿Has cifrado la contraseña con el middleware `pre("save")`?
- ¿El login verifica credenciales y establece la cookie `sessionId`?
- ¿El middleware `checkAuth` permite registro y login sin autenticación?
- ¿El middleware `checkAuth` adjunta `req.session` con el usuario populado?
- ¿Las rutas de profile y logout están antes de `:id`?

---

## Resultado esperado

**Registro:**
- `POST /api/users` → **201** con el usuario creado (sin password en la respuesta). La contraseña se almacena cifrada en la BD.

**Login:**
- `POST /api/users/login` con credenciales válidas → **200** con cookie `sessionId`.
- `POST /api/users/login` con credenciales inválidas → **401**.

**Autenticación:**
- Cualquier ruta (excepto registro y login) sin cookie → **401**.
- Cualquier ruta con cookie válida → funciona normalmente.

**Profile y Logout:**
- `GET /api/users/profile` → **200** con datos del usuario autenticado.
- `DELETE /api/users/logout` → **204**. La cookie deja de ser válida.

Happy coding!
