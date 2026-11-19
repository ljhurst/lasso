type Listener = () => void;

const listeners: Listener[] = [];

/** Runs `listener` whenever the registered resources are changed through this process. */
export function onResourcesChanged(listener: Listener): void {
  listeners.push(listener);
}

/** Tells this process the resources changed, so it need not wait for its next scheduled look. */
export function resourcesChanged(): void {
  for (const listener of listeners) {
    listener();
  }
}
