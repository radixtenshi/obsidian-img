import { FileSystemAdapter, Modal, Notice, normalizePath, Platform, Setting, TFile } from "obsidian";
import type ObsidianImgPlugin from "./main";

const ACTION_LABEL = { delete: "Eliminado", keep: "Conservado" } as const;

export class HistoryModal extends Modal {
  constructor(private plugin: ObsidianImgPlugin) {
    super(plugin.app);
  }

  async onOpen() {
    this.titleEl.setText("Historial de trazabilidad");
    const entries = (await this.plugin.log.readAll()).slice().reverse();

    const container = this.contentEl.createDiv();
    if (!entries.length) {
      container.createEl("p", { text: "Sin entradas todavía." });
    }
    for (const e of entries) {
      const when = new Date(e.ts).toLocaleString();
      container.createEl("div", {
        text: `${when} — ${ACTION_LABEL[e.action]}: ${e.file} (origen: ${e.source}) → ${e.dest}`,
        cls: "obsidian-img-log-entry",
      });
    }

    new Setting(this.contentEl)
      .addButton((b) =>
        b.setButtonText("Abrir archivo").onClick(() => void this.openLogFile())
      )
      .addButton((b) =>
        b
          .setButtonText("Vaciar")
          .setWarning()
          .onClick(async () => {
            await this.plugin.log.clear();
            new Notice("Historial vaciado.");
            this.close();
          })
      );
  }

  private async openLogFile() {
    const path = this.plugin.log.filePath;
    const af = this.app.vault.getAbstractFileByPath(path);
    if (af instanceof TFile) {
      await this.app.workspace.getLeaf(false).openFile(af);
      return;
    }
    if (Platform.isDesktop && this.app.vault.adapter instanceof FileSystemAdapter) {
      const { shell } = require("electron") as { shell: { openPath(p: string): Promise<string> } };
      const full = normalizePath(
        `${this.app.vault.adapter.getBasePath()}/${path}`
      );
      await shell.openPath(full);
      return;
    }
    new Notice(`El log está en: ${path}`);
  }
}
