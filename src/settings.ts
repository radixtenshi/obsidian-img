import { App, PluginSettingTab, SettingDefinitionItem } from "obsidian";
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

  getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      {
        name: "Activar plugin",
        desc: "Escuchar cambios en las notas para detectar adjuntos desvinculados.",
        control: { type: "toggle", key: "enabled" },
      },
      {
        name: "Carpetas vigiladas",
        desc: "Rutas separadas por coma donde viven los adjuntos. Un nombre simple (ej. .img/) aplica a cualquier profundidad.",
        control: { type: "text", key: "watchedFolders" },
      },
      {
        name: "Acción permanente",
        desc: "Estado del checkbox «No volver a preguntar» del modal.",
        render: (setting) => {
          setting
            .addText((t) => t.setValue(POLICY_LABEL[this.plugin.settings.policy]).setDisabled(true))
            .addButton((b) =>
              b.setButtonText("Volver a preguntar").onClick(async () => {
                this.plugin.settings.policy = "ask";
                await this.plugin.saveSettings();
                this.update();
              })
            );
        },
      },
      {
        name: "Historial de trazabilidad",
        desc: "Ver las acciones registradas por el plugin.",
        action: () => new HistoryModal(this.plugin).open(),
      },
    ];
  }
}
