import { App, PluginSettingTab, Setting } from "obsidian";
import type ObsidianImgPlugin from "./main";
import { HistoryModal } from "./modal-history";

export interface ObsidianImgSettings {
  enabled: boolean;
  watchedFolders: string;
  policy: "ask" | "delete" | "keep";
}

export const DEFAULT_SETTINGS: ObsidianImgSettings = {
  enabled: true,
  watchedFolders: ".img/",
  policy: "ask",
};

const POLICY_LABEL: Record<ObsidianImgSettings["policy"], string> = {
  ask: "Preguntar",
  delete: "Eliminar siempre",
  keep: "Conservar siempre",
};

export class ObsidianImgSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: ObsidianImgPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Activar plugin")
      .setDesc("Escuchar cambios en las notas para detectar adjuntos desvinculados.")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.enabled).onChange(async (v) => {
          this.plugin.settings.enabled = v;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Carpetas vigiladas")
      .setDesc("Rutas separadas por coma donde viven los adjuntos. Un nombre simple (ej. .img/) aplica a cualquier profundidad.")
      .addText((t) =>
        t.setValue(this.plugin.settings.watchedFolders).onChange(async (v) => {
          this.plugin.settings.watchedFolders = v;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Acción permanente")
      .setDesc("Estado del checkbox «No volver a preguntar» del modal.")
      .addText((t) => t.setValue(POLICY_LABEL[this.plugin.settings.policy]).setDisabled(true))
      .addButton((b) =>
        b.setButtonText("Volver a preguntar").onClick(async () => {
          this.plugin.settings.policy = "ask";
          await this.plugin.saveSettings();
          this.display();
        })
      );

    new Setting(containerEl)
      .setName("Historial de trazabilidad")
      .setDesc("Ver las acciones registradas por el plugin.")
      .addButton((b) =>
        b.setButtonText("Abrir historial").onClick(() => new HistoryModal(this.plugin).open())
      );
  }
}
