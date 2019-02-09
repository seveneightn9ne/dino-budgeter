import { History, Location } from "history";
import { FrameIndex, InitState } from "../shared/types";
export * from "../shared/util";
import _ from "lodash";
import * as frames from "../shared/frames";
import * as api from "../shared/api";

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

export function apiFetch<Request extends object, Response extends object>(options: {
    api: api.API2<Request, Response>,
    body?: Request,
    location?: Location,
    history?: History,
}): Promise<Response> {
    return fetch(options.api.path, {
        method: options.api.method,
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
          },
        body: options.body ? JSON.stringify(options.body) : undefined,
    }).then(result => {
        if (options.api.responseSchema == api.emptySchema && result.status == 204) {
            return null as Response;
        }
        if (result.status == 204) {
            throw new Error("Received a 204 but required a response for " + options.api.path);
        }
        if (result.status == 401) {
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
        if (result.status != 200) {
            result.json().catch(() => {
                throw new Error(`API error ${result.status}`);
            }).then(r => {
                if (r.message) {
                    throw new Error(`API error ${result.status}: ${r.message}`);
                } else {
                    throw new Error(`API error ${result.status}`);
                }
            });
        }
        if (options.api.responseSchema == api.emptySchema) {
            throw new Error(`Unexpected response for ${options.api.path}`);
        }
        return result.text().then(t => options.api.reviveResponse(t));
    });
}

export function initializeState<S extends {initialized: boolean}, W extends (keyof (InitState & S))[]>
        (self: React.Component<any, S>, index: FrameIndex, ...wants: W) {
    return apiFetch({
        api: api.Initialize,
        body: {
            index,
            fields: wants as (keyof InitState)[],
        },
        location: self.props.location,
        history: self.props.history,
    }).then(response => {
        return new Promise((resolve) => {
            //console.log(response);
            self.setState({...(response as any), initialized: true}, () => {
                resolve();
            });
        });
    });
}
