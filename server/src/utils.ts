export function defer(fn: Function): void {
  setTimeout(fn, 0);
}

const alphabet =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
export function hash(len = 32) {
  let id = "";
  while (len--) {
    id += alphabet[(Math.random() * 62) >> 0];
  }
  return id;
}
