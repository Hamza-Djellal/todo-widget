import St from 'gi://St';
import GObject from 'gi://GObject';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

function makeDirectoryAsync(file: Gio.File): Promise<void> {
  return new Promise((resolve, reject) => {
    file.make_directory_async(GLib.PRIORITY_DEFAULT, null, (_f, res) => {
      try {
        file.make_directory_finish(res);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  });
}

async function makeDirectoryWithParentsAsync(file: Gio.File): Promise<void> {
  try {
    await makeDirectoryAsync(file);
  } catch (err: any) {
    if (err.code === Gio.IOErrorEnum.EXISTS) {
      return;
    }
    if (err.code === Gio.IOErrorEnum.NOT_FOUND) {
      const parent = file.get_parent();
      if (!parent) {
        throw err;
      }
      await makeDirectoryWithParentsAsync(parent);
      try {
        await makeDirectoryAsync(file);
      } catch (err2: any) {
        if ((err2 as any).code !== Gio.IOErrorEnum.EXISTS) {
          throw err2;
        }
      }
      return;
    }
    throw err;
  }
}

function loadFileContentsAsync(file: Gio.File): Promise<[boolean, Uint8Array, string]> {
  return new Promise((resolve, reject) => {
    file.load_contents_async(null, (_f, res) => {
      try {
        resolve(file.load_contents_finish(res));
      } catch (err) {
        reject(err);
      }
    });
  });
}

function createFileAsync(file: Gio.File): Promise<void> {
  return new Promise((resolve, reject) => {
    file.create_async(Gio.FileCreateFlags.NONE, GLib.PRIORITY_DEFAULT, null, (_f, res) => {
      try {
        const stream = file.create_finish(res);
        stream.close(null);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  });
}

function logError(msg: string, err?: any): void {
  console.error(msg, err);
}

interface TodoTask {
  originalIndex: number;
  rawLine: string;
  isCompleted: boolean;
  text: string;
  projects: string[];
}

function getProjectIcon(projectName: string, customIconsJson?: string): string {
  if (customIconsJson) {
    try {
      const customMap = JSON.parse(customIconsJson);
      if (customMap[projectName]) {
        return customMap[projectName];
      }
      if (projectName === '__all__' && (customMap['All Tasks'] || customMap['__all__'])) {
        return customMap['All Tasks'] || customMap['__all__'];
      }
      if (projectName === '__inbox__' && (customMap['Inbox'] || customMap['__inbox__'])) {
        return customMap['Inbox'] || customMap['__inbox__'];
      }
    } catch (e) {
      // Ignore JSON parse error
    }
  }

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

function parseTodoTasks(lines: string[], stripProjectTags: boolean = true): TodoTask[] {
  const tasks: TodoTask[] = [];
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.length === 0) return;
    const isCompleted = trimmed.startsWith('x ');
    const rawTaskText = isCompleted ? trimmed.slice(2).trim() : trimmed;

    // Extract true project tags matching both #Project and +Project
    // Avoid escaped /#Tag, \+Tag, etc. and avoid standalone # or + (e.g. 2 + 3, #1)
    const projects: string[] = [];
    const projectRegex = /(?:^|\s)(?<![\\/])[#+]([A-Za-z0-9_\-]+)/g;
    let match;
    while ((match = projectRegex.exec(rawTaskText)) !== null) {
      const proj = match[1];
      if (proj && !projects.includes(proj)) {
        projects.push(proj);
      }
    }

    let displayText = rawTaskText;
    if (stripProjectTags) {
      // Remove true project tags (#Project and +Project) from the display text
      displayText = displayText.replace(/(^|\s)(?<![\\/])[#+]([A-Za-z0-9_\-]+)/g, '$1');
    }
    // Unescape any /\# or \+ to literal # or +
    displayText = displayText.replace(/(^|\s)[\\/]([#+])([A-Za-z0-9_\-]+)/g, '$1$2$3');
    displayText = displayText.replace(/\s+/g, ' ').trim();

    tasks.push({
      originalIndex: index,
      rawLine: trimmed,
      isCompleted,
      text: displayText.length > 0 ? displayText : rawTaskText,
      projects,
    });
  });
  return tasks;
}

const TodoWidget = GObject.registerClass(
  class TodoWidget extends St.BoxLayout {
    private _settings: any;
    private _intervalId: number | null = null;
    private _fileMonitor: Gio.FileMonitor | null = null;
    private _filePath: string = '';

    // Drag state
    private _dragging = false;
    private _dragX = 0;
    private _dragY = 0;

    // Project selection state
    private _selectedProject: string = '__all__';
    private _parsedTasks: TodoTask[] = [];

    // UI elements
    private _headerBox!: St.BoxLayout;
    private _titleLabel!: St.Label;
    private _addIcon!: St.Icon;
    private _openIcon!: St.Icon;
    private _clearIcon!: St.Icon;
    private _lockButtonIcon!: St.Icon;

    private _bodyBox!: St.BoxLayout;
    private _sidebarBox!: St.BoxLayout;
    private _sidebarTitle!: St.Label;
    private _projectsScrollView!: St.ScrollView;
    private _projectsBox!: St.BoxLayout;
    private _separator!: St.Widget;
    private _mainContentBox!: St.BoxLayout;

    private _tasksScrollView!: St.ScrollView;
    private _tasksBox!: St.BoxLayout;
    private _addBox!: St.BoxLayout;
    private _addEntry!: St.Entry;

    constructor(settings: any) {
      super({
        style_class: 'todo-widget-container',
        vertical: true,
        reactive: true,
        can_focus: true,
      });

      this._settings = settings;

      this._buildUI();
      this._connectSettings();
      this._updatePosition();

      // Initial file setup and monitor
      this._updateFilePath();
      this._updateTodoList();
      this._startUpdates();
    }

    private _buildUI(): void {
      // Connect drag-and-drop event handlers
      this.connect('button-press-event', (actor, event) => this._onButtonPress(event));
      this.connect('motion-event', (actor, event) => this._onMotion(event));
      this.connect('button-release-event', (actor, event) => this._onButtonRelease(event));

      // Header Box
      this._headerBox = new St.BoxLayout({
        style_class: 'todo-header',
        vertical: false,
        x_expand: true,
      });

      this._titleLabel = new St.Label({
        text: 'TODO LIST',
        style_class: 'todo-title',
        y_align: Clutter.ActorAlign.CENTER,
        x_expand: true,
      });
      this._headerBox.add_child(this._titleLabel);

      // Add task toggle button
      this._addIcon = new St.Icon({
        icon_name: 'list-add-symbolic',
        icon_size: 14,
      });
      const addButton = new St.Button({
        style_class: 'todo-header-button',
        reactive: true,
        can_focus: true,
        child: this._addIcon,
      });
      addButton.connect('clicked', () => {
        this._toggleAddBox();
      });
      this._headerBox.add_child(addButton);

      // Open file button
      this._openIcon = new St.Icon({
        icon_name: 'document-open-symbolic',
        icon_size: 14,
      });
      const openButton = new St.Button({
        style_class: 'todo-header-button',
        reactive: true,
        can_focus: true,
        child: this._openIcon,
      });
      openButton.connect('clicked', () => {
        this._openTodoFile();
      });
      this._headerBox.add_child(openButton);

      // Clear completed tasks button
      this._clearIcon = new St.Icon({
        icon_name: 'edit-clear-symbolic',
        icon_size: 14,
      });
      const clearButton = new St.Button({
        style_class: 'todo-header-button',
        reactive: true,
        can_focus: true,
        child: this._clearIcon,
      });
      clearButton.connect('clicked', () => {
        this._clearCompletedTasks();
      });
      this._headerBox.add_child(clearButton);

      // Lock position toggle button
      const lockButton = new St.Button({
        style_class: 'todo-header-button',
        reactive: true,
        can_focus: true,
      });
      const isLocked = this._settings.get_boolean('lock-position');
      this._lockButtonIcon = new St.Icon({
        icon_name: isLocked ? 'changes-prevent-symbolic' : 'changes-allow-symbolic',
        icon_size: 14,
      });
      lockButton.set_child(this._lockButtonIcon);
      lockButton.connect('clicked', () => {
        const nextState = !this._settings.get_boolean('lock-position');
        this._settings.set_boolean('lock-position', nextState);
      });
      this._headerBox.add_child(lockButton);

      this.add_child(this._headerBox);

      // Body container (2-column layout: Sidebar + Tasks)
      this._bodyBox = new St.BoxLayout({
        style_class: 'todo-body',
        vertical: false,
        x_expand: true,
        y_expand: true,
      });

      // Left Sidebar for Projects
      this._sidebarBox = new St.BoxLayout({
        style_class: 'todo-sidebar',
        vertical: true,
      });

      this._sidebarTitle = new St.Label({
        text: 'PROJECTS',
        style_class: 'todo-sidebar-title',
      });
      this._sidebarBox.add_child(this._sidebarTitle);

      this._projectsScrollView = new St.ScrollView({
        hscrollbar_policy: St.PolicyType.NEVER,
        vscrollbar_policy: St.PolicyType.AUTOMATIC,
        x_expand: true,
        y_expand: true,
      });
      this._projectsScrollView.set_style('max-height: 300px;');

      this._projectsBox = new St.BoxLayout({
        style_class: 'todo-projects-list',
        vertical: true,
        x_expand: true,
      });
      this._projectsScrollView.set_child(this._projectsBox);
      this._sidebarBox.add_child(this._projectsScrollView);

      this._bodyBox.add_child(this._sidebarBox);

      // Vertical Separator
      this._separator = new St.Widget({
        style_class: 'todo-sidebar-separator',
        y_expand: true,
      });
      this._bodyBox.add_child(this._separator);

      // Right Main Content for Tasks
      this._mainContentBox = new St.BoxLayout({
        style_class: 'todo-main-content',
        vertical: true,
        x_expand: true,
        y_expand: true,
      });

      // ScrollView for tasks
      this._tasksScrollView = new St.ScrollView({
        hscrollbar_policy: St.PolicyType.NEVER,
        vscrollbar_policy: St.PolicyType.AUTOMATIC,
        x_expand: true,
        y_expand: true,
      });
      this._tasksScrollView.set_style('max-height: 300px;');

      this._tasksBox = new St.BoxLayout({
        style_class: 'todo-tasks-list',
        vertical: true,
        x_expand: true,
      });
      this._tasksScrollView.set_child(this._tasksBox);
      this._mainContentBox.add_child(this._tasksScrollView);

      // Add Task Box (collapsed by default)
      this._addBox = new St.BoxLayout({
        vertical: true,
        x_expand: true,
        visible: false,
      });

      this._addEntry = new St.Entry({
        style_class: 'todo-add-entry',
        hint_text: 'Add a task...',
        x_expand: true,
        reactive: true,
        can_focus: true,
      });

      this._addEntry.clutter_text.connect('activate', () => {
        const text = this._addEntry.get_text().trim();
        if (text.length >= 1) {
          this._addTask(text);
          this._addEntry.set_text('');
        } else {
          this._toggleAddBox();
        }
      });

      this._addEntry.clutter_text.connect('key-press-event', (actor: any, event: any) => {
        const symbol = event.get_key_symbol();
        if (symbol === Clutter.KEY_Escape) {
          this._toggleAddBox();
          return Clutter.EVENT_STOP;
        }
        return Clutter.EVENT_PROPAGATE;
      });

      this._addBox.add_child(this._addEntry);
      this._mainContentBox.add_child(this._addBox);

      this._bodyBox.add_child(this._mainContentBox);
      this.add_child(this._bodyBox);

      // Apply style classes and colors based on theme
      this._updateContainerStyle();
    }

    private _connectSettings(): void {
      this._settings.connectObject(
        'changed::position-x', () => this._updatePosition(),
        'changed::position-y', () => this._updatePosition(),
        this
      );

      const styleKeys = [
        'theme',
        'background-color',
        'border-color',
        'text-color',
        'header-color',
        'border-radius',
        'padding-horizontal',
        'padding-vertical',
        'label-font-size',
      ];
      styleKeys.forEach((key) => {
        this._settings.connectObject(`changed::${key}`, () => {
          this._updateContainerStyle();
          this._updateTodoList();
        }, this);
      });

      this._settings.connectObject(
        'changed::todo-file-path', () => {
          this._updateFilePath();
          this._updateTodoList();
        },
        'changed::update-interval', () => {
          this._startUpdates();
        },
        'changed::show-completed', () => {
          this._updateTodoList();
        },
        'changed::completed-behavior', () => {
          this._updateTodoList();
        },
        'changed::lock-position', () => {
          this._updateLockIcon();
        },
        'changed::projects-mode', () => {
          this._updateTodoList();
        },
        'changed::custom-project-icons', () => {
          this._renderProjects();
        },
        this
      );
    }

    private _updateContainerStyle(): void {
      const theme = this._settings.get_string('theme');

      // Clear standard theme class names
      const themes = ['dark', 'light', 'dracula', 'nord', 'gruvbox', 'system'];
      themes.forEach((t) => this.remove_style_class_name(t));

      // Apply current theme style class
      this.add_style_class_name(theme);

      // Reset inline styles
      this.set_style('');

      // Custom padding & border-radius can be overlaid on presets
      const borderRadius = this._settings.get_int('border-radius');
      const padH = this._settings.get_int('padding-horizontal');
      const padV = this._settings.get_int('padding-vertical');

      let inlineStyle = `
        border-radius: ${borderRadius}px;
        padding: ${padV}px ${padH}px;
        min-width: 270px;
      `;

      if (theme !== 'system') {
        const bgColor = this._settings.get_string('background-color');
        const borderColor = this._settings.get_string('border-color');
        inlineStyle += `
          background-color: ${bgColor};
          border: 1px solid ${borderColor};
        `;
        if (this._separator) {
          this._separator.set_style(`background-color: ${borderColor};`);
        }
      } else {
        if (this._separator) {
          this._separator.set_style('');
        }
      }

      this.set_style(inlineStyle);
      this._updateHeaderStyle();
    }

    private _updateHeaderStyle(): void {
      const theme = this._settings.get_string('theme');
      const headerColor = this._settings.get_string('header-color');

      const isCustomOrPreset = theme !== 'system';
      const colorStyle = (isCustomOrPreset && headerColor) ? `color: ${headerColor};` : '';

      if (this._titleLabel) {
        this._titleLabel.set_style(colorStyle);
      }
      if (this._sidebarTitle) {
        this._sidebarTitle.set_style(colorStyle ? `${colorStyle} opacity: 0.7;` : '');
      }
      if (this._addIcon) {
        this._addIcon.set_style(colorStyle);
      }
      if (this._openIcon) {
        this._openIcon.set_style(colorStyle);
      }
      if (this._clearIcon) {
        this._clearIcon.set_style(colorStyle);
      }
      if (this._lockButtonIcon) {
        this._lockButtonIcon.set_style(colorStyle);
      }
    }

    private _updateLockIcon(): void {
      if (!this._lockButtonIcon) return;
      const isLocked = this._settings.get_boolean('lock-position');
      this._lockButtonIcon.icon_name = isLocked ? 'changes-prevent-symbolic' : 'changes-allow-symbolic';
    }

    private _updatePosition(): void {
      const monitor = Main.layoutManager.primaryMonitor;
      if (!monitor) return;
      const x = (monitor.width * this._settings.get_double('position-x')) / 100;
      const y = (monitor.height * this._settings.get_double('position-y')) / 100;
      this.set_position(Math.round(x), Math.round(y));
    }

    private _startUpdates(): void {
      this._clearTimer();
      const interval = this._settings.get_int('update-interval');
      if (interval <= 0) return;
      this._intervalId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, interval, () => {
        this._updateTodoList();
        return GLib.SOURCE_CONTINUE;
      });
    }

    private _clearTimer(): void {
      if (this._intervalId !== null) {
        GLib.source_remove(this._intervalId);
        this._intervalId = null;
      }
    }

    private _updateFilePath(): void {
      let path = this._settings.get_string('todo-file-path');
      if (path.startsWith('~/')) {
        path = GLib.get_home_dir() + path.slice(1);
      }
      this._filePath = path;

      // Reset file monitor
      if (this._fileMonitor) {
        (this._fileMonitor as any).disconnectObject(this);
        this._fileMonitor.cancel();
        this._fileMonitor = null;
      }

      const file = Gio.File.new_for_path(this._filePath);
      const parent = file.get_parent();

      if (parent) {
        makeDirectoryWithParentsAsync(parent)
          .then(() => {
            return createFileAsync(file);
          })
          .then(() => {
            try {
              this._setupFileMonitor(file);
              this._updateTodoList();
            } catch (monitorErr) {
              logError('[TodoWidget] Failed to monitor file:', monitorErr);
            }
          })
          .catch((err: any) => {
            if (err.code !== Gio.IOErrorEnum.EXISTS) {
              logError('[TodoWidget] Failed to initialize file:', err);
            }
            // Even if creation/dir fails (e.g., exists), try setup monitor and load list
            try {
              this._setupFileMonitor(file);
              this._updateTodoList();
            } catch (monitorErr) {
              logError('[TodoWidget] Failed to monitor file:', monitorErr);
            }
          });
      } else {
        try {
          this._setupFileMonitor(file);
          this._updateTodoList();
        } catch (monitorErr) {
          logError('[TodoWidget] Failed to monitor file:', monitorErr);
        }
      }
    }

    private _setupFileMonitor(file: Gio.File): void {
      if (this._fileMonitor) {
        (this._fileMonitor as any).disconnectObject(this);
        this._fileMonitor.cancel();
      }
      this._fileMonitor = file.monitor_file(Gio.FileMonitorFlags.NONE, null);
      (this._fileMonitor as any).connectObject('changed', (mon: any, f: any, otherF: any, eventType: any) => {
        if (
          eventType === Gio.FileMonitorEvent.CHANGES_DONE_HINT ||
          eventType === Gio.FileMonitorEvent.CREATED
        ) {
          this._updateTodoList();
        }
      }, this);
    }

    private async _updateTodoList(): Promise<void> {
      try {
        const file = Gio.File.new_for_path(this._filePath);
        try {
          const [success, contents] = await loadFileContentsAsync(file);
          if (success) {
            const decoder = new TextDecoder('utf-8');
            const text = decoder.decode(contents);
            const lines = text.split('\n').filter((line) => line.trim().length > 0);
            const projectsMode = this._settings.get_string('projects-mode') || 'icon';
            const stripProjectTags = projectsMode !== 'off';
            this._parsedTasks = parseTodoTasks(lines, stripProjectTags);
            this._renderProjects();
            this._renderTasks();
          } else {
            this._parsedTasks = [];
            this._renderProjects();
            this._renderTasks();
          }
        } catch (err: any) {
          if (err.code === Gio.IOErrorEnum.NOT_FOUND) {
            this._parsedTasks = [];
            this._renderProjects();
            this._renderTasks();
          } else {
            logError('[TodoWidget] Error loading contents:', err);
            this._parsedTasks = [];
            this._renderProjects();
            this._renderTasks();
          }
        }
      } catch (err) {
        logError('[TodoWidget] Error updating todo list:', err);
        this._parsedTasks = [];
        this._renderProjects();
        this._renderTasks();
      }
    }

    private _renderProjects(): void {
      this._projectsBox.destroy_all_children();

      const projectsMode = this._settings.get_string('projects-mode') || 'icon';

      if (projectsMode === 'off') {
        if (this._sidebarBox) this._sidebarBox.visible = false;
        if (this._separator) this._separator.visible = false;
        this._selectedProject = '__all__';
        return;
      }

      if (this._sidebarBox) this._sidebarBox.visible = true;
      if (this._separator) this._separator.visible = true;

      const isIconMode = projectsMode === 'icon';
      if (isIconMode) {
        this._sidebarBox.add_style_class_name('icon-mode');
        this._bodyBox.add_style_class_name('icon-mode');
        if (this._sidebarTitle) this._sidebarTitle.visible = false;
        this._sidebarBox.set_style('width: 30px; min-width: 30px; max-width: 30px;');
        this._projectsScrollView.set_style('width: 30px; max-height: 300px;');
      } else {
        this._sidebarBox.remove_style_class_name('icon-mode');
        this._bodyBox.remove_style_class_name('icon-mode');
        if (this._sidebarTitle) this._sidebarTitle.visible = true;
        this._sidebarBox.set_style('');
        this._projectsScrollView.set_style('max-height: 300px;');
      }

      const showIcons = projectsMode === 'icon' || projectsMode === 'both';
      const showText = projectsMode === 'text' || projectsMode === 'both';

      const theme = this._settings.get_string('theme');
      const textColor = this._settings.get_string('text-color');
      const isCustomOrPreset = theme !== 'system';
      const textStyle = (isCustomOrPreset && textColor) ? `color: ${textColor};` : '';

      // Tally active tasks
      const allActiveCount = this._parsedTasks.filter((t) => !t.isCompleted).length;
      const inboxActiveCount = this._parsedTasks.filter((t) => !t.isCompleted && t.projects.length === 0).length;
      const hasInboxTasks = this._parsedTasks.some((t) => t.projects.length === 0);

      // Collect unique projects and active counts
      const projectMap: Map<string, number> = new Map();
      this._parsedTasks.forEach((t) => {
        t.projects.forEach((p) => {
          if (!projectMap.has(p)) {
            projectMap.set(p, 0);
          }
          if (!t.isCompleted) {
            projectMap.set(p, (projectMap.get(p) || 0) + 1);
          }
        });
      });

      const sortedProjects = Array.from(projectMap.keys()).sort((a, b) => a.localeCompare(b));

      const customIconsJson = this._settings.get_string('custom-project-icons') || '{}';

      // Build project items list
      const items: { id: string; name: string; icon: string; count: number }[] = [
        { id: '__all__', name: 'All Tasks', icon: getProjectIcon('__all__', customIconsJson), count: allActiveCount },
      ];

      if (hasInboxTasks || sortedProjects.length > 0) {
        items.push({ id: '__inbox__', name: 'Inbox', icon: getProjectIcon('__inbox__', customIconsJson), count: inboxActiveCount });
      }

      sortedProjects.forEach((p) => {
        items.push({ id: p, name: p, icon: getProjectIcon(p, customIconsJson), count: projectMap.get(p) || 0 });
      });

      // If selected project no longer exists, reset to __all__
      if (!items.some((item) => item.id === this._selectedProject)) {
        this._selectedProject = '__all__';
      }

      items.forEach((item) => {
        const isSelected = item.id === this._selectedProject;
        const btn = new St.Button({
          style_class: isSelected ? 'todo-project-button active' : 'todo-project-button',
          reactive: true,
          can_focus: true,
          x_expand: !isIconMode,
          x_align: isIconMode ? Clutter.ActorAlign.CENTER : Clutter.ActorAlign.FILL,
          y_align: Clutter.ActorAlign.CENTER,
        });

        if (isIconMode) {
          const icon = new St.Icon({
            icon_name: item.icon,
            icon_size: 14,
            style: textStyle,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
          });
          btn.set_child(icon);
        } else {
          const row = new St.BoxLayout({
            style_class: 'todo-project-row',
            vertical: false,
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
          });

          if (showIcons) {
            const icon = new St.Icon({
              icon_name: item.icon,
              icon_size: 14,
              style: textStyle,
              y_align: Clutter.ActorAlign.CENTER,
            });
            row.add_child(icon);
          }

          if (showText) {
            const label = new St.Label({
              text: item.name,
              style_class: 'todo-project-label',
              x_expand: true,
              y_align: Clutter.ActorAlign.CENTER,
              style: textStyle,
            });
            row.add_child(label);

            const countLabel = new St.Label({
              text: `${item.count}`,
              style_class: 'todo-project-count',
              y_align: Clutter.ActorAlign.CENTER,
              style: textStyle,
            });
            row.add_child(countLabel);
          }

          btn.set_child(row);
        }

        btn.connect('clicked', () => {
          this._selectedProject = item.id;
          this._renderProjects();
          this._renderTasks();
        });

        this._projectsBox.add_child(btn);
      });
    }

    private _renderTasks(): void {
      this._tasksBox.destroy_all_children();

      const theme = this._settings.get_string('theme');
      const fontSize = this._settings.get_int('label-font-size');
      const textColor = this._settings.get_string('text-color');
      const showCompleted = this._settings.get_boolean('show-completed');

      const isCustomOrPreset = theme !== 'system';
      const colorStyle = (isCustomOrPreset && textColor) ? `color: ${textColor};` : '';

      // Filter tasks by active project selection
      let filteredTasks = this._parsedTasks;
      if (this._selectedProject === '__inbox__') {
        filteredTasks = filteredTasks.filter((t) => t.projects.length === 0);
      } else if (this._selectedProject !== '__all__') {
        filteredTasks = filteredTasks.filter((t) => t.projects.includes(this._selectedProject));
      }

      if (!showCompleted) {
        filteredTasks = filteredTasks.filter((t) => !t.isCompleted);
      }

      let taskCount = 0;

      filteredTasks.forEach((task) => {
        const row = new St.BoxLayout({
          style_class: 'todo-task-row',
          vertical: false,
          x_expand: true,
        });

        // Checkbox button
        const checkbox = new St.Button({
          style_class: 'todo-checkbox',
          reactive: true,
          can_focus: true,
          child: new St.Icon({
            icon_name: task.isCompleted ? 'checkbox-checked-symbolic' : 'checkbox-symbolic',
            icon_size: fontSize + 2,
            style: colorStyle,
          }),
        });

        checkbox.connect('clicked', () => {
          this._toggleTaskCompleted(task.originalIndex);
        });

        row.add_child(checkbox);

        // Label
        const label = new St.Label({
          text: task.text,
          style_class: task.isCompleted ? 'todo-task-text-completed' : 'todo-task-text',
          style: colorStyle
            ? `font-size: ${fontSize}px; ${colorStyle}`
            : `font-size: ${fontSize}px;`,
          y_align: Clutter.ActorAlign.CENTER,
          x_expand: true,
        });

        row.add_child(label);
        this._tasksBox.add_child(row);
        taskCount++;
      });

      if (taskCount === 0) {
        const emptyText =
          this._selectedProject === '__all__'
            ? 'No tasks left!'
            : `No tasks in ${this._selectedProject === '__inbox__' ? 'Inbox' : this._selectedProject}!`;
        const emptyLabel = new St.Label({
          text: emptyText,
          style_class: 'todo-task-text-completed',
          style: colorStyle
            ? `font-size: ${fontSize}px; ${colorStyle} margin: 8px 0;`
            : `font-size: ${fontSize}px; margin: 8px 0;`,
          x_expand: true,
          y_align: Clutter.ActorAlign.CENTER,
        });
        this._tasksBox.add_child(emptyLabel);
      }
    }

    private _toggleAddBox(): void {
      const isVisible = this._addBox.visible;
      this._addBox.visible = !isVisible;
      if (this._addBox.visible) {
        this._addEntry.grab_key_focus();
      }
    }

    private _openTodoFile(): void {
      try {
        const file = Gio.File.new_for_path(this._filePath);
        Gio.AppInfo.launch_default_for_uri_async(file.get_uri(), null, null, null);
      } catch (err) {
        logError('[TodoWidget] Error launching default editor:', err);
      }
    }

    private async _addTask(text: string): Promise<void> {
      try {
        const file = Gio.File.new_for_path(this._filePath);
        let contents = '';
        try {
          const [success, rawContents] = await loadFileContentsAsync(file);
          if (success) {
            const decoder = new TextDecoder('utf-8');
            contents = decoder.decode(rawContents);
          }
        } catch (err: any) {
          if (err.code !== Gio.IOErrorEnum.NOT_FOUND) {
            logError('[TodoWidget] Failed to load contents for add:', err);
          }
        }

        // Auto-tag with project if a specific project is selected and user didn't specify a project
        let taskToAdd = text;
        if (
          this._selectedProject !== '__all__' &&
          this._selectedProject !== '__inbox__' &&
          !taskToAdd.match(/(?:^|\s)[#+]\S+/)
        ) {
          taskToAdd += ` #${this._selectedProject}`;
        }

        const separator = contents.endsWith('\n') || contents === '' ? '' : '\n';
        const newContents = contents + separator + taskToAdd + '\n';

        await this._writeTodoFile(this._filePath, newContents);
      } catch (err) {
        logError('[TodoWidget] Error adding task:', err);
      }
    }

    private async _toggleTaskCompleted(index: number): Promise<void> {
      try {
        const file = Gio.File.new_for_path(this._filePath);
        let contents = '';
        try {
          const [success, rawContents] = await loadFileContentsAsync(file);
          if (!success) return;
          const decoder = new TextDecoder('utf-8');
          contents = decoder.decode(rawContents);
        } catch (err: any) {
          if (err.code !== Gio.IOErrorEnum.NOT_FOUND) {
            logError('[TodoWidget] Error reading file for toggle completed:', err);
          }
          return;
        }

        const lines = contents.split('\n');

        let taskIndex = 0;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].trim().length > 0) {
            if (taskIndex === index) {
              const completedBehavior = this._settings.get_string('completed-behavior');

              if (completedBehavior === 'delete') {
                lines.splice(i, 1);
              } else {
                const lineTrimmed = lines[i].trim();
                if (lineTrimmed.startsWith('x ')) {
                  lines[i] = lineTrimmed.slice(2);
                } else {
                  lines[i] = 'x ' + lineTrimmed;
                }
              }
              break;
            }
            taskIndex++;
          }
        }

        const newContents = lines.join('\n');
        await this._writeTodoFile(this._filePath, newContents);
      } catch (err) {
        logError('[TodoWidget] Error toggling task completed:', err);
      }
    }

    private async _clearCompletedTasks(): Promise<void> {
      try {
        const file = Gio.File.new_for_path(this._filePath);
        let contents = '';
        try {
          const [success, rawContents] = await loadFileContentsAsync(file);
          if (!success) return;
          const decoder = new TextDecoder('utf-8');
          contents = decoder.decode(rawContents);
        } catch (err: any) {
          if (err.code !== Gio.IOErrorEnum.NOT_FOUND) {
            logError('[TodoWidget] Error reading file for clear completed:', err);
          }
          return;
        }

        const lines = contents.split('\n');
        const newLines = lines.filter((line) => {
          const trimmed = line.trim();
          if (!trimmed.startsWith('x ')) {
            return true;
          }
          if (this._selectedProject === '__all__') {
            return false;
          }
          const projectMatches = trimmed.match(/(?:^|\s)[#+]([A-Za-z0-9_\-]+)/g);
          const projects = projectMatches
            ? projectMatches.map((m) => m.trim().replace(/^[#+]/, ''))
            : [];
          if (this._selectedProject === '__inbox__') {
            return projects.length > 0;
          }
          return !projects.includes(this._selectedProject);
        });

        const newContents = newLines.join('\n');
        await this._writeTodoFile(this._filePath, newContents);
      } catch (err) {
        logError('[TodoWidget] Error clearing completed tasks:', err);
      }
    }

    private async _writeTodoFile(path: string, content: string): Promise<void> {
      const file = Gio.File.new_for_path(path);
      const encoder = new TextEncoder();
      const bytes = encoder.encode(content);
      const gbytes = GLib.Bytes.new(bytes);

      const doWrite = () => {
        return new Promise<void>((resolve, reject) => {
          file.replace_contents_bytes_async(
            gbytes,
            null,
            false,
            Gio.FileCreateFlags.REPLACE_DESTINATION,
            null,
            (_file, res) => {
              try {
                const [success] = file.replace_contents_finish(res);
                if (success) {
                  resolve();
                } else {
                  reject(new Error('Failed to write contents'));
                }
              } catch (e) {
                reject(e);
              }
            },
          );
        });
      };

      try {
        await doWrite();
      } catch (err: any) {
        if (err.code === Gio.IOErrorEnum.NOT_FOUND) {
          const parent = file.get_parent();
          if (parent) {
            try {
              await makeDirectoryWithParentsAsync(parent);
              await doWrite();
              return;
            } catch (dirErr) {
              logError('[TodoWidget] Failed to create directories for writing:', dirErr);
              throw dirErr;
            }
          }
        }
        throw err;
      }
    }

    private _isInteractive(actor: any): boolean {
      if (!actor) return false;

      try {
        const gtypeName = GObject.type_name(actor.constructor as any);
        if (
          gtypeName &&
          (gtypeName.includes('Button') ||
            gtypeName.includes('Entry') ||
            gtypeName.includes('Text') ||
            gtypeName.includes('ScrollBar') ||
            gtypeName.includes('ScrollView'))
        ) {
          return true;
        }
      } catch (e) {
        // Fallback to constructor name check
      }

      const className = actor.constructor.name;
      if (
        className &&
        (className.includes('Button') ||
          className.includes('Entry') ||
          className.includes('Text') ||
          className.includes('ScrollBar') ||
          className.includes('ScrollView'))
      ) {
        return true;
      }

      if (typeof actor.get_style_class_name === 'function') {
        const styleClass = actor.get_style_class_name();
        if (
          styleClass &&
          (styleClass.includes('button') ||
            styleClass.includes('checkbox') ||
            styleClass.includes('entry') ||
            styleClass.includes('project'))
        ) {
          return true;
        }
      }

      return false;
    }

    private _onButtonPress(event: any): boolean {
      if (event.get_button() !== 1) {
        return Clutter.EVENT_PROPAGATE;
      }

      if (this._settings.get_boolean('lock-position')) {
        return Clutter.EVENT_PROPAGATE;
      }

      const [x, y] = event.get_coords();

      // Find the clicked actor under the cursor using global stage picking
      let actor: any = global.stage.get_actor_at_pos(Clutter.PickMode.REACTIVE, x, y);

      // Bypass dragging if clicking interactive controls
      while (actor && actor !== this) {
        if (this._isInteractive(actor)) {
          return Clutter.EVENT_PROPAGATE;
        }
        actor = actor.get_parent();
      }

      this._dragging = true;
      const [widgetX, widgetY] = this.get_position();
      this._dragX = x - widgetX;
      this._dragY = y - widgetY;

      return Clutter.EVENT_STOP;
    }

    private _onMotion(event: any): boolean {
      if (!this._dragging) {
        return Clutter.EVENT_PROPAGATE;
      }

      const [x, y] = event.get_coords();
      const newX = x - this._dragX;
      const newY = y - this._dragY;

      this.set_position(Math.round(newX), Math.round(newY));

      return Clutter.EVENT_STOP;
    }

    private _onButtonRelease(event: any): boolean {
      if (!this._dragging) {
        return Clutter.EVENT_PROPAGATE;
      }

      this._dragging = false;

      const monitor = Main.layoutManager.primaryMonitor;
      if (monitor) {
        const [x, y] = this.get_position();
        const pctX = (x / monitor.width) * 100;
        const pctY = (y / monitor.height) * 100;

        this._settings.set_double('position-x', pctX);
        this._settings.set_double('position-y', pctY);
      }

      return Clutter.EVENT_STOP;
    }

    destroy(): void {
      this._clearTimer();
      if (this._fileMonitor) {
        (this._fileMonitor as any).disconnectObject(this);
        this._fileMonitor.cancel();
        this._fileMonitor = null;
      }
      this._settings.disconnectObject(this);
      this.destroy_all_children();
      super.destroy();
    }
  },
);

export default class TodoWidgetExtension extends Extension {
  private _widget: InstanceType<typeof TodoWidget> | null = null;

  enable(): void {
    const settings = this.getSettings();
    this._widget = new TodoWidget(settings);
    Main.layoutManager._backgroundGroup.add_child(this._widget);
  }

  disable(): void {
    if (this._widget) {
      Main.layoutManager._backgroundGroup.remove_child(this._widget);
      this._widget.destroy();
      this._widget = null;
    }
  }
}
