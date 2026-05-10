// pages/detail/DetailPage.ets
// Password entry detail — view, edit, copy, and delete.

import { router } from '@kit.ArkUI';
import { promptAction } from '@kit.ArkUI';
import { PasswordEntry, createEmptyEntry } from '../../models/PasswordEntry';
import * as VaultService from '../../services/VaultService';
import * as ClipboardService from '../../services/ClipboardService';
import * as PasswordEntryDao from '../../dao/PasswordEntryDao';
import { common } from '@kit.AbilityKit';

@Entry
@Component
struct DetailPage {
  @State entry: PasswordEntry = createEmptyEntry();
  @State isEditing: boolean = false;
  @State isSaving: boolean = false;
  @State showPassword: boolean = false;
  @State entryId: string = '';

  async aboutToAppear(): Promise<void> {
    const params: Record<string, Object> = router.getParams() as Record<string, Object>;
    if (params !== undefined && params !== null && params['entryId'] !== undefined) {
      this.entryId = params['entryId'] as string;
      await this.loadEntry();
    } else {
      this.isEditing = true;
    }
  }

  async loadEntry(): Promise<void> {
    try {
      const context: common.UIAbilityContext = getContext() as common.UIAbilityContext;
      const encrypted = await PasswordEntryDao.getEntryById(context, this.entryId);
      if (encrypted !== null) {
        this.entry = await VaultService.decryptEntry(encrypted);
      }
    } catch (_e) {
      promptAction.showToast({ message: '加载失败' });
    }
  }

  async handleSave(): Promise<void> {
    if (this.entry.title.length === 0) {
      promptAction.showToast({ message: '请输入标题' });
      return;
    }

    this.isSaving = true;
    try {
      const context: common.UIAbilityContext = getContext() as common.UIAbilityContext;
      const encrypted = await VaultService.encryptEntry(this.entry);
      await PasswordEntryDao.upsertEntry(context, encrypted);
      this.entry.id = encrypted.id;
      this.isEditing = false;
      promptAction.showToast({ message: '已保存' });
    } catch (_e) {
      promptAction.showToast({ message: '保存失败' });
    } finally {
      this.isSaving = false;
    }
  }

  async handleDelete(): Promise<void> {
    promptAction.showDialog({
      title: '确认删除',
      message: '此操作不可恢复',
      buttons: [
        { text: '取消', color: '#666666' },
        { text: '删除', color: '#E60012' }
      ]
    }).then((result: promptAction.ShowDialogSuccessResponse) => {
      if (result.index === 1) {
        const context: common.UIAbilityContext = getContext() as common.UIAbilityContext;
        PasswordEntryDao.deleteEntry(context, this.entry.id);
        router.back();
      }
    });
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
        Blank()
        if (!this.isEditing) {
          Button('编辑')
            .fontSize(14)
            .backgroundColor('transparent')
            .fontColor('#007DFF')
            .onClick(() => { this.isEditing = true; })
        }
      }
      .width('100%')
      .padding({ left: 16, right: 16, top: 16 })

      Scroll() {
        Column({ space: 16 }) {
          // Title
          this.buildField('标题', this.entry.title, (v: string) => {
            this.entry = Object.assign({}, this.entry, { title: v }) as PasswordEntry;
          })

          // Username
          this.buildFieldWithCopy('用户名', this.entry.username, this.isEditing,
            (v: string) => { this.entry = Object.assign({}, this.entry, { username: v }) as PasswordEntry; },
            () => { ClipboardService.copyToClipboard(this.entry.username, '用户名已复制'); })

          // Password
          Column() {
            Text('密码')
              .fontSize(12)
              .fontColor('#666666')
            Row() {
              if (this.showPassword || this.isEditing) {
                TextInput({ text: this.entry.password })
                  .type(InputType.Password)
                  .onChange((v: string) => {
                    this.entry = Object.assign({}, this.entry, { password: v }) as PasswordEntry;
                  })
                  .layoutWeight(1)
              } else {
                Text('••••••••')
                  .fontSize(16)
                  .layoutWeight(1)
              }
              Button(this.showPassword ? '隐藏' : '显示')
                .fontSize(12)
                .backgroundColor('transparent')
                .fontColor('#007DFF')
                .onClick(() => { this.showPassword = !this.showPassword; })
              Button('复制')
                .fontSize(12)
                .backgroundColor('transparent')
                .fontColor('#007DFF')
                .onClick(() => { ClipboardService.copyToClipboard(this.entry.password, '密码已复制'); })
            }
          }

          // URL
          this.buildFieldWithCopy('网址', this.entry.url, this.isEditing,
            (v: string) => { this.entry = Object.assign({}, this.entry, { url: v }) as PasswordEntry; },
            () => { ClipboardService.copyToClipboard(this.entry.url, '网址已复制'); })

          // Notes
          this.buildField('备注', this.entry.notes, (v: string) => {
            this.entry = Object.assign({}, this.entry, { notes: v }) as PasswordEntry;
          }, true)

          // Favorite toggle
          Row() {
            Text('收藏')
              .fontSize(14)
              .fontColor('#181818')
            Blank()
            Toggle({ type: ToggleType.Switch, isOn: this.entry.favorite })
              .onChange((isOn: boolean) => {
                this.entry = Object.assign({}, this.entry, { favorite: isOn }) as PasswordEntry;
              })
          }
          .width('100%')

          // Action buttons
          if (this.isEditing) {
            Button('保存')
              .type(ButtonType.Capsule)
              .width('100%')
              .height(48)
              .backgroundColor('#007DFF')
              .onClick(() => { this.handleSave(); })
              .enabled(!this.isSaving)
          }

          if (this.entryId.length > 0 && !this.isEditing) {
            Button('删除')
              .type(ButtonType.Capsule)
              .width('100%')
              .height(48)
              .backgroundColor('#FFFFFF')
              .fontColor('#E60012')
              .border({ width: 1, color: '#E60012' })
              .margin({ top: 8 })
              .onClick(() => { this.handleDelete(); })
          }
        }
        .padding(16)
      }
      .layoutWeight(1)
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#F5F5F5')
  }

  @Builder
  buildField(
    label: string,
    value: string,
    onChange: (v: string) => void,
    multiline: boolean = false
  ) {
    Column() {
      Text(label)
        .fontSize(12)
        .fontColor('#666666')
      if (this.isEditing) {
        TextInput({ text: value })
          .onChange(onChange)
          .width('100%')
      } else {
        Text(value.length > 0 ? value : '—')
          .fontSize(16)
          .fontColor('#181818')
          .width('100%')
      }
    }
    .width('100%')
  }

  @Builder
  buildFieldWithCopy(
    label: string,
    value: string,
    editing: boolean,
    onChange: (v: string) => void,
    onCopy: () => void
  ) {
    Row() {
      Column() {
        Text(label)
          .fontSize(12)
          .fontColor('#666666')
        if (editing) {
          TextInput({ text: value })
            .onChange(onChange)
            .width('100%')
        } else {
          Text(value.length > 0 ? value : '—')
            .fontSize(16)
            .fontColor('#181818')
        }
      }
      .layoutWeight(1)

      if (!editing && value.length > 0) {
        Button('复制')
          .fontSize(12)
          .backgroundColor('transparent')
          .fontColor('#007DFF')
          .onClick(onCopy)
      }
    }
    .width('100%')
  }
}
