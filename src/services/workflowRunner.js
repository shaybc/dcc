import { addStep, finishStep } from "./runHistoryService.js";
import { logInfo } from "../utils/logger.js";

/**
 * Workflow runner scaffold.
 * A workflow is defined in YAML/JSON in the config repo.
 * This MVP does not yet parse YAML. It demonstrates the run/step lifecycle and logging.
 */
export async function runWorkflow({ runId, workflowId }) {
  logInfo(`Running workflow`, { runId, workflowId });

  // Example steps. Replace with real step loading + execution.
  const step1 = addStep({ runId, stepName: "collect_context" });
  await sleep(300);
  finishStep({ stepId: step1, status: "success", detail: "Collected basic context (scaffold)." });

  const step2 = addStep({ runId, stepName: "analyze_architecture" });
  await sleep(400);
  finishStep({ stepId: step2, status: "success", detail: "Analysis complete (scaffold)." });

  return { ok: true };
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
