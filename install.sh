#!/bin/bash
UUID=$(jq -r .uuid metadata.json)
EXT_DIR="$HOME/.local/share/gnome-shell/extensions/$UUID"
rm -rf "$EXT_DIR"
mkdir -p "$EXT_DIR"
cp -r dist/* "$EXT_DIR/"
glib-compile-schemas "$EXT_DIR/schemas/"
echo "Installed to $EXT_DIR"
