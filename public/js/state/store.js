/** Minimal observable application state, avoiding scattered globals. */
export function createStore(initialState) {
  let state = Object.freeze({...initialState});
  const subscribers = new Set();
  return {
    getState: () => state,
    setState(update) {
      const next = typeof update === "function" ? update(state) : {...state,...update};
      state = Object.freeze({...next});
      subscribers.forEach(fn => fn(state));
    },
    subscribe(fn) { subscribers.add(fn); return () => subscribers.delete(fn); }
  };
}
