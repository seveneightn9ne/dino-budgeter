import { api } from "typescript-json-api";
import { SchemaBase, SchemaType } from "typescript-json-api/dist/shared/api";
import Money from "./Money";
import {
  Category,
  CategoryId,
  Charge,
  Frame,
  FrameIndex,
  Friend,
  InitState,
  Payment as PaymentType,
  SavingsTransaction,
  Share,
  Transaction,
  UserSettings
} from "./types";

const Schemas = api.Schemas;

// tslint:disable-next-line
namespace DinoSchemas {
  export function money(
    opts: { nonNegative?: boolean } = {}
  ): SchemaBase<Money> {
    const { nonNegative } = opts;
    return (key: string, val: any): Money => {
      const m = new Money(val);
      if (m.isValid(!nonNegative)) {
        return m;
      }
      throw new Error("Field " + key + " must be a Money");
    };
  }

  export function share(
    opts: { nonNegative?: boolean } = {}
  ): SchemaBase<Share> {
    const { nonNegative } = opts;
    return (key: string, val: any): Share => {
      const s = new Share(val);
      if (s.isValid(!nonNegative)) {
        return s;
      }
      throw new Error("Field " + key + " must be a Share");
    };
  }
}

/** Reusable Schemas */

const categorySchema: SchemaType<Category> = {
  id: Schemas.string(),
  gid: Schemas.string(),
  frame: Schemas.number(),
  alive: Schemas.boolean(),
  name: Schemas.string(),
  ordering: Schemas.number(),
  budget: DinoSchemas.money(),
  ghost: Schemas.boolean(),
  parent: Schemas.optional(Schemas.string()),
  balance: Schemas.optional(DinoSchemas.money()),
  ctime: Schemas.optional(Schemas.date())
};
const savingsTransactionSchema: SchemaType<SavingsTransaction> = {
  id: Schemas.string(),
  gid: Schemas.string(),
  amount: DinoSchemas.money(),
  frame: Schemas.number(),
  ctime: Schemas.optional(Schemas.date())
};
const frameSchema: SchemaType<Required<Frame>> = {
  gid: Schemas.string(),
  index: Schemas.number(),
  income: DinoSchemas.money(),
  ghost: Schemas.boolean(),
  categories: Schemas.array(categorySchema),
  balance: DinoSchemas.money(),
  spending: DinoSchemas.money(),
  savings: DinoSchemas.money(),
  savingsTransactions: Schemas.array(savingsTransactionSchema)
};
const paymentSchema: SchemaType<PaymentType> = {
  type: Schemas.literal("payment"),
  id: Schemas.string(),
  payer: Schemas.string(),
  payee: Schemas.string(),
  amount: DinoSchemas.money(),
  date: Schemas.date(),
  memo: Schemas.string(),
  frame: Schemas.number()
};
const chargeSchema: SchemaType<Charge> = {
  type: Schemas.literal("charge"),
  id: Schemas.string(),
  debtor: Schemas.string(),
  debtee: Schemas.string(),
  amount: DinoSchemas.money(),
  date: Schemas.date(),
  memo: Schemas.string(),
  frame: Schemas.number()
};
const friendSchema: SchemaType<Friend> = {
  uid: Schemas.string(),
  gid: Schemas.string(),
  email: Schemas.string(),
  name: Schemas.or(Schemas.string(), Schemas.nulll())
};
const transactionSchema: SchemaType<Transaction> = {
  id: Schemas.string(),
  gid: Schemas.string(),
  frame: Schemas.number(),
  amount: DinoSchemas.money(),
  description: Schemas.string(),
  date: Schemas.date(),
  category: Schemas.or(Schemas.string(), Schemas.nulll()),
  alive: Schemas.boolean(),
  split: Schemas.optional({
    id: Schemas.string(),
    with: friendSchema as SchemaType<Friend>,
    payer: Schemas.string(),
    settled: Schemas.boolean(),
    myShare: DinoSchemas.share(),
    theirShare: DinoSchemas.share(),
    otherAmount: DinoSchemas.money()
  })
};
const settingsSchema: SchemaType<UserSettings> = {
  emailNewTransaction: Schemas.optional(Schemas.boolean()),
  emailNewPayment: Schemas.optional(Schemas.boolean())
} as SchemaType<UserSettings>;

/** API Endpoints */

export const Payment = new api.API(
  "/api/payment",
  {
    amount: DinoSchemas.money(),
    email: Schemas.string(),
    youPay: Schemas.boolean(),
    isPayment: Schemas.boolean(),
    memo: Schemas.string(),
    frame: Schemas.number()
  },
  api.emptySchema
);

