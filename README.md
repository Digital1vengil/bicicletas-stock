# Bicicletas · stock y armado

App independiente, del mismo palo que las **Apps PARKA**: HTML + JS plano, **sin build, sin npm, sin
backend**. Se abre en el celular y se puede instalar como PWA (funciona sin señal). Todo se guarda en el
`localStorage` del dispositivo y se sube a Drive cuando querés.

```
index.html            la app entera (pantallas + lógica)
bicis-skus.js         catálogo de modelos (los SKUs BICI-)
manifest.webmanifest  para instalarla como app
sw.js                 service worker (caché offline)
icon-192.png          iconos
icon-512.png
apps-script/
  BicicletasStock.gs  el script de Drive que recibe los partes
```

## La idea: una bici pasa por tres estados

| Estado | Qué es |
|---|---|
| 🧱 **Para armar** | cuadros que entraron y están sin tocar |
| 🔧 **Prearmadas** | a medio armar |
| 🚲 **Armadas** | listas |

El **stock** de cada estado no se guarda como un número que se pisa: se calcula sumando **movimientos**.
Cada movimiento mueve unidades de un estado al siguiente:

| Movimiento | Qué hace con el stock |
|---|---|
| Ingreso de cuadros | **+1 para armar** |
| Prearmar | −1 para armar · **+1 prearmada** |
| Armar | −1 prearmada · **+1 armada** |
| Encajar | **−1 armada** (sale del stock, ya está embalada) |
| Ajuste | corrige un solo estado, por la diferencia contada |

Por eso **borrar un movimiento arregla el stock solo**, el historial siempre explica cómo se llegó al
número de hoy, y no hay forma de que el stock y el historial se contradigan.

> La app **no deja armar lo que no hay**: para prearmar tiene que haber cuadros para armar, para armar
> tiene que haber prearmadas, para encajar tiene que haber armadas. Si no alcanza, lo dice y no guarda nada.

## Las tres secciones

### 📦 Stock
Lo primero que se ve: los tres números grandes (para armar · prearmadas · armadas) y la tabla por modelo
con su total. Buscador por modelo, talle o SKU, **Ver todos** para listar el catálogo completo y
**➕ Artículo** para dar de alta uno nuevo.

**➕ Artículo** pide **nombre y talle** por separado, no el SKU: escribís `CARRERA`, marcás los talles
(chips `S · M · L · XL · XXL · 24 · 26 · 29`, o el campo *Otro talle* para cualquier otro) y la app arma un
artículo por talle — `BICI-CARRERA-S`, `BICI-CARRERA-M`, `BICI-CARRERA-L` — mostrando antes la lista y
marcando cuáles **ya existen** para no duplicar.

**Tocando un modelo** se abre su hoja: su stock en los tres estados, y ahí mismo se registra el trabajo —
**🔧 Prearmar · 🚲 Armar · 📦 Encajar**, cada botón mostrando cuántas hay disponibles para esa acción.
Se elige la acción, la cantidad (contador **−/+**, atajos 1 · 5 · 10 · 20, nota opcional) y **✓ Registrar**.
Abajo, los últimos movimientos de ese modelo, borrables de a uno.

Si algún estado queda en **negativo**, la app avisa arriba: significa que se armó más de lo que figura
ingresado, y se arregla cargando el ingreso en Conteo. También avisa si hay stock cargado *sin modelo*.

Botones **⬇️ CSV del stock** y **📋 Copiar stock** (texto para WhatsApp).

### ➕ Conteo
Para **agregar unidades disponibles**, en tres pasos:

1. **Elegí el modelo** — buscador o los atajos (los contados hoy, y *Sin modelo* para contar sin SKU).
2. **Unidades que entran** — contador y **➕ Agregar N al stock**: son cuadros nuevos, entran como
   *para armar*. La nota sirve para el remito.
3. **Ajustar el conteo real** — si contaste a mano y no coincide, escribís los tres números reales y la app
   guarda **la diferencia** como ajuste, con fecha y hora. No pisa nada: queda registrado qué cambió.

Abajo, **Conteos de hoy**: los ingresos y ajustes del día, borrables de a uno.

#### Planilla de stock (para cargar todo de una)

Para el conteo inicial no hace falta ir modelo por modelo:

- **⬇️ Bajar planilla** genera un CSV con **todo el catálogo** y el stock que figura hoy, en columnas
  `sku ; modelo ; talle ; para_armar ; prearmadas ; armadas`.
