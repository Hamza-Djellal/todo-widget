import St from 'gi://St';
import GObject from 'gi://GObject';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

const TodoWidget = GObject.registerClass(
  class TodoWidget extends St.BoxLayout {
    private _settings: any;
    private _handlerIds: number[] = [];
    private _intervalId: number | null = null;
    private _taskLabels: St.Label[] = [];

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
      this._startUpdates();
      this._updateTodoList();
    }

    private _buildUI(): void {
      this._updateContainerStyle();
    }

    private _connectSettings(): void {
      this._handlerIds.push(
        this._settings.connect('changed::position-x', () =>
          this._updatePosition(),
        ),
      );
      this._handlerIds.push(
        this._settings.connect('changed::position-y', () =>
          this._updatePosition(),
        ),
      );

      const styleKeys = [
        'background-color',
        'border-color',
        'text-color',
        'border-radius',
        'padding-horizontal',
        'padding-vertical',
        'label-font-size'
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
        this._settings.connect(`changed::update-interval`, () => {
          this._startUpdates();
        }),
      );
    }

    private _updateContainerStyle(): void {
      const bgColor = this._settings.get_string('background-color');
      const borderColor = this._settings.get_string('border-color');
      const borderRadius = this._settings.get_int('border-radius');
      const padH = this._settings.get_int('padding-horizontal');
      const padV = this._settings.get_int('padding-vertical');

      this.set_style(`
            background-color: ${bgColor};
            border: 2px solid ${borderColor};
            border-radius: ${borderRadius}px;
            padding: ${padV}px ${padH}px;
        `);
    }

    private _updatePosition(): void {
      const monitor = Main.layoutManager.primaryMonitor;
      if (!monitor) return;
      const x = (monitor.width * this._settings.get_double('position-x')) / 100;
      const y =
        (monitor.height * this._settings.get_double('position-y')) / 100;
      this.set_position(Math.round(x), Math.round(y));
    }

    private _startUpdates(): void {
      this._clearTimer();
      const interval = this._settings.get_int('update-interval');
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

    private async _updateTodoList(): Promise<void> {
      let path = this._settings.get_string('todo-file-path');
      if (path.startsWith('~/')) {
        path = GLib.get_home_dir() + path.slice(1);
      }

      try {
        const file = Gio.File.new_for_path(path);
        const [success, contents] = file.load_contents(null);

        if (success) {
            const decoder = new TextDecoder('utf-8');
            const text = decoder.decode(contents);
            const lines = text.split('\n').filter(line => line.trim().length > 0);
            this._renderTasks(lines);
        } else {
            this._renderTasks(['(Todo file not found or empty)']);
        }
      } catch (err) {
        console.error(`[TodoWidget] Error reading file at ${path}:`, err);
        this._renderTasks([`Error reading ${path}`]);
      }
    }

    private _renderTasks(tasks: string[]): void {
      this.destroy_all_children();
      this._taskLabels = [];
      const fontSize = this._settings.get_int('label-font-size');
      const textColor = this._settings.get_string('text-color');

      // Add a wrapper box that forces left alignment
      const contentBox = new St.BoxLayout({
          vertical: true,
          x_expand: true,
          x_align: Clutter.ActorAlign.START
      });

      const titleLabel = new St.Label({
        text: 'TODO LIST',
        style: `font-size: ${fontSize + 2}px; font-weight: bold; margin-bottom: 8px; color: ${textColor};`
      });
      contentBox.add_child(titleLabel);

      tasks.forEach((task) => {
        const label = new St.Label({
          text: `• ${task}`,
          style: `font-size: ${fontSize}px; margin-bottom: 4px; color: ${textColor};`
        });
        this._taskLabels.push(label);
        contentBox.add_child(label);
      });

      this.add_child(contentBox);
    }

    destroy(): void {
      this._clearTimer();
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
