export function debounce(callback: (value: string) => void, delay: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return {
    run(value: string) {
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(() => callback(value), delay);
    },
    cancel() {
      if (timer !== undefined) clearTimeout(timer);
    },
  };
}
