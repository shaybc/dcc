const PROMPT_ENHANCE_DEBUG_PREFIX = "[prompt-enhance]";

function createClientRequestId() {
  return `enh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function requestEnhancedPrompt({ userText, fieldLabel }) {
  const clientRequestId = createClientRequestId();
  const composedPrompt = [
    `You are an expert prompt engineer. Enhance and enrich the following ${fieldLabel}.`,
    "Keep the original intent, constraints, and scope.",
    "Improve clarity, completeness, and actionable detail.",
    "Return only the improved text with no markdown fences, labels, or commentary.",
    "",
    "Original text:",
    userText
  ].join("\n");

  console.info(
    `${PROMPT_ENHANCE_DEBUG_PREFIX} request:start id=${clientRequestId} field=${fieldLabel} input_len=${userText.length} prompt_len=${composedPrompt.length}`
  );

  const response = await fetch("/v1/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-DCC-Feature": "prompt-enhance",
      "X-DCC-Client-Request-Id": clientRequestId
    },
    body: JSON.stringify({
      prompt: composedPrompt,
      max_tokens: 2048,
      temperature: 0.4
    })
  });

  console.info(
    `${PROMPT_ENHANCE_DEBUG_PREFIX} request:response id=${clientRequestId} status=${response.status} ok=${response.ok}`
  );

  if (!response.ok) {
    let details = "";
    try {
      const errorBody = await response.text();
      details = errorBody ? ` body=${errorBody.slice(0, 400)}` : "";
    } catch (_error) {
      details = "";
    }
    console.error(
      `${PROMPT_ENHANCE_DEBUG_PREFIX} request:error id=${clientRequestId} status=${response.status}${details}`
    );
    throw new Error(`Enhance request failed with status ${response.status}.${details ? ` Details: ${details}` : ""}`);
  }

  const payload = await response.json();
  console.debug(
    `${PROMPT_ENHANCE_DEBUG_PREFIX} request:payload id=${clientRequestId} keys=${Object.keys(payload || {}).join(",")}`
  );
  const enhancedText = payload?.choices?.[0]?.text;
  if (!enhancedText || !String(enhancedText).trim()) {
    console.error(`${PROMPT_ENHANCE_DEBUG_PREFIX} request:empty-result id=${clientRequestId}`);
    throw new Error("AI returned an empty enhancement.");
  }

  console.info(
    `${PROMPT_ENHANCE_DEBUG_PREFIX} request:success id=${clientRequestId} output_len=${String(enhancedText).trim().length}`
  );

  return String(enhancedText).trim();
}

export function attachEnhancePromptBehavior({
  button,
  getText,
  setText,
  onChange,
  fieldLabel = "prompt"
}) {
  button.addEventListener("click", async () => {
    const text = String(getText() || "").trim();
    if (!text) {
      window.alert(`Please enter ${fieldLabel} before enhancing.`);
      return;
    }

    const originalLabel = button.textContent;
    button.disabled = true;
    button.textContent = "Enhancing...";
    console.info(`${PROMPT_ENHANCE_DEBUG_PREFIX} ui:clicked field=${fieldLabel} input_len=${text.length}`);

    try {
      const enhancedText = await requestEnhancedPrompt({
        userText: text,
        fieldLabel
      });
      setText(enhancedText);
      onChange();
      console.info(`${PROMPT_ENHANCE_DEBUG_PREFIX} ui:applied field=${fieldLabel} output_len=${enhancedText.length}`);
    } catch (error) {
      console.error(`${PROMPT_ENHANCE_DEBUG_PREFIX} ui:error field=${fieldLabel}`, error);
      window.alert(String(error?.message || error || "Unable to enhance prompt."));
    } finally {
      button.disabled = false;
      button.textContent = originalLabel;
      console.info(`${PROMPT_ENHANCE_DEBUG_PREFIX} ui:idle field=${fieldLabel}`);
    }
  });
}
