# Documento de Lineamientos y Requerimientos Técnicos
## Plugin de Obsidian: Limpieza y Gestión Selectiva de Adjuntos e Imágenes

### 1. Contexto y Propósito del Plugin
Este documento establece las directrices técnicas y funcionales para el desarrollo de un plugin personalizado para **Obsidian**. El objetivo principal es automatizar la detección de imágenes y archivos adjuntos eliminados de un documento Markdown (`.md`), solicitando una confirmación al usuario antes de borrar el archivo físico del disco, respetando las políticas de eliminación de Obsidian, y registrando la trazabilidad de la acción.

---

### 2. Requerimientos Funcionales

#### 2.1. Monitoreo de Documentos y Detección de Cambios
- El plugin debe escuchar de forma activa los eventos de modificación de archivos en la bóveda (Vault), específicamente sobre archivos con extensión `.md`.
- Debe realizar un seguimiento o una comparación diferencial entre las referencias a recursos (imágenes, enlaces a archivos) presentes en el estado previo del documento y el estado actual tras una edición o guardado.
- Debe identificar con precisión cuándo un enlace a una imagen o adjunto ha sido removido intencionalmente del cuerpo del texto Markdown.
- **Debounce de ~1.5 s** antes de evaluar el diff: evita falsos positivos mientras el usuario sigue tipeando.
- **Snapshot por archivo** de los adjuntos referenciados, tomado antes de ofrecer el diff. Se persiste en `localStorage` para sobrevivir a recargas de la aplicación.
- Formatos de referencia a detectar: `![](ruta)`, `![[archivo]]` y `[[archivo]]` (embebidos y frontmatter). Las URLs externas se ignoran.

#### 2.2. Restricción de Ubicación de Archivos
- La verificación de eliminación solo debe aplicarse a aquellos archivos adjuntos o imágenes que residan dentro de las **carpetas vigiladas**, configurables desde Settings del plugin (default: `.img/`), con rutas resueltas contra la raíz del Vault (ej. `/docs/.img/imagen.png`).
- Las imágenes externas (URLs web) o recursos fuera de las carpetas vigiladas deben ser ignorados por el proceso de limpieza.

#### 2.3. Ventana de Confirmación Interactiva (Prompt)
- Cuando se detecte que un adjunto o imagen ha sido desvinculado de un documento, **no** se debe borrar el archivo de forma automática y silenciosa.
- **Regla de backlinks:** antes de ofrecer un archivo, consultar `app.metadataCache.getBacklinksForFile()`. Si otra nota lo referencia, ese archivo **no se ofrece** para borrar (se omite de la lista, sin modal).
- **Modal en lote:** un solo modal de confirmación que liste todos los adjuntos desvinculados en una sesión, mostrando por cada uno:
  - El nombre del archivo o imagen removido.
  - La nota de origen de la cual fue desvinculado.
  - Un checkbox por archivo (default: tildado) para elegir cuáles entran en la acción.
- La interfaz debe incluir los botones:
  1. **Eliminar:** Proceder con la eliminación de los archivos tildados.
  2. **Conservar:** Conservar los archivos (el enlace ya fue borrado del documento, por lo que el recurso queda independiente).
- **Checkbox "No volver a preguntar":** al marcarlo se persiste la **última acción** como política permanente — si la acción fue Eliminar → el plugin elimina siempre sin preguntar; si fue Conservar → nunca más pregunta y conserva. La política se resetea a "Preguntar" desde Settings.

#### 2.4. Respeto a la Configuración de Eliminación de Obsidian
- El plugin **nunca** debe realizar un borrado permanente directo (como `fs.unlink` irreversible) a menos que la configuración del usuario en Obsidian así lo dicte.
- Se debe utilizar `app.fileManager.trashFile(file)`, que respeta la configuración global de papelera de Obsidian (papelera interna o papelera del sistema, según los ajustes globales de la bóveda del usuario).