export interface AddTransactionRequest {
  frame: FrameIndex;
  amount: Money;
  description: string;
  date: Date;
  category: CategoryId;
  split?: {
    with: string;
    myShare: Share;
    theirShare: Share;
    otherAmount: Money;
    iPaid: boolean;
  };
}
export interface AddTransactionRequest2 {
  frame: FrameIndex;
  amount: Money;
  description: string;
  date: Date;
  category: CategoryId;
  split?: {
    with: string;
    myShare: Share;
    theirShare: Share;
    otherAmount: Money;
    iPaid: boolean;
  };
}
const req: SchemaType<AddTransactionRequest2> = {
  frame: Schemas.number(),
  amount: DinoSchemas.money({ nonNegative: true }),
  description: Schemas.string(),
  date: Schemas.date(),
  category: Schemas.string(),
  split: Schemas.optional({
    with: Schemas.string(),
    myShare: DinoSchemas.share({ nonNegative: true }),
    theirShare: DinoSchemas.share({ nonNegative: true }),
    otherAmount: DinoSchemas.money({ nonNegative: true }),
    iPaid: Schemas.boolean()
  })
};
export const AddTransaction = new api.API<AddTransactionRequest2, Transaction>(
  "/api/transaction",
  req,
  transactionSchema
);

export const DeleteTransaction = new api.API(
  "/api/transaction/delete",
  { id: Schemas.string() },
  api.emptySchema
);

export const TransactionSplit = new api.API(
  "/api/transaction/split",
  {
    tid: Schemas.string({ nonEmpty: true }),
    sid: Schemas.string({ nonEmpty: true }),
    total: DinoSchemas.money({ nonNegative: true }),
    myShare: DinoSchemas.share({ nonNegative: true }),
    theirShare: DinoSchemas.share({ nonNegative: true }),
    iPaid: Schemas.boolean()
  },
  api.emptySchema
);

export const TransactionDescription = new api.API(
  "/api/transaction/description",
  {
    description: Schemas.string({ nonEmpty: true }),
    id: Schemas.string()
  },
  api.emptySchema
);

export const TransactionDate = new api.API(
  "/api/transaction/date",
  {
    id: Schemas.string(),
    date: Schemas.date()
  },
  api.emptySchema
);

export const TransactionCategory = new api.API(
  "/api/transaction/category",
  {
    id: Schemas.string(),
    category: Schemas.string()
  },
  api.emptySchema
);

export const TransactionAmount = new api.API(
  "/api/transaction/amount",
  {
    id: Schemas.string(),
    amount: DinoSchemas.money()
  },
  api.emptySchema
);

export const Initialize = new api.API(
  "/api/init",
  {
    index: Schemas.number(),
    fields: Schemas.array(Schemas.string())
  },
  {
    frame: Schemas.optional(frameSchema),
    transactions: Schemas.optional(Schemas.array(transactionSchema)),
    debts: Schemas.optional(
      Schemas.values({
        balance: DinoSchemas.money(),
        payments: Schemas.baseArray(Schemas.or(paymentSchema, chargeSchema))
      })
    ),
    me: Schemas.optional(friendSchema),
    categories: Schemas.optional(Schemas.array(categorySchema)),
    friends: Schemas.optional(Schemas.array(friendSchema)),
    pendingFriends: Schemas.optional(Schemas.array(friendSchema)),
    invites: Schemas.optional(Schemas.array(friendSchema)),
    history: Schemas.optional(
      Schemas.values(
        Schemas.array({
          budget: DinoSchemas.money(),
          spending: DinoSchemas.money()
        })
      )
    ),
    settings: Schemas.optional(settingsSchema)
  } as SchemaType<InitState>
);

export const AddCategory = new api.API<
  { frame: number; name: string },
  Category
>(
  "/api/category",
  {
    frame: Schemas.number(),
    name: Schemas.string({ nonEmpty: true })
  },
  categorySchema
);

export const DeleteCategory = new api.API(
  "/api/category/delete",
  {
    id: Schemas.string(),
    frame: Schemas.number()
  },
  api.emptySchema
);

export const CategoryBudget = new api.API(
  "/api/category/budget",
  {
    id: Schemas.string(),
    frame: Schemas.number(),
    amount: DinoSchemas.money({ nonNegative: true })
  },
  api.emptySchema
);

export const CategoryName = new api.API(
  "/api/category/name",
  {
    id: Schemas.string(),
    frame: Schemas.number(),
    name: Schemas.string({ nonEmpty: true })
  },
  api.emptySchema
);

export const BudgetingMove = new api.API(
  "/api/budgeting/move",
  {
    to: Schemas.string(),
    from: Schemas.string(),
    amount: DinoSchemas.money(),
    frame: Schemas.number()
  },
  api.emptySchema
);

export const Income = new api.API(
  "/api/income",
  {
    income: DinoSchemas.money(),
    frame: Schemas.number()
  },
  api.emptySchema
);

export const Name = new api.API(
  "/api/name",
  { name: Schemas.string() },
  api.emptySchema
);
const friendRequest = { email: Schemas.string({ nonEmpty: true }) };
export interface FriendRequest {
  email: string;
}
export const AcceptFriend = new api.API<FriendRequest, Friend>(
  "/api/friend",
  friendRequest,
  friendSchema
);
export const RejectFriend = new api.API(
  "/api/friend/reject",
  friendRequest,
  api.emptySchema
);
export const DeleteFriend = new api.API(
  "/api/friend/delete",
  friendRequest,
  api.emptySchema
);

export const UpdateSettings = new api.API(
  "/api/settings",
  settingsSchema,
  api.emptySchema
);
