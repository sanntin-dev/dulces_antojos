/* ============================================================
   Dulces Antojos — lógica de la app (JavaScript vanilla)

   Cómo está organizado este archivo:
   1. Configuración (se lee de config.json: número de WhatsApp, saludo)
   2. Estado en memoria (el carrito y los boxes)
   3. Arranque: leer productos.json y dibujar todo
   4. Dibujar chips y secciones de productos
   5. Carrito de productos sueltos (sumar / restar / quitar)
   6. Armador de boxes de bocaditos (Variedad / Mixto)
   7. Panel del pedido (abrir / cerrar / dibujar)
   8. Enviar por WhatsApp
   9. Scrollspy + visor de fotos + utilidades

   Está comentado a propósito para que puedas tocar cosas sueltas
   sin ser programador. Buscá el número de comentario que te interese.
   ============================================================ */

/* ---------- 1) CONFIGURACIÓN ---------- */

// La configuración vive en el archivo "config.json", así la podés editar sin
// tocar este código. Acá solo dejamos valores por defecto, por si no se pudiera
// leer el archivo.
let config = {
  whatsapp: {
    numero: "",
    mensaje_saludo: "¡Hola! Quiero hacer este pedido:",
  },
};

/* ---------- 2) ESTADO EN MEMORIA ---------- */

// Productos sueltos (tartas, galletas, etc.): { idProducto: cantidad }
// Ejemplo: { "rogel": 2, "lemon-pie": 1 }
// No se guarda en ningún lado: si recargás la página, se vacía.
let carrito = {};

// Boxes de bocaditos ya armados. Cada box es una cosa aparte, con su tipo:
//   { tipo: "variedad" }                            -> 4 de cada sabor (las 5)
//   { tipo: "mixto", sabores: ["rogelitos","coco"] } -> 10 y 10 de 2 sabores
// El total de cada box siempre cierra en 20 (no hace falta validar nada).
let boxesBocaditos = [];

// Índice plano de todos los productos por id, para buscar nombre/precio rápido.
let productosPorId = {};

// La categoría de bocaditos (con su config: unidadesPorBox y tiposBox). Se
// reconoce porque trae "tiposBox" en el JSON. Se llena al cargar el catálogo.
let categoriaBocaditos = null;

// Sabores elegidos en el armador del box mixto (uno por cada desplegable).
// Ej: ["rogelitos", null] mientras se está eligiendo el segundo.
let mixtoSel = [];

// Tipo de box elegido en la galería de cuadrados (ej. "variedad" o "mixto").
let tipoSel = null;

/* ---------- 3) ARRANQUE ---------- */

document.addEventListener("DOMContentLoaded", iniciar);

async function iniciar() {
  const estado = document.getElementById("estado");

  try {
    // Configuración (número de WhatsApp, etc.). Si falla, seguimos con los
    // valores por defecto de arriba.
    try {
      const respConfig = await fetch("datos/config.json");
      if (respConfig.ok) {
        config = Object.assign(config, await respConfig.json());
      }
    } catch (e) {
      console.warn("No se pudo leer config.json, uso valores por defecto.", e);
    }

    configurarRedes();

    const respuesta = await fetch("datos/productos.json");
    if (!respuesta.ok) throw new Error("No se pudo leer productos.json");

    const datos = await respuesta.json();
    if (!datos.categorias || datos.categorias.length === 0) {
      throw new Error("El catálogo está vacío");
    }

    dibujarCatalogo(datos.categorias);
    conectarPanel();
  } catch (error) {
    console.error(error);
    estado.textContent = "No se pudo cargar el catálogo.";
  }
}

// Completa los íconos de redes con los datos del config.
function configurarRedes() {
  const whatsapp = document.getElementById("redWhatsapp");
  const instagram = document.getElementById("redInstagram");

  if (config.whatsapp && config.whatsapp.numero) {
    whatsapp.href = "https://wa.me/" + config.whatsapp.numero;
  } else {
    whatsapp.hidden = true;
  }

  if (config.redes && config.redes.instagram) {
    instagram.href = config.redes.instagram;
  } else {
    instagram.hidden = true;
  }
}

/* ---------- 4) DIBUJAR CHIPS Y SECCIONES ---------- */

