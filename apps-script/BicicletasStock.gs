/* ============================================================================
   Bicicletas · stock y armado — receptor de partes en Google Drive
   ============================================================================
   Qué hace:
   - Crea (si no existe) la carpeta "Bicicletas stock" en Mi unidad.
   - Adentro, una carpeta NUEVA POR DÍA (ej. "2026-08-20"), con la fecha del
     día trabajado (no la de la subida).
   - En esa carpeta guarda tres CSV: stock-<fecha>.csv, armado-<fecha>.csv,
     movimientos-<fecha>.csv. Volver a subir el mismo día reemplaza los tres.
   - Mantiene además una planilla "Bicicletas stock (histórico)" con tres
     hojas (Stock · Armado · Movimientos) donde cada subida reemplaza las
     filas de esa fecha (por eso reintentar nunca duplica).
   - crearCarpetaDeHoy() crea la carpeta del día aunque nadie suba nada
     todavía: se dispara sola si le agregás un activador diario (ver abajo).

   Cómo instalarlo (una vez):
   1) En script.google.com → Nuevo proyecto → pegar TODO este archivo.
   2) Implementar → Nueva implementación → tipo "Aplicación web".
      Ejecutar como: Yo. Quién tiene acceso: Cualquier persona.
   3) Copiar la URL que termina en /exec y pegarla en la app, en
      Ajustes → Google Drive.

   Carpeta nueva todos los días sin depender de la app (opcional):
   En el editor → Activadores (reloj, barra izquierda) → Agregar activador →
   función a ejecutar: crearCarpetaDeHoy → tipo de evento: basado en tiempo →
   día → elegir hora. Con eso la carpeta de hoy aparece sola a la mañana.
   ============================================================================ */

var ROOT_FOLDER_NAME = 'Bicicletas stock';
var SHEET_NAME = 'Bicicletas stock (histórico)';
var TZ = 'America/Argentina/Buenos_Aires';

/* ========================= puntos de entrada ========================= */

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return respond_('falta el body del POST');
    }
    var pl = JSON.parse(e.postData.contents);
    if (!pl || pl.app !== 'bicis-stock') {
      return respond_('payload inválido (app distinto de bicis-stock)');
    }
    guardarParte_(pl);
    return respond_('ok');
  } catch (err) {
    return respond_('error: ' + (err && err.message ? err.message : err));
  }
}

function doGet(e) {
  // Lo que abre "Probar conexión" en Ajustes: sólo confirma que el
  // deployment está activo y accesible por cualquiera.
  var out = '✅ Bicicletas stock — Apps Script funcionando.\n' +
    'Este endpoint recibe partes diarios por POST desde la app y los guarda ' +
    'en Drive, en la carpeta "' + ROOT_FOLDER_NAME + '".';
  return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.TEXT);
}

function respond_(msg) {
  // El POST de la app va con mode:'no-cors', así que nunca lee esta
  // respuesta — igual la devolvemos por si se llama a mano o desde otro lado.
  return ContentService.createTextOutput(msg).setMimeType(ContentService.MimeType.TEXT);
}

/* ========================= activador diario ========================= */

function crearCarpetaDeHoy() {
  var fecha = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  getOrCreateDayFolder_(fecha);
}

/* ========================= guardar un parte ========================= */

function guardarParte_(pl) {
  var fecha = pl.fecha;
  if (!fecha) throw new Error('el parte no trae fecha');

  var dayFolder = getOrCreateDayFolder_(fecha);

  escribirArchivo_(dayFolder, 'stock-' + fecha + '.csv', csvStock_(pl));
  escribirArchivo_(dayFolder, 'armado-' + fecha + '.csv', csvArmado_(pl));
  escribirArchivo_(dayFolder, 'movimientos-' + fecha + '.csv', csvMovimientos_(pl));

  actualizarHistorico_(pl);
}

/* ========================= carpetas ========================= */

function getOrCreateRootFolder_() {
  var root = DriveApp.getRootFolder();
  return getOrCreateFolder_(root, ROOT_FOLDER_NAME);
}

function getOrCreateDayFolder_(fecha) {
  var root = getOrCreateRootFolder_();
  return getOrCreateFolder_(root, fecha);
}

function getOrCreateFolder_(parent, name) {
  var it = parent.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return parent.createFolder(name);
}

/* ========================= archivos (reemplazan si ya existen) ========================= */

function escribirArchivo_(folder, name, content) {
  var it = folder.getFilesByName(name);
  while (it.hasNext()) it.next().setTrashed(true); // reemplaza: lo anterior va a la papelera
  // BOM al inicio + CRLF, igual que los CSV que exporta la app, para que Excel los abra bien.
  folder.createFile(name, '﻿' + content, MimeType.CSV);
}

/* ========================= armado de los CSV (separador ';', igual que la app) ========================= */

function csvEsc_(v) {
  v = (v === undefined || v === null) ? '' : String(v);
  return v.replace(/;/g, ',').replace(/\r?\n/g, ' ');
}

