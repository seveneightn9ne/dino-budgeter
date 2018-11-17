import { History, Location } from "history";
import { FrameIndex, InitState } from "../shared/types";
export * from "../shared/util";
import * as _ from "lodash";
import * as categories from "../shared/categories";
import * as frames from "../shared/frames";
import Money from "../shared/Money";
import * as transactions from "../shared/transactions";

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function yyyymmdd(date: Date): string {
    const y = "" + date.getFullYear();
    let m = "" + (date.getMonth() + 1),
        d = "" + date.getDate();
    if (m.length == 1) m = "0" + m;
    if (d.length == 1) d = "0" + d;
    return y + "-" + m + "-" + d;
}

export function fromYyyymmdd(datestring: string): Date {
    const [y, m_, d] = datestring.split("-").map(Number);
    const m = m_ - 1;
    return new Date(y, m, d);
}

export function cc(self: React.Component, field: string): (event: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLSelectElement>) => void {
    return (event) => self.setState({[field]: event.target.value});
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

function apiFetch(options: {
    path: string,
    body?: {[key: string]: any},
    location?: Location,
    history?: History,
    method: "GET" | "POST" | "PUT" | "DELETE",
}): Promise<any> {
    return fetch(options.path, {
        method: options.method,
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
          },
        body: options.body ? JSON.stringify(options.body) : undefined,
    }).then(result => {
        if (result.status != 200 && result.status != 204) {
            throw result.status;
        }
        return result.json().then(json => {
            if (json.error == "reauth") {
                // Note, discarding non-path bits of the location
                const redir = options.location ? options.location.pathname : "";
                const path = `/login?redirectTo=${redir}`;
                if (options.history) {
                    options.history.push(path);
                    throw new Error(`Reauth required`);
                } else {
                    window.location.href = path;
                }
            }
            return json;
        }).catch(() => {
            // The response was not JSON but it was 200 so it probably was just "OK"
            return {};
        });
    });
}

export function apiPost(options: {
    path: string,
    body: {[key: string]: any},
    location?: Location,
    history?: History,
    method?: "POST" | "PUT" | "DELETE",
}): Promise<any> {
    return apiFetch({...options, method: options.method || "POST"});
}

export function apiGet(options: {
    path: string,
    location?: Location,
    history?: History,
}): Promise<any> {
    return apiFetch({...options, method: "GET"});
}

export function initializeState<S extends {initialized: boolean}, W extends (keyof (InitState & S))[]>
        (self: React.Component<any, S>, index: FrameIndex, ...wants: W) {
    let params = wants.map(w => w + "=true").join("&");
    if (index) {
        params += "&index=" + index;
    }
    return apiGet({
        path: "/api/init?" + params,
        location: self.props.location,
        history: self.props.history,
    }).then(response => {
        if (response.frame) {
            response.frame = frames.fromSerialized(response.frame);
        }
        if (response.categories) {
            response.categories = response.categories.map(categories.fromSerialized);
        }
        if (response.transactions) {
            response.transactions = response.transactions.map(transactions.fromSerialized);
        }
        if (response.debts) {
            response.debts = _.mapValues(response.debts, v => new Money(v));
        }
        return new Promise((resolve) => {
            self.setState({...response, initialized: true}, () => {
                resolve();
            });
        });
    });
}
