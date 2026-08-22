import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import GLib from 'gi://GLib';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const THEMES = {
  dark: { bg: 'rgba(0, 0, 0, 0.8)', border: 'rgba(255, 255, 255, 0.2)', text: 'rgba(255, 255, 255, 0.9)', header: 'rgba(255, 255, 255, 0.9)' },
  light: { bg: 'rgba(255, 255, 255, 0.8)', border: 'rgba(0, 0, 0, 0.2)', text: 'rgba(0, 0, 0, 0.9)', header: 'rgba(0, 0, 0, 0.9)' },
  dracula: { bg: 'rgba(40, 42, 54, 0.9)', border: 'rgba(98, 114, 164, 0.5)', text: 'rgba(248, 248, 242, 1)', header: 'rgba(189, 147, 249, 1)' },
  nord: { bg: 'rgba(46, 52, 64, 0.9)', border: 'rgba(76, 86, 106, 0.5)', text: 'rgba(236, 239, 244, 1)', header: 'rgba(136, 192, 208, 1)' },
  gruvbox: { bg: 'rgba(40, 40, 40, 0.9)', border: 'rgba(168, 153, 132, 0.5)', text: 'rgba(235, 219, 178, 1)', header: 'rgba(250, 189, 47, 1)' }
};

const AVAILABLE_ICONS = [
  { id: 'view-list-symbolic', label: 'List (Default for All Tasks)' },
  { id: 'folder-download-symbolic', label: 'Inbox Tray (Default for Inbox)' },
  { id: 'starred-symbolic', label: 'Star / Priority' },
  { id: 'applications-engineering-symbolic', label: 'Engineering / Tools' },
  { id: 'user-home-symbolic', label: 'Home' },
  { id: 'preferences-system-symbolic', label: 'Tech / System / Code' },
  { id: 'user-bookmarks-symbolic', label: 'Bookmark / Ribbon / Personal' },
  { id: 'folder-documents-symbolic', label: 'Documents / Study' },
  { id: 'document-edit-symbolic', label: 'Edit / Notes' },
  { id: 'package-x-generic-symbolic', label: 'Package / Shopping' },
  { id: 'folder-music-symbolic', label: 'Music' },
  { id: 'folder-pictures-symbolic', label: 'Pictures / Photos' },
  { id: 'folder-videos-symbolic', label: 'Videos' },
  { id: 'chat-message-new-symbolic', label: 'Chat / Messages' },
  { id: 'x-office-spreadsheet-symbolic', label: 'Calculator / Finance' },
  { id: 'x-office-calendar-symbolic', label: 'Calendar / Time' },
  { id: 'alarm-symbolic', label: 'Alarm / Bell' },
  { id: 'weather-clear-symbolic', label: 'Sun / Weather / Health' },
  { id: 'find-location-symbolic', label: 'Location Pin / Travel' },
  { id: 'x-office-drawing-symbolic', label: 'Drawing / Design' },
  { id: 'x-office-presentation-symbolic', label: 'Presentation' },
  { id: 'x-office-address-book-symbolic', label: 'Contacts' },
  { id: 'web-browser-symbolic', label: 'Web / Internet' },
  { id: 'task-due-symbolic', label: 'Task Checkmark' },
  { id: 'folder-symbolic', label: 'Generic Folder' },
];

