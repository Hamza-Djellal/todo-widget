<p align="center">
  <img src="https://img.shields.io/github/stars/Hamza-Djellal/todo-widget">
  <img src="https://img.shields.io/github/license/Hamza-Djellal/todo-widget">
  <img alt="GNOME Shell" src="https://img.shields.io/badge/GNOME_Shell-45%2B-4A86CF?logo=gnome&logoColor=white"/>
  <img src="https://img.shields.io/badge/status-active-success">
</p>

<p align="center">
  <img src="icon.png" width="128" height="128" alt="Todo Widget icon">
</p>

# Todo Widget

A minimal, fully interactive desktop widget for GNOME Shell that displays and manages tasks from a plain-text todo file directly on your desktop.

---

## Features

- 📝 **Plain-Text Todo**: Reads tasks from a plain text file, defaulting to `~/todo.txt`.
- 🔒 **Interactive Checkboxes**: Toggle task completion directly from the desktop.
- ➕ **Inline Task Creation**: Click the `+` button in the header, type your task, and press `Enter` to instantly append it.
- 🔄 **Bidirectional File Watching**: Watches your todo text file; changes made externally sync immediately to your desktop widget.
- 🖱️ **Drag-and-Drop Repositioning**: Click and drag the widget anywhere on the desktop to adjust its location.
- 🛡️ **Desktop Position Locking**: Toggle widget movement locking directly via the lock button in the header to prevent accidental drags.
- 📂 **Quick Editor Launcher**: Click the document icon to instantly open the todo file in your default system text editor.
- 🗑️ **Completed Task Purging**: Clear all completed tasks (prefixed with `x`) with a single click.
- 🎨 **GNOME 50 Glassmorphism**: High-fidelity, translucent glass styling options that blend seamlessly with Adwaita wallpapers.
- 🎨 **Built-in Theme Presets**: Pick from System (native), Dark, Light, Nord, Dracula, Gruvbox, or design your own using Custom colors in the Preferences.

---

## Installation

### From Source

Ensure you have Node.js and TypeScript installed on your system.

1. Clone this repository to your local machine:
   ```bash
   git clone https://github.com/Hamza-Djellal/todo-widget.git
   cd todo-widget
   ```

2. Install dependencies, compile, and install local extension:
   ```bash
   npm install
   npm run install-local
   ```

3. Restart GNOME Shell (or log out and log back in on Wayland).

4. Enable the extension using the **GNOME Extensions** application or Extensions Manager.

---

## Preferences

Open the Extension Preferences to configure:
- **Theme Preset**: Toggle between System (glassmorphic), Light, Dark, Dracula, Nord, Gruvbox, or Custom.
- **Custom Spacing & Layout**: Adjust font size, borders, margin, padding, and corner radius.
- **Task Behavior**: Toggle whether checking off a task crosses it out (`x task` todo.txt style) or deletes it immediately.
- **Todo Path**: Point to your preferred todo text file path (e.g. `~/todo.txt`).

---

## Build Package

To build the extension archive (`extension.zip`) for manual installation or upload:
```bash
npm run zip
```
