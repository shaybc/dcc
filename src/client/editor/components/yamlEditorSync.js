export function createTextFormSync({
  textArea,
  errorNode,
  parseText,
  serializeState,
  readState,
  writeState,
  onTextInput
}) {
  let suppressTextUpdate = false;
  let suppressFormUpdate = false;

  function setError(message) {
    errorNode.textContent = message || "";
    errorNode.hidden = !message;
  }

  function updateTextFromForm() {
    if (suppressTextUpdate) return;
    try {
      suppressFormUpdate = true;
      textArea.value = serializeState(readState());
      setError("");
    } catch (error) {
      setError(error.message || "Failed to serialize content.");
    } finally {
      suppressFormUpdate = false;
    }
  }

  function updateFormFromText({ reason = "input", event } = {}) {
    if (suppressFormUpdate) return;
    if (typeof onTextInput === "function") {
      const result = onTextInput({ text: textArea.value, reason, event });
      if (result?.skipParse) return;
    }
    try {
      suppressTextUpdate = true;
      const parsed = parseText(textArea.value);
      writeState(parsed);
      setError("");
    } catch (error) {
      setError(error.message || "Failed to parse text.");
    } finally {
      suppressTextUpdate = false;
    }
  }

  textArea.addEventListener("input", (event) => updateFormFromText({ reason: "input", event }));

  return {
    updateTextFromForm,
    updateFormFromText,
    setError
  };
}