- Se completa en Excel y se vuelve a cargar con **⬆️ Cargar planilla**. La app muestra primero un resumen
  —cuántas filas leyó, cuántos modelos cambian, cuántas unidades de diferencia, cuántos artículos nuevos
  crearía— y recién con tu confirmación guarda **las diferencias** como ajustes de conteo.

Detalles que ya están resueltos:

- **Celda vacía = no se toca ese estado.** Si sólo completás `armadas`, los otros dos quedan como estaban.
- **Volver a cargar la misma planilla no hace nada** ("coincide con el stock"): las diferencias son cero,
  así que no duplica.
- **Filas de modelos que no están en el catálogo se crean solas.** Podés dejar `sku` vacío y poner sólo
  `modelo` y `talle`: el SKU lo arma la app (`NIGHTMARE` + `XL` → `BICI-NIGHTMARE-XL`).
- Acepta separador `;` `,` tab o `|`, encabezados con mayúsculas/acentos/espacios (`Para armar`), BOM de
  Excel, y saltea la fila `TOTAL`.
- Si el archivo no tiene columnas reconocibles, lo dice y **no toca nada**.

### 📋 Historial de armado
Con selector de día (**‹ ›**, y tocando la fecha volvés a hoy — no se puede cargar en el futuro):

- Los cuatro números del día: **ingresos · prearmadas · armadas · en caja**, con el porcentaje de la meta
  si cargaste metas en Ajustes.
- **Armado del día por modelo**: qué se le hizo a cada bici (tocando la fila se abre su hoja).
- **Movimientos del día**: cada carga con hora, tipo, cantidad, modelo y nota. La ✕ la borra (confirmación
  dentro de la app, no usa el `confirm()` del navegador).
- **Parte del día**: **📋 Copiar** y **☁️ Subir a Drive**.
- **Días con movimiento**: la lista para saltar a cualquier día, marcando los que ya se subieron.
- **Resumen del período**: esta semana / este mes / últimos 30 días / todo, con gráfico de los últimos
  14 días, tabla día por día con total y promedio, y CSV **por día** y **de armado por modelo**.

### ⚙️ Ajustes
URL del Apps Script con **Probar conexión**, turno/responsable, metas diarias, modelos propios, respaldo
JSON (exportar / importar sin duplicar) y borrar todo.

## Lo que se sube a Drive

`apps-script/BicicletasStock.gs` arma esto solo, la primera vez que recibe algo:

```
Mi unidad/
  Bicicletas stock/
    Bicicletas stock (histórico)     ← planilla: Stock · Armado · Movimientos
    2026-08-20/                      ← una carpeta NUEVA POR DÍA
      stock-2026-08-20.csv           ← cuántas hay por modelo y estado
      armado-2026-08-20.csv          ← qué se hizo ese día, por modelo
      movimientos-2026-08-20.csv     ← el detalle carga por carga
    2026-08-21/
      ...
```

La carpeta del día se crea con la **fecha del día trabajado**, no la de la subida: si el lunes subís el
parte del sábado, la carpeta es la del sábado.

