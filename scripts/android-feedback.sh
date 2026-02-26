#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
FEEDBACK_DIR="${ROOT_DIR}/feedback"
DEVICE_SERIAL=""

mkdir -p "${FEEDBACK_DIR}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    exit 1
  fi
}

ensure_device() {
  require_cmd adb
  adb start-server >/dev/null 2>&1 || true

  local connected
  connected="$(adb devices | awk '/\tdevice$/{print $1}')"

  if [[ -n "${ANDROID_SERIAL:-}" ]]; then
    if echo "${connected}" | grep -Fxq "${ANDROID_SERIAL}"; then
      DEVICE_SERIAL="${ANDROID_SERIAL}"
      return
    fi
    echo "ANDROID_SERIAL is set to '${ANDROID_SERIAL}', but that device is not in 'device' state."
    echo "Current adb devices:"
    adb devices
    exit 1
  fi

  if [[ -n "${connected}" ]]; then
    DEVICE_SERIAL="$(echo "${connected}" | head -n 1)"
    return
  fi

  echo "No Android device detected in 'device' state."
  echo "Current adb devices:"
  adb devices
  echo ""
  echo "If you are using Wi-Fi debugging, make sure you ran:"
  echo "  adb connect <phone-ip>:<connect-port>"
  echo ""
  echo "Or connect your phone via USB and run:"
  echo "  adb devices"
  exit 1
}

adb_target() {
  ensure_device
  if [[ -z "${DEVICE_SERIAL}" ]]; then
    echo "No Android device detected."
    exit 1
  fi
  echo "${DEVICE_SERIAL}"
}

adb_exec_out() {
  local serial
  serial="$(adb_target)"
  adb -s "${serial}" exec-out "$@"
}

adb_shell() {
  local serial
  serial="$(adb_target)"
  adb -s "${serial}" shell "$@"
}

capture_shot() {
  local serial timestamp requested filename output
  serial="$(adb_target)"
  timestamp="$(date +%Y%m%d-%H%M%S)"
  requested="${1:-}"

  if [[ -z "${requested}" ]]; then
    filename="issue-feedback-android-${timestamp}.png"
  else
    filename="${requested}"
    if [[ "${filename}" != *issue-feedback* ]]; then
      filename="issue-feedback-${filename}"
    fi
  fi

  output="${FEEDBACK_DIR}/${filename}"
  adb -s "${serial}" exec-out screencap -p > "${output}"
  echo "Saved screenshot from ${serial}: ${output}"
}

run_mirror() {
  local serial
  serial="$(adb_target)"
  require_cmd scrcpy
  exec scrcpy -s "${serial}" --window-title "ScratPad Android Mirror" --stay-awake
}

run_session() {
  local serial scrcpy_pid
  serial="$(adb_target)"
  require_cmd scrcpy

  scrcpy -s "${serial}" --window-title "ScratPad Android Mirror" --stay-awake >/dev/null 2>&1 &
  scrcpy_pid=$!

  cleanup() {
    if kill -0 "${scrcpy_pid}" >/dev/null 2>&1; then
      kill "${scrcpy_pid}" >/dev/null 2>&1 || true
    fi
  }

  trap cleanup EXIT INT TERM

  echo ""
  echo "Android feedback session started."
  echo "Connected device: ${serial}"
  echo "Scrcpy mirror is open."
  echo ""
  echo "Controls in this terminal:"
  echo "  [Enter] Capture screenshot"
  echo "  q       Quit session"
  echo ""
  echo "Screenshots will be saved to:"
  echo "  ${FEEDBACK_DIR}"
  echo ""

  while true; do
    if ! kill -0 "${scrcpy_pid}" >/dev/null 2>&1; then
      echo "Scrcpy closed. Session ended."
      break
    fi

    IFS= read -r input
    if [[ "${input}" == "q" || "${input}" == "Q" ]]; then
      echo "Quitting session..."
      break
    fi
    capture_shot
  done
}

print_help() {
  cat <<'EOF'
Usage: scripts/android-feedback.sh <command> [args]

Commands:
  mirror               Mirror Android device with scrcpy
  shot [filename.png]  Capture one screenshot to feedback/
  session              Mirror + terminal-driven screenshot capture loop
  help                 Show this help

Notes:
  - Set ANDROID_SERIAL to choose a specific connected device.
  - For wireless debugging, make sure adb shows your device as "device".
EOF
}

case "${1:-help}" in
  mirror)
    run_mirror
    ;;
  shot)
    capture_shot "${2:-}"
    ;;
  session)
    run_session
    ;;
  help|--help|-h)
    print_help
    ;;
  *)
    echo "Unknown command: ${1}"
    print_help
    exit 1
    ;;
esac
