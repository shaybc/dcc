export const MAX_LOG_ENTRIES = 2000;
export const STUCK_TIMEOUT_MS = 120000;

export const RUN_OPTION_FLAG_MAP = [
  ["denyRead", "--exclude", "Read"],
  ["denyList", "--exclude", "List"],
  ["denySearch", "--exclude", "Search"],
  ["denyFetch", "--exclude", "Fetch"],
  ["denyDiff", "--exclude", "Diff"],
  ["allowWrite", "--allow", "Write"],
  ["allowEdit", "--allow", "Edit"],
  ["allowMultiEdit", "--allow", "MultiEdit"],
  ["allowTerminal", "--allow", "Bash(*)"]
];

export const RUN_STATUS_LAUNCHING = new Set(["running", "launched", "preparing_to_launch"]);
