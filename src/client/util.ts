export * from '../shared/util';

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function yyyymmdd(date: Date): string {
    console.log(date);
    let y = '' + date.getFullYear(),
        m = '' + (date.getMonth() + 1),
        d = '' + date.getDate();
    if (m.length == 1) m = "0" + m;
    if (d.length == 1) d = "0" + d;
    const ret = y + "-" + m + "-" + d;
    console.log(ret);
    return ret;
}

export function fromYyyymmdd(datestring: string): Date {
    let [y,m,d] = datestring.split("-").map(Number);
    m -= 1;
    return new Date(y, m, d);
}

export function cc(self: React.Component, field: string): (event: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLSelectElement>) => void {
    return (event) => self.setState({[field]: event.target.value});
}