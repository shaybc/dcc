const initialState = Object.freeze({
  definitions: [],
  activeFilter: "all",
  searchTerm: "",
  devProjects: [],
  currentDetailDefinitionId: null,
  activeHistoricalVersion: "",
  lastValidationResult: null,
  activeVersionDropdown: null
});

let state = { ...initialState };

export function getState() {
  return state;
}

export function setState(updates) {
  state = { ...state, ...updates };
  return state;
}

export function resetState() {
  state = { ...initialState };
  return state;
}
