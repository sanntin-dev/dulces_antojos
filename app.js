/* ============================================================
   Dulces Antojos — lógica de la app (JavaScript vanilla)

   Cómo está organizado este archivo:
   1. Configuración (número de WhatsApp)
   2. Estado en memoria (el carrito)
   3. Arranque: leer productos.json y dibujar todo
   4. Dibujar chips y secciones de productos
   5. Carrito: sumar / restar / quitar y refrescar pantalla
   6. Panel del pedido (abrir / cerrar)
   7. Enviar por WhatsApp
   8. Scrollspy (resaltar el chip de la categoría que se está viendo)

   Está comentado a propósito para que puedas tocar cosas sueltas
   sin ser programador. Buscá el número de comentario que te interese.
   ============================================================ */

/* ---------- 1) CONFIGURACIÓN ---------- */

// Número de WhatsApp en formato internacional, SIN espacios, +, ni guiones.
// Ejemplo: 5491122334455  (54 = Argentina, 9 = celular, etc.)
const WHATSAPP_NUMBER = "5492974618975"; // TODO: reemplazar por el número real

/* ---------- 2) ESTADO EN MEMORIA ---------- */

// El carrito es un objeto simple: { idProducto: cantidad }
// Ejemplo: { "rogel": 2, "lemon-pie": 1 }
// No se guarda en ningún lado: si recargás la página, se vacía.
let carrito = {};

// Acá guardamos todos los productos en una lista plana para poder buscar
// cualquiera por su id rápido (nombre, precio, etc.) cuando armamos el pedido.
// Se llena al cargar el JSON.
let productosPorId = {};

/* ---------- 3) ARRANQUE ---------- */

// Cuando termina de cargar la página, pedimos el catálogo y lo dibujamos.
document.addEventListener("DOMContentLoaded", iniciar);

async function iniciar() {
  const estado = document.getElementById("estado");

  try {
    // Leemos el archivo de productos.
    const respuesta = await fetch("productos.json");

    // Si el archivo no se encontró o el servidor respondió mal, avisamos.
    if (!respuesta.ok) {
      throw new Error("No se pudo leer productos.json");
    }

    const datos = await respuesta.json();

    // Validación mínima: que venga la lista de categorías y que no esté vacía.
    if (!datos.categorias || datos.categorias.length === 0) {
      throw new Error("El catálogo está vacío");
    }

    // Todo OK: dibujamos chips y secciones.
    dibujarCatalogo(datos.categorias);

    // Conectamos los botones del panel del pedido (cerrar, overlay, WhatsApp).
    conectarPanel();
  } catch (error) {
    // Cualquier problema (sin internet, JSON roto, archivo vacío) cae acá.
    console.error(error);
    estado.textContent = "No se pudo cargar el catálogo.";
  }
}

/* ---------- 4) DIBUJAR CHIPS Y SECCIONES ---------- */

