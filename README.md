# Dulces Antojos 🧁

App web sencilla de pedidos para la pastelería casera **Dulces Antojos** — *hecho en casa*.

Es una página pensada para el celular: el cliente arma su pedido tocando los productos
y, al terminar, lo envía por **WhatsApp** con un solo botón. No hay pagos online ni
cuentas de usuario: el pedido se concreta por WhatsApp.

🔗 **Sitio online:** _(pegá acá tu link de Vercel cuando lo subas, ej. https://dulces-antojos.vercel.app)_

---

## ✨ Qué hace

- Muestra el catálogo de productos ordenado por categorías (Tartas, Bocaditos, Galletas, etc.).
- Barra de categorías que se queda fija arriba y se va resaltando según lo que mirás.
- Carrito con botones + / – para elegir cantidades.
- Botón final que abre WhatsApp con el resumen del pedido y el total ya escritos.

---

## 🛠️ Cómo está hecho

HTML + CSS + JavaScript **sin frameworks ni instalación**. Se puede hostear en cualquier
lado (Vercel, GitHub Pages, etc.) subiendo los archivos tal cual.

### Archivos del proyecto

| Archivo            | Para qué sirve |
|--------------------|----------------|
| `index.html`       | La estructura de la página. |
| `styles.css`       | Los colores, tipografías y diseño. |
| `app.js`           | La lógica (carrito, WhatsApp, etc.). Está comentado en español. |
| `productos.json`   | **El catálogo.** Acá se editan productos, precios y descripciones. |
| `img/`             | Las fotos de los productos. |
| `logo.jpg`         | El logo de la marca. |

---

## ✏️ Cómo editar el catálogo (lo más común)

Toda la información de productos vive en **`productos.json`**. No hace falta tocar el código.

Cada producto se ve así:

```json
{
  "id": "tarta-nuez",
  "nombre": "Tarta de Nuez",
  "descripcion": "Base de nuez con dulce de leche, crema y frutos rojos",
  "precio": 45000,
  "imagen": "img/tarta-nuez.jpg"
}
```

- **Cambiar un precio:** editá el número en `"precio"`. Va sin puntos ni símbolo `$`
  (ej. `45000`, no `$45.000`). La app le da el formato sola.
- **Cambiar nombre o descripción:** editá el texto entre comillas. Cuidá de no borrar las comillas.
- **Agregar un producto:** copiá un bloque completo `{ ... }`, pegalo dentro de la categoría
  que corresponda, y cambiale los datos. Acordate de la coma `,` entre un producto y otro.
- **El `id`** tiene que ser único y sin espacios (ej. `tarta-nuez`). Sirve para identificar el producto.

> 💡 Consejo: después de editar, revisá que el archivo siga siendo un JSON válido
> (sin comas de más o de menos). Lo podés pegar en [jsonlint.com](https://jsonlint.com) para chequearlo.

### Agregar las fotos

Subí la foto a la carpeta `img/` con el mismo nombre que pusiste en el campo `"imagen"`.
Si una foto todavía no existe, la app muestra un ícono de torta de relleno (no se rompe).

---

## 📱 El número de WhatsApp

Está al principio de **`app.js`**, bien visible:

```js
const WHATSAPP_NUMBER = "5492974618975";
```

Formato internacional, sin espacios, `+` ni guiones (54 = Argentina, 9 = celular).

---

## 💻 Probar la app en tu compu

Importante: **no se puede abrir con doble clic** (el navegador bloquea la carga del catálogo
en ese modo). Necesitás un servidor local simple. Desde la carpeta del proyecto:

```bash
python3 -m http.server 8000
```

Y abrís en el navegador: **http://localhost:8000**

---

## 🚀 Publicar en Vercel

1. Subí esta carpeta a un repositorio de GitHub.
2. Entrá a [vercel.com](https://vercel.com) → **Add New Project** → importá el repo.
3. En "Framework Preset" elegí **Other** (no necesita build).
4. **Deploy.** Listo, te da la URL pública.

Cada vez que actualices el repo en GitHub, Vercel vuelve a publicar solo.

---

## 🎨 Paleta de colores

Definida como variables en `styles.css` (arriba de todo, en `:root`):

| Color           | Código     | Uso |
|-----------------|------------|-----|
| Crema           | `#FBF7F0`  | Fondo principal |
| Lavanda         | `#9B7FC7`  | Botones, precios, acentos |
| Marrón          | `#3D2E2A`  | Texto principal |
| Marrón claro    | `#8a7a6d`  | Descripciones |
| Borde           | `#ECE3D2`  | Bordes suaves |
