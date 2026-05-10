// pages/lock/LockPage.ets
// Lock screen — master password entry and biometric unlock.

import { router } from '@kit.ArkUI';
import { promptAction } from '@kit.ArkUI';
import { userAuth } from '@kit.UserAuthenticationKit';
import { VaultService } from '../../services/VaultService';

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
        await VaultService.initializeVault(getContext(), this.masterPassword);
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

  async handleBiometricUnlock(): Promise<void> {
    try {
      const authParam: userAuth.UserAuthParam = {
        challenge: new Uint8Array(32),
        authType: [userAuth.UserAuthType.FINGERPRINT, userAuth.UserAuthType.FACE],
        authTrustLevel: userAuth.AuthTrustLevel.ATL1
      };

      const result: userAuth.UserAuthResult =
        await userAuth.getUserAuth(authParam, {
          title: '解锁 ArkVault'
        });

      if (result.result === userAuth.UserAuthResultCode.SUCCESS) {
        router.replaceUrl({ url: 'pages/vaultlist/VaultListPage' });
      }
    } catch (_e) {
      promptAction.showToast({ message: '生物识别不可用' });
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

        if (!this.isFirstTime) {
          Button('使用生物识别')
            .type(ButtonType.Capsule)
            .width('100%')
            .height(48)
            .backgroundColor('#F5F5F5')
            .fontColor('#007DFF')
            .margin({ top: 12 })
            .onClick(() => { this.handleBiometricUnlock(); })
        }
      }
      .margin({ top: 32, left: 32, right: 32 })

      Spacer()
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#FFFFFF')
  }
}