function dibujarCatalogo(categorias) {
  const chipsCont = document.getElementById("chips");
  const catalogo = document.getElementById("catalogo");
  catalogo.innerHTML = "";

  categorias.forEach(function (categoria) {
    // Solo productos activos (activo === 1, o sin el campo).
    const activos = categoria.productos.filter(function (p) {
      return p.activo !== 0;
    });
    if (activos.length === 0) return;

    // --- Chip de la categoría ---
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.textContent = categoria.nombre;
    chip.dataset.target = "seccion-" + categoria.id;
    chip.addEventListener("click", function () {
      document
        .getElementById("seccion-" + categoria.id)
        .scrollIntoView({ behavior: "smooth", block: "start" });
    });
    chipsCont.appendChild(chip);

    // --- Sección de la categoría ---
    const seccion = document.createElement("section");
    seccion.className = "seccion";
    seccion.id = "seccion-" + categoria.id;

    const titulo = document.createElement("h2");
    titulo.className = "seccion__titulo";
    titulo.textContent = categoria.nombre;
    seccion.appendChild(titulo);

    if (categoria.nota) {
      const nota = document.createElement("p");
      nota.className = "seccion__nota";
      nota.textContent = categoria.nota;
      seccion.appendChild(nota);
    }

    // Indexamos los productos (estampando su categoría) para usarlos después.
    activos.forEach(function (p) {
      p.categoria = categoria.id;
      productosPorId[p.id] = p;
    });

    // ¿Es la categoría de bocaditos? (trae "tiposBox"). En ese caso dibujamos
    // el armador de boxes en vez de las tarjetas de producto sueltas.
    if (categoria.tiposBox) {
      categoriaBocaditos = categoria;
      dibujarArmadorBoxes(seccion);
    } else {
      activos.forEach(function (p) {
        seccion.appendChild(crearCard(p));
      });
    }

    catalogo.appendChild(seccion);
  });

  activarScrollspy();
  ajustarAlturaChips();
  window.addEventListener("resize", ajustarAlturaChips);
}

// Guarda la altura real de la barra de chips en --altura-chips (la usa el CSS).
function ajustarAlturaChips() {
  const chips = document.getElementById("chips");
  if (!chips) return;
  document.documentElement.style.setProperty(
    "--altura-chips",
    chips.offsetHeight + "px",
  );
}

