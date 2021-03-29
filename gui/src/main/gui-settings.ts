import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { IGuiSettingsState, SYSTEM_PREFERRED_LOCALE_KEY } from '../shared/gui-settings-state';
import log from '../shared/logging';

const settingsSchema = {
  preferredLocale: 'string',
  autoConnect: 'boolean',
  enableSystemNotifications: 'boolean',
  monochromaticIcon: 'boolean',
  startMinimized: 'boolean',
  unpinnedWindow: 'boolean',
  browsedForSplitTunnelingApplications: 'Array<string>',
};

const defaultSettings: IGuiSettingsState = {
  preferredLocale: SYSTEM_PREFERRED_LOCALE_KEY,
  autoConnect: false,
  enableSystemNotifications: true,
  monochromaticIcon: false,
  startMinimized: false,
  unpinnedWindow: process.platform !== 'win32' && process.platform !== 'darwin',
  browsedForSplitTunnelingApplications: [],
};

export default class GuiSettings {
  public onChange?: (newState: IGuiSettingsState, oldState: IGuiSettingsState) => void;

  private stateValue: IGuiSettingsState = { ...defaultSettings };

  get state(): IGuiSettingsState {
    return this.stateValue;
  }

  set preferredLocale(newValue: string) {
    this.changeStateAndNotify({ ...this.stateValue, preferredLocale: newValue });
  }

  get preferredLocale(): string {
    return this.stateValue.preferredLocale;
  }

  set enableSystemNotifications(newValue: boolean) {
    this.changeStateAndNotify({ ...this.stateValue, enableSystemNotifications: newValue });
  }

  get enableSystemNotifications(): boolean {
    return this.stateValue.enableSystemNotifications;
  }

  set autoConnect(newValue: boolean) {
    this.changeStateAndNotify({ ...this.stateValue, autoConnect: newValue });
  }

  get autoConnect(): boolean {
    return this.stateValue.autoConnect;
  }

  set monochromaticIcon(newValue: boolean) {
    this.changeStateAndNotify({ ...this.stateValue, monochromaticIcon: newValue });
  }

  get monochromaticIcon(): boolean {
    return this.stateValue.monochromaticIcon;
  }

  set startMinimized(newValue: boolean) {
    this.changeStateAndNotify({ ...this.stateValue, startMinimized: newValue });
  }

  get startMinimized(): boolean {
    return this.stateValue.startMinimized;
  }

  set unpinnedWindow(newValue: boolean) {
    this.changeStateAndNotify({ ...this.stateValue, unpinnedWindow: newValue });
  }

  get unpinnedWindow(): boolean {
    return this.stateValue.unpinnedWindow;
  }

  public addBrowsedForSplitTunnelingapplications(newApp: string) {
    this.changeStateAndNotify({
      ...this.stateValue,
      browsedForSplitTunnelingApplications: [...this.browsedForSplitTunnelingApplications, newApp],
    });
  }

  get browsedForSplitTunnelingApplications(): Array<string> {
    return this.stateValue.browsedForSplitTunnelingApplications;
  }

  public load() {
    try {
      const settingsFile = this.filePath();
      const contents = fs.readFileSync(settingsFile, 'utf8');
      const rawJson = JSON.parse(contents);

      this.stateValue = {
        ...defaultSettings,
        ...this.validateSettings(rawJson),
      };
    } catch (error) {
      // Read settings if the file exists, otherwise write the default settings to it.
      if (error.code === 'ENOENT') {
        log.debug('Creating gui-settings file and writing the default settings to it');
        this.store();
      } else {
        log.error(`Failed to read GUI settings file: ${error}`);
      }
    }
  }

  public store() {
    try {
      const settingsFile = this.filePath();

      fs.writeFileSync(settingsFile, JSON.stringify(this.stateValue));
    } catch (error) {
      log.error(`Failed to write GUI settings file: ${error}`);
    }
  }

  private validateSettings(settings: Record<string, unknown>) {
    Object.entries(settingsSchema).forEach(([key, expectedType]) => {
      if (/^Array<.*>/.test(expectedType)) {
        const value = settings[key];
        if (!Array.isArray(value)) {
          throw new Error(`Expected ${key} to be array but wasn't`);
        } else {
          const expectedInnerType = expectedType.replace(/^Array</, '').replace(/>$/, '');
          const innerTypes: string[] = value.map((value) => typeof value);
          if (
            innerTypes.some((value) => value !== innerTypes[0]) ||
            innerTypes[0] !== expectedInnerType
          ) {
            throw new Error(`Expected ${key} to to contain ${expectedInnerType}s`);
          }
        }
      } else {
        const actualType = typeof settings[key];
        if (key in settings && actualType !== expectedType) {
          throw new Error(`Expected ${key} to be of type ${expectedType} but was ${actualType}`);
        }
      }
    });

    return settings as Partial<IGuiSettingsState>;
  }

  private filePath() {
    return path.join(app.getPath('userData'), 'gui_settings.json');
  }

  private changeStateAndNotify(newState: IGuiSettingsState) {
    const oldState = this.stateValue;
    this.stateValue = newState;

    this.store();

    if (this.onChange) {
      this.onChange({ ...newState }, oldState);
    }
  }
}
