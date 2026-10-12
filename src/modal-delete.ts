import { Modal, Setting, TFile } from "obsidian";
import type ObsidianImgPlugin from "./main";

export class DeleteModal extends Modal {
  private selected = new Set<string>();
  private neverAsk = false;

  constructor(
    private plugin: ObsidianImgPlugin,
    private source: TFile,
    private files: TFile[]
  ) {
    super(plugin.app);
    for (const f of this.files) this.selected.add(f.path);
  }

  onOpen() {
    this.titleEl.setText("Adjuntos desvinculados");
    this.contentEl.createEl("p", {
      text: `Estos archivos ya no están referenciados en «${this.source.path}»:`,
    });

    const list = this.contentEl.createDiv();
    for (const f of this.files) {
      new Setting(list)
        .setName(f.name)
        .setDesc(`Origen: ${this.source.path}`)
        .addToggle((t) =>
          t.setValue(true).onChange((v) => {
            if (v) this.selected.add(f.path);
            else this.selected.delete(f.path);
          })
        );
    }

    new Setting(this.contentEl)
      .setName("No volver a preguntar")
      .setDesc("Usar siempre la última acción elegida. Se puede volver a «Preguntar» desde Settings.")
      .addToggle((t) =>
        t.onChange((v) => {
          this.neverAsk = v;
        })
      );

    const buttons = new Setting(this.contentEl);
    buttons.addButton((b) =>
      b.setButtonText("Conservar").onClick(() => void this.finish("keep"))
    );
    buttons.addButton((b) =>
      b.setButtonText("Eliminar").setWarning().onClick(() => void this.finish("delete"))
    );
  }

  private async finish(action: "delete" | "keep") {
    if (this.neverAsk) {
      this.plugin.settings.policy = action;
      await this.plugin.saveSettings();
    }
    const chosen = this.files.filter((f) => this.selected.has(f.path));
    this.close();
    await this.plugin.applyAction(chosen, this.source.path, action);
  }
}
