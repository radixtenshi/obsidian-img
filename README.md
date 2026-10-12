# Obsidian Img — Limpieza selectiva de adjuntos

Plugin de Obsidian que detecta imágenes y adjuntos que quedaron **desvinculados** de una nota al editarla, y te ofrece enviarlos a la papelera — respetando la configuración de papelera de Obsidian y dejando trazabilidad de cada acción.

## Características

- **Detección en vivo:** escucha cambios en los `.md` del vault (con debounce de 1.5 s para no molestar mientras tipeas) y compara las referencias antes/después.
- **Formatos soportados:** `![](ruta)`, `![[archivo]]`, `[[archivo]]` y links Markdown. URLs externas ignoradas.
- **Solo carpetas vigiladas:** por defecto `.img/` (configurable en Settings); cualquier adjunto fuera de esas carpetas se ignora.
- **Backlinks:** si otra nota todavía referencia el archivo, **no se ofrece** para borrar.
- **Modal en lote:** una sola ventana lista los desvinculados con checkbox por archivo y los botones **Eliminar** / **Conservar**.
- **"No volver a preguntar":** persiste la última acción como política permanente (eliminar siempre / conservar siempre). Se resetea desde Settings.
- **Papelera de Obsidian:** usa `fileManager.trashFile()` — nunca borra permanente contra la voluntad de la configuración del usuario.
- **Log de trazabilidad:** JSONL con fecha, archivo, nota origen, destino y acción. Rotación con tope de 1000 entradas. Historial consultable desde un modal (abrir archivo / vaciar).

## Instalación

1. Crear la carpeta `.obsidian/plugins/obsidian-img/` dentro de tu vault.
2. Copiar ahí `manifest.json` y `main.js` (ya vienen compilados en este repo).
3. Reiniciar Obsidian → **Settings → Community plugins** → habilitar **Obsidian Img**.

## Configuración (Settings → Obsidian Img)

| Setting | Descripción |
|---|---|
| Activar plugin | Enciende/apaga el monitoreo |
| Carpetas vigiladas | Rutas separadas por coma (default `.img/`). Un nombre simple aplica a cualquier profundidad |
| Acción permanente | Estado del "No volver a preguntar" + botón para volver a "Preguntar" |
| Historial de trazabilidad | Abre el modal con el log de acciones |

El log vive en `.obsidian/plugins/obsidian-img/data/appendix-log.jsonl`.

## Desarrollo

Requiere [Node.js](https://nodejs.org/) 18+.

```bash
npm install        # dependencias
npm run build      # typecheck + bundle de producción → main.js
npm run dev        # watch mode (rebuild automático)
```

### Estructura

```
manifest.json
versions.json
esbuild.config.mjs
tsconfig.json
src/
  main.ts            # entrada: eventos, política, backlinks, papelera
  settings.ts        # PluginSettingTab
  diff.ts            # parser de referencias + debounce + snapshot
  log.ts             # log JSONL + rotación
  modal-delete.ts    # modal de confirmación en lote
  modal-history.ts   # modal de historial
docs/
  documento_de_lineamientos_para_el_desarrollo_del_plugin_de_obsidian.md
```

## Fuera de alcance

- Escaneo de archivos huérfanos (adjuntos sin referenciar en ninguna nota).
- Notas Markdown vinculadas entre sí (solo adjuntos/imágenes).
- Canvas.

## Licencia

MIT