// Crea la card horizontal de un producto suelto (tartas, galletas, etc.).
function crearCard(producto) {
  const card = document.createElement("div");
  card.className = "card";

  const img = document.createElement("img");
  img.className = "card__foto";
  img.src = producto.imagen;
  img.alt = producto.nombre;
  img.loading = "lazy";
  img.onerror = function () {
    img.replaceWith(crearPlaceholder());
  };
  img.addEventListener("click", function () {
    abrirVisor(producto.imagen, producto.nombre);
  });
  card.appendChild(img);

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

  const fila = document.createElement("div");
  fila.className = "card__fila";

  const precio = document.createElement("span");
  precio.className = "card__precio";
  precio.textContent = formatearPrecio(producto.precio);
  fila.appendChild(precio);

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

/* ---------- 5) CARRITO DE PRODUCTOS SUELTOS ---------- */

// Control de cantidad de un producto suelto:
// - cantidad 0  -> solo "+"
// - cantidad >0 -> "–", número, "+"  (de a uno)
function crearControlCantidad(idProducto) {
  const cant = document.createElement("div");
  cant.className = "cant";
  cant.dataset.id = idProducto;

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

function sumar(idProducto) {
  carrito[idProducto] = (carrito[idProducto] || 0) + 1;
  refrescarControl(idProducto);
  refrescarBurbuja();
  if (!document.getElementById("sheet").hidden) dibujarPedido();
}

function restar(idProducto) {
  if (!carrito[idProducto]) return;
  carrito[idProducto] -= 1;
  if (carrito[idProducto] <= 0) delete carrito[idProducto];
  refrescarControl(idProducto);
  refrescarBurbuja();
  if (!document.getElementById("sheet").hidden) dibujarPedido();
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
  if (viejo) viejo.replaceWith(crearControlCantidad(idProducto));
}

/* ---------- 6) ARMADOR DE BOXES DE BOCADITOS ---------- */

// Tamaño del box (ej. 20).
function unidadesPorBox() {
  return (categoriaBocaditos && categoriaBocaditos.unidadesPorBox) || 20;
}

// Sabores activos de la categoría de bocaditos.
function saboresBocaditos() {
  if (!categoriaBocaditos) return [];
  return categoriaBocaditos.productos.filter(function (p) {
    return p.activo !== 0;
  });
}

// Config de un tipo de box (variedad / mixto) por su id.
function tipoPorId(idTipo) {
  return categoriaBocaditos.tiposBox.find(function (t) {
    return t.id === idTipo;
  });
}

// ¿Es un box "a definir" (personalizado, sin precio fijo)? Se cotiza después
// por WhatsApp.
function esADefinir(box) {
  const t = tipoPorId(box.tipo);
  return !!(t && t.definirDespues);
}

// Devuelve el contenido de un box: lista de { id, nombre, precio, cantidad }.
//  - Con "sabores" (mixto, un solo sabor): reparte el total entre esos sabores
//    (ej. 20 / 2 = 10 y 10; o 20 / 1 = 20).
//  - Sin "sabores" (variedad): reparte entre TODOS los sabores (ej. 20 / 5 = 4).
//  - Personalizado (a definir): no tiene contenido fijo, devuelve vacío.
function contenidoDeBox(box) {
  if (esADefinir(box)) return [];

  const total = unidadesPorBox();
  const ids = box.sabores
    ? box.sabores.slice()
    : saboresBocaditos().map(function (s) {
        return s.id;
      });

  const por = Math.floor(total / ids.length);
  return ids.map(function (id, i) {
    const p = productosPorId[id];
    // Si el total no se reparte exacto, el resto se suma al primer sabor.
    const extra = i === 0 ? total - por * ids.length : 0;
    return {
      id: id,
      nombre: p.nombre,
      precio: p.precio,
      cantidad: por + extra,
    };
  });
}

// Precio total de un box (0 si es a definir, así no suma al total del pedido).
function precioDeBox(box) {
  if (esADefinir(box)) return 0;
  return contenidoDeBox(box).reduce(function (acc, it) {
    return acc + it.precio * it.cantidad;
  }, 0);
}

// Precio del box para mostrar: "A definir" si es personalizado, o el precio.
function precioTextoDeBox(box) {
  return esADefinir(box) ? "A definir" : formatearPrecio(precioDeBox(box));
}

// Nombre del tipo de un box ("Variedad" / "Mixto").
function nombreTipoDeBox(box) {
  const t = tipoPorId(box.tipo);
  return t ? t.nombre : box.tipo;
}

// Dibuja el armador completo dentro de la sección de bocaditos:
//   1. la galería de tipos de box en cuadrados grandes (arriba),
//   2. la configuración del tipo elegido (precio + Agregar, y los sabores si es
//      mixto),
//   3. la lista de boxes ya agregados (abajo).
function dibujarArmadorBoxes(seccion) {
  mixtoSel = [];
  tipoSel = categoriaBocaditos.tiposBox[0].id; // arranca con el primero elegido

  // 1. Vitrina: las fotos de los sabores en grande, para ver "lo que hay".
  const vitrina = document.createElement("div");
  vitrina.className = "vitrina";
  vitrina.id = "vitrina";
  seccion.appendChild(vitrina);
  dibujarVitrina(vitrina);

  // 2. Subtítulo + galería de tipos de box.
  const sub = document.createElement("h3");
  sub.className = "armador__sub";
  sub.textContent = "Armá tu box";
  seccion.appendChild(sub);

  const cuadros = document.createElement("div");
  cuadros.className = "box-cuadros";
  cuadros.id = "box-cuadros";
  seccion.appendChild(cuadros);

  const lista = document.createElement("div");
  lista.className = "boxes-lista";
  lista.id = "boxes-lista";
  seccion.appendChild(lista);

  // El panel de configuración se crea e inserta DENTRO de la grilla, justo
  // debajo de la fila del cuadrado elegido (lo arma dibujarCuadros).
  dibujarCuadros(cuadros);
  refrescarBoxesLista(lista);
}

// (Re)dibuja la vitrina de sabores: una grilla con las fotos en grande y el
// nombre debajo. Al tocar una, se abre en grande (visor). Es solo para mostrar;
// los sabores se eligen después al armar el box.
function dibujarVitrina(cont) {
  cont = cont || document.getElementById("vitrina");
  if (!cont) return;
  cont.innerHTML = "";
  saboresBocaditos().forEach(function (s) {
    const item = document.createElement("div");
    item.className = "vitrina__item";

    const img = document.createElement("img");
    img.className = "vitrina__foto";
    img.src = s.imagen;
    img.alt = s.nombre;
    img.loading = "lazy";
    img.onerror = function () {
      const ph = document.createElement("div");
      ph.className = "vitrina__foto vitrina__foto--ph";
      img.replaceWith(ph);
    };
    img.addEventListener("click", function () {
      abrirVisor(s.imagen, s.nombre);
    });
    item.appendChild(img);

    const nombre = document.createElement("span");
    nombre.className = "vitrina__nombre";
    nombre.textContent = s.nombre;
    item.appendChild(nombre);

    cont.appendChild(item);
  });
}

// (Re)dibuja la galería de tipos de box en cuadrados, e inserta el panel de
// configuración (precio + Agregar, y sabores si hace falta) justo debajo de la
// fila del cuadrado elegido. La grilla es de 2 columnas.
function dibujarCuadros(cont) {
  cont = cont || document.getElementById("box-cuadros");
  if (!cont) return;
  cont.innerHTML = "";

  const tipos = categoriaBocaditos.tiposBox;
  const columnas = 2;
  const elegido = Math.max(
    0,
    tipos.findIndex(function (t) {
      return t.id === tipoSel;
    }),
  );
  // Cantidad de cuadrados que van ANTES del panel (hasta cerrar la fila del
  // elegido). Ej. con 2 columnas: si elegís el 1° o 2°, el panel va tras el 2°.
  const cuadrosAntes = (Math.floor(elegido / columnas) + 1) * columnas;

  const config = document.createElement("div");
  config.className = "box-config";
  config.id = "box-config";

  tipos.forEach(function (tipo, i) {
    cont.appendChild(crearCuadroTipo(tipo));
    if (i + 1 === cuadrosAntes) cont.appendChild(config);
  });
  // Si el elegido está en la última fila (incompleta), el panel todavía no se
  // insertó: va al final.
  if (!config.parentElement) cont.appendChild(config);

  dibujarConfig(config);
}

// Un cuadrado grande de la galería: foto (collage), nombre y descripción.
// Al tocarlo, queda elegido y abajo aparece su configuración.
function crearCuadroTipo(tipo) {
  const cuadro = document.createElement("button");
  cuadro.type = "button";
  cuadro.className =
    "box-cuadro" + (tipo.id === tipoSel ? " box-cuadro--on" : "");

  cuadro.appendChild(crearFotoBox(tipo));

  // Globito "+" para que se entienda que al tocar se agrega un box de ese tipo.
  const mas = document.createElement("span");
  mas.className = "box-cuadro__mas";
  mas.textContent = "+";
  mas.setAttribute("aria-hidden", "true");
  cuadro.appendChild(mas);

  const cap = document.createElement("div");
  cap.className = "box-cuadro__cap";
  const nombre = document.createElement("span");
  nombre.className = "box-cuadro__nombre";
  nombre.textContent = "Box " + tipo.nombre;
  cap.appendChild(nombre);
  const desc = document.createElement("span");
  desc.className = "box-cuadro__desc";
  desc.textContent = tipo.descripcion;
  cap.appendChild(desc);
  cuadro.appendChild(cap);

  cuadro.addEventListener("click", function () {
    tipoSel = tipo.id;
    mixtoSel = []; // al cambiar de tipo, arrancamos la elección de cero
    dibujarCuadros();
    dibujarConfig();
  });

  return cuadro;
}

// Imagen del cuadrado del tipo de box. Por ahora todos comparten una sola foto
// ("imagenBox" de la categoría). Cada tipo puede tener la suya propia más
// adelante con "imagen". Si ninguna existe, caemos a la del primer sabor; y si
// esa tampoco está, mostramos el placeholder lavanda.
function crearFotoBox(tipo) {
  const sabores = saboresBocaditos();
  const respaldo = (sabores[0] && sabores[0].imagen) || "";
  const fotoBox = tipo.imagen || categoriaBocaditos.imagenBox || respaldo;

  const wrap = document.createElement("div");
  wrap.className = "box-cuadro__foto";

  const img = document.createElement("img");
  img.src = fotoBox;
  img.alt = "";
  img.loading = "lazy";
  img.onerror = function () {
    // Primero probamos con la foto de respaldo (la del primer sabor).
    if (img.dataset.respaldo !== "1" && respaldo && img.src.indexOf(respaldo) === -1) {
      img.dataset.respaldo = "1";
      img.src = respaldo;
      return;
    }
    // Si tampoco carga, dejamos el cuadro lavanda.
    wrap.classList.add("box-cuadro__foto--ph");
    img.remove();
  };
  wrap.appendChild(img);
  return wrap;
}

// (Re)dibuja la configuración del tipo de box elegido (debajo de la galería).
function dibujarConfig(cont) {
  cont = cont || document.getElementById("box-config");
  if (!cont) return;
  cont.innerHTML = "";
  cont.appendChild(crearConfigTipo(tipoPorId(tipoSel)));
}

// Configuración del tipo elegido: si es mixto, los desplegables de sabores;
// siempre, el precio del box y el botón Agregar.
function crearConfigTipo(tipo) {
  const panel = document.createElement("div");
  panel.className = "box-config__panel";

  const eligeSabores = !!tipo.cantidadSabores;
  const aDefinir = !!tipo.definirDespues;

  if (eligeSabores) {
    // Aseguramos que mixtoSel tenga un lugar por cada sabor a elegir.
    while (mixtoSel.length < tipo.cantidadSabores) mixtoSel.push(null);

    const label = document.createElement("p");
    label.className = "box-config__label";
    label.textContent =
      "Elegí " +
      (tipo.cantidadSabores === 1 ? "1 sabor" : tipo.cantidadSabores + " sabores");
    panel.appendChild(label);

    const picker = document.createElement("div");
    picker.className = "box-tipo__picker";
    for (let i = 0; i < tipo.cantidadSabores; i++) {
      picker.appendChild(crearDropdownSabor(i));
    }
    panel.appendChild(picker);
  } else if (aDefinir) {
    // Personalizado: no se elige nada acá, se charla por WhatsApp.
    const nota = document.createElement("p");
    nota.className = "box-config__nota";
    nota.textContent =
      "El precio y el armado los definimos por WhatsApp cuando hagas el pedido.";
    panel.appendChild(nota);
  }

  // Pie: precio del box + botón Agregar.
  const pie = document.createElement("div");
  pie.className = "box-tipo__pie";

  // El box queda listo para agregar si: es a definir, o no elige sabores
  // (variedad), o ya eligió todos los sabores.
  const completo = aDefinir || !eligeSabores || mixtoCompleto(tipo);

  const precio = document.createElement("span");
  precio.className = "box-tipo__precio";
  if (aDefinir) {
    precio.textContent = "A definir";
  } else if (completo) {
    precio.textContent = formatearPrecio(precioDeBox(boxDeTipo(tipo)));
  } else {
    precio.textContent = "";
  }
  pie.appendChild(precio);

  const btn = document.createElement("button");
  btn.className = "box-agregar";
  btn.textContent = "Agregar box " + tipo.nombre.toLowerCase();
  btn.disabled = !completo;
  btn.addEventListener("click", function () {
    agregarBox(boxDeTipo(tipo));
  });
  pie.appendChild(btn);

  panel.appendChild(pie);
  return panel;
}

// Arma el objeto box a partir de un tipo (usa mixtoSel para el mixto).
function boxDeTipo(tipo) {
  if (tipo.cantidadSabores) {
    return { tipo: tipo.id, sabores: mixtoSel.slice(0, tipo.cantidadSabores) };
  }
  return { tipo: tipo.id };
}

// ¿Ya se eligieron todos los sabores del mixto?
function mixtoCompleto(tipo) {
  for (let i = 0; i < tipo.cantidadSabores; i++) {
    if (!mixtoSel[i]) return false;
  }
  return true;
}

// Un desplegable (con miniatura) para elegir el sabor del lugar "i" del mixto.
function crearDropdownSabor(i) {
  const dd = document.createElement("div");
  dd.className = "dd";

  const elegido = mixtoSel[i] ? productosPorId[mixtoSel[i]] : null;

  // Botón que muestra el sabor elegido (o el placeholder) y abre el menú.
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "dd__toggle";
  if (elegido) {
    toggle.appendChild(crearThumb(elegido));
    const txt = document.createElement("span");
    txt.className = "dd__txt";
    txt.textContent = elegido.nombre;
    toggle.appendChild(txt);
  } else {
    const txt = document.createElement("span");
    txt.className = "dd__txt dd__txt--placeholder";
    txt.textContent = "Elegí un sabor…";
    toggle.appendChild(txt);
  }
  const chev = document.createElement("span");
  chev.className = "dd__chev";
  chev.textContent = "▾";
  toggle.appendChild(chev);

  toggle.addEventListener("click", function (e) {
    e.stopPropagation();
    // Cerramos cualquier otro desplegable abierto.
    document.querySelectorAll(".dd--abierto").forEach(function (otro) {
      if (otro !== dd) otro.classList.remove("dd--abierto");
    });
    dd.classList.toggle("dd--abierto");
  });
  dd.appendChild(toggle);

  // Menú con todos los sabores (sacando los ya elegidos en OTRO desplegable).
  const menu = document.createElement("div");
  menu.className = "dd__menu";
  saboresBocaditos().forEach(function (s) {
    const usadoEnOtro = mixtoSel.some(function (sel, j) {
      return j !== i && sel === s.id;
    });
    if (usadoEnOtro) return;

    const opt = document.createElement("button");
    opt.type = "button";
    opt.className = "dd__opt";
    opt.appendChild(crearThumb(s));
    const txt = document.createElement("span");
    txt.className = "dd__txt";
    txt.textContent = s.nombre;
    opt.appendChild(txt);
    opt.addEventListener("click", function () {
      mixtoSel[i] = s.id;
      dibujarConfig();
    });
    menu.appendChild(opt);
  });
  dd.appendChild(menu);

  return dd;
}

// Miniatura cuadrada de un sabor (con placeholder si falta la foto).
function crearThumb(producto) {
  const img = document.createElement("img");
  img.className = "thumb";
  img.src = producto.imagen;
  img.alt = producto.nombre;
  img.loading = "lazy";
  img.onerror = function () {
    const ph = document.createElement("div");
    ph.className = "thumb thumb--ph";
    img.replaceWith(ph);
  };
  return img;
}

// Agrega un box al pedido y refresca todo.
function agregarBox(box) {
  boxesBocaditos.push(box);
  mixtoSel = [];
  dibujarCuadros();
  dibujarConfig();
  refrescarBoxesLista();
  refrescarBurbuja();
  if (!document.getElementById("sheet").hidden) dibujarPedido();
}

// Quita el box número "indice" de la lista.
function quitarBox(indice) {
  boxesBocaditos.splice(indice, 1);
  refrescarBoxesLista();
  refrescarBurbuja();
  if (!document.getElementById("sheet").hidden) dibujarPedido();
}

// (Re)dibuja la lista de boxes ya agregados, debajo de los paneles de tipo.
function refrescarBoxesLista(lista) {
  lista = lista || document.getElementById("boxes-lista");
  if (!lista) return;
  lista.innerHTML = "";

  if (boxesBocaditos.length === 0) return;

  const titulo = document.createElement("p");
  titulo.className = "boxes-lista__titulo";
  titulo.textContent =
    boxesBocaditos.length === 1
      ? "1 box agregado"
      : boxesBocaditos.length + " boxes agregados";
  lista.appendChild(titulo);

  boxesBocaditos.forEach(function (box, i) {
    lista.appendChild(crearBoxAgregado(box, i));
  });
}

// Tarjetita de un box ya agregado: tipo, surtido, precio y botón quitar.
function crearBoxAgregado(box, indice) {
  const item = document.createElement("div");
  item.className = "box-item";

  const texto = document.createElement("div");
  texto.className = "box-item__texto";

  const nombre = document.createElement("div");
  nombre.className = "box-item__nombre";
  nombre.textContent =
    "Box " + (indice + 1) + " · " + nombreTipoDeBox(box) +
    (esADefinir(box) ? "" : " (" + unidadesPorBox() + "u)");
  texto.appendChild(nombre);

  const detalle = document.createElement("div");
  detalle.className = "box-item__detalle";
  detalle.textContent = esADefinir(box)
    ? "A definir por WhatsApp"
    : contenidoDeBox(box)
        .map(function (it) {
          return it.cantidad + "x " + it.nombre;
        })
        .join(" · ");
  texto.appendChild(detalle);

  item.appendChild(texto);

  const precio = document.createElement("span");
  precio.className = "box-item__precio";
  precio.textContent = precioTextoDeBox(box);
  item.appendChild(precio);

  const quitarBtn = document.createElement("button");
  quitarBtn.className = "item__quitar";
  quitarBtn.textContent = "×";
  quitarBtn.setAttribute("aria-label", "Quitar box " + (indice + 1));
  quitarBtn.addEventListener("click", function () {
    quitarBox(indice);
  });
  item.appendChild(quitarBtn);

  return item;
}

/* ---------- BARRA FIJA DE ABAJO ---------- */

// Actualiza la barra fija (cantidad + total) y la muestra u oculta.
function refrescarBurbuja() {
  const barra = document.getElementById("barraPedido");
  const cantEl = document.getElementById("barraCant");
  const totalEl = document.getElementById("barraTotal");
  const cantidad = contarItems();

  cantEl.textContent = cantidad + (cantidad === 1 ? " producto" : " productos");
  totalEl.textContent = formatearPrecio(calcularTotal());

  barra.hidden = cantidad === 0;
}

// Cuenta unidades: productos sueltos + las de cada box (ej. 20 por box).
function contarItems() {
  let total = 0;
  for (const id in carrito) total += carrito[id];
  total += boxesBocaditos.length * unidadesPorBox();
  return total;
}

// Precio total del pedido: productos sueltos + boxes.
function calcularTotal() {
  let total = 0;
  for (const id in carrito) total += productosPorId[id].precio * carrito[id];
  boxesBocaditos.forEach(function (box) {
    total += precioDeBox(box);
  });
  return total;
}

/* ---------- 7) PANEL DEL PEDIDO ---------- */

function conectarPanel() {
  document.getElementById("barraVerPedido").addEventListener("click", abrirPanel);
  document.getElementById("sheetCerrar").addEventListener("click", cerrarPanel);
  document.getElementById("overlay").addEventListener("click", cerrarPanel);
  document.getElementById("btnWhatsapp").addEventListener("click", enviarPorWhatsapp);

  document.getElementById("visor").addEventListener("click", cerrarVisor);
  document.getElementById("visorCerrar").addEventListener("click", cerrarVisor);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") cerrarVisor();
  });

  // Cerrar los desplegables del mixto al tocar fuera de ellos.
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".dd")) {
      document.querySelectorAll(".dd--abierto").forEach(function (dd) {
        dd.classList.remove("dd--abierto");
      });
    }
  });
}

