#!/usr/bin/env bash
# PostToolUse hook (Write|Edit): formatea con Prettier y lintea con ESLint
# los archivos React/TS y Markdown recien creados o editados.

FILE=$(jq -r '.tool_input.file_path // empty')

[ -z "$FILE" ] && exit 0
[ -f "$FILE" ] || exit 0

cd "$CLAUDE_PROJECT_DIR" || exit 0

squeeze_blank_lines() {
  # Colapsa 2+ lineas en blanco consecutivas a 1, y quita blancos al inicio/fin del archivo.
  awk 'BEGIN{blank=0} /^[[:space:]]*$/{blank++; if(blank<=1) print; next} {blank=0; print}' "$1" \
    | sed -e '/./,$!d' -e ':a' -e '/^\n*$/{$d;N;ba' -e '}' > "$1.tmp" && mv "$1.tmp" "$1"
}

case "$FILE" in
  *.tsx|*.jsx|*.ts)
    squeeze_blank_lines "$FILE"
    npx prettier --write "$FILE"
    npx eslint --fix "$FILE"
    ;;
  *.md|*.mdx)
    squeeze_blank_lines "$FILE"
    npx prettier --write "$FILE"
    ;;
esac

exit 0
