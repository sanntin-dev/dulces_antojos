# Dulces Antojos 🧁

App web sencilla de pedidos para la pastelería casera **Dulces Antojos** — *hecho en casa*.

Es una página pensada para el celular: el cliente arma su pedido tocando los productos
y, al terminar, lo envía por **WhatsApp** con un solo botón. No hay pagos online ni
cuentas de usuario: el pedido se concreta por WhatsApp.

🔗 **Sitio online:** (https://dulcesantojos.vercel.app/)

---

## ✨ Qué hace

- Muestra el catálogo de productos ordenado por categorías (Tartas, Bocaditos, Galletas, etc.).
- Barra de categorías que se queda fija arriba y se va resaltando según lo que mirás.
- Carrito con botones + / – para elegir cantidades.
- **Tocá la foto de un producto** para verla en grande.
- **Bocaditos por box:** se venden en boxes de 20 unidades a elección. Una barrita
  muestra cuánto falta para completar el box y no deja enviar el pedido si no cierra.
- Botón final que abre WhatsApp con el resumen del pedido y el total ya escritos.

---

## 🛠️ Cómo está hecho

HTML + CSS + JavaScript **sin frameworks ni instalación**. Se puede hostear en cualquier
lado (Vercel, GitHub Pages, etc.) subiendo los archivos tal cual.

### Archivos del proyecto

> 📝 **Si solo querés cambiar productos o el número de WhatsApp, andá directo a
> la carpeta `datos/`.** Todo lo demás es código que no hace falta tocar.

| Archivo / Carpeta        | Para qué sirve |
|--------------------------|----------------|
| `datos/productos.json`   | **El catálogo.** Acá se editan productos, precios y descripciones. |
| `datos/config.json`      | **La configuración.** Número de WhatsApp y saludo del mensaje. |
| `img/productos/`         | Las fotos de los productos. |
| `img/marca/`             | El logo, el favicon y la imagen para compartir. |
| `index.html`             | La estructura de la página. |
| `assets/styles.css`      | Los colores, tipografías y diseño. |
| `assets/app.js`          | La lógica (carrito, WhatsApp, etc.). Está comentado en español. |
| `assets/validar-json.js` | Revisa que los JSON estén bien antes de publicar. |

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
  "imagen": "img/productos/tarta-nuez.jpg",
  "activo": 1
}
```

- **Cambiar un precio:** editá el número en `"precio"`. Va sin puntos ni símbolo `$`
  (ej. `45000`, no `$45.000`). La app le da el formato sola.
- **Cambiar nombre o descripción:** editá el texto entre comillas. Cuidá de no borrar las comillas.
- **Mostrar u ocultar un producto:** usá el campo `"activo"`. `1` = se muestra,
  `0` = no se muestra. Sirve para esconder algo que no estás haciendo en el momento
  sin tener que borrar el producto. Si una categoría queda sin ningún producto activo,
  esa categoría entera (con su botón arriba) desaparece sola.
- **Agregar un producto:** copiá un bloque completo `{ ... }`, pegalo dentro de la categoría
  que corresponda, y cambiale los datos. Acordate de la coma `,` entre un producto y otro.
- **El `id`** tiene que ser único y sin espacios (ej. `tarta-nuez`). Sirve para identificar el producto.

> 💡 Consejo: después de editar, revisá que el archivo siga siendo un JSON válido
> (sin comas de más o de menos). Lo podés pegar en [jsonlint.com](https://jsonlint.com) para chequearlo.

### Agregar las fotos

Subí la foto a la carpeta `img/productos/` con el mismo nombre que pusiste en el campo `"imagen"`.
Si una foto todavía no existe, la app muestra un ícono de torta de relleno (no se rompe).

---

## 📦 Opciones de la categoría (nota y boxes)

Además de su lista de productos, **cada categoría** puede tener estos campos
opcionales. Van al lado de `"id"` y `"nombre"`, antes de `"productos"`:

```json
{
  "id": "bocaditos",
  "nombre": "Bocaditos",
  "nota": "Se arman en boxes de 20 unidades a elección",
  "unidadesPorBox": 20,
  "cantidadPorClick": 5,
  "productos": [ ... ]
}
```

- **`nota`**: un texto que aparece debajo del título de la categoría (un aclarador).
  Si no la querés, sacá la línea.
- **`unidadesPorBox`**: si está, esa categoría se vende **en boxes** de ese tamaño.
  La app suma todas las unidades de la categoría y exige que el total cierre en un
  múltiplo (ej. con `20`: 20, 40, 60…). Mientras no cierre, muestra cuánto falta y no
  deja enviar el pedido. En el carrito y en el WhatsApp los junta en una línea de box.
  Si una categoría **no** tiene este campo, se vende suelta (como tartas o galletas).
- **`cantidadPorClick`**: de a cuánto suma/resta cada botón + / –. Por defecto es `1`.
  En bocaditos está en `5` para que se pidan de a 5.

> Para cambiar el tamaño del box (ej. 20 → 24) o el salto (ej. 5 → 6), editás esos
> dos números acá. No hace falta tocar el código. El precio del box es siempre la
> **suma de lo elegido** (se respetan los precios por sabor).

---

## 📱 Configuración (`config.json`)

Los datos que cambian cada tanto viven en **`config.json`**, así no tenés que
tocar el código:

La config está agrupada por tema (`whatsapp` y `redes`):

```json
{
  "whatsapp": {
    "numero": "5492974611234",
    "mensaje_saludo": "¡Hola! Quiero hacer este pedido:"
  },
  "redes": {
    "instagram": "https://instagram.com/tu_usuario"
  }
}
```

- **`whatsapp.numero`**: el número adonde llegan los pedidos. El de arriba es
  solo un ejemplo: reemplazalo por el real. Formato internacional, sin espacios,
  `+` ni guiones (54 = Argentina, 9 = celular).
- **`whatsapp.mensaje_saludo`**: la primera línea del mensaje que se arma para WhatsApp.
- **`redes.instagram`**: link de Instagram para el ícono del encabezado. Si lo
  dejás vacío o sacás la línea, ese ícono no se muestra.

> 💡 Igual que con `productos.json`, cuidá de no borrar comillas ni las comas.
> Si más adelante se agregan más opciones, van como grupos nuevos al lado de estos.

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

### 🛡️ Protección contra JSON roto

Antes de publicar, Vercel corre el script `validar-json.js` (configurado en
`vercel.json`). Ese script revisa que `config.json` y `productos.json` estén
bien escritos.

- Si están **bien** → se publica la nueva versión.
- Si alguno está **roto** (por ejemplo, se borró una coma sin querer) → el
  deploy se **cancela** y el sitio sigue mostrando la **última versión que
  funcionaba**. Nadie ve la app rota.

Quien haya pusheado verá el error marcado en Vercel (o en GitHub) y podrá
corregirlo. También podés revisar vos antes de pushear, desde la carpeta del
proyecto:

```bash
node assets/validar-json.js
```

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
