// A small ownership boundary, not a complete authentication client.
export function createSessionWork() {
  let generation = 0;
  return {
    changeSession() { generation += 1; },
    async run<T>(
      load: () => Promise<T>,
      commit: (value: T) => void,
      reject: (error: unknown) => void,
    ) {
      const owner = generation;
      try {
        const value = await load();
        if (owner !== generation) return;
        commit(value);
      } catch (error) {
        if (owner !== generation) return;
        reject(error);
      }
    },
  };
}
