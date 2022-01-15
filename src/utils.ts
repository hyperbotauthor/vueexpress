export function uid() {
  return (
    "uid_" + Date.now().toString(36) + Math.random().toString(36).substring(2)
  );
}
