import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const THEMES = {
  dark: { bg: 'rgba(0, 0, 0, 0.8)', border: 'rgba(255, 255, 255, 0.2)', text: 'rgba(255, 255, 255, 0.9)' },
  light: { bg: 'rgba(255, 255, 255, 0.8)', border: 'rgba(0, 0, 0, 0.2)', text: 'rgba(0, 0, 0, 0.9)' },
  dracula: { bg: 'rgba(40, 42, 54, 0.9)', border: 'rgba(98, 114, 164, 0.5)', text: 'rgba(248, 248, 242, 1)' },
  nord: { bg: 'rgba(46, 52, 64, 0.9)', border: 'rgba(76, 86, 106, 0.5)', text: 'rgba(236, 239, 244, 1)' },
  gruvbox: { bg: 'rgba(40, 40, 40, 0.9)', border: 'rgba(168, 153, 132, 0.5)', text: 'rgba(235, 219, 178, 1)' }
};

export default class TodoWidgetPreferences extends ExtensionPreferences {
  private _settings!: Gio.Settings;
  private _bgColorRow!: Adw.EntryRow;
  private _borderColorRow!: Adw.EntryRow;
  private _textColorRow!: Adw.EntryRow;

  async fillPreferencesWindow(window: Adw.PreferencesWindow): Promise<void> {
    this._settings = this.getSettings();

    const page = new Adw.PreferencesPage();
    window.add(page);

    // Group 1: Appearance
    const appearanceGroup = new Adw.PreferencesGroup({
      title: 'Appearance',
      description: 'Customize the styling and theme of the widget.',
    });
    page.add(appearanceGroup);

    // Themes dropdown (includes System theme)
    const themeKeys = ['system', 'dark', 'light', 'dracula', 'nord', 'gruvbox', 'custom'];
    const themeRow = new Adw.ComboRow({
      title: 'Theme Preset',
      subtitle: 'Select a theme preset or use a custom one',
      model: Gtk.StringList.new(['System', 'Dark', 'Light', 'Dracula', 'Nord', 'Gruvbox', 'Custom']),
    });

    const currentTheme = this._settings.get_string('theme');
    const currentIndex = themeKeys.indexOf(currentTheme);
    if (currentIndex !== -1) {
      themeRow.selected = currentIndex;
    }

    themeRow.connect('notify::selected', () => {
      const selectedTheme = themeKeys[themeRow.selected];
      this._settings.set_string('theme', selectedTheme);

      if (selectedTheme !== 'custom' && selectedTheme !== 'system') {
        const themeColors = THEMES[selectedTheme as keyof typeof THEMES];
        if (themeColors) {
          this._settings.set_string('background-color', themeColors.bg);
          this._settings.set_string('border-color', themeColors.border);
          this._settings.set_string('text-color', themeColors.text);

          if (this._bgColorRow) this._bgColorRow.text = themeColors.bg;
          if (this._borderColorRow) this._borderColorRow.text = themeColors.border;
          if (this._textColorRow) this._textColorRow.text = themeColors.text;
        }
      }
    });
    appearanceGroup.add(themeRow);

    // Custom Color Entries
    this._bgColorRow = this._createColorRow('background-color', 'Custom Background Color', 'RGBA format (e.g. rgba(0,0,0,0.8))');
    this._borderColorRow = this._createColorRow('border-color', 'Custom Border Color', 'RGBA format');
    this._textColorRow = this._createColorRow('text-color', 'Custom Text Color', 'RGBA format');

    appearanceGroup.add(this._bgColorRow);
    appearanceGroup.add(this._borderColorRow);
    appearanceGroup.add(this._textColorRow);

    appearanceGroup.add(this._createSpinRow('border-radius', 'Border Radius', 'Corner radius in pixels', 0, 50, 1));
    appearanceGroup.add(this._createSpinRow('padding-horizontal', 'Horizontal Padding', 'Left and right padding in pixels', 0, 100, 1));
    appearanceGroup.add(this._createSpinRow('padding-vertical', 'Vertical Padding', 'Top and bottom padding in pixels', 0, 100, 1));
    appearanceGroup.add(this._createSpinRow('label-font-size', 'Font Size', 'Size of task text in pixels', 8, 48, 1));

    // Group 2: Behavior & Position
    const behaviorGroup = new Adw.PreferencesGroup({
      title: 'Behavior & Positioning',
      description: 'Configure interaction and file settings.',
    });
    page.add(behaviorGroup);

    // Lock position row (SwitchRow)
    const lockPositionRow = new Adw.SwitchRow({
      title: 'Lock Widget Position',
      subtitle: 'Disable drag-and-drop to prevent accidental moves on the desktop',
      active: this._settings.get_boolean('lock-position'),
    });
    lockPositionRow.connect('notify::active', () => {
      this._settings.set_boolean('lock-position', lockPositionRow.active);
    });
    behaviorGroup.add(lockPositionRow);

    // Show Completed tasks (SwitchRow)
    const showCompletedRow = new Adw.SwitchRow({
      title: 'Show Completed Tasks',
      subtitle: 'Display checked-off tasks in the list',
      active: this._settings.get_boolean('show-completed'),
    });
    showCompletedRow.connect('notify::active', () => {
      this._settings.set_boolean('show-completed', showCompletedRow.active);
    });
    behaviorGroup.add(showCompletedRow);

    // Completed task behavior (ComboRow)
    const completedBehaviorRow = new Adw.ComboRow({
      title: 'Completed Task Action',
      subtitle: 'What happens when a task is checked off',
      model: Gtk.StringList.new(['Cross out task (todo.txt style)', 'Delete task immediately']),
    });
    const behaviorKeys = ['cross', 'delete'];
    const currentBehavior = this._settings.get_string('completed-behavior');
    const behaviorIndex = behaviorKeys.indexOf(currentBehavior);
    if (behaviorIndex !== -1) {
      completedBehaviorRow.selected = behaviorIndex;
    }
    completedBehaviorRow.connect('notify::selected', () => {
      this._settings.set_string('completed-behavior', behaviorKeys[completedBehaviorRow.selected]);
    });
    behaviorGroup.add(completedBehaviorRow);

    // File path and interval
    behaviorGroup.add(this._createStringRow('todo-file-path', 'Todo File Path', 'Path to your tasks file'));
    behaviorGroup.add(this._createSpinRow('update-interval', 'Fallback Update Interval', 'Refresh time in milliseconds (0 to disable)', 0, 3600000, 1000));

    // Fine-tuned manual position adjustment
    const positionGroup = new Adw.PreferencesGroup({
      title: 'Manual Position Fine-tuning',
      description: 'Coordinates as percentage of the screen width and height.',
    });
    page.add(positionGroup);

    positionGroup.add(this._createSpinRow('position-x', 'X Position (%)', 'Horizontal desktop coordinates', 0, 100, 1));
    positionGroup.add(this._createSpinRow('position-y', 'Y Position (%)', 'Vertical desktop coordinates', 0, 100, 1));
  }

