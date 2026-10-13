import { normalizePath, TFile } from "obsidian";
import type ObsidianImgPlugin from "./main";

const DEBOUNCE_MS = 1500;
const SNAP_KEY = "img-cleanup:snapshots";
const EXTERNAL_URL = /^(https?|data|mailto|app):/i;

export class AttachmentTracker {
  private timers = new Map<string, number>();
  private snapshots: Record<string, string[]>;

  constructor(private plugin: ObsidianImgPlugin) {
    this.snapshots = this.loadSnapshots();
  }

  schedule(file: TFile) {
    const prev = this.timers.get(file.path);
    if (prev) window.clearTimeout(prev);
    this.timers.set(
      file.path,
      window.setTimeout(() => {
        this.timers.delete(file.path);
        void this.check(file);
      }, DEBOUNCE_MS)
    );
  }

  dispose() {
    for (const id of this.timers.values()) window.clearTimeout(id);
    this.timers.clear();
  }

  private async check(file: TFile) {
    let content: string;
    try {
      content = await this.plugin.app.vault.cachedRead(file);
    } catch {
      return;
    }

    const current = this.extractWatched(content, file.path);
    const previous = this.snapshots[file.path];
    this.snapshots[file.path] = current;
    this.persistSnapshots();

    if (!previous) return; // primera vez: solo baseline
    const removed = previous.filter((p) => !current.includes(p));
    if (removed.length) await this.plugin.handleUnlinked(file, removed);
  }

  private extractWatched(content: string, sourcePath: string): string[] {
    const folders = this.plugin.watchedFolderList();
    const out = new Set<string>();
    for (const ref of parseReferences(content)) {
      const tfile = resolveRef(this.plugin, ref, sourcePath);
      if (!tfile) continue;
      if (!folders.some((folder) => matchesWatched(tfile.path, folder))) continue;
      out.add(tfile.path);
    }
    return [...out];
  }

  private loadSnapshots(): Record<string, string[]> {
    try {
      const raw: unknown = this.plugin.app.loadLocalStorage(SNAP_KEY);
      if (typeof raw === "object" && raw !== null) return raw as Record<string, string[]>;
      if (typeof raw === "string") {
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed === "object" && parsed !== null) return parsed as Record<string, string[]>;
      }
      return {};
    } catch {
      return {};
    }
  }

  private persistSnapshots() {
    try {
      this.plugin.app.saveLocalStorage(SNAP_KEY, this.snapshots);
    } catch {
      // storage lleno o bloqueado: el snapshot en memoria sigue funcionando
    }
  }
}

export function parseReferences(content: string): string[] {
  const refs: string[] = [];
  const wikilink = /!?\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g;
  const mdLink = /!?\[[^\]]*\]\(\s*(<[^>]+>|[^)\s]+)(?:\s+"[^"]*")?\s*\)/g;

  let m: RegExpExecArray | null;
  while ((m = wikilink.exec(content))) {
    const v = m[1].trim();
    if (v) refs.push(v);
  }
  while ((m = mdLink.exec(content))) {
    let v = m[1].trim();
    if (v.startsWith("<") && v.endsWith(">")) v = v.slice(1, -1);
    if (!v || v.startsWith("#") || EXTERNAL_URL.test(v)) continue;
    refs.push(v);
  }
  return refs;
}

function resolveRef(plugin: ObsidianImgPlugin, ref: string, sourcePath: string): TFile | null {
  const app = plugin.app;
  const viaCache = app.metadataCache.getFirstLinkpathDest(ref, sourcePath);
  if (viaCache) return viaCache;

  let p = ref.replace(/^\.\//, "");
  try {
    p = decodeURIComponent(p);
  } catch {
    // ruta con % inválido: usarla tal cual
  }
  if (p.startsWith("/")) {
    p = normalizePath(p.slice(1));
  } else {
    const slash = sourcePath.lastIndexOf("/");
    const dir = slash >= 0 ? sourcePath.slice(0, slash) : "";
    p = normalizePath(dir ? `${dir}/${p}` : p);
  }
  const af = app.vault.getAbstractFileByPath(p);
  return af instanceof TFile ? af : null;
}

function matchesWatched(path: string, folder: string): boolean {
  if (folder.includes("/")) return path.startsWith(folder);
  return path.startsWith(folder + "/") || path.includes("/" + folder + "/");
}