**Instalarlo (una vez):** en [script.google.com](https://script.google.com/home) → Nuevo proyecto → pegar
todo `BicicletasStock.gs` → Implementar → **Nueva implementación** → tipo *Aplicación web*,
**Ejecutar como: Yo**, **Quién tiene acceso: Cualquier persona** → copiar la URL `/exec` y pegarla en
**Ajustes → Google Drive**. Los pasos también están comentados arriba del propio `.gs`.

**Carpeta nueva todos los días sin depender de la app** (opcional): en el editor del script, Activadores →
Agregar activador → función `crearCarpetaDeHoy`, temporizador diario. Con eso la carpeta del día aparece
sola a la mañana, aunque nadie suba nada.

**Cómo sube la app:** **☁️ Subir a Drive** abre una hoja de **confirmación** con lo que se va a mandar
(los movimientos del día, el stock que queda, cuántos modelos y movimientos van) y a qué carpeta y
archivos cae. Recién con **Confirmar y subir** sale el envío.

- **Un envío a la vez.** Mientras está en vuelo el botón queda en *Subiendo…* y la hoja no se cierra.
- **Si falla, no se pierde nada**: aparece el motivo y **Reintentar** reenvía con la **misma sesión**, así
  el script lo deduplica en vez de duplicar el día.
- **Volver a subir un día lo corrige**: los tres CSV se reemplazan y las filas de esa fecha se reescriben
  en la planilla.
- El POST va con `mode:'no-cors'`, igual que en Inventario y Devoluciones: la app sabe que la request
  **salió**, no que Drive ya la procesó. Por eso dice "subido" y no "confirmado por Drive".

## El catálogo de modelos

`bicis-skus.js` trae los **27 SKUs con prefijo `BICI-`**: los 25 del rubro *BICI-BICICLETAS* más
`BICI-BLIZZARD-M` y `BICI-THUNDER-M`, que en el listado estaban bajo *MOUNT-*.

El **talle** es lo que va después del último guión y el **modelo** lo del medio: `BICI-HURRICANE-L` se
muestra como `HURRICANE` · `L`. `BICI-EARTHQU-M` queda como `EARTHQU`, tal cual está el SKU.

El buscador pide que **cada palabra escrita sea el principio de alguna palabra del SKU**: `mars s` trae
MARS S y no MARS M, `eclip l` trae ECLIPSE L, y pegar el SKU entero (`BICI-STORM-M`) también funciona.

> Quedaron **afuera** los que son bicis pero no llevan el prefijo (`CARRERA-24-L`, `ECLIPSE-24-*`,
> `INVICTUS-24-*`, `MOONLIGHT-24-*`, `NIGHTMARE-24-*`, `ONTRAIL-*`, `PEGASUS-21-S`, `ROCKSLIDE-21V-S`,
> `SUPERNOVA-21-*`, `EMBER-21-S`). Se agregan con **Stock → ➕ Artículo** (nombre + talles, varios de una),
> se cargan de una en la **planilla de stock**, o se suman a `bicis-skus.js` si van a usarse siempre.

## Los colores

| Token | Para qué |
|---|---|
| `--brand` `#3730a3` → `--brand2` `#5b53d6` | índigo de la marca: header, botón principal, pestaña activa |
| `--par` `#b45309` | 🧱 para armar (ámbar) |
| `--pre` `#7c3aed` | 🔧 prearmadas (violeta) |
| `--arm` `#0d9488` | 🚲 armadas y todo lo que salió bien (teal) |
| `--caj` `#2563eb` | 📦 en caja / salida (azul) |
| `--danger` `#be123c` | errores y descuentos |

Cada color tiene su versión clara (`--parink`, `--preink`, …) para fondos de chips y avisos. **Están todos
en el `:root` del `index.html`**: cambiando esas líneas cambia la app entera, sin tocar nada más. El header
muestra los tres números del stock siempre a la vista, y lo que queda en negativo se pinta en rojo tanto
arriba como en las tarjetas y la tabla.

## Cómo se prueba local

```bash
python -m http.server 8137 --directory "C:\Users\Usuario\Documents\app registro bicis"
```

y abrir `http://127.0.0.1:8137/`. Para el celular hay que publicarla (GitHub Pages, Netlify, un
subdirectorio del hosting): el service worker y la instalación como PWA piden HTTPS o `localhost`.

### Publicar en GitHub Pages

El repo local ya está inicializado con el primer commit. Falta crearlo en GitHub y empujarlo:

```bash
git remote add origin https://github.com/Digital1vengil/NOMBRE-DEL-REPO.git
```

```bash
git push -u origin main
```

Después, en **Settings → Pages** del repo: *Source* = **Deploy from a branch**, *Branch* = `main` / `root`.
Queda en `https://digital1vengil.github.io/NOMBRE-DEL-REPO/`.

## Dónde se guardan los datos

| Clave | Qué guarda |
|---|---|
| `bicis_mov_v2` | todos los movimientos: `{id, d:'YYYY-MM-DD', ts, tp, sk, q, n}` |
| `bicis_skus_custom_v1` | los modelos agregados a mano |
| `bicis_cfg_v1` | turno/responsable y metas diarias |
| `bicis_gas_url` | la URL del Apps Script |
| `bicis_up_v2` | qué días ya se subieron a Drive y cuándo |

`tp` es el tipo de movimiento (`ing` · `pre` · `arm` · `caj` · `ajp` · `ajr` · `aja`) y `sk` el SKU
(`''` = sin modelo). **El stock nunca se guarda**: se recalcula siempre desde los movimientos.

La primera vez que se abre esta versión, **migra sola** lo que hubiera de la versión anterior
(`bicis_mov_v1`, que sólo contaba prearmadas/armadas/en caja por día): los convierte en movimientos de
armado. Como esa versión no registraba ingresos de cuadros, *para armar* va a quedar en negativo hasta que
cargues el ingreso real en **Conteo** — la app lo avisa en Stock y explica cómo arreglarlo.

> Es todo local, **por dispositivo**: si lo usan dos personas en dos celulares, son dos stocks distintos.
> Para juntarlos: **Exportar JSON** en uno e **Importar JSON** en el otro (no duplica). Si hace falta un
> stock único compartido en vivo, eso ya pide backend de verdad, no `localStorage`.
