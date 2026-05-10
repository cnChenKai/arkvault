// pages/import/ImportPage.ets
// Import passwords from Bitwarden, 1Password, LastPass, Chrome, etc.

import { router } from '@kit.ArkUI';
import { promptAction } from '@kit.ArkUI';
import { picker } from '@kit.CoreFileKit';
import { fs } from '@kit.CoreFileKit';
import { ImportFormat, ImportRecord, ImportResult, detectImportFormat } from '../../models/ImportFormat';
import { PasswordEntry, createEmptyEntry } from '../../models/PasswordEntry';
import { VaultService } from '../../services/VaultService';
import { PasswordEntryDao } from '../../dao/PasswordEntryDao';
import { generateId } from '../../crypto/CryptoService';
import { common } from '@kit.AbilityKit';

@Entry
@Component
struct ImportPage {
  @State selectedFile: string = '';
  @State detectedFormat: ImportFormat | null = null;
  @State importResult: ImportResult | null = null;
  @State isImporting: boolean = false;
  @State fileContent: string = '';

  async handleSelectFile(): Promise<void> {
    try {
      const documentPicker: picker.DocumentViewPicker = new picker.DocumentViewPicker();
      const result: Array<string> = await documentPicker.select();
      if (result.length > 0) {
        this.selectedFile = result[0];
        await this.readFile();
      }
    } catch (_e) {
      promptAction.showToast({ message: '文件选择失败' });
    }
  }

  async readFile(): Promise<void> {
    try {
      const file: fs.File = fs.openSync(this.selectedFile, fs.OpenMode.READ_ONLY);
      const stat: fs.Stat = fs.statSync(this.selectedFile);
      const buffer: ArrayBuffer = new ArrayBuffer(stat.size);
      fs.readSync(file.fd, buffer);
      fs.closeSync(file);

      const decoder: TextDecoder = new TextDecoder();
      this.fileContent = decoder.decode(new Uint8Array(buffer));

      // Detect format
      const fileName: string = this.selectedFile.split('/').pop() ?? '';
      this.detectedFormat = detectImportFormat(fileName, this.fileContent);
    } catch (_e) {
      promptAction.showToast({ message: '文件读取失败' });
    }
  }

  async handleImport(): Promise<void> {
    if (this.detectedFormat === null || this.fileContent.length === 0) {
      promptAction.showToast({ message: '无法识别文件格式' });
      return;
    }

    this.isImporting = true;
    const result: ImportResult = {
      totalRows: 0,
      imported: 0,
      skipped: 0,
      errors: []
    };

    try {
      const records: ImportRecord[] = this.parseFile(this.detectedFormat, this.fileContent);
      result.totalRows = records.length;

      const context: common.UIAbilityContext = getContext() as common.UIAbilityContext;

      for (const record of records) {
        try {
          if (record.title.length === 0 && record.url.length === 0) {
            result.skipped++;
            continue;
          }

          const entry: PasswordEntry = {
            id: generateId(),
            title: record.title || record.url,
            username: record.username,
            password: record.password,
            url: record.url,
            notes: record.notes,
            folder: record.folder,
            tags: record.tags,
            favorite: record.favorite,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            passwordHistory: []
          };

          const encrypted = await VaultService.encryptEntry(entry);
          await PasswordEntryDao.upsertEntry(context, encrypted);
          result.imported++;
        } catch (_e) {
          result.skipped++;
          result.errors.push('跳过一条记录');
        }
      }

      this.importResult = result;
      promptAction.showToast({
        message: `导入完成: ${result.imported} 条成功, ${result.skipped} 条跳过`
      });
    } catch (_e) {
      promptAction.showToast({ message: '导入失败' });
    } finally {
      this.isImporting = false;
    }
  }

