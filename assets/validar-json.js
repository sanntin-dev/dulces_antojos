/* ============================================================
   Validador de los archivos JSON antes de publicar en Vercel.

   Qué hace: revisa que "config.json" y "productos.json" estén bien
   escritos (que sean JSON válidos y tengan lo mínimo que la app necesita).

   - Si está todo OK: termina bien y Vercel publica la nueva versión.
   - Si algo está roto: termina con error y Vercel CANCELA el deploy,
     dejando online la última versión que funcionaba. Así, si alguien
     edita un JSON y se le escapa una coma, el sitio NO se rompe.

   También lo podés correr vos en tu compu antes de pushear, con:
       node assets/validar-json.js
   ============================================================ */

const fs = require("fs");

let huboError = false;

// Pequeña ayuda para reportar un problema y marcar que algo salió mal.
function error(mensaje) {
  console.error("  ✗ " + mensaje);
  huboError = true;
}

// Lee un archivo y lo convierte de JSON a objeto. Si falla, avisa con claridad.
function leerJSON(archivo) {
  let texto;
  try {
    texto = fs.readFileSync(archivo, "utf8");
  } catch (e) {
    error("No se encontró el archivo " + archivo);
    return null;
  }
  try {
    return JSON.parse(texto);
  } catch (e) {
    // El mensaje de JSON.parse suele decir en qué posición está el problema.
    error(archivo + " no es un JSON válido (revisá comas y comillas): " + e.message);
    return null;
  }
}

console.log("Validando archivos JSON…\n");

/* ---------- config.json ---------- */
console.log("config.json:");
const config = leerJSON("datos/config.json");
if (config) {
  if (!config.whatsapp || !config.whatsapp.numero) {
    error('config.json: falta "whatsapp" con un "numero" adentro.');
  } else {
    console.log("  ✓ ok");
  }
}

/* ---------- productos.json ---------- */
console.log("productos.json:");
const productos = leerJSON("datos/productos.json");
if (productos) {
  if (!Array.isArray(productos.categorias) || productos.categorias.length === 0) {
    error('productos.json: tiene que tener una lista "categorias" con al menos una categoría.');
  } else {
    // Chequeo simple de cada producto: que tenga nombre y precio numérico.
    productos.categorias.forEach(function (cat) {
      if (!Array.isArray(cat.productos)) {
        error('La categoría "' + (cat.id || cat.nombre || "?") + '" no tiene lista de productos.');
        return;
      }
      // Si la categoría define un tamaño de box o una cantidad por click, tienen
      // que ser números positivos (ej. bocaditos: "unidadesPorBox": 20, "cantidadPorClick": 5).
      const nombreCat = cat.nombre || cat.id || "?";
      if ("unidadesPorBox" in cat && !(typeof cat.unidadesPorBox === "number" && cat.unidadesPorBox > 0)) {
        error('La categoría "' + nombreCat + '" tiene un "unidadesPorBox" que no es un número positivo.');
      }
      if ("cantidadPorClick" in cat && !(typeof cat.cantidadPorClick === "number" && cat.cantidadPorClick > 0)) {
        error('La categoría "' + nombreCat + '" tiene un "cantidadPorClick" que no es un número positivo.');
      }
      cat.productos.forEach(function (p) {
        if (!p.nombre) {
          error('Un producto de "' + (cat.nombre || cat.id) + '" no tiene "nombre".');
        }
        if (typeof p.precio !== "number") {
          error('El producto "' + (p.nombre || p.id || "?") + '" tiene un "precio" que no es un número.');
        }
      });
    });
    if (!huboError) {
      console.log("  ✓ ok");
    }
  }
}

/* ---------- Resultado final ---------- */
console.log("");
if (huboError) {
  console.error("Hay errores. Se cancela la publicación: arreglá lo de arriba y volvé a pushear.");
  process.exit(1); // <- esto es lo que hace que Vercel frene el deploy
}

console.log("Todo OK. Publicando la nueva versión. 🎂");
