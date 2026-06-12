
#!/bin/sh

# --- interpreters ---
PY=/storage/AIML/MLDashboard/FinSentinel_Microservice/venv/bin/python
PY_2=/storage/AIML/MLDashboard/MLpipe-v2/venv/bin/python

# --- service roots ---
GATEWAY_DIR=/storage/AIML/MLDashboard/FinSentinel_Microservice/Finsentinel_gateway
CORE_DIR=/storage/AIML/MLDashboard/FinSentinel_Microservice/Backend
WORKFLOW_DIR=/storage/AIML/MLDashboard/MLpipe-v2/Backend
GRAPHQL_DIR=/storage/AIML/MLDashboard/FinSentinel_Microservice/Backend
MULE_DIR=/storage/AIML/MLDashboard/FinSentinel_Microservice/Backend
REPORT_DIR=/storage/AIML/MLDashboard/FinSentinel_Microservice/Backend

# --- entry points ---
PY_GATEWAY=$GATEWAY_DIR/app.py
PY_CORE=$CORE_DIR/app.py
PY_WORKFLOW=$WORKFLOW_DIR/app.py
PY_GRAPHQL=$GRAPHQL_DIR/graphql_service.py
PY_MULE=$MULE_DIR/mule_service.py
PY_REPORT=$REPORT_DIR/report_service.py

# --- explicit ports (change these to your actual ports) ---
PORT_GATEWAY=8000
PORT_CORE=8001
PORT_WORKFLOW=8002
PORT_GRAPHQL=8003
PORT_MULE=8004
PORT_REPORT=8005

# --- logs ---
LOG=/storage/AIML/MLDashboard/FinSentinel_Microservice/nohup_log/gateway.nohup.log
LOG_1=/storage/AIML/MLDashboard/FinSentinel_Microservice/Backend/nohup_log/core.nohup.log
LOG_2=/storage/AIML/MLDashboard/FinSentinel_Microservice/nohup_log/workflow.nohup.log
LOG_3=/storage/AIML/MLDashboard/FinSentinel_Microservice/nohup_log/graphql.nohup.log
LOG_4=/storage/AIML/MLDashboard/FinSentinel_Microservice/nohup_log/mule.nohup.log
LOG_5=/storage/AIML/MLDashboard/FinSentinel_Microservice/nohup_log/report.nohup.log

mkdir -p \
  "$(dirname "$LOG")" \
  "$(dirname "$LOG_1")" \
  "$(dirname "$LOG_2")" \
  "$(dirname "$LOG_3")" \
  "$(dirname "$LOG_4")" \
  "$(dirname "$LOG_5")"

is_port_free() {
  port="$1"
  # works if lsof installed; else use ss: ss -ltn sport = :$port | grep -q LISTEN
  lsof -i :"$port" >/dev/null 2>&1 && return 1 || return 0
}

already_running() {
  py_bin="$1"; script="$2"
  pgrep -f "$py_bin .* $script" >/dev/null 2>&1
}

start_service() {
  py_bin="$1"; dir="$2"; script="$3"; log="$4"; port="$5"; name="$6"

  if already_running "$py_bin" "$script"; then
    printf '[SKIP] %-10s already running\n' "$name"
    return 0
  fi

  if ! is_port_free "$port"; then
    printf '[FAIL] %-10s port %s already in use\n' "$name" "$port"
    return 1
  fi

  # Export env vars that your app.py reads: PORT, WORKERS, and any others you rely on
  ( cd "$dir" && PORT="$port" WORKERS=2 nohup "$py_bin" "$script" >>"$log" 2>&1 & )
  printf '[OK]   %-10s started on :%s -> %s\n' "$name" "$port" "$log"
}

start_service "$PY"   "$GATEWAY_DIR"  "$PY_GATEWAY"  "$LOG"   "$PORT_GATEWAY"  "gateway"
start_service "$PY"   "$CORE_DIR"     "$PY_CORE"     "$LOG_1" "$PORT_CORE"     "core"
start_service "$PY_2" "$WORKFLOW_DIR" "$PY_WORKFLOW" "$LOG_2" "$PORT_WORKFLOW" "workflow"
start_service "$PY"   "$GRAPHQL_DIR"  "$PY_GRAPHQL"  "$LOG_3" "$PORT_GRAPHQL"  "graphql"
start_service "$PY"   "$MULE_DIR"     "$PY_MULE"     "$LOG_4" "$PORT_MULE"     "mule"
start_service "$PY"   "$REPORT_DIR"   "$PY_REPORT"   "$LOG_5" "$PORT_REPORT"   "report"

sleep 1
echo '--- PIDs ---'
pgrep -af "$PY_GATEWAY"  || true
pgrep -af "$PY_CORE"     || true
pgrep -af "$PY_WORKFLOW" || true
pgrep -af "$PY_GRAPHQL"  || true
pgrep -af "$PY_MULE"     || true
pgrep -af "$PY_REPORT"   || true