/* ---------- VISOR DE FOTOS (lightbox) ---------- */

function abrirVisor(src, alt) {
  const visor = document.getElementById("visor");
  const img = document.getElementById("visorImg");
  img.src = src;
  img.alt = alt || "";
  visor.hidden = false;
  bloquearScrollFondo(true);
}

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
  const vacio = ids.length === 0 && boxesBocaditos.length === 0;

  if (vacio) {
    const p = document.createElement("p");
    p.className = "sheet__vacio";
    p.textContent = "Todavía no agregaste nada.";
    cont.appendChild(p);
    totalEl.textContent = formatearPrecio(0);
    btn.disabled = true;
    return;
  }

  btn.disabled = false;

  // Productos sueltos: una línea por producto.
  ids.forEach(function (id) {
    cont.appendChild(crearLineaSuelto(id));
  });

  // Boxes de bocaditos: una línea por box.
  boxesBocaditos.forEach(function (box, i) {
    cont.appendChild(crearLineaBox(box, i + 1, i));
  });

  totalEl.textContent = formatearPrecio(calcularTotal());
}

// Línea de un producto suelto en el pedido.
function crearLineaSuelto(id) {
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

  return item;
}

// Línea de un box en el pedido. Ej:
//   "Box 1 · Variedad (20u)" + "4x Rogelitos — $3.800 / 4x Brownie — …"
function crearLineaBox(box, numero, indice) {
  const item = document.createElement("div");
  item.className = "item";

  const texto = document.createElement("div");
  texto.className = "item__texto";

  const nombre = document.createElement("div");
  nombre.className = "item__nombre";
  nombre.textContent =
    "Box " + numero + " · " + nombreTipoDeBox(box) +
    (esADefinir(box) ? "" : " (" + unidadesPorBox() + "u)");
  texto.appendChild(nombre);

  const detalle = document.createElement("div");
  detalle.className = "item__detalle";
  if (esADefinir(box)) {
    const fila = document.createElement("div");
    fila.textContent = "A definir por WhatsApp";
    detalle.appendChild(fila);
  } else {
    contenidoDeBox(box).forEach(function (it) {
      const fila = document.createElement("div");
      fila.textContent =
        it.cantidad + "x " + it.nombre + " — " +
        formatearPrecio(it.precio * it.cantidad);
      detalle.appendChild(fila);
    });
  }
  texto.appendChild(detalle);

  item.appendChild(texto);

  const linea = document.createElement("span");
  linea.className = "item__linea";
  linea.textContent = precioTextoDeBox(box);
  item.appendChild(linea);

  const quitarBtn = document.createElement("button");
  quitarBtn.className = "item__quitar";
  quitarBtn.textContent = "×";
  quitarBtn.setAttribute("aria-label", "Quitar box " + numero);
  quitarBtn.addEventListener("click", function () {
    quitarBox(indice);
  });
  item.appendChild(quitarBtn);

  return item;
}

