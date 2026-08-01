import { useCallback, useMemo, useState } from 'react';

// =============================================================================
// Unified City State
// =============================================================================
// The single source of truth for "which city is currently being represented
// on screen, and in what mode" on the World Map:
//
//   - `castle` (the player's own castle, from GET /castle/me)
//   - `visit`  ({ loading, data } - the castle currently being "visited" via
//               "enter kingdom", or null)
//
// Battle rendering has no presence on the World Map or in this state
// container - there is no "battle mode" here anymore.
// =============================================================================

export const CITY_MODE = {
  OWN: 'own',
  VISITING: 'visiting',
};

const EMPTY_VISIT = { loading: false, data: null };

function initialRaw() {
  return {
    own: null, // full /castle/me payload
    visit: EMPTY_VISIT, // { loading, data } - data/loading shape kept identical to the old `visit` state
  };
}

function deriveMode(raw) {
  if (raw.visit.loading || raw.visit.data) return CITY_MODE.VISITING;
  return CITY_MODE.OWN;
}

function deriveCastleId(raw, mode) {
  if (mode === CITY_MODE.VISITING) return raw.visit.data?.id ?? null;
  return raw.own?.id ?? null;
}

function deriveBuildings(raw, mode) {
  if (mode === CITY_MODE.VISITING) return raw.visit.data?.buildings || [];
  return raw.own?.buildings || [];
}

function deriveUnlockedTiles(raw, mode) {
  if (mode === CITY_MODE.VISITING) return raw.visit.data?.city?.unlocked_tiles || [];
  return raw.own?.city?.unlocked_tiles || [];
}

// ====== FIX (city_decor rendering) - نفس فكرة deriveBuildings/
// deriveUnlockedTiles بالظبط. ======
function deriveCityDecor(raw, mode) {
  if (mode === CITY_MODE.VISITING) return raw.visit.data?.city_decor || [];
  return raw.own?.city_decor || [];
}

export function useCityState() {
  const [raw, setRaw] = useState(initialRaw);

  // setCastle(castle) - updates the player's own castle from any API
  // response (getMyCastle or any other response returning an updated castle
  // object - upgradeBuilding/buildNewBuilding/trainTroops...).
  const setCastle = useCallback((castle) => {
    setRaw((prev) => ({ ...prev, own: castle }));
  }, []);

  // setVisit(...) - controls "enter kingdom" mode:
  //   setVisit(null)                          -> exits visiting mode
  //   setVisit({ loading: true, data: null }) -> starts loading a new visit
  //   setVisit({ loading: false, data })      -> the visit finished loading
  const setVisit = useCallback((value) => {
    setRaw((prev) => ({ ...prev, visit: value || EMPTY_VISIT }));
  }, []);

  const mode = deriveMode(raw);

  const cityState = useMemo(
    () => ({
      castleId: deriveCastleId(raw, mode),
      mode,
      buildings: deriveBuildings(raw, mode),
      unlockedTiles: deriveUnlockedTiles(raw, mode),
      cityDecor: deriveCityDecor(raw, mode),
    }),
    [raw, mode]
  );

  return {
    cityState,
    castle: raw.own,
    setCastle,
    visit: raw.visit,
    setVisit,
  };
}
