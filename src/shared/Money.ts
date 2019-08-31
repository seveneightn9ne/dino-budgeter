import BigNumber from "bignumber.js";

export default class Money {
  public num: BigNumber; // really it's private. Don't touch.
  constructor(value: BigNumber.Value) {
    this.num = new BigNumber(value);
  }
  public static Zero = new Money(0);
  public static sum(ms: Money[]): Money {
    return ms.reduce((a: Money, b: Money) => a.plus(b), Money.Zero);
  }
  public string(): string {
    return this.num.toFixed(2);
  }
  public toJSON(): string {
    return this.string();
  }
  public formatted(): string {
    const money = this.string();
    let dollars = money;
    let cents = "00";
    if (money.indexOf(".") > -1) {
      [dollars, cents] = money.split(".");
    }
    if (cents.length < 2) {
      cents = cents + "0";
    }
    return "$" + dollars + "." + cents;
  }
  public plus(other: Money): Money {
    return new Money(this.num.plus(other.num));
  }
  public minus(other: Money): Money {
    return new Money(this.num.minus(other.num));
  }
  public cmp(other: Money): number {
    return this.num.comparedTo(other.num);
  }
  public negate(): Money {
    return new Money(this.num.times(-1));
  }

  public times(s: Money): Money {
    return new Money(this.num.times(s.num));
  }
  public dividedBy(s: Money): Money {
    return new Money(this.num.dividedBy(s.num));
  }

  public isValid(allowNegative: boolean = true): boolean {
    if (!this.num.isFinite()) {
      return false;
    }
    if (!allowNegative && this.num.isNegative()) {
      return false;
    }
    return true;
  }
}
