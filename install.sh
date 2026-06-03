#!/bin/bash
UUID=$(jq -r .uuid metadata.json)
EXT_DIR="$HOME/.local/share/gnome-shell/extensions/$UUID"
rm -rf "$EXT_DIR"
mkdir -p "$EXT_DIR"
cp -r dist/* "$EXT_DIR/"
glib-compile-schemas "$EXT_DIR/schemas/"

# Compile system-wide for user session so GSettings works perfectly
mkdir -p "$HOME/.local/share/glib-2.0/schemas/"
cp dist/schemas/*.gschema.xml "$HOME/.local/share/glib-2.0/schemas/"
glib-compile-schemas "$HOME/.local/share/glib-2.0/schemas/"

echo "Installed to $EXT_DIR"