  private _createColorRow(key: string, title: string, subtitle: string): Adw.EntryRow {
    const row = new Adw.EntryRow({
      title,
      text: this._settings.get_string(key),
    });

    row.connect('changed', () => {
      this._settings.set_string(key, row.text);
      this._settings.set_string('theme', 'custom');
    });

    return row;
  }

  private _createSpinRow(
    key: string,
    title: string,
    subtitle: string,
    min: number,
    max: number,
    step: number,
  ): Adw.SpinRow {
    let currentValue = 0;
    const variantType = this._settings.get_value(key).get_type_string();
    if (variantType === 'd') {
      currentValue = this._settings.get_double(key);
    } else {
      currentValue = this._settings.get_int(key);
    }

    const row = new Adw.SpinRow({
      title,
      subtitle,
      numeric: true,
      adjustment: new Gtk.Adjustment({
        lower: min,
        upper: max,
        step_increment: step,
        value: currentValue,
      }),
    });

    row.connect('notify::value', () => {
      if (variantType === 'd') {
        this._settings.set_double(key, row.value);
      } else {
        this._settings.set_int(key, Math.round(row.value));
      }
    });

    return row;
  }

  private _createStringRow(key: string, title: string, subtitle: string): Adw.EntryRow {
    const row = new Adw.EntryRow({
      title,
      text: this._settings.get_string(key),
    });

    row.connect('changed', () => {
      this._settings.set_string(key, row.text);
    });

    return row;
  }
}
