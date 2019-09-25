import randomstring from "randomstring";

export function randomId() {
  return randomstring.generate({ length: 32, capitalization: "lowercase" });
}

export function token() {
  return randomstring.generate({ length: 64, capitalization: "lowercase" });
}

export function formatDate(val: Date) {
  return `${val.getMonth() + 1}/${val.getDate()}/${val.getFullYear()}`;
}

export function enforceExhaustive(v: never): void {
  throw Error("enforceExhaustive found an unexpected value: " + v);
}
