import { inspect } from 'node:util';

const MAX_LOGS = 1200;
const listeners = new Set();
const state = {
  logs: [],
  initialized: false,
  originals: null
};

function stringifyArg(arg) {
  if (typeof arg === 'string') return arg;
  if (arg instanceof Error) {
    return `${arg.name}: ${arg.message}${arg.stack ? `\n${arg.stack}` : ''}`;
  }
  return inspect(arg, { depth: 4, breakLength: 120, compact: true });
}

function createLog(level, args = []) {
  return {
    id: `${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    timestamp: Date.now(),
    level,
    message: args.map((arg) => stringifyArg(arg)).join(' ')
  };
}

export function pushRuntimeLog(level, ...args) {
  const log = createLog(level, args);
  state.logs.push(log);
  if (state.logs.length > MAX_LOGS) {
    state.logs.splice(0, state.logs.length - MAX_LOGS);
  }
  for (const listener of listeners) {
    try {
      listener(log);
    } catch (error) {
      // ignore listener failures
    }
  }
  return log;
}

export function getRuntimeLogs(limit = 400) {
  const safeLimit = Math.min(Math.max(Number(limit) || 0, 1), MAX_LOGS);
  return state.logs.slice(-safeLimit);
}

export function clearRuntimeLogs() {
  state.logs = [];
}

export function subscribeRuntimeLogs(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function initRuntimeLogCapture() {
  if (state.initialized) return;
  state.initialized = true;
  state.originals = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug ? console.debug.bind(console) : console.log.bind(console)
  };

  const wrap = (level, original) => (...args) => {
    pushRuntimeLog(level, ...args);
    original(...args);
  };

  console.log = wrap('log', state.originals.log);
  console.info = wrap('info', state.originals.info);
  console.warn = wrap('warn', state.originals.warn);
  console.error = wrap('error', state.originals.error);
  console.debug = wrap('debug', state.originals.debug);
}
