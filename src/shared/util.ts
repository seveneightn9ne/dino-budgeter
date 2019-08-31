import randomstring from "randomstring";

export function randomId() {
  return randomstring.generate({ length: 32, capitalization: "lowercase" });
}

export function token() {
  return randomstring.generate({ length: 64, capitalization: "lowercase" });
}
