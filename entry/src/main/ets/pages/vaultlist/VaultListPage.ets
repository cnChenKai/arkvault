// pages/vaultlist/VaultListPage.ets
// Main vault list with search, folder filter, and favorites.

import { router } from '@kit.ArkUI';
import { VaultService } from '../../services/VaultService';
import { PasswordEntry, EncryptedPasswordEntry } from '../../models/PasswordEntry';
import { PasswordEntryDao } from '../../dao/PasswordEntryDao';
import { ClipboardService } from '../../services/ClipboardService';
import { common } from '@kit.AbilityKit';

@Entry
@Component
struct VaultListPage {
  @State entries: PasswordEntry[] = [];
  @State searchQuery: string = '';
  @State isLoading: boolean = true;
  @State selectedFolder: string | null = null;

  async aboutToAppear(): Promise<void> {
    await this.loadEntries();
  }

  async loadEntries(): Promise<void> {
    this.isLoading = true;
    try {
      const context: common.UIAbilityContext = getContext() as common.UIAbilityContext;
      const encrypted: EncryptedPasswordEntry[] = this.searchQuery.length > 0
        ? await PasswordEntryDao.searchEntries(context, this.searchQuery)
        : await PasswordEntryDao.getAllEntries(context);

      const decrypted: PasswordEntry[] = [];
      for (const entry of encrypted) {
        try {
          decrypted.push(await VaultService.decryptEntry(entry));
        } catch (_e) {
          // Skip corrupted entries
        }
      }
      this.entries = decrypted;
    } catch (_e) {
      // Handle error
    } finally {
      this.isLoading = false;
    }
  }

  build() {
    Column() {
      // Header
      Row() {
        Text('密码库')
          .fontSize(24)
          .fontWeight(FontWeight.Bold)
        Blank()
        Button('+')
          .type(ButtonType.Circle)
          .width(36)
          .height(36)
          .backgroundColor('#007DFF')
          .fontColor('#FFFFFF')
          .onClick(() => {
            router.pushUrl({ url: 'pages/detail/DetailPage' });
          })
      }
      .width('100%')
      .padding({ left: 16, right: 16, top: 16, bottom: 8 })

      // Search bar
      TextInput({ placeholder: '搜索密码...', text: this.searchQuery })
        .onChange((value: string) => {
          this.searchQuery = value;
          this.loadEntries();
        })
        .margin({ left: 16, right: 16, bottom: 8 })

      // Entry list
      if (this.isLoading) {
        Column() {
          LoadingProgress()
            .width(48)
            .height(48)
        }
        .width('100%')
        .layoutWeight(1)
        .justifyContent(FlexAlign.Center)
      } else if (this.entries.length === 0) {
        Column() {
          Text('🔒')
            .fontSize(48)
          Text(this.searchQuery.length > 0 ? '未找到匹配项' : '密码库为空')
            .fontSize(16)
            .fontColor('#666666')
            .margin({ top: 12 })
          if (this.searchQuery.length === 0) {
            Button('添加第一条密码')
              .type(ButtonType.Capsule)
              .margin({ top: 16 })
              .onClick(() => {
                router.pushUrl({ url: 'pages/detail/DetailPage' });
              })
          }
        }
        .width('100%')
        .layoutWeight(1)
        .justifyContent(FlexAlign.Center)
      } else {
        List({ space: 8 }) {
          ForEach(this.entries, (entry: PasswordEntry) => {
            ListItem() {
              Row() {
                Column() {
                  Text(entry.title)
                    .fontSize(16)
                    .fontWeight(FontWeight.Medium)
                    .fontColor('#181818')
                  Text(entry.username.length > 0 ? entry.username : entry.url)
                    .fontSize(12)
                    .fontColor('#666666')
                    .margin({ top: 2 })
                    .maxLines(1)
                    .textOverflow({ overflow: TextOverflow.Ellipsis })
                }
                .layoutWeight(1)
                .alignItems(HorizontalAlign.Start)

                if (entry.favorite) {
                  Text('★')
                    .fontSize(16)
                    .fontColor('#FFD700')
                    .margin({ right: 8 })
                }

                Button('复制')
                  .type(ButtonType.Normal)
                  .height(32)
                  .fontSize(12)
                  .backgroundColor('#F5F5F5')
                  .fontColor('#007DFF')
                  .onClick(() => {
                    ClipboardService.copyToClipboard(entry.password, '密码已复制');
                  })
              }
              .width('100%')
              .padding(12)
              .backgroundColor('#FFFFFF')
              .borderRadius(8)
            }
            .onClick(() => {
              router.pushUrl({
                url: 'pages/detail/DetailPage',
                params: { entryId: entry.id }
              });
            })
          })
        }
        .width('100%')
        .layoutWeight(1)
        .padding({ left: 16, right: 16 })
      }

      // Bottom navigation
      Row() {
        Button('密码库')
          .fontSize(12)
          .backgroundColor('#007DFF')
          .fontColor('#FFFFFF')
        Button('生成器')
          .fontSize(12)
          .backgroundColor('#F5F5F5')
          .fontColor('#666666')
          .onClick(() => { router.pushUrl({ url: 'pages/generator/GeneratorPage' }); })
        Button('导入')
          .fontSize(12)
          .backgroundColor('#F5F5F5')
          .fontColor('#666666')
          .onClick(() => { router.pushUrl({ url: 'pages/import/ImportPage' }); })
        Button('设置')
          .fontSize(12)
          .backgroundColor('#F5F5F5')
          .fontColor('#666666')
          .onClick(() => { router.pushUrl({ url: 'pages/settings/SettingsPage' }); })
      }
      .width('100%')
      .justifyContent(FlexAlign.SpaceAround)
      .padding(12)
      .backgroundColor('#FFFFFF')
      .border({ width: { top: 1 }, color: '#E5E5E5' })
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#F5F5F5')
  }
}
