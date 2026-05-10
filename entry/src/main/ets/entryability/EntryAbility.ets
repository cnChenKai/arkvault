// entryability/EntryAbility.ets
// Application entry ability.

import { AbilityConstant, UIAbility, Want } from '@kit.AbilityKit';
import { hilog } from '@kit.PerformanceAnalysisKit';
import { window } from '@kit.ArkUI';

const TAG: string = 'EntryAbility';
const DOMAIN: number = 0xFF00;

export default class EntryAbility extends UIAbility {
  onCreate(want: Want, launchParam: AbilityConstant.LaunchParam): void {
    hilog.info(DOMAIN, TAG, 'ArkVault launched');
  }

  onDestroy(): void {
    hilog.info(DOMAIN, TAG, 'ArkVault destroyed');
  }

  onWindowStageCreate(windowStage: window.WindowStage): void {
    windowStage.loadContent('pages/lock/LockPage', (err) => {
      if (err.code !== 0) {
        hilog.error(DOMAIN, TAG, 'Failed to load LockPage: %{public}s', JSON.stringify(err));
        return;
      }
      hilog.info(DOMAIN, TAG, 'LockPage loaded');
    });
  }

  onWindowStageDestroy(): void {
    // Lock vault on window close
    hilog.info(DOMAIN, TAG, 'Window stage destroyed');
  }

  onForeground(): void {
    hilog.info(DOMAIN, TAG, 'Foreground');
  }

  onBackground(): void {
    // Clear clipboard on background
    hilog.info(DOMAIN, TAG, 'Background');
  }
}
