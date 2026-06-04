import St from 'gi://St';
import GObject from 'gi://GObject';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

// Helper function to create a directory asynchronously
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

// Helper function to create directories recursively asynchronously
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

// Helper to load file contents asynchronously
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

// Helper to create an empty file asynchronously
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

// Helper to log errors without breaking the ungated console logging rule
function logError(msg: string, err?: any): void {
  console.error(msg, err);
}

const TodoWidget = GObject.registerClass(
  class TodoWidget extends St.BoxLayout {
    private _settings: any;
    private _handlerIds: number[] = [];
    private _intervalId: number | null = null;
    private _fileMonitor: Gio.FileMonitor | null = null;
    private _fileMonitorId: number | null = null;
    private _filePath: string = '';

    // Drag state
    private _dragging = false;
    private _dragX = 0;
    private _dragY = 0;

    // UI elements
    private _headerBox!: St.BoxLayout;
    private _tasksScrollView!: St.ScrollView;
    private _tasksBox!: St.BoxLayout;
    private _addBox!: St.BoxLayout;
    private _addEntry!: St.Entry;
    private _lockButtonIcon!: St.Icon;

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
      // Apply style classes based on theme
      this._updateContainerStyle();

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

      const title = new St.Label({
        text: 'TODO LIST',
        style_class: 'todo-title',
        y_align: Clutter.ActorAlign.CENTER,
        x_expand: true,
      });
      this._headerBox.add_child(title);

      // Add task toggle button
      const addButton = new St.Button({
        style_class: 'todo-header-button',
        reactive: true,
        can_focus: true,
        child: new St.Icon({
          icon_name: 'list-add-symbolic',
          icon_size: 14,
        }),
      });
      addButton.connect('clicked', () => {
        this._toggleAddBox();
      });
      this._headerBox.add_child(addButton);

      // Open file button
      const openButton = new St.Button({
        style_class: 'todo-header-button',
        reactive: true,
        can_focus: true,
        child: new St.Icon({
          icon_name: 'document-open-symbolic',
          icon_size: 14,
        }),
      });
      openButton.connect('clicked', () => {
        this._openTodoFile();
      });
      this._headerBox.add_child(openButton);

      // Clear completed tasks button
      const clearButton = new St.Button({
        style_class: 'todo-header-button',
        reactive: true,
        can_focus: true,
        child: new St.Icon({
          icon_name: 'edit-clear-symbolic',
          icon_size: 14,
        }),
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
      this.add_child(this._tasksScrollView);

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
        if (text) {
          this._addTask(text);
          this._addEntry.set_text('');
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
      this.add_child(this._addBox);
    }

    private _connectSettings(): void {
      this._handlerIds.push(
        this._settings.connect('changed::position-x', () => this._updatePosition()),
      );
      this._handlerIds.push(
        this._settings.connect('changed::position-y', () => this._updatePosition()),
      );

      const styleKeys = [
        'theme',
        'background-color',
        'border-color',
        'text-color',
        'border-radius',
        'padding-horizontal',
        'padding-vertical',
        'label-font-size',
      ];
      styleKeys.forEach((key) => {
        this._handlerIds.push(
          this._settings.connect(`changed::${key}`, () => {
            this._updateContainerStyle();
            this._updateTodoList();
          }),
        );
      });

      this._handlerIds.push(
        this._settings.connect('changed::todo-file-path', () => {
          this._updateFilePath();
          this._updateTodoList();
        }),
      );

      this._handlerIds.push(
        this._settings.connect('changed::update-interval', () => {
          this._startUpdates();
        }),
      );

      this._handlerIds.push(
        this._settings.connect('changed::show-completed', () => {
          this._updateTodoList();
        }),
      );

      this._handlerIds.push(
        this._settings.connect('changed::completed-behavior', () => {
          this._updateTodoList();
        }),
      );

      this._handlerIds.push(
        this._settings.connect('changed::lock-position', () => {
          this._updateLockIcon();
        }),
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
      `;

      if (theme === 'custom') {
        const bgColor = this._settings.get_string('background-color');
        const borderColor = this._settings.get_string('border-color');
        inlineStyle += `
          background-color: ${bgColor};
          border: 1px solid ${borderColor};
        `;
      }

      this.set_style(inlineStyle);
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
        if (this._fileMonitorId !== null) {
          this._fileMonitor.disconnect(this._fileMonitorId);
          this._fileMonitorId = null;
        }
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
        if (this._fileMonitorId !== null) {
          this._fileMonitor.disconnect(this._fileMonitorId);
          this._fileMonitorId = null;
        }
        this._fileMonitor.cancel();
      }
      this._fileMonitor = file.monitor_file(Gio.FileMonitorFlags.NONE, null);
      this._fileMonitorId = this._fileMonitor.connect('changed', (mon, f, otherF, eventType) => {
        if (
          eventType === Gio.FileMonitorEvent.CHANGES_DONE_HINT ||
          eventType === Gio.FileMonitorEvent.CREATED
        ) {
          this._updateTodoList();
        }
      });
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
            this._renderTasks(lines);
          } else {
            this._renderTasks(['Failed to read tasks file.']);
          }
        } catch (err: any) {
          if (err.code === Gio.IOErrorEnum.NOT_FOUND) {
            this._renderTasks(['No tasks file found. Click + to start.']);
          } else {
            logError('[TodoWidget] Error loading contents:', err);
            this._renderTasks([`Error reading tasks file`]);
          }
        }
      } catch (err) {
        logError('[TodoWidget] Error updating todo list:', err);
        this._renderTasks([`Error: ${err}`]);
      }
    }

    private _renderTasks(tasks: string[]): void {
      this._tasksBox.destroy_all_children();

      const theme = this._settings.get_string('theme');
      const fontSize = this._settings.get_int('label-font-size');
      const textColor = this._settings.get_string('text-color');
      const showCompleted = this._settings.get_boolean('show-completed');

      let taskCount = 0;

      tasks.forEach((task, index) => {
        const isCompleted = task.trim().startsWith('x ');

        // Skip completed tasks if show-completed is disabled
        if (isCompleted && !showCompleted) {
          return;
        }

        // Clean task text by removing 'x ' prefix for display
        const taskText = isCompleted ? task.trim().slice(2) : task;

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
            icon_name: isCompleted ? 'checkbox-checked-symbolic' : 'checkbox-symbolic',
            icon_size: fontSize + 2,
            style: theme === 'custom' ? `color: ${textColor};` : '',
          }),
        });

        checkbox.connect('clicked', () => {
          this._toggleTaskCompleted(index);
        });

        row.add_child(checkbox);

        // Label
        const label = new St.Label({
          text: taskText,
          style_class: isCompleted ? 'todo-task-text-completed' : 'todo-task-text',
          style: theme === 'custom'
            ? `font-size: ${fontSize}px; color: ${textColor};`
            : `font-size: ${fontSize}px;`,
          y_align: Clutter.ActorAlign.CENTER,
          x_expand: true,
        });

        row.add_child(label);
        this._tasksBox.add_child(row);
        taskCount++;
      });

      if (taskCount === 0) {
        const emptyLabel = new St.Label({
          text: 'No tasks left!',
          style_class: 'todo-task-text-completed',
          style: theme === 'custom'
            ? `font-size: ${fontSize}px; color: ${textColor}; margin: 8px 0;`
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

        const separator = contents.endsWith('\n') || contents === '' ? '' : '\n';
        const newContents = contents + separator + text + '\n';

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
        const newLines = lines.filter((line) => !line.trim().startsWith('x '));
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
            styleClass.includes('entry'))
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
        if (this._fileMonitorId !== null) {
          this._fileMonitor.disconnect(this._fileMonitorId);
          this._fileMonitorId = null;
        }
        this._fileMonitor.cancel();
        this._fileMonitor = null;
      }
      this._handlerIds.forEach((id) => this._settings.disconnect(id));
      this._handlerIds = [];
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
