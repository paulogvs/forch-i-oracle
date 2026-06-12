type Listener = () => void;
const listeners = new Set<Listener>();

export const dataEvents = {
  emit() { listeners.forEach((l) => l()); },
  on(l: Listener) { listeners.add(l); return () => listeners.delete(l); },
};
