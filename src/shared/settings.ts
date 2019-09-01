import _ from "lodash";
import { UserSettings } from "./types";

const defaultSettings: Required<UserSettings> = {
  rollover: true,
  emailNewTransaction: true,
  emailNewPayment: true,
};

export function getWithDefault(
  settings: UserSettings,
  field: keyof UserSettings,
): boolean {
  if (field in settings && settings[field] !== undefined) {
    return settings[field];
  }
  return defaultSettings[field];
}

export function getDefault(field: keyof UserSettings): boolean {
  return getWithDefault({}, field);
}

export function getDefaultSettings(): Required<UserSettings> {
  return { ...defaultSettings };
}
