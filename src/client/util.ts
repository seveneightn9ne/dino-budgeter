import { FrameIndex } from '../shared/types';
import { Location, History } from 'history';
export * from '../shared/util';
import * as frames from '../shared/frames';

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function yyyymmdd(date: Date): string {
    let y = '' + date.getFullYear(),
        m = '' + (date.getMonth() + 1),
        d = '' + date.getDate();
    if (m.length == 1) m = "0" + m;
    if (d.length == 1) d = "0" + d;
    return y + "-" + m + "-" + d;
}

export function fromYyyymmdd(datestring: string): Date {
    let [y,m,d] = datestring.split("-").map(Number);
    m -= 1;
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
    location: Location,
    history: History,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
}): Promise<any> {
    return fetch(options.path, {
        method: options.method,
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
        body: options.body ? JSON.stringify(options.body) : undefined,
    }).then(result => {
        if (result.status != 200) {
            throw new Error(`Server responded with status ${result.status}`);
        }
        return result.json().then(json => {
            if (json.error == 'reauth') {
                // Note, discarding non-path bits of the location
                options.history.push(`/login?redirectTo=${options.location.pathname}`);
                throw new Error(`Reauth required`);
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
    location: Location,
    history: History,
    method?: 'POST' | 'PUT' | 'DELETE',
}): Promise<any> {
    return apiFetch({...options, method: options.method || 'POST'});
}

export function apiGet(options: {
    path: string,
    location: Location,
    history: History,
}): Promise<any> {
    return apiFetch({...options, method: 'GET'});
}