  private parseFile(format: ImportFormat, content: string): ImportRecord[] {
    // Placeholder — implement per-format parsers
    // Each parser returns ImportRecord[]
    switch (format) {
      case 'bitwarden_csv':
        return this.parseBitwardenCsv(content);
      case 'bitwarden_json':
        return this.parseBitwardenJson(content);
      case 'lastpass_csv':
        return this.parseLastpassCsv(content);
      case 'chrome_csv':
        return this.parseChromeCsv(content);
      default:
        return this.parseGenericCsv(content);
    }
  }

  private parseBitwardenCsv(content: string): ImportRecord[] {
    const lines: string[] = content.split('\n');
    if (lines.length < 2) return [];

    const records: ImportRecord[] = [];
    for (let i: number = 1; i < lines.length; i++) {
      const line: string = lines[i].trim();
      if (line.length === 0) continue;

      const cols: string[] = this.parseCsvLine(line);
      if (cols.length < 8) continue;

      records.push({
        folder: cols[0] || null,
        favorite: cols[1] === '1',
        title: cols[3] || '',
        notes: cols[4] || '',
        url: cols[7] || '',
        username: cols[8] || '',
        password: cols[9] || '',
        tags: []
      });
    }
    return records;
  }

  private parseBitwardenJson(content: string): ImportRecord[] {
    const parsed: Record<string, Object> = JSON.parse(content) as Record<string, Object>;
    const items: Array<Record<string, Object>> = parsed['items'] as Array<Record<string, Object>>;
    if (items === undefined || items === null) return [];

    const records: ImportRecord[] = [];
    for (const item of items) {
      const login: Record<string, Object> | undefined =
        item['login'] as Record<string, Object> | undefined;
      if (login === undefined) continue;

      const uris: Array<Record<string, Object>> | undefined =
        login['uris'] as Array<Record<string, Object>> | undefined;
      const url: string = (uris !== undefined && uris.length > 0)
        ? (uris[0]['uri'] as string) ?? ''
        : '';

      records.push({
        title: (item['name'] as string) ?? '',
        username: (login['username'] as string) ?? '',
        password: (login['password'] as string) ?? '',
        url: url,
        notes: (item['notes'] as string) ?? '',
        folder: (item['folderId'] as string) ?? null,
        tags: [],
        favorite: (item['favorite'] as boolean) ?? false
      });
    }
    return records;
  }

  private parseLastpassCsv(content: string): ImportRecord[] {
    const lines: string[] = content.split('\n');
    if (lines.length < 2) return [];

    const records: ImportRecord[] = [];
    for (let i: number = 1; i < lines.length; i++) {
      const line: string = lines[i].trim();
      if (line.length === 0) continue;

      const cols: string[] = this.parseCsvLine(line);
      if (cols.length < 4) continue;

      records.push({
        url: cols[0] || '',
        username: cols[1] || '',
        password: cols[2] || '',
        title: cols[4] || cols[0] || '',
        notes: cols[3] || '',
        folder: cols.length > 5 ? (cols[5] || null) : null,
        tags: [],
        favorite: false
      });
    }
    return records;
  }

  private parseChromeCsv(content: string): ImportRecord[] {
    const lines: string[] = content.split('\n');
    if (lines.length < 2) return [];

    const records: ImportRecord[] = [];
    for (let i: number = 1; i < lines.length; i++) {
      const line: string = lines[i].trim();
      if (line.length === 0) continue;

      const cols: string[] = this.parseCsvLine(line);
      if (cols.length < 4) continue;

      records.push({
        title: cols[0] || '',
        url: cols[1] || '',
        username: cols[2] || '',
        password: cols[3] || '',
        notes: '',
        folder: null,
        tags: [],
        favorite: false
      });
    }
    return records;
  }

