# Todo Widget

Todo Widget is a GNOME Shell extension that shows a plain-text todo list directly on your desktop.

## What it does

- Reads tasks from a configurable text file, defaulting to `~/todo.txt`.
- Displays each non-empty line as a bullet item under a `TODO LIST` heading.
- Refreshes the list automatically at a configurable interval.
- Lets you position the widget on the desktop with X/Y percentage settings.
- Provides appearance settings for theme, background color, border color, text color, border radius, padding, and font size.

## Preferences

Open the extension preferences to configure:

- Todo file path
- Update interval
- Desktop position
- Preset theme or custom colors
- Font size, padding, and border radius

## Installation

```bash
npm install
npm run install-local
```

After installing, enable the extension from GNOME Extensions.

## Build package

```bash
npm run zip
```
