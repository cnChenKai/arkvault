// pages/generator/GeneratorPage.ets
// Password generator with configurable options.

import { router } from '@kit.ArkUI';
import {
  GeneratorOptions, DEFAULT_GENERATOR_OPTIONS,
  generatePassword, calculateStrength, getStrengthLabel
} from '../../services/PasswordGenerator';
import * as ClipboardService from '../../services/ClipboardService';

@Entry
@Component
struct GeneratorPage {
  @State password: string = '';
  @State options: GeneratorOptions = Object.assign({}, DEFAULT_GENERATOR_OPTIONS);
  @State strengthScore: number = 0;
  @State strengthLabel: string = '';

  aboutToAppear(): void {
    this.regenerate();
  }

  regenerate(): void {
    this.password = generatePassword(this.options);
    this.strengthScore = calculateStrength(this.password);
    this.strengthLabel = getStrengthLabel(this.strengthScore);
  }

  getStrengthColor(): string {
    if (this.strengthScore < 30) return '#E60012';
    if (this.strengthScore < 60) return '#FF8C00';
    if (this.strengthScore < 80) return '#007DFF';
    return '#00C853';
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
        Text('密码生成器')
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
        Blank()
      }
      .width('100%')
      .padding({ left: 16, right: 16, top: 16 })

      // Generated password
      Column() {
        Text(this.password)
          .fontSize(20)
          .fontFamily('monospace')
          .fontColor('#181818')
          .maxLines(2)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .width('100%')
          .padding(16)
          .backgroundColor('#FFFFFF')
          .borderRadius(8)

        // Strength indicator
        Row() {
          Text(this.strengthLabel)
            .fontSize(12)
            .fontColor(this.getStrengthColor())
          Blank()
          Text(this.strengthScore + '/100')
            .fontSize(12)
            .fontColor('#666666')
        }
        .width('100%')
        .margin({ top: 8 })

        // Strength bar
        Row() {
          Stack({ alignContent: Alignment.Start }) {
            Row()
              .width('100%')
              .height(4)
              .backgroundColor('#E5E5E5')
              .borderRadius(2)
            Row()
              .width((this.strengthScore) + '%')
              .height(4)
              .backgroundColor(this.getStrengthColor())
              .borderRadius(2)
          }
          .width('100%')
          .height(4)
        }
        .margin({ top: 4 })
      }
      .padding(16)

      // Options
      Column({ space: 12 }) {
        // Length slider
        Column() {
          Row() {
            Text('长度')
              .fontSize(14)
            Blank()
            Text(this.options.length.toString())
              .fontSize(14)
              .fontColor('#007DFF')
          }
          .width('100%')
          Slider({
            value: this.options.length,
            min: 8,
            max: 64,
            step: 1
          })
            .onChange((value: number) => {
              this.options = Object.assign({}, this.options, { length: value }) as GeneratorOptions;
              this.regenerate();
            })
        }

        // Toggle options
        this.buildToggle('大写字母 (A-Z)', this.options.useUppercase, (v: boolean) => {
          this.options = Object.assign({}, this.options, { useUppercase: v }) as GeneratorOptions;
          this.regenerate();
        })
        this.buildToggle('小写字母 (a-z)', this.options.useLowercase, (v: boolean) => {
          this.options = Object.assign({}, this.options, { useLowercase: v }) as GeneratorOptions;
          this.regenerate();
        })
        this.buildToggle('数字 (0-9)', this.options.useDigits, (v: boolean) => {
          this.options = Object.assign({}, this.options, { useDigits: v }) as GeneratorOptions;
          this.regenerate();
        })
        this.buildToggle('符号 (!@#$...)', this.options.useSymbols, (v: boolean) => {
          this.options = Object.assign({}, this.options, { useSymbols: v }) as GeneratorOptions;
          this.regenerate();
        })
        this.buildToggle('排除易混淆字符', this.options.excludeAmbiguous, (v: boolean) => {
          this.options = Object.assign({}, this.options, { excludeAmbiguous: v }) as GeneratorOptions;
          this.regenerate();
        })
      }
      .padding(16)

      // Action buttons
      Column({ space: 12 }) {
        Button('复制密码')
          .type(ButtonType.Capsule)
          .width('100%')
          .height(48)
          .backgroundColor('#007DFF')
          .onClick(() => { ClipboardService.copyToClipboard(this.password, '密码已复制'); })

        Button('重新生成')
          .type(ButtonType.Capsule)
          .width('100%')
          .height(48)
          .backgroundColor('#F5F5F5')
          .fontColor('#007DFF')
          .onClick(() => { this.regenerate(); })
      }
      .padding(16)
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#F5F5F5')
  }

  @Builder
  buildToggle(label: string, isOn: boolean, onChange: (v: boolean) => void) {
    Row() {
      Text(label)
        .fontSize(14)
        .fontColor('#181818')
      Blank()
      Toggle({ type: ToggleType.Switch, isOn: isOn })
        .onChange(onChange)
    }
    .width('100%')
  }
}
