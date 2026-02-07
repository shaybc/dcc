export function createTextFormSync({ textArea, errorNode, parseText, serializeState, readState, writeState }) {
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

  function updateFormFromText() {
    if (suppressFormUpdate) return;
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

  textArea.addEventListener("input", updateFormFromText);

  return {
    updateTextFromForm,
    updateFormFromText,
    setError
  };
}
