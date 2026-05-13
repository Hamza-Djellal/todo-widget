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
    const group = new Adw.PreferencesGroup({
      title: 'Todo Widget Settings',
      description: 'Configure your todo list desktop widget.',
    });
    page.add(group);

    // Themes
    const themeRow = new Adw.ComboRow({
      title: 'Theme',
      subtitle: 'Select a preset theme',
      model: Gtk.StringList.new(['Dark', 'Light', 'Dracula', 'Nord', 'Gruvbox']),
    });
    
    // Map dropdown index to theme key
    const themeKeys = ['dark', 'light', 'dracula', 'nord', 'gruvbox'];
    const currentTheme = this._settings.get_string('theme');
    const currentIndex = themeKeys.indexOf(currentTheme);
    if (currentIndex !== -1) {
      themeRow.selected = currentIndex;
    }

    themeRow.connect('notify::selected', () => {
      const selectedTheme = themeKeys[themeRow.selected];
      this._settings.set_string('theme', selectedTheme);
      
      // Apply theme colors
      const themeColors = THEMES[selectedTheme as keyof typeof THEMES];
      if (themeColors) {
        this._settings.set_string('background-color', themeColors.bg);
        this._settings.set_string('border-color', themeColors.border);
        this._settings.set_string('text-color', themeColors.text);
        
        // Update UI rows
        if (this._bgColorRow) this._bgColorRow.text = themeColors.bg;
        if (this._borderColorRow) this._borderColorRow.text = themeColors.border;
        if (this._textColorRow) this._textColorRow.text = themeColors.text;
      }
    });
    group.add(themeRow);

    // Appearance
    this._bgColorRow = this._createColorRow('background-color', 'Background Color', 'Background color in rgba(...) format');
    this._borderColorRow = this._createColorRow('border-color', 'Border Color', 'Border color in rgba(...) format');
    this._textColorRow = this._createColorRow('text-color', 'Text Color', 'Text color in rgba(...) format');
    
    group.add(this._bgColorRow);
    group.add(this._borderColorRow);
    group.add(this._textColorRow);
    group.add(this._createSpinRow('border-radius', 'Border Radius', 'Corner radius in pixels', 0, 50, 1));
    group.add(this._createSpinRow('padding-horizontal', 'Horizontal Padding', 'Left and right padding in pixels', 0, 100, 1));
    group.add(this._createSpinRow('padding-vertical', 'Vertical Padding', 'Top and bottom padding in pixels', 0, 100, 1));

    // Position
    group.add(this._createSpinRow('position-x', 'X Position (%)', 'Horizontal position on screen', 0, 100, 1));
    group.add(this._createSpinRow('position-y', 'Y Position (%)', 'Vertical position on screen', 0, 100, 1));

    // Behavior
    group.add(this._createSpinRow('label-font-size', 'Font Size', 'Size of task text in pixels', 8, 48, 1));
    group.add(this._createStringRow('todo-file-path', 'Todo File Path', 'Path to your tasks file (e.g., ~/todo.txt)'));
    group.add(this._createSpinRow('update-interval', 'Update Interval', 'Refresh time in milliseconds', 1000, 3600000, 1000));

    window.add(page);
  }

  private _createColorRow(key: string, title: string, subtitle: string): Adw.EntryRow {
    const row = new Adw.EntryRow({
      title,
      text: this._settings.get_string(key),
    });

    row.connect('changed', () => {
      this._settings.set_string(key, row.text);
      // Change theme to 'custom' if user edits a color
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
