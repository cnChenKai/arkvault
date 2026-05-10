// pages/lock/LockPage.ets
// Lock screen — master password entry.

import { router, promptAction } from '@kit.ArkUI';
import * as VaultService from '../../services/VaultService';
import { common } from '@kit.AbilityKit';

@Entry
@Component
struct LockPage {
  @State masterPassword: string = '';
  @State isLoading: boolean = false;
  @State errorMessage: string = '';
  @State isFirstTime: boolean = false;

  async aboutToAppear(): Promise<void> {
    this.isFirstTime = !(await VaultService.isVaultInitialized());
  }

  async handleUnlock(): Promise<void> {
    if (this.masterPassword.length === 0) {
      this.errorMessage = '请输入主密码';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      if (this.isFirstTime) {
        await VaultService.initializeVault(getContext() as common.UIAbilityContext, this.masterPassword);
        router.replaceUrl({ url: 'pages/vaultlist/VaultListPage' });
      } else {
        const success: boolean = await VaultService.unlockWithPassword(this.masterPassword);
        if (success) {
          router.replaceUrl({ url: 'pages/vaultlist/VaultListPage' });
        } else {
          this.errorMessage = '密码错误，请重试';
        }
      }
    } catch (_e) {
      this.errorMessage = '解锁失败，请重试';
    } finally {
      this.isLoading = false;
    }
  }

  build() {
    Column() {
      // Logo area
      Column() {
        Text('🔐')
          .fontSize(64)
          .margin({ bottom: 16 })
        Text('ArkVault')
          .fontSize(28)
          .fontWeight(FontWeight.Bold)
          .fontColor('#181818')
        Text('安全密码管理')
          .fontSize(14)
          .fontColor('#666666')
          .margin({ top: 4 })
      }
      .margin({ top: 120 })

      // Password input
      Column() {
        TextInput({ placeholder: '输入主密码', text: this.masterPassword })
          .type(InputType.Password)
          .onChange((value: string) => { this.masterPassword = value; })
          .onSubmit(() => { this.handleUnlock(); })
          .width('100%')
          .height(48)

        if (this.errorMessage.length > 0) {
          Text(this.errorMessage)
            .fontSize(12)
            .fontColor('#E60012')
            .margin({ top: 8 })
        }
      }
      .margin({ top: 48, left: 32, right: 32 })

      // Buttons
      Column() {
        Button(this.isFirstTime ? '创建密码库' : '解锁')
          .type(ButtonType.Capsule)
          .width('100%')
          .height(48)
          .backgroundColor('#007DFF')
          .onClick(() => { this.handleUnlock(); })
          .enabled(!this.isLoading)
      }
      .margin({ top: 32, left: 32, right: 32 })

      Row().layoutWeight(1)
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#FFFFFF')
  }
}