/* ---------- 8) ENVIAR POR WHATSAPP ---------- */

function enviarPorWhatsapp() {
  if (contarItems() === 0) return;

  const lineas = [];
  lineas.push(config.whatsapp.mensaje_saludo);
  lineas.push("");

  // Productos sueltos.
  for (const id in carrito) {
    const producto = productosPorId[id];
    const cantidad = carrito[id];
    const subtotal = producto.precio * cantidad;
    lineas.push(
      cantidad + "x " + producto.nombre + " - " + formatearPrecio(subtotal),
    );
  }

  // Boxes: un encabezado por box y debajo su detalle por sabor.
  //   Box 1 · Variedad (20u) - $X
  //     • 4x Rogelitos - $3.800
  boxesBocaditos.forEach(function (box, i) {
    if (esADefinir(box)) {
      lineas.push(
        "Box " + (i + 1) + " · " + nombreTipoDeBox(box) + " - A definir",
      );
      lineas.push("  • Lo definimos por acá");
      return;
    }
    lineas.push(
      "Box " + (i + 1) + " · " + nombreTipoDeBox(box) +
      " (" + unidadesPorBox() + "u) - " + formatearPrecio(precioDeBox(box)),
    );
    contenidoDeBox(box).forEach(function (it) {
      lineas.push(
        "  • " + it.cantidad + "x " + it.nombre + " - " +
        formatearPrecio(it.precio * it.cantidad),
      );
    });
  });

  lineas.push("");
  lineas.push("Total: " + formatearPrecio(calcularTotal()));

  const mensaje = encodeURIComponent(lineas.join("\n"));
  const url = "https://wa.me/" + config.whatsapp.numero + "?text=" + mensaje;
  window.open(url, "_blank");
}

/* ---------- 9) SCROLLSPY + UTILIDADES ---------- */

function activarScrollspy() {
  const secciones = document.querySelectorAll(".seccion");

  const observer = new IntersectionObserver(
    function (entradas) {
      entradas.forEach(function (entrada) {
        if (entrada.isIntersecting) marcarChipActivo(entrada.target.id);
      });
    },
    { rootMargin: "-80px 0px -70% 0px", threshold: 0 },
  );

  secciones.forEach(function (seccion) {
    observer.observe(seccion);
  });
}

function marcarChipActivo(idSeccion) {
  const chips = document.querySelectorAll(".chip");
  chips.forEach(function (chip) {
    const activo = chip.dataset.target === idSeccion;
    chip.classList.toggle("chip--activo", activo);
    if (activo) {
      chip.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  });
}

// 45000 -> "$45.000"
function formatearPrecio(numero) {
  return "$" + numero.toLocaleString("es-AR");
}
