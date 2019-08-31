import { createBrowserHistory } from "history";
import { client } from "typescript-json-api";
import * as api from "../shared/api";
import * as frames from "../shared/frames";
import { FrameIndex, InitState } from "../shared/types";
export * from "../shared/util";

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const history = createBrowserHistory();

export function yyyymmdd(date: Date): string {
  const y = "" + date.getFullYear();
  let m = "" + (date.getMonth() + 1),
    d = "" + date.getDate();
  if (m.length == 1) { m = "0" + m; }
  if (d.length == 1) { d = "0" + d; }
  return y + "-" + m + "-" + d;
}

export function fromYyyymmdd(datestring: string): Date {
  const [y, m_, d] = datestring.split("-").map(Number);
  const m = m_ - 1;
  return new Date(y, m, d);
}

export function cc(
  self: React.Component,
  field: string,
): (
  event:
    | React.ChangeEvent<HTMLInputElement>
    | React.ChangeEvent<HTMLSelectElement>,
) => void {
  return (event) => self.setState({ [field]: event.target.value });
}

export function defaultTxDate(frame: FrameIndex): Date {
  const year = frames.year(frame);
  const month = frames.month(frame);
  const newTxDate = new Date();
  if (newTxDate.getFullYear() != year || newTxDate.getMonth() != month) {
    // frame is not the current frame
    newTxDate.setFullYear(year);
    newTxDate.setMonth(month);
    newTxDate.setDate(1);
  }
  return newTxDate;
}

client.registerReauthHandler(() => {
  const redir = history.location.pathname;
  const path = `/login?redirectTo=${redir}`;
  history.push(path);
});
export const apiFetch = client.apiFetch;

export function initializeState<
  S extends { initialized: boolean },
  W extends Array<keyof (InitState & S)>
>(self: React.Component<any, S>, index: FrameIndex, ...wants: W) {
  return apiFetch({
    api: api.Initialize,
    body: {
      index,
      fields: wants as Array<keyof InitState>,
    },
  }).then((response) => {
    return new Promise((resolve) => {
      // console.log(response);
      self.setState({ ...(response as any), initialized: true }, () => {
        resolve();
      });
    });
  });
}