  private parseGenericCsv(content: string): ImportRecord[] {
    // For generic CSV, try to use headers as field names
    const lines: string[] = content.split('\n');
    if (lines.length < 2) return [];

    const headers: string[] = this.parseCsvLine(lines[0].toLowerCase());
    const titleIdx: number = headers.findIndex((h: string) =>
      h.includes('title') || h.includes('name'));
    const userIdx: number = headers.findIndex((h: string) =>
      h.includes('user') || h.includes('email'));
    const passIdx: number = headers.findIndex((h: string) =>
      h.includes('pass'));
    const urlIdx: number = headers.findIndex((h: string) =>
      h.includes('url') || h.includes('site') || h.includes('web'));
    const noteIdx: number = headers.findIndex((h: string) =>
      h.includes('note') || h.includes('comment'));

    const records: ImportRecord[] = [];
    for (let i: number = 1; i < lines.length; i++) {
      const line: string = lines[i].trim();
      if (line.length === 0) continue;

      const cols: string[] = this.parseCsvLine(line);
      records.push({
        title: titleIdx >= 0 && titleIdx < cols.length ? cols[titleIdx] : '',
        username: userIdx >= 0 && userIdx < cols.length ? cols[userIdx] : '',
        password: passIdx >= 0 && passIdx < cols.length ? cols[passIdx] : '',
        url: urlIdx >= 0 && urlIdx < cols.length ? cols[urlIdx] : '',
        notes: noteIdx >= 0 && noteIdx < cols.length ? cols[noteIdx] : '',
        folder: null,
        tags: [],
        favorite: false
      });
    }
    return records;
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current: string = '';
    let inQuotes: boolean = false;

    for (let i: number = 0; i < line.length; i++) {
      const char: string = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  build() {
    Column() {
      // Header
      Row() {
        Button('返回')
          .fontSize(14)
          .backgroundColor('transparent')
          .fontColor('#007DFF')
          .onClick(() => { router.back(); })
        Text('导入密码')
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
        Blank()
      }
      .width('100%')
      .padding({ left: 16, right: 16, top: 16 })

      Column({ space: 16 }) {
        // Supported formats info
        Text('支持格式: Bitwarden (CSV/JSON), 1Password (1PUX), LastPass (CSV), Chrome (CSV), 通用 CSV')
          .fontSize(12)
          .fontColor('#666666')
          .width('100%')

        // File selection
        Button(this.selectedFile.length > 0 ? '已选择: ' + this.selectedFile.split('/').pop() : '选择文件')
          .type(ButtonType.Capsule)
          .width('100%')
          .height(48)
          .backgroundColor('#F5F5F5')
          .fontColor('#007DFF')
          .onClick(() => { this.handleSelectFile(); })

        // Detected format
        if (this.detectedFormat !== null) {
          Row() {
            Text('检测到格式: ')
              .fontSize(14)
              .fontColor('#666666')
            Text(this.detectedFormat)
              .fontSize(14)
              .fontColor('#007DFF')
              .fontWeight(FontWeight.Medium)
          }
          .width('100%')
        }

        // Import button
        Button(this.isImporting ? '导入中...' : '开始导入')
          .type(ButtonType.Capsule)
          .width('100%')
          .height(48)
          .backgroundColor('#007DFF')
          .enabled(this.detectedFormat !== null && !this.isImporting)
          .onClick(() => { this.handleImport(); })

        // Result
        if (this.importResult !== null) {
          Column({ space: 8 }) {
            Text('导入结果')
              .fontSize(16)
              .fontWeight(FontWeight.Medium)
            Row() {
              Text('总计: ')
              Text(this.importResult.totalRows.toString())
                .fontColor('#007DFF')
            }
            Row() {
              Text('成功导入: ')
              Text(this.importResult.imported.toString())
                .fontColor('#00C853')
            }
            Row() {
              Text('跳过: ')
              Text(this.importResult.skipped.toString())
                .fontColor('#FF8C00')
            }
          }
          .width('100%')
          .padding(16)
          .backgroundColor('#FFFFFF')
          .borderRadius(8)
        }
      }
      .padding(16)
      .layoutWeight(1)
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#F5F5F5')
  }
}
