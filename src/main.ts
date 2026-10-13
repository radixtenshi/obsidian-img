import { normalizePath, Notice, Plugin, TFile } from "obsidian";
import { ObsidianImgSettings, ObsidianImgSettingTab, DEFAULT_SETTINGS } from "./settings";
import { AttachmentTracker } from "./diff";
import { LogStore } from "./log";
import { DeleteModal } from "./modal-delete";

const DEFAULT_WATCHED = [".img"];

export default class ObsidianImgPlugin extends Plugin {
  settings: ObsidianImgSettings;
  log: LogStore;
  private tracker: AttachmentTracker;

  async onload() {
    const data = (await this.loadData()) as Partial<ObsidianImgSettings> | null;
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data ?? {});
    this.log = new LogStore(this);
    this.tracker = new AttachmentTracker(this);

    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        if (!this.settings.enabled) return;
        if (!(file instanceof TFile) || file.extension !== "md") return;
        this.tracker.schedule(file);
      })
    );

    this.addSettingTab(new ObsidianImgSettingTab(this.app, this));
  }

  onunload() {
    this.tracker.dispose();
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  watchedFolderList(): string[] {
    const folders = this.settings.watchedFolders
      .split(",")
      .map((f) => normalizePath(f.trim().replace(/^\/+|\/+$/g, "")))
      .filter(Boolean);
    return folders.length ? folders : DEFAULT_WATCHED;
  }

  async handleUnlinked(source: TFile, removedPaths: string[]) {
    const candidates: TFile[] = [];
    for (const p of removedPaths) {
      const f = this.app.vault.getAbstractFileByPath(p);
      if (f instanceof TFile && !this.hasOtherBacklinks(f)) candidates.push(f);
    }
    if (!candidates.length) return;

    if (this.settings.policy === "delete") {
      await this.applyAction(candidates, source.path, "delete");
    } else if (this.settings.policy !== "keep") {
      new DeleteModal(this, source, candidates).open();
    }
  }

  async applyAction(files: TFile[], sourcePath: string, action: "delete" | "keep") {
    if (!files.length) return;
    const dest = action === "delete" ? this.trashDestinationLabel() : "conservado en la carpeta original";
    for (const f of files) {
      if (action === "delete") await this.app.fileManager.trashFile(f);
      await this.log.append({
        ts: new Date().toISOString(),
        file: f.path,
        source: sourcePath,
        dest,
        action,
      });
    }
    const verb = action === "delete" ? "enviados a la papelera" : "conservados";
    new Notice(`${files.length} archivo(s) ${verb}.`);
  }

  private hasOtherBacklinks(file: TFile): boolean {
    const cache = this.app.metadataCache as unknown as {
      getBacklinksForFile?: (f: TFile) => unknown;
    };
    const res: unknown = cache.getBacklinksForFile?.(file);
    if (res instanceof Map) return res.size > 0;
    if (typeof res === "object" && res !== null) {
      const data = (res as { data?: unknown }).data;
      if (data instanceof Map) return data.size > 0;
    }
    return false;
  }

  private trashDestinationLabel(): string {
    const vault = this.app.vault as unknown as { getConfig?: (key: string) => unknown };
    const cfg = vault.getConfig?.("trashSystem");
    if (cfg === "system") return "papelera del sistema";
    if (cfg === "local") return "papelera de Obsidian";
    return "papelera (según configuración de Obsidian)";
  }
}
