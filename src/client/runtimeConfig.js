function readRuntimeConfig() {
  return window.__DCC_RUNTIME_CONFIG || {};
}

export function isAgentEnabled() {
  return readRuntimeConfig().enableAgent === true;
}
