/* ============================================================
   Dulces Antojos — lógica de la app (JavaScript vanilla)

   Cómo está organizado este archivo:
   1. Configuración (se lee de config.json: número de WhatsApp, saludo)
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

// La configuración vive en el archivo "config.json", así la podés editar sin
// tocar este código. Está agrupada por tema (por ahora solo "whatsapp", pero
// si más adelante sumás otras cosas, agregás otro grupo). Acá solo dejamos
// valores por defecto, por si el config.json no se pudiera leer.
let config = {
  whatsapp: {
    numero: "",
    mensaje_saludo: "¡Hola! Quiero hacer este pedido:",
  },
};

/* ---------- 2) ESTADO EN MEMORIA ---------- */

// El carrito es un objeto simple: { idProducto: cantidad }
// Ejemplo: { "rogel": 2, "lemon-pie": 1 }
// No se guarda en ningún lado: si recargás la página, se vacía.
let carrito = {};

// Acá guardamos todos los productos en una lista plana para poder buscar
// cualquiera por su id rápido (nombre, precio, etc.) cuando armamos el pedido.
// Se llena al cargar el JSON.
let productosPorId = {};

// Reglas por categoría que se leen del JSON (por ahora "bocaditos"):
//   - unidadesPorBox: tamaño del box. Si está, los productos de esa categoría se
//     venden en boxes de ese tamaño (ej. 20) y el total tiene que cerrar en un
//     múltiplo (20, 40, 60…) para poder pedir.
//   - cantidadPorClick: de a cuánto suma/resta cada botón + / – .
// Ejemplo: { "bocaditos": { nombre: "Bocaditos", unidadesPorBox: 20, cantidadPorClick: 5 } }
// Se llena al cargar el catálogo. Una categoría sin estos campos usa los
// valores por defecto (sin box y de a uno).
let reglasPorCategoria = {};

/* ---------- 3) ARRANQUE ---------- */

// Cuando termina de cargar la página, pedimos el catálogo y lo dibujamos.
document.addEventListener("DOMContentLoaded", iniciar);

