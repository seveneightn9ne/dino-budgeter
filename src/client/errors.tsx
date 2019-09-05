import _ from "lodash";
import React from "react";
import Money from "../shared/Money";
import * as util from "./util";

/**
 * USAGE
 *
 * const errorDefs = {
 *   amount: nonNegativeMoneyError("amount", "Amount"),
 *   yourShare: allowEmpty(nonNegativeMoneyError("yourShare", "Your share")),
 *   theirShare: allowEmpty(nonNegativeMoneyError("theirShare", "Their share")),
 *   fieldName: {
 *     field: 'fieldName',
 *     isError: (f: string) => f.length !== 21,
 *     message: () => 'must have length 21',
 *   },
 * };
 *
 * interface State extends ErrorState<typeof errorDefs> {}
 *
 * class TxEntry {
 *
 *   onSubmit() {
 *     if (!validate(errorDefs, this)) {
 *       return;
 *     }
 *     ...
 *   }
 *
 *   render() {
 *     return (
 *       <input onClick={ccec(this, 'fieldName')} />
 *       {renderError(this.state.errors.fieldName)}
 *     )
 *   }
 * }
 */

export interface ErrorState<Defs extends { [k: string]: DinoError<any> }> {
  error: string;
  errors: { [k in keyof Defs]?: string };
}

export interface DinoError<S, F extends keyof S = keyof S> {
  field: F & string;
  isError: (t: any /*S[F]*/, fullState: S) => boolean;
  message: (t: any /*S[F]*/) => string;
}
// interface BigError<S> {
//   isError: (s: S) => boolean;
//   message: (s: S) => string;
// }

// type Error<S> = FieldError<S>; // | BigError<S>;

function checkErrors<S extends { [k: string]: any }>(
  errorDefs: Array<DinoError<S>> | { [k: string]: DinoError<S> },
  state: S,
): { [s: string]: string } {
  const errors: { [s: string]: string } = {};
  _.forEach(errorDefs, ({ field, isError, message }: DinoError<S>) => {
    if (isError(state[field], state)) {
      errors[field] = message(state[field]);
    }
  });
  return errors;
}

export function nonNegativeMoneyError(
  field: string,
  _name: string,
): DinoError<any> {
  return {
    field,
    isError: (amt: string) => !new Money(amt).isValid(false),
    message: (amt: string) => {
      if (amt === "") {
        return "required";
      }
      if (isNaN(Number(amt))) {
        return "must be numeric";
      }
      return "must be positive";
    },
  };
}

export function allowEmpty(d: DinoError<any>): DinoError<any> {
  return {
    field: d.field,
    isError: (amt: string, fullState: any) =>
      amt !== "" && d.isError(amt, fullState),
    message: d.message,
  };
}

export function render(error: string): JSX.Element {
  if (!error) {
    return null;
  }
  return (
    <span className="error-message">
      {" "}
      <span className="fas fa-times-circle error-x" />
      {" " + error}
    </span>
  );
}

export function validate<
  S extends {
    [k: string]: any;
    errors: { [s: string]: string };
    error: string;
  }
>(
  errorDefs: Array<DinoError<S>> | { [k: string]: DinoError<S> },
  self: React.Component<any, S>,
): boolean {
  const errors = checkErrors(errorDefs, self.state);
  if (!_.isEmpty(errors)) {
    self.setState({ errors, error: "Validation failed." });
    return false;
  } else {
    self.setState({ error: "" });
  }
}

export function handleError(self: React.Component) {
  return (e: Error) => {
    self.setState({
      error: e.message,
    });
  };
}

/**
 * cc with error handling - simply clears the error when the field changes
 */
export function ccec<
  S extends { errors?: { [f in string]?: string }; error: string },
  F extends keyof S
>(
  self: React.Component<unknown, S>,
  field: F & string,
): (
  event:
    | React.ChangeEvent<HTMLInputElement>
    | React.ChangeEvent<HTMLSelectElement>,
) => void {
  const cc = util.cc(self, field);
  return (event) => {
    cc(event);
    self.setState(({ errors, error }) => {
      const newErrors = {
        ...errors,
        [field as keyof S]: undefined,
      } as S["errors"];
      const newError =
        _.values(newErrors).filter((e) => e !== undefined).length > 0
          ? error
          : "";
      return {
        errors: { ...errors, [field]: undefined },
        error: newError,
      } as { [f in F]: any };
    });
  };
}