function getSmartKeywordIcon(projectName: string): string {
  const lower = projectName.toLowerCase();
  if (lower === '__all__' || lower === 'all tasks') return 'view-list-symbolic';
  if (lower === '__inbox__' || lower === 'inbox') return 'folder-download-symbolic';

  if (lower.includes('work') || lower.includes('job') || lower.includes('office') || lower.includes('biz')) {
    return 'applications-engineering-symbolic';
  }
  if (lower.includes('home') || lower.includes('house') || lower.includes('family')) {
    return 'user-home-symbolic';
  }
  if (lower.includes('code') || lower.includes('dev') || lower.includes('git') || lower.includes('bug') || lower.includes('tech') || lower.includes('script')) {
    return 'preferences-system-symbolic';
  }
  if (lower.includes('personal') || lower.includes('life') || lower.includes('self') || lower.includes('me')) {
    return 'user-bookmarks-symbolic';
  }
  if (lower.includes('music') || lower.includes('song') || lower.includes('audio') || lower.includes('sound')) {
    return 'folder-music-symbolic';
  }
  if (lower.includes('photo') || lower.includes('pic') || lower.includes('image') || lower.includes('art')) {
    return 'folder-pictures-symbolic';
  }
  if (lower.includes('video') || lower.includes('movie') || lower.includes('film')) {
    return 'folder-videos-symbolic';
  }
  if (lower.includes('shop') || lower.includes('buy') || lower.includes('grocer') || lower.includes('store') || lower.includes('market')) {
    return 'package-x-generic-symbolic';
  }
  if (lower.includes('study') || lower.includes('school') || lower.includes('learn') || lower.includes('book') || lower.includes('read') || lower.includes('doc')) {
    return 'folder-documents-symbolic';
  }
  if (lower.includes('call') || lower.includes('talk') || lower.includes('chat') || lower.includes('meet') || lower.includes('msg')) {
    return 'chat-message-new-symbolic';
  }
  if (lower.includes('fav') || lower.includes('star') || lower.includes('top') || lower.includes('priority') || lower.includes('goal')) {
    return 'starred-symbolic';
  }
  if (lower.includes('money') || lower.includes('finance') || lower.includes('tax') || lower.includes('pay') || lower.includes('bank') || lower.includes('calc')) {
    return 'x-office-spreadsheet-symbolic';
  }
  if (lower.includes('trip') || lower.includes('travel') || lower.includes('vacation') || lower.includes('tour') || lower.includes('place')) {
    return 'find-location-symbolic';
  }
  if (lower.includes('health') || lower.includes('fit') || lower.includes('gym') || lower.includes('sport') || lower.includes('sun')) {
    return 'weather-clear-symbolic';
  }
  if (lower.includes('time') || lower.includes('plan') || lower.includes('sched') || lower.includes('cal') || lower.includes('date')) {
    return 'x-office-calendar-symbolic';
  }
  if (lower.includes('alarm') || lower.includes('remind') || lower.includes('bell')) {
    return 'alarm-symbolic';
  }
  if (lower.includes('edit') || lower.includes('write') || lower.includes('note') || lower.includes('draft') || lower.includes('todo')) {
    return 'document-edit-symbolic';
  }
  if (lower.includes('draw') || lower.includes('paint') || lower.includes('sketch')) {
    return 'x-office-drawing-symbolic';
  }
  if (lower.includes('pres') || lower.includes('slide') || lower.includes('pitch')) {
    return 'x-office-presentation-symbolic';
  }
  if (lower.includes('contact') || lower.includes('people') || lower.includes('team')) {
    return 'x-office-address-book-symbolic';
  }
  if (lower.includes('web') || lower.includes('net') || lower.includes('online') || lower.includes('site')) {
    return 'web-browser-symbolic';
  }

  const iconPool = [
    'folder-documents-symbolic',
    'folder-download-symbolic',
    'folder-music-symbolic',
    'folder-pictures-symbolic',
    'folder-videos-symbolic',
    'folder-symbolic',
    'user-home-symbolic',
    'starred-symbolic',
    'bookmark-new-symbolic',
    'task-due-symbolic',
    'document-edit-symbolic',
    'x-office-calendar-symbolic',
    'x-office-spreadsheet-symbolic',
    'x-office-drawing-symbolic',
    'x-office-presentation-symbolic',
    'x-office-address-book-symbolic',
    'preferences-system-symbolic',
    'applications-engineering-symbolic',
    'web-browser-symbolic',
    'chat-message-new-symbolic',
    'camera-photo-symbolic',
    'weather-clear-symbolic',
    'alarm-symbolic',
    'find-location-symbolic',
    'user-bookmarks-symbolic',
    'package-x-generic-symbolic',
  ];

  let hash = 0;
  for (let i = 0; i < projectName.length; i++) {
    hash = (hash << 5) - hash + projectName.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % iconPool.length;
  return iconPool[index];
}

export default class TodoWidgetPreferences extends ExtensionPreferences {
  private _settings!: Gio.Settings;
  private _bgColorRow!: Adw.EntryRow;
  private _borderColorRow!: Adw.EntryRow;
  private _textColorRow!: Adw.EntryRow;
  private _headerColorRow!: Adw.EntryRow;

  async fillPreferencesWindow(window: Adw.PreferencesWindow): Promise<void> {
    this._settings = this.getSettings();

    window.connect('close-request', () => {
      this._settings = null as any;
      this._bgColorRow = null as any;
      this._borderColorRow = null as any;
      this._textColorRow = null as any;
      this._headerColorRow = null as any;
    });

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
          this._settings.set_string('header-color', themeColors.header);

          if (this._bgColorRow) this._bgColorRow.text = themeColors.bg;
          if (this._borderColorRow) this._borderColorRow.text = themeColors.border;
          if (this._textColorRow) this._textColorRow.text = themeColors.text;
          if (this._headerColorRow) this._headerColorRow.text = themeColors.header;
        }
      }
    });
    appearanceGroup.add(themeRow);

    // Custom Color Entries
    this._bgColorRow = this._createColorRow('background-color', 'Custom Background Color', 'RGBA format (e.g. rgba(0,0,0,0.8))');
    this._borderColorRow = this._createColorRow('border-color', 'Custom Border Color', 'RGBA format');
    this._textColorRow = this._createColorRow('text-color', 'Custom Text Color', 'RGBA format');
    this._headerColorRow = this._createColorRow('header-color', 'Custom Header Color', 'RGBA format (header title and icons)');

    appearanceGroup.add(this._bgColorRow);
    appearanceGroup.add(this._borderColorRow);
    appearanceGroup.add(this._textColorRow);
    appearanceGroup.add(this._headerColorRow);

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

    // Projects sidebar mode (ComboRow)
    const projectModeKeys = ['icon', 'both', 'text', 'off'];
    const projectModeRow = new Adw.ComboRow({
      title: 'Projects Sidebar Mode',
      subtitle: 'Display style for grouping tasks by project on the left',
      model: Gtk.StringList.new([
        'Icons Only (Compact)',
        'Icons and Text',
        'Text Only',
        'Disabled (Off)',
      ]),
    });
    const currentMode = this._settings.get_string('projects-mode');
    const modeIndex = projectModeKeys.indexOf(currentMode);
    if (modeIndex !== -1) {
      projectModeRow.selected = modeIndex;
    }
    projectModeRow.connect('notify::selected', () => {
      this._settings.set_string('projects-mode', projectModeKeys[projectModeRow.selected]);
    });
    behaviorGroup.add(projectModeRow);

    // File path and interval
    behaviorGroup.add(this._createFilePathRow(window, 'todo-file-path', 'Todo File Path'));
    behaviorGroup.add(this._createSpinRow('update-interval', 'Fallback Update Interval', 'Refresh time in milliseconds (0 to disable)', 0, 3600000, 1000));

    // Fine-tuned manual position adjustment
    const positionGroup = new Adw.PreferencesGroup({
      title: 'Manual Position Fine-tuning',
      description: 'Coordinates as percentage of the screen width and height.',
    });
    page.add(positionGroup);

    positionGroup.add(this._createSpinRow('position-x', 'X Position (%)', 'Horizontal desktop coordinates', 0, 100, 1));
    positionGroup.add(this._createSpinRow('position-y', 'Y Position (%)', 'Vertical desktop coordinates', 0, 100, 1));

    // Group 4: Project Icons
    const projectIconsGroup = new Adw.PreferencesGroup({
      title: 'Project Icons',
      description: 'Choose custom icons for your projects. Default icons match keywords automatically.',
    });
    page.add(projectIconsGroup);

    // Read projects from todo-file-path
    let filePath = this._settings.get_string('todo-file-path') || '~/todo.txt';
    if (filePath.startsWith('~')) {
      filePath = GLib.get_home_dir() + filePath.slice(1);
    }

    const projectsList: string[] = ['All Tasks', 'Inbox'];
    try {
      const file = Gio.File.new_for_path(filePath);
      const [success, contents] = file.load_contents(null);
      if (success) {
        const text = new TextDecoder('utf-8').decode(contents);
        const matches = text.match(/(?:^|\s)[#+]([A-Za-z0-9_\-]+)/g);
        if (matches) {
          matches.forEach((m) => {
            const p = m.trim().replace(/^[#+]/, '');
            if (p && !projectsList.includes(p)) {
              projectsList.push(p);
            }
          });
        }
      }
    } catch (e) {
      // Ignore file read error in prefs
    }

    let customIcons: Record<string, string> = {};
    try {
      customIcons = JSON.parse(this._settings.get_string('custom-project-icons') || '{}');
    } catch (e) {
      customIcons = {};
    }

    const saveCustomIcon = (projName: string, iconId: string) => {
      customIcons[projName] = iconId;
      this._settings.set_string('custom-project-icons', JSON.stringify(customIcons));
    };

    const iconLabels = AVAILABLE_ICONS.map((i) => i.label);
    const iconIds = AVAILABLE_ICONS.map((i) => i.id);

    projectsList.forEach((proj) => {
      const currentIcon = customIcons[proj] || getSmartKeywordIcon(proj);
      let selectedIndex = iconIds.indexOf(currentIcon);
      if (selectedIndex === -1) {
        selectedIndex = 0;
      }

      const row = new Adw.ComboRow({
        title: proj,
        subtitle: `Icon for ${proj}`,
        model: Gtk.StringList.new(iconLabels),
        selected: selectedIndex,
      });

      row.connect('notify::selected', () => {
        const chosenIcon = iconIds[row.selected];
        saveCustomIcon(proj, chosenIcon);
      });

      projectIconsGroup.add(row);
    });

    // Custom manual overrides entry
    const customMappingRow = new Adw.EntryRow({
      title: 'Manual Icon Mappings (JSON)',
      text: this._settings.get_string('custom-project-icons') || '{}',
    });
    customMappingRow.connect('changed', () => {
      try {
        JSON.parse(customMappingRow.text);
        this._settings.set_string('custom-project-icons', customMappingRow.text);
      } catch (e) {
        // Invalid JSON, don't write
      }
    });
    projectIconsGroup.add(customMappingRow);
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

  private _createFilePathRow(window: Adw.PreferencesWindow, key: string, title: string): Adw.EntryRow {
    const row = new Adw.EntryRow({
      title,
      text: this._settings.get_string(key),
    });

    row.connect('apply', () => {
      this._settings.set_string(key, row.text);
    });

    const focusController = new Gtk.EventControllerFocus();
    focusController.connect('leave', () => {
      this._settings.set_string(key, row.text);
    });
    row.add_controller(focusController);

    const fileButton = new Gtk.Button({
      icon_name: 'folder-open-symbolic',
      tooltip_text: 'Choose Todo File',
      valign: Gtk.Align.CENTER,
    });

    fileButton.connect('clicked', () => {
      const native = new Gtk.FileChooserNative({
        title: 'Select Todo File',
        transient_for: window,
        action: Gtk.FileChooserAction.OPEN,
        accept_label: '_Open',
        cancel_label: '_Cancel',
      });

      const filter = new Gtk.FileFilter();
      filter.set_name('Text files (*.txt)');
      filter.add_pattern('*.txt');
      native.add_filter(filter);

      const allFilter = new Gtk.FileFilter();
      allFilter.set_name('All files');
      allFilter.add_pattern('*');
      native.add_filter(allFilter);

      native.connect('response', (dialog, response_id) => {
        if (response_id === Gtk.ResponseType.ACCEPT) {
          const file = dialog.get_file();
          if (file) {
            let path = file.get_path();
            if (path) {
              const homeDir = GLib.get_home_dir();
              if (path.startsWith(homeDir)) {
                path = '~' + path.slice(homeDir.length);
              }
              row.text = path;
              this._settings.set_string(key, path);
            }
          }
        }
        dialog.destroy();
      });

      native.show();
    });

    row.add_suffix(fileButton);

    return row;
  }
}
