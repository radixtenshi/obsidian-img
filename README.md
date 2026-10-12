# Img Cleanup — Selective attachment cleanup

Obsidian plugin that detects images and attachments that became **unlinked** from a note while you edit it, and offers to send them to the trash — respecting Obsidian's trash settings and keeping a trace log of every action.

## Features

- **Live detection:** listens for changes in the vault's `.md` files (with a 1.5 s debounce so it doesn't interrupt while you type) and compares attachments referenced before/after.
- **Supported formats:** `![](path)`, `![[file]]`, `[[file]]` and Markdown links. External URLs are ignored.
- **Watched folders only:** defaults to `.img/` (configurable in Settings); any attachment outside those folders is ignored.
- **Backlinks:** if another note still references the file, it is **not offered** for deletion.
- **Batch modal:** a single window lists the unlinked files with a checkbox per file and **Delete** / **Keep** buttons.
- **"Don't ask again":** persists the last action as a permanent policy (always delete / always keep). Resettable from Settings.
- **Obsidian's trash:** uses `fileManager.trashFile()` — never permanently deletes against the user's trash configuration.
- **Trace log:** JSONL with date, file, source note, destination and action. Rotated with a 1000-entry cap. History viewable from a modal (open file / clear).

## Installation

1. Create the folder `.obsidian/plugins/img-cleanup/` inside your vault.
2. Copy `manifest.json` and `main.js` into it (already compiled in this repo).
3. Restart Obsidian → **Settings → Community plugins** → enable **Img Cleanup**.

## Configuration (Settings → Img Cleanup)

| Setting | Description |
|---|---|
| Enable plugin | Turns monitoring on/off |
| Watched folders | Comma-separated paths (default `.img/`). A bare name matches at any depth |
| Permanent action | State of the "Don't ask again" policy + button to reset to "Ask" |
| Trace history | Opens the modal with the action log |

The log lives in `.obsidian/plugins/img-cleanup/data/appendix-log.jsonl`.

## Development

Requires [Node.js](https://nodejs.org/) 18+.

```bash
npm install        # dependencies
npm run build      # typecheck + production bundle → main.js
npm run dev        # watch mode (auto rebuild)
```

### Structure

```
manifest.json
versions.json
esbuild.config.mjs
tsconfig.json
src/
  main.ts            # entry: events, policy, backlinks, trash
  settings.ts        # PluginSettingTab
  diff.ts            # reference parser + debounce + snapshot
  log.ts             # JSONL log + rotation
  modal-delete.ts    # batch confirmation modal
  modal-history.ts   # history modal
docs/
  documento_de_lineamientos_para_el_desarrollo_del_plugin_de_obsidian.md
```

## Out of scope

- Scanning for orphan files (attachments not referenced by any note).
- Markdown notes linked to each other (attachments/images only).
- Canvas.

## License

MIT