async function iniciar() {
  const estado = document.getElementById("estado");

  try {
    // Primero leemos la configuración (número de WhatsApp, etc.).
    // Si falla, no rompemos: seguimos con los valores por defecto de arriba.
    try {
      const respConfig = await fetch("datos/config.json");
      if (respConfig.ok) {
        // Mezclamos lo que venga del archivo sobre los valores por defecto.
        config = Object.assign(config, await respConfig.json());
      }
    } catch (e) {
      console.warn("No se pudo leer config.json, uso valores por defecto.", e);
    }

    // Completamos los íconos de redes (WhatsApp / Instagram) con lo del config.
    configurarRedes();

    // Leemos el archivo de productos.
    const respuesta = await fetch("datos/productos.json");

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

// Completa los íconos de redes con los datos del config.
// - WhatsApp: usa el mismo número del pedido (config.whatsapp.numero).
// - Instagram: usa el link de config.redes.instagram.
// Si alguno no tiene dato cargado, escondemos ese ícono.
function configurarRedes() {
  const whatsapp = document.getElementById("redWhatsapp");
  const instagram = document.getElementById("redInstagram");

  // WhatsApp: arma el link wa.me con el número configurado.
  if (config.whatsapp && config.whatsapp.numero) {
    whatsapp.href = "https://wa.me/" + config.whatsapp.numero;
  } else {
    whatsapp.hidden = true; // sin número, no mostramos el ícono
  }

  // Instagram: usa el link tal cual del config.
  if (config.redes && config.redes.instagram) {
    instagram.href = config.redes.instagram;
  } else {
    instagram.hidden = true; // sin link, no mostramos el ícono
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
    // Guardamos las reglas de esta categoría (tamaño de box y cantidad por click).
    // Si el JSON no las trae, quedan en sus valores por defecto: sin box (0)
    // y de a uno (1).
    reglasPorCategoria[categoria.id] = {
      nombre: categoria.nombre,
      unidadesPorBox: categoria.unidadesPorBox || 0,
      cantidadPorClick: categoria.cantidadPorClick || 1,
    };

    // Nos quedamos solo con los productos ACTIVOS.
    // Un producto se considera activo si "activo" es 1 (o si no tiene el campo,
    // así no se rompe nada si te olvidás de ponérselo a alguno).
    const activos = categoria.productos.filter(function (producto) {
      return producto.activo !== 0;
    });

    // Si la categoría no tiene ningún producto activo, no dibujamos nada
    // (ni el chip ni la sección), para que no quede una categoría vacía.
    if (activos.length === 0) {
      return;
    }

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

    // Nota de la categoría (si tiene), por ejemplo "Se arman en boxes de 20".
    if (categoria.nota) {
      const nota = document.createElement("p");
      nota.className = "seccion__nota";
      nota.textContent = categoria.nota;
      seccion.appendChild(nota);
    }

    // Si la categoría se vende en boxes (ej. bocaditos), agregamos arriba una
    // barrita de progreso que muestra cuánto falta para completar el box.
    if (reglasPorCategoria[categoria.id].unidadesPorBox) {
      seccion.appendChild(crearProgresoBox(categoria.id));
    }

    // Productos ACTIVOS de la categoría.
    activos.forEach(function (producto) {
      // Estampamos a qué categoría pertenece (para el box y la cantidad por
      // click), y lo guardamos en el índice plano para usarlo después.
      producto.categoria = categoria.id;
      productosPorId[producto.id] = producto;
      // Creamos y agregamos la card.
      seccion.appendChild(crearCard(producto));
    });

    catalogo.appendChild(seccion);
  });

  // Una vez que existen las secciones, activamos el scrollspy.
  activarScrollspy();

  // Estado inicial de las barras de progreso de boxes (arrancan en 0).
  refrescarProgresos();

  // Medimos la altura de los chips para que la barra del box se pegue justo
  // debajo (y la recalculamos si cambia el tamaño de la ventana).
  ajustarAlturaChips();
  window.addEventListener("resize", ajustarAlturaChips);
}

// Guarda la altura real de la barra de chips en la variable CSS --altura-chips.
// La usa el "top" de la barra sticky del box (styles.css), así se pega justo
// debajo de los chips sin depender de un número fijo.
function ajustarAlturaChips() {
  const chips = document.getElementById("chips");
  if (!chips) return;
  document.documentElement.style.setProperty(
    "--altura-chips",
    chips.offsetHeight + "px",
  );
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
  // Al tocar la foto, se abre en grande (visor). El placeholder no abre nada.
  img.addEventListener("click", function () {
    abrirVisor(producto.imagen, producto.nombre);
  });
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

// De a cuánto suma/resta cada click para un producto, según su categoría.
// Por defecto 1; los bocaditos, por ejemplo, van de a 5 (config en productos.json).
function cantidadPorClickDe(idProducto) {
  const producto = productosPorId[idProducto];
  const regla = producto && reglasPorCategoria[producto.categoria];
  return (regla && regla.cantidadPorClick) || 1;
}

function sumar(idProducto) {
  carrito[idProducto] = (carrito[idProducto] || 0) + cantidadPorClickDe(idProducto);
  refrescarControl(idProducto);
  refrescarBurbuja();
  refrescarProgresos();
}

function restar(idProducto) {
  if (!carrito[idProducto]) return;
  carrito[idProducto] -= cantidadPorClickDe(idProducto);
  // Si llega a 0 (o menos), lo sacamos del carrito para mantenerlo limpio.
  if (carrito[idProducto] <= 0) {
    delete carrito[idProducto];
  }
  refrescarControl(idProducto);
  refrescarBurbuja();
  refrescarProgresos();
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
  refrescarProgresos();
  dibujarPedido();
}

// Quita TODOS los productos de una categoría (ej. vaciar los bocaditos desde la
// línea de box del pedido).
function quitarCategoria(catId) {
  for (const id in carrito) {
    if (productosPorId[id].categoria === catId) {
      delete carrito[id];
      refrescarControl(id);
    }
  }
  refrescarBurbuja();
  refrescarProgresos();
  dibujarPedido();
}

// Vuelve a dibujar SOLO el control de cantidad de un producto en su card.
function refrescarControl(idProducto) {
  const viejo = document.querySelector('.cant[data-id="' + idProducto + '"]');
  if (viejo) {
    viejo.replaceWith(crearControlCantidad(idProducto));
  }
}

// Actualiza la barra fija de abajo (cantidad + total) y la muestra u oculta.
function refrescarBurbuja() {
  const barra = document.getElementById("barraPedido");
  const cantEl = document.getElementById("barraCant");
  const totalEl = document.getElementById("barraTotal");
  const cantidad = contarItems();

  // "1 producto" / "3 productos" (singular o plural según corresponda).
  cantEl.textContent = cantidad + (cantidad === 1 ? " producto" : " productos");
  totalEl.textContent = formatearPrecio(calcularTotal());

  // Si el carrito está vacío, escondemos la barra para que se vea prolijo.
  barra.hidden = cantidad === 0;
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

// ¿Esta categoría se vende en boxes? (tiene "unidadesPorBox" en el JSON)
function esCategoriaBox(catId) {
  const regla = reglasPorCategoria[catId];
  return !!(regla && regla.unidadesPorBox);
}

// Resume lo que hay en el carrito de una categoría de boxes: cuántas unidades,
// cuánto sale, el detalle del surtido, cuántos boxes completos y si cierra justo.
function resumenBox(catId) {
  const regla = reglasPorCategoria[catId];
  const box = regla.unidadesPorBox;
  let suma = 0;
  let subtotal = 0;
  // Detalle por sabor: [{ nombre: "Rogelitos", cantidad: 10, subtotal: 9500 }, ...]
  const items = [];
  for (const id in carrito) {
    if (productosPorId[id].categoria === catId) {
      const p = productosPorId[id];
      const cantidad = carrito[id];
      const sub = p.precio * cantidad;
      suma += cantidad;
      subtotal += sub;
      items.push({ nombre: p.nombre, cantidad: cantidad, subtotal: sub });
    }
  }
  return {
    nombre: regla.nombre,
    box: box,
    suma: suma,
    subtotal: subtotal,
    items: items,
    boxes: Math.floor(suma / box), // boxes completos
    resto: suma % box, // lo que va en el box "en armado" (0 = cierra justo)
    completo: suma > 0 && suma % box === 0,
  };
}

// Revisa las categorías que se venden en boxes (ej. bocaditos = 20) y devuelve
// las que están "a medias": tienen unidades pero no cierran en un múltiplo del
// box. Si una categoría tiene 0 unidades, no aplica (no es obligatorio pedirla).
// Devuelve una lista vacía si está todo OK, o algo como:
//   [{ nombre: "Bocaditos", faltan: 5, box: 20 }]
function validarBoxes() {
  const faltantes = [];
  for (const catId in reglasPorCategoria) {
    if (!esCategoriaBox(catId)) continue;
    const r = resumenBox(catId);
    if (r.suma > 0 && r.resto !== 0) {
      faltantes.push({
        nombre: r.nombre,
        faltan: r.box - r.resto,
        completados: r.boxes, // boxes ya cerrados
        boxNumero: r.boxes + 1, // el box que está en armado
      });
    }
  }
  return faltantes;
}

/* ---------- PROGRESO DEL BOX (barrita arriba de la sección) ---------- */

// Crea la barrita de progreso de una categoría de boxes. Se actualiza después
// con refrescarProgresos() a medida que el cliente suma/resta.
function crearProgresoBox(catId) {
  const cont = document.createElement("div");
  cont.className = "box-progreso";
  cont.id = "progreso-" + catId;
  cont.innerHTML =
    '<div class="box-progreso__fila">' +
    '  <span class="box-progreso__label"></span>' +
    '  <span class="box-progreso__cont"></span>' +
    "</div>" +
    '<div class="box-progreso__barra"><div class="box-progreso__relleno"></div></div>' +
    '<p class="box-progreso__nota"></p>';
  return cont;
}

// Actualiza TODAS las barritas de progreso de boxes según lo que haya en el carrito.
function refrescarProgresos() {
  for (const catId in reglasPorCategoria) {
    if (!esCategoriaBox(catId)) continue;
    const cont = document.getElementById("progreso-" + catId);
    if (!cont) continue;

    const r = resumenBox(catId);
    const label = cont.querySelector(".box-progreso__label");
    const contador = cont.querySelector(".box-progreso__cont");
    const relleno = cont.querySelector(".box-progreso__relleno");
    const nota = cont.querySelector(".box-progreso__nota");

    if (r.suma === 0) {
      // Sin nada elegido todavía: no mostramos la barra (aparece al sumar el 1°).
      cont.hidden = true;
      cont.classList.remove("box-progreso--completo");
      continue;
    }
    cont.hidden = false;

    if (r.completo) {
      // Cierra justo: todos los boxes están completos.
      label.textContent = "Box " + r.boxes;
      contador.textContent = r.box + " / " + r.box;
      relleno.style.width = "100%";
      nota.textContent =
        "✓ " + r.boxes + (r.boxes === 1 ? " box completo" : " boxes completos") +
        " (" + r.suma + "u)";
      cont.classList.add("box-progreso--completo");
    } else {
      // Hay un box "en armado": mostramos cuánto le falta.
      const enArmado = r.boxes + 1;
      label.textContent = "Box " + enArmado;
      contador.textContent = r.resto + " / " + r.box;
      relleno.style.width = Math.round((r.resto / r.box) * 100) + "%";
      // Si ya cerró boxes, se lo reconocemos antes de pedirle el siguiente.
      const prefijo =
        r.boxes > 0
          ? (r.boxes === 1 ? "1 box listo · " : r.boxes + " boxes listos · ")
          : "";
      nota.textContent =
        prefijo + "te faltan " + (r.box - r.resto) +
        " para completar el box " + enArmado;
      cont.classList.remove("box-progreso--completo");
    }
  }
}

/* ---------- 6) PANEL DEL PEDIDO ---------- */

function conectarPanel() {
  document
    .getElementById("barraVerPedido")
    .addEventListener("click", abrirPanel);
  document.getElementById("sheetCerrar").addEventListener("click", cerrarPanel);
  document.getElementById("overlay").addEventListener("click", cerrarPanel);
  document
    .getElementById("btnWhatsapp")
    .addEventListener("click", enviarPorWhatsapp);

  // Visor de fotos: cerrar tocando el fondo, la X o la tecla Escape.
  document.getElementById("visor").addEventListener("click", cerrarVisor);
  document
    .getElementById("visorCerrar")
    .addEventListener("click", cerrarVisor);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") cerrarVisor();
  });
}

/* ---------- VISOR DE FOTOS (lightbox) ---------- */

// Abre la imagen en grande sobre un fondo oscuro.
function abrirVisor(src, alt) {
  const visor = document.getElementById("visor");
  const img = document.getElementById("visorImg");
  img.src = src;
  img.alt = alt || "";
  visor.hidden = false;
  bloquearScrollFondo(true);
}

// Cierra el visor.
function cerrarVisor() {
  document.getElementById("visor").hidden = true;
  bloquearScrollFondo(false);
}

function abrirPanel() {
  dibujarPedido();
  document.getElementById("overlay").hidden = false;
  document.getElementById("sheet").hidden = false;
  bloquearScrollFondo(true);
}

function cerrarPanel() {
  document.getElementById("overlay").hidden = true;
  document.getElementById("sheet").hidden = true;
  bloquearScrollFondo(false);
}

// Congela (o libera) el scroll de la página de atrás mientras hay un panel
// abierto, así el dedo no "arrastra" el catálogo por detrás del pedido/visor.
function bloquearScrollFondo(bloquear) {
  document.body.classList.toggle("sin-scroll", bloquear);
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

  // Productos sueltos (los que NO se venden en box): una línea por producto.
  // Los de categorías de box se juntan más abajo en una sola línea por categoría.
  ids.forEach(function (id) {
    const producto = productosPorId[id];
    if (esCategoriaBox(producto.categoria)) return; // se agrupan aparte

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

  // Categorías de box (ej. bocaditos): una sola línea con el surtido y el total.
  for (const catId in reglasPorCategoria) {
    if (!esCategoriaBox(catId)) continue;
    const r = resumenBox(catId);
    if (r.suma === 0) continue;
    cont.appendChild(crearLineaBox(catId, r));
  }

  totalEl.textContent = formatearPrecio(calcularTotal());

  // Chequeo de boxes (ej. bocaditos): si el total no cierra en un múltiplo del
  // box, mostramos un cartel y deshabilitamos el botón hasta que se complete.
  const faltantes = validarBoxes();
  if (faltantes.length > 0) {
    faltantes.forEach(function (f) {
      const aviso = document.createElement("p");
      aviso.className = "sheet__aviso";
      // Si ya cerró boxes, se lo reconocemos antes de pedirle que complete el actual.
      const prefijo =
        f.completados > 0
          ? "Ya tenés " + f.completados +
            (f.completados === 1 ? " box listo. " : " boxes listos. ")
          : "";
      aviso.textContent =
        prefijo + "Te faltan " + f.faltan + " para completar el box " +
        f.boxNumero + " de " + f.nombre.toLowerCase() + ".";
      cont.appendChild(aviso);
    });
    btn.disabled = true;
  }
}

// Crea la línea agrupada del pedido para una categoría de boxes.
// Ej: "1 box de bocaditos (20u)" + "10 Rogelitos · 5 Brownie · 5 Cheesecake".
function crearLineaBox(catId, r) {
  const item = document.createElement("div");
  item.className = "item";

  const texto = document.createElement("div");
  texto.className = "item__texto";

  const nombre = document.createElement("div");
  nombre.className = "item__nombre";
  if (r.completo) {
    nombre.textContent =
      r.boxes + (r.boxes === 1 ? " box de " : " boxes de ") +
      r.nombre.toLowerCase() + " (" + r.suma + "u)";
  } else {
    // Aún no cierra el box: lo mostramos igual, el cartel de abajo avisa.
    nombre.textContent = r.nombre + " (" + r.suma + "u, falta completar)";
  }
  texto.appendChild(nombre);

  // Detalle por sabor, una línea por cada uno con su subtotal.
  const detalle = document.createElement("div");
  detalle.className = "item__detalle";
  r.items.forEach(function (it) {
    const fila = document.createElement("div");
    fila.textContent =
      it.cantidad + "x " + it.nombre + " — " + formatearPrecio(it.subtotal);
    detalle.appendChild(fila);
  });
  texto.appendChild(detalle);

  item.appendChild(texto);

  const linea = document.createElement("span");
  linea.className = "item__linea";
  linea.textContent = formatearPrecio(r.subtotal);
  item.appendChild(linea);

  const quitarBtn = document.createElement("button");
  quitarBtn.className = "item__quitar";
  quitarBtn.textContent = "×";
  quitarBtn.setAttribute("aria-label", "Quitar " + r.nombre.toLowerCase());
  quitarBtn.addEventListener("click", function () {
    quitarCategoria(catId);
  });
  item.appendChild(quitarBtn);

  return item;
}

/* ---------- 7) ENVIAR POR WHATSAPP ---------- */

function enviarPorWhatsapp() {
  if (contarItems() === 0) return;

  // Segunda barrera: si algún box no cierra (ej. 15 bocaditos), no armamos ni
  // enviamos el mensaje. El panel ya avisa cuánto falta.
  if (validarBoxes().length > 0) return;

  // Armamos el texto del mensaje línea por línea.
  const lineas = [];
  lineas.push(config.whatsapp.mensaje_saludo); // saludo configurable (config.json)
  lineas.push(""); // línea en blanco

  // Productos sueltos (los que no son de box): una línea por producto.
  for (const id in carrito) {
    const producto = productosPorId[id];
    if (esCategoriaBox(producto.categoria)) continue; // se agrupan abajo
    const cantidad = carrito[id];
    const subtotal = producto.precio * cantidad;
    // Ejemplo: "2x Tarta de Nuez - $90.000"
    lineas.push(
      cantidad + "x " + producto.nombre + " - " + formatearPrecio(subtotal),
    );
  }

  // Categorías de box (ej. bocaditos): un encabezado con el total del box y
  // debajo el detalle por sabor con su subtotal. Ejemplo:
  //   1 box de bocaditos (20u) - $21.000
  //     • 10x Rogelitos - $9.500
  //     • 5x Brownie - $4.000
  for (const catId in reglasPorCategoria) {
    if (!esCategoriaBox(catId)) continue;
    const r = resumenBox(catId);
    if (r.suma === 0) continue;
    lineas.push(
      r.boxes + (r.boxes === 1 ? " box de " : " boxes de ") +
      r.nombre.toLowerCase() + " (" + r.suma + "u) - " + formatearPrecio(r.subtotal),
    );
    r.items.forEach(function (it) {
      lineas.push(
        "  • " + it.cantidad + "x " + it.nombre + " - " + formatearPrecio(it.subtotal),
      );
    });
  }

  lineas.push(""); // línea en blanco
  lineas.push("Total: " + formatearPrecio(calcularTotal()));

  // Unimos con saltos de línea y codificamos para que viaje bien en la URL.
  const mensaje = encodeURIComponent(lineas.join("\n"));
  const url = "https://wa.me/" + config.whatsapp.numero + "?text=" + mensaje;

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