function dibujarCatalogo(categorias) {
  const chipsCont = document.getElementById("chips");
  const catalogo = document.getElementById("catalogo");

  // Limpiamos el mensaje de "Cargando…".
  catalogo.innerHTML = "";

  // Recorremos cada categoría en el MISMO orden en que viene en el JSON.
  categorias.forEach(function (categoria) {
    // --- Chip de la categoría ---
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.textContent = categoria.nombre;
    // Guardamos a qué sección apunta para el scroll suave.
    chip.dataset.target = "seccion-" + categoria.id;
    chip.addEventListener("click", function () {
      const seccion = document.getElementById("seccion-" + categoria.id);
      seccion.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    chipsCont.appendChild(chip);

    // --- Sección de la categoría ---
    const seccion = document.createElement("section");
    seccion.className = "seccion";
    seccion.id = "seccion-" + categoria.id;

    // Título.
    const titulo = document.createElement("h2");
    titulo.className = "seccion__titulo";
    titulo.textContent = categoria.nombre;
    seccion.appendChild(titulo);

    // Nota de la categoría (si tiene), por ejemplo "Box mínimo 20 unidades".
    if (categoria.nota) {
      const nota = document.createElement("p");
      nota.className = "seccion__nota";
      nota.textContent = categoria.nota;
      seccion.appendChild(nota);
    }

    // Productos de la categoría.
    categoria.productos.forEach(function (producto) {
      // Guardamos el producto en el índice plano para usarlo después.
      productosPorId[producto.id] = producto;
      // Creamos y agregamos la card.
      seccion.appendChild(crearCard(producto));
    });

    catalogo.appendChild(seccion);
  });

  // Una vez que existen las secciones, activamos el scrollspy.
  activarScrollspy();
}

// Crea la card horizontal de un producto.
function crearCard(producto) {
  const card = document.createElement("div");
  card.className = "card";

  // --- Foto (con placeholder si todavía no existe el archivo) ---
  const img = document.createElement("img");
  img.className = "card__foto";
  img.src = producto.imagen;
  img.alt = producto.nombre;
  img.loading = "lazy";
  // Si la imagen no carga, la reemplazamos por un cuadrito lavanda con
  // un ícono de torta, así nunca se ve la imagen rota.
  img.onerror = function () {
    img.replaceWith(crearPlaceholder());
  };
  card.appendChild(img);

  // --- Info a la derecha ---
  const info = document.createElement("div");
  info.className = "card__info";

  const nombre = document.createElement("h3");
  nombre.className = "card__nombre";
  nombre.textContent = producto.nombre;
  info.appendChild(nombre);

  const desc = document.createElement("p");
  desc.className = "card__desc";
  desc.textContent = producto.descripcion;
  info.appendChild(desc);

  // Fila con precio + control de cantidad.
  const fila = document.createElement("div");
  fila.className = "card__fila";

  const precio = document.createElement("span");
  precio.className = "card__precio";
  precio.textContent = formatearPrecio(producto.precio);
  fila.appendChild(precio);

  // El control de cantidad se dibuja según lo que haya en el carrito.
  fila.appendChild(crearControlCantidad(producto.id));

  info.appendChild(fila);
  card.appendChild(info);

  return card;
}

// Cuadrito de reemplazo cuando falta la foto (ícono de torta simple).
function crearPlaceholder() {
  const div = document.createElement("div");
  div.className = "card__placeholder";
  div.innerHTML =
    '<svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true">' +
    '<path fill="currentColor" d="M12 2a1.2 1.2 0 0 1 1.2 1.2c0 .8-1.2 2-1.2 2s-1.2-1.2-1.2-2A1.2 1.2 0 0 1 12 2Zm-6 8a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v1H6v-1Zm-2 3h16a2 2 0 0 1 2 2v5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-5a2 2 0 0 1 2-2Z"/>' +
    "</svg>";
  return div;
}

// El control de cantidad cambia de forma:
// - cantidad 0  -> solo un botón "+"
// - cantidad >0 -> botón "–", número, botón "+"
function crearControlCantidad(idProducto) {
  const cant = document.createElement("div");
  cant.className = "cant";
  cant.dataset.id = idProducto; // para encontrarlo y redibujarlo después

  const cantidad = carrito[idProducto] || 0;

  if (cantidad > 0) {
    const menos = document.createElement("button");
    menos.className = "cant__btn";
    menos.textContent = "–";
    menos.setAttribute("aria-label", "Quitar uno");
    menos.addEventListener("click", function () {
      restar(idProducto);
    });
    cant.appendChild(menos);

    const num = document.createElement("span");
    num.className = "cant__num";
    num.textContent = cantidad;
    cant.appendChild(num);
  }

  const mas = document.createElement("button");
  mas.className = "cant__btn";
  mas.textContent = "+";
  mas.setAttribute("aria-label", "Agregar uno");
  mas.addEventListener("click", function () {
    sumar(idProducto);
  });
  cant.appendChild(mas);

  return cant;
}

/* ---------- 5) CARRITO ---------- */

function sumar(idProducto) {
  carrito[idProducto] = (carrito[idProducto] || 0) + 1;
  refrescarControl(idProducto);
  refrescarBurbuja();
}

function restar(idProducto) {
  if (!carrito[idProducto]) return;
  carrito[idProducto] -= 1;
  // Si llega a 0, lo sacamos del carrito para mantenerlo limpio.
  if (carrito[idProducto] <= 0) {
    delete carrito[idProducto];
  }
  refrescarControl(idProducto);
  refrescarBurbuja();
  // Si el panel del pedido está abierto, lo redibujamos también.
  if (!document.getElementById("sheet").hidden) {
    dibujarPedido();
  }
}

// Quita un producto entero (desde el panel del pedido).
function quitar(idProducto) {
  delete carrito[idProducto];
  refrescarControl(idProducto);
  refrescarBurbuja();
  dibujarPedido();
}

// Vuelve a dibujar SOLO el control de cantidad de un producto en su card.
function refrescarControl(idProducto) {
  const viejo = document.querySelector('.cant[data-id="' + idProducto + '"]');
  if (viejo) {
    viejo.replaceWith(crearControlCantidad(idProducto));
  }
}

// Actualiza el contador de la burbuja y la muestra u oculta.
function refrescarBurbuja() {
  const burbuja = document.getElementById("carritoBurbuja");
  const badge = document.getElementById("carritoBadge");
  const total = contarItems();

  badge.textContent = total;
  // Si el carrito está vacío, escondemos la burbuja para que se vea prolijo.
  burbuja.hidden = total === 0;
}

// Suma cuántas unidades hay en total en el carrito.
function contarItems() {
  let total = 0;
  for (const id in carrito) {
    total += carrito[id];
  }
  return total;
}

// Suma el precio total del pedido.
function calcularTotal() {
  let total = 0;
  for (const id in carrito) {
    total += productosPorId[id].precio * carrito[id];
  }
  return total;
}

/* ---------- 6) PANEL DEL PEDIDO ---------- */

function conectarPanel() {
  document
    .getElementById("carritoBurbuja")
    .addEventListener("click", abrirPanel);
  document.getElementById("sheetCerrar").addEventListener("click", cerrarPanel);
  document.getElementById("overlay").addEventListener("click", cerrarPanel);
  document
    .getElementById("btnWhatsapp")
    .addEventListener("click", enviarPorWhatsapp);
}

function abrirPanel() {
  dibujarPedido();
  document.getElementById("overlay").hidden = false;
  document.getElementById("sheet").hidden = false;
}

function cerrarPanel() {
  document.getElementById("overlay").hidden = true;
  document.getElementById("sheet").hidden = true;
}

// Dibuja la lista de items dentro del panel + el total.
function dibujarPedido() {
  const cont = document.getElementById("sheetItems");
  const totalEl = document.getElementById("sheetTotal");
  const btn = document.getElementById("btnWhatsapp");
  cont.innerHTML = "";

  const ids = Object.keys(carrito);

  // Carrito vacío: mensaje y botón deshabilitado.
  if (ids.length === 0) {
    const vacio = document.createElement("p");
    vacio.className = "sheet__vacio";
    vacio.textContent = "Todavía no agregaste nada.";
    cont.appendChild(vacio);
    totalEl.textContent = formatearPrecio(0);
    btn.disabled = true;
    return;
  }

  btn.disabled = false;

  ids.forEach(function (id) {
    const producto = productosPorId[id];
    const cantidad = carrito[id];
    const subtotal = producto.precio * cantidad;

    const item = document.createElement("div");
    item.className = "item";

    const texto = document.createElement("div");
    texto.className = "item__texto";

    const nombre = document.createElement("div");
    nombre.className = "item__nombre";
    nombre.textContent = cantidad + "x " + producto.nombre;
    texto.appendChild(nombre);

    const detalle = document.createElement("div");
    detalle.className = "item__detalle";
    detalle.textContent = formatearPrecio(producto.precio) + " c/u";
    texto.appendChild(detalle);

    item.appendChild(texto);

    const linea = document.createElement("span");
    linea.className = "item__linea";
    linea.textContent = formatearPrecio(subtotal);
    item.appendChild(linea);

    const quitarBtn = document.createElement("button");
    quitarBtn.className = "item__quitar";
    quitarBtn.textContent = "×";
    quitarBtn.setAttribute("aria-label", "Quitar " + producto.nombre);
    quitarBtn.addEventListener("click", function () {
      quitar(id);
    });
    item.appendChild(quitarBtn);

    cont.appendChild(item);
  });

  totalEl.textContent = formatearPrecio(calcularTotal());
}

/* ---------- 7) ENVIAR POR WHATSAPP ---------- */

function enviarPorWhatsapp() {
  if (contarItems() === 0) return;

  // Armamos el texto del mensaje línea por línea.
  const lineas = [];
  lineas.push("¡Hola! Quiero hacer este pedido:");
  lineas.push(""); // línea en blanco

  for (const id in carrito) {
    const producto = productosPorId[id];
    const cantidad = carrito[id];
    const subtotal = producto.precio * cantidad;
    // Ejemplo: "2x Tarta de Nuez - $90.000"
    lineas.push(
      cantidad + "x " + producto.nombre + " - " + formatearPrecio(subtotal),
    );
  }

  lineas.push(""); // línea en blanco
  lineas.push("Total: " + formatearPrecio(calcularTotal()));

  // Unimos con saltos de línea y codificamos para que viaje bien en la URL.
  const mensaje = encodeURIComponent(lineas.join("\n"));
  const url = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + mensaje;

  // Abrimos WhatsApp (app o web) en otra pestaña.
  window.open(url, "_blank");
}

/* ---------- 8) SCROLLSPY (chip activo según el scroll) ---------- */

// Usamos IntersectionObserver: el navegador nos avisa qué secciones están
// visibles, sin tener que calcular posiciones a mano.
function activarScrollspy() {
  const secciones = document.querySelectorAll(".seccion");

  const observer = new IntersectionObserver(
    function (entradas) {
      entradas.forEach(function (entrada) {
        if (entrada.isIntersecting) {
          marcarChipActivo(entrada.target.id);
        }
      });
    },
    {
      // La "línea de detección" está cerca de la parte de arriba de la pantalla
      // (debajo de los chips). Cuando una sección la cruza, se marca su chip.
      rootMargin: "-80px 0px -70% 0px",
      threshold: 0,
    },
  );

  secciones.forEach(function (seccion) {
    observer.observe(seccion);
  });
}

// Resalta el chip que apunta a la sección dada y apaga los demás.
function marcarChipActivo(idSeccion) {
  const chips = document.querySelectorAll(".chip");
  chips.forEach(function (chip) {
    const activo = chip.dataset.target === idSeccion;
    chip.classList.toggle("chip--activo", activo);

    // Si el chip activo quedó fuera de vista en la barra scrolleable,
    // lo traemos a la vista (sin mover la página vertical).
    if (activo) {
      chip.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  });
}

/* ---------- UTILIDAD: formato de precio en pesos argentinos ---------- */

// 45000 -> "$45.000"
function formatearPrecio(numero) {
  return "$" + numero.toLocaleString("es-AR");
}