#### 2.5. Registro de Trazabilidad (Log / Auditoría)
- El plugin debe mantener un registro (log) persistente en formato **JSONL** en `.obsidian/plugins/<obsidian-img>/data/appendix-log.jsonl`.
- El registro debe almacenar como mínimo los siguientes campos por cada evento:
  - **Fecha y hora** exacta de la acción.
  - **Nombre del archivo** eliminado/conservado.
  - **Documento de origen** (nota que contenía el enlace removido).
  - **Destino del archivo** (papelera de Obsidian, papelera del sistema o borrado permanente, según la config de Obsidian).
  - **Acción** tomada (eliminar / conservar).
- **Rotación:** tope de 1000 entradas (al superarlo se descartan las más antiguas).
- El historial debe consultarse mediante un **modal dentro de Obsidian**, con acciones "abrir archivo" (ir al registro) y "vaciar" (limpiar el log).

---

### 3. Requerimientos Técnicos y de Arquitectura (Para el Agente de Programación)

- **Framework / API:** Utilizar la API oficial de Obsidian (`obsidian`).
- **Lenguaje:** TypeScript compatible con el entorno de ejecución de Obsidian (escritorio y móvil).
- **Idioma de la UI:** Español.
- **Identificador interno del plugin:** `obsidian-img`.
- **Gestión de Eventos:** 
  - Registrar eventos mediante `this.registerEvent(this.app.vault.on('modify', ...))`.
  - Debounce de ~1.5 s + snapshot por archivo en caché en memoria (persistido en `localStorage`) para evitar falsos positivos durante la escritura rápida o redibujado del editor.
- **Modales de UI:** Extender la clase `Modal` de Obsidian para el modal de confirmación en lote (sección 2.3) y el modal de historial (sección 2.5).
- **Persistencia de Ajustes (`PluginSettingTab`):** 
  - Activar/desactivar el plugin.
  - Carpetas vigiladas (default `.img/`).
  - Reset de la política "No volver a preguntar" → volver a "Preguntar".
  - Abrir el historial de trazabilidad.
- **Estructura del proyecto (scaffold):**
  ```
  manifest.json
  versions.json
  esbuild.config.mjs
  tsconfig.json
  src/
    main.ts            # entrada, registro de eventos, orquestación
    settings.ts        # PluginSettingTab
    diff.ts            # parser de referencias + debounce + snapshot
    log.ts             # JSONL + rotación
    modal-delete.ts    # modal de confirmación en lote
    modal-history.ts   # modal de historial
  ```
- **Build:** `node esbuild.config.mjs` (modo producción) sin errores de TypeScript.

---

### 4. Criterios de Aceptación (Definición de Terminado)
1. Al editar un archivo `.md` y borrar el código de una imagen alojada en una carpeta vigilada (default `.img/`), el plugin intercepta el cambio (con debounce, sin falsos positivos mientras se tipea).
2. Se despliega **un solo modal** (en lote) listando los adjuntos desvinculados con checkbox por archivo y los botones Eliminar/Conservar.
3. Si el usuario acepta, los archivos tildados son enviados a la papelera respetando la configuración de Obsidian (`fileManager.trashFile`).
4. Si el usuario conserva, los archivos físicos permanecen intactos en su carpeta correspondiente.
5. Si se marca "No volver a preguntar", se persiste la última acción como política permanente; solo se resetea desde Settings.
6. Si un adjunto sigue referenciado en **otra nota** (backlinks), no se ofrece para borrar.
7. Queda registrado en el log (JSONL) el evento con fecha, nombre de archivo, nota origen, destino y acción; visible en el modal de historial.

---

### 5. Fuera de Alcance (Non-Goals)
- Escaneo de archivos huérfanos (adjuntos sin referenciar en ninguna nota): **no es función de este plugin**.
- Notas Markdown vinculadas entre sí (solo se procesan adjuntos/imágenes).
- Edición de Canvas.