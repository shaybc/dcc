export function createFavoritesStorage(storageKey) {
  let favoriteDefinitionIds = new Set();

  function getStoredFavoriteDefinitionIds() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        return new Set();
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return new Set();
      }
      return new Set(parsed.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0));
    } catch (_error) {
      return new Set();
    }
  }

  function persistFavoriteDefinitionIds() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(favoriteDefinitionIds)));
    } catch (_error) {
      // Ignore localStorage errors.
    }
  }

  function isFavoriteDefinition(definitionId) {
    return favoriteDefinitionIds.has(Number(definitionId));
  }

  function toggleFavoriteDefinition(definitionId) {
    const normalizedId = Number(definitionId);
    if (!Number.isFinite(normalizedId) || normalizedId <= 0) {
      return false;
    }

    if (favoriteDefinitionIds.has(normalizedId)) {
      favoriteDefinitionIds.delete(normalizedId);
    } else {
      favoriteDefinitionIds.add(normalizedId);
    }

    persistFavoriteDefinitionIds();
    return favoriteDefinitionIds.has(normalizedId);
  }

  favoriteDefinitionIds = getStoredFavoriteDefinitionIds();


  function pruneFavoriteDefinitionIds(validDefinitionIds = []) {
    const validSet = new Set(
      (Array.isArray(validDefinitionIds) ? validDefinitionIds : [])
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0)
    );

    favoriteDefinitionIds = new Set(
      Array.from(favoriteDefinitionIds).filter((definitionId) => validSet.has(definitionId))
    );
    persistFavoriteDefinitionIds();
  }

  return {
    getStoredFavoriteDefinitionIds,
    isFavoriteDefinition,
    toggleFavoriteDefinition,
    pruneFavoriteDefinitionIds,
  };
}
