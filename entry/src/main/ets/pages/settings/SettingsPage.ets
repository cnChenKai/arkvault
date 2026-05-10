// pages/settings/SettingsPage.ets
// App settings — biometric, auto-lock, clipboard, server config.

import { router } from '@kit.ArkUI';
import { promptAction } from '@kit.ArkUI';

@Entry
@Component
struct SettingsPage {
  @State biometricEnabled: boolean = false;
  @State autoLockSeconds: number = 300;
  @State clipboardClearSeconds: number = 30;
  @State serverUrl: string = '';
  @State syncEnabled: boolean = false;

  build() {
    Column() {
      // Header
      Row() {
        Button('返回')
          .fontSize(14)
          .backgroundColor('transparent')
          .fontColor('#007DFF')
          .onClick(() => { router.back(); })
        Text('设置')
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
        Blank()
      }
      .width('100%')
      .padding({ left: 16, right: 16, top: 16 })

      Scroll() {
        Column({ space: 16 }) {
          // Security section
          this.buildSection('安全', [
            this.buildToggleRow('生物识别解锁', this.biometricEnabled, (v: boolean) => {
              this.biometricEnabled = v;
            }),
            this.buildSelectRow('自动锁定', this.formatSeconds(this.autoLockSeconds), () => {
              // Show picker
            }),
            this.buildSelectRow('剪贴板清除', this.formatSeconds(this.clipboardClearSeconds), () => {
              // Show picker
            })
          ])

          // Sync section (Phase 2)
          this.buildSection('同步 (Phase 2)', [
            this.buildToggleRow('启用同步', this.syncEnabled, (v: boolean) => {
              this.syncEnabled = v;
            }),
            this.buildInputRow('服务器地址', this.serverUrl, (v: string) => {
              this.serverUrl = v;
            })
          ])

          // About section
          this.buildSection('关于', [
            this.buildInfoRow('版本', '1.0.0'),
            this.buildInfoRow('开发者', 'ArkVault Team')
          ])

          // Danger zone
          Button('重置密码库')
            .type(ButtonType.Capsule)
            .width('100%')
            .height(48)
            .backgroundColor('#FFFFFF')
            .fontColor('#E60012')
            .border({ width: 1, color: '#E60012' })
            .onClick(() => {
              promptAction.showDialog({
                title: '确认重置',
                message: '所有数据将被删除，此操作不可恢复',
                buttons: [
                  { text: '取消', color: '#666666' },
                  { text: '重置', color: '#E60012' }
                ]
              });
            })
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
  buildSection(title: string, children: object[]) {
    Column({ space: 0 }) {
      Text(title)
        .fontSize(12)
        .fontColor('#666666')
        .padding({ left: 16, top: 12, bottom: 8 })
        .width('100%')
      Column({ space: 0 }) {
        ForEach(children, (child: object) => {
          // children are built by their own builders
        })
      }
      .width('100%')
      .backgroundColor('#FFFFFF')
      .borderRadius(8)
    }
    .width('100%')
  }

  @Builder
  buildToggleRow(label: string, isOn: boolean, onChange: (v: boolean) => void) {
    Row() {
      Text(label)
        .fontSize(16)
        .fontColor('#181818')
      Blank()
      Toggle({ type: ToggleType.Switch, isOn: isOn })
        .onChange(onChange)
    }
    .width('100%')
    .padding({ left: 16, right: 16, top: 12, bottom: 12 })
  }

  @Builder
  buildSelectRow(label: string, value: string, onClick: () => void) {
    Row() {
      Text(label)
        .fontSize(16)
        .fontColor('#181818')
      Blank()
      Text(value)
        .fontSize(14)
        .fontColor('#666666')
      Text(' >')
        .fontSize(14)
        .fontColor('#CCCCCC')
    }
    .width('100%')
    .padding({ left: 16, right: 16, top: 12, bottom: 12 })
    .onClick(onClick)
  }

  @Builder
  buildInputRow(label: string, value: string, onChange: (v: string) => void) {
    Column() {
      Text(label)
        .fontSize(16)
        .fontColor('#181818')
      TextInput({ text: value, placeholder: '输入服务器地址' })
        .onChange(onChange)
        .width('100%')
        .margin({ top: 4 })
    }
    .width('100%')
    .padding({ left: 16, right: 16, top: 12, bottom: 12 })
  }

  @Builder
  buildInfoRow(label: string, value: string) {
    Row() {
      Text(label)
        .fontSize(16)
        .fontColor('#181818')
      Blank()
      Text(value)
        .fontSize(14)
        .fontColor('#666666')
    }
    .width('100%')
    .padding({ left: 16, right: 16, top: 12, bottom: 12 })
  }

  private formatSeconds(seconds: number): string {
    if (seconds < 60) return seconds + ' 秒';
    if (seconds < 3600) return (seconds / 60) + ' 分钟';
    return (seconds / 3600) + ' 小时';
  }
}
