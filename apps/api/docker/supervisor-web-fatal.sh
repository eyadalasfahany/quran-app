#!/bin/sh
# supervisord event listener (ADR 0065). On PROCESS_STATE_FATAL for the `web` program, stop supervisord so the
# container exits and Railway's restart policy (ALWAYS) starts a new one. Other programs are ignored.
# stdout carries the listener protocol only; messages go to stderr.
set -u
while :; do
  printf 'READY\n'
  read -r header || exit 0
  len=$(printf '%s\n' "$header" | sed -n 's/.*len:\([0-9][0-9]*\).*/\1/p')
  payload=$(dd bs=1 count="${len:-0}" 2>/dev/null)
  case "$payload" in
    *processname:web\ *)
      echo "web_fatal: the web server is FATAL; stopping the container" >&2
      kill -TERM "$(cat /tmp/supervisord.pid)"
      ;;
  esac
  printf 'RESULT 2\nOK'
done