function csvStock_(pl) {
  var L = ['sku;modelo;talle;para_armar;prearmadas;armadas;total;responsable'];
  var mods = pl.stockModelos || [];
  for (var i = 0; i < mods.length; i++) {
    var r = mods[i];
    L.push([r.sku, r.modelo, r.talle, r.par, r.pre, r.arm, (r.par + r.pre + r.arm), pl.responsable || '']
      .map(csvEsc_).join(';'));
  }
  var s = pl.stock || { par: 0, pre: 0, arm: 0 };
  L.push('TOTAL;;;' + s.par + ';' + s.pre + ';' + s.arm + ';' + (s.par + s.pre + s.arm) + ';');
  return L.join('\r\n');
}

function csvArmado_(pl) {
  var L = ['sku;modelo;talle;ingresos;prearmadas;armadas;en_caja;responsable'];
  var mods = pl.diaModelos || [];
  for (var i = 0; i < mods.length; i++) {
    var r = mods[i];
    L.push([r.sku, r.modelo, r.talle, r.ing, r.pre, r.arm, r.caj, pl.responsable || ''].map(csvEsc_).join(';'));
  }
  var t = pl.dia || { ing: 0, pre: 0, arm: 0, caj: 0 };
  L.push('TOTAL;;;' + t.ing + ';' + t.pre + ';' + t.arm + ';' + t.caj + ';');
  return L.join('\r\n');
}

function csvMovimientos_(pl) {
  var L = ['hora;tipo;sku;modelo;talle;cantidad;nota;responsable'];
  var movs = pl.movs || [];
  for (var i = 0; i < movs.length; i++) {
    var m = movs[i];
    L.push([m.hora, m.tipoN || m.tipo, m.sku, m.modelo, m.talle, m.q, m.nota, pl.responsable || '']
      .map(csvEsc_).join(';'));
  }
  return L.join('\r\n');
}

/* ========================= planilla histórico ========================= */

function getOrCreateHistorico_() {
  var root = getOrCreateRootFolder_();
  var it = root.getFilesByName(SHEET_NAME);
  var ss;
  if (it.hasNext()) {
    ss = SpreadsheetApp.open(it.next());
  } else {
    ss = SpreadsheetApp.create(SHEET_NAME);
    var file = DriveApp.getFileById(ss.getId());
    root.addFile(file);
    DriveApp.getRootFolder().removeFile(file); // Sheets se crea en la raíz de Drive: la sacamos de ahí.
    var hoja1 = ss.getSheets()[0];
    hoja1.setName('Stock');
    ss.insertSheet('Armado');
    ss.insertSheet('Movimientos');
  }
  asegurarEncabezados_(ss.getSheetByName('Stock'),
    ['fecha', 'sess', 'sku', 'modelo', 'talle', 'para_armar', 'prearmadas', 'armadas', 'total', 'responsable']);
  asegurarEncabezados_(ss.getSheetByName('Armado'),
    ['fecha', 'sess', 'sku', 'modelo', 'talle', 'ingresos', 'prearmadas', 'armadas', 'en_caja', 'responsable']);
  asegurarEncabezados_(ss.getSheetByName('Movimientos'),
    ['fecha', 'sess', 'hora', 'tipo', 'sku', 'modelo', 'talle', 'cantidad', 'nota', 'responsable']);
  return ss;
}

function asegurarEncabezados_(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
}

function actualizarHistorico_(pl) {
  var ss = getOrCreateHistorico_();
  var fecha = pl.fecha, sess = pl.sess || '';

  borrarFilasDeFecha_(ss.getSheetByName('Stock'), fecha);
  var mods = pl.stockModelos || [];
  var filasStock = [];
  for (var i = 0; i < mods.length; i++) {
    var r = mods[i];
    filasStock.push([fecha, sess, r.sku, r.modelo, r.talle, r.par, r.pre, r.arm, (r.par + r.pre + r.arm), pl.responsable || '']);
  }
  agregarFilas_(ss.getSheetByName('Stock'), filasStock);

  borrarFilasDeFecha_(ss.getSheetByName('Armado'), fecha);
  var dm = pl.diaModelos || [];
  var filasArmado = [];
  for (var j = 0; j < dm.length; j++) {
    var d = dm[j];
    filasArmado.push([fecha, sess, d.sku, d.modelo, d.talle, d.ing, d.pre, d.arm, d.caj, pl.responsable || '']);
  }
  agregarFilas_(ss.getSheetByName('Armado'), filasArmado);

  borrarFilasDeFecha_(ss.getSheetByName('Movimientos'), fecha);
  var movs = pl.movs || [];
  var filasMov = [];
  for (var k = 0; k < movs.length; k++) {
    var m = movs[k];
    filasMov.push([fecha, sess, m.hora, m.tipoN || m.tipo, m.sku, m.modelo, m.talle, m.q, m.nota || '', pl.responsable || '']);
  }
  agregarFilas_(ss.getSheetByName('Movimientos'), filasMov);
}

function borrarFilasDeFecha_(sheet, fecha) {
  var last = sheet.getLastRow();
  if (last < 2) return;
  var col = sheet.getRange(2, 1, last - 1, 1).getValues(); // columna "fecha"
  for (var i = col.length - 1; i >= 0; i--) {
    if (String(col[i][0]) === String(fecha)) sheet.deleteRow(i + 2);
  }
}

function agregarFilas_(sheet, filas) {
  if (!filas.length) return;
  sheet.getRange(sheet.getLastRow() + 1, 1, filas.length, filas[0].length).setValues(filas);
}
