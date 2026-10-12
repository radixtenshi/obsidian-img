import { normalizePath } from "obsidian";
import type ObsidianImgPlugin from "./main";

export interface LogEntry {
  ts: string;
  file: string;
  source: string;
  dest: string;
  action: "delete" | "keep";
}

const MAX_ENTRIES = 1000;

export class LogStore {
  readonly filePath: string;

  constructor(private plugin: ObsidianImgPlugin) {
    const dir = normalizePath(
      `${this.plugin.app.vault.configDir}/plugins/${this.plugin.manifest.id}/data`
    );
    this.filePath = `${dir}/appendix-log.jsonl`;
  }

  private get adapter() {
    return this.plugin.app.vault.adapter;
  }

  async append(entry: LogEntry): Promise<void> {
    const lines = await this.readAll();
    lines.push(entry);
    const trimmed = lines.length > MAX_ENTRIES ? lines.slice(lines.length - MAX_ENTRIES) : lines;
    await this.writeAll(trimmed);
  }

  async readAll(): Promise<LogEntry[]> {
    try {
      const raw = await this.adapter.read(this.filePath);
      return raw
        .split("\n")
        .filter(Boolean)
        .flatMap((l) => {
          try {
            return [JSON.parse(l) as LogEntry];
          } catch {
            return [];
          }
        });
    } catch {
      return [];
    }
  }

  async clear(): Promise<void> {
    await this.writeAll([]);
  }

  private async writeAll(entries: LogEntry[]): Promise<void> {
    const dir = this.filePath.slice(0, this.filePath.lastIndexOf("/"));
    if (!(await this.adapter.exists(dir))) await this.adapter.mkdir(dir);
    const content = entries.length
      ? entries.map((e) => JSON.stringify(e)).join("\n") + "\n"
      : "";
    await this.adapter.write(this.filePath, content);
  }
}
