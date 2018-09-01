
import randomstring from 'randomstring';

export function randomId() {
    return randomstring.generate({length: 32, capitalization: 'lowercase'});
}
