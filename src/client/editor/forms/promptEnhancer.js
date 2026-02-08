async function requestEnhancedPrompt({ userText, fieldLabel }) {
  const composedPrompt = [
    `You are an expert prompt engineer. Enhance and enrich the following ${fieldLabel}.`,
    "Keep the original intent, constraints, and scope.",
    "Improve clarity, completeness, and actionable detail.",
    "Return only the improved text with no markdown fences, labels, or commentary.",
    "",
    "Original text:",
    userText
  ].join("\n");

  const response = await fetch("/v1/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: composedPrompt,
      max_tokens: 2048,
      temperature: 0.4
    })
  });

  if (!response.ok) {
    throw new Error(`Enhance request failed with status ${response.status}`);
  }

  const payload = await response.json();
  const enhancedText = payload?.choices?.[0]?.text;
  if (!enhancedText || !String(enhancedText).trim()) {
    throw new Error("AI returned an empty enhancement.");
  }

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

    try {
      const enhancedText = await requestEnhancedPrompt({
        userText: text,
        fieldLabel
      });
      setText(enhancedText);
      onChange();
    } catch (error) {
      window.alert(String(error?.message || error || "Unable to enhance prompt."));
    } finally {
      button.disabled = false;
      button.textContent = originalLabel;
    }
  });
}

