export type AnchorRecord = {
  owner: string;
  metaCid: string;
  ledger: number;
  timestamp: number;
};

export type AnchorSubmitResult = {
  txHash: string;
  status: "SUCCESS" | "FAILED" | "PENDING";
  ledger: number | null;
  feeStroops: string | null;
  record: AnchorRecord | null;
  error: "already_anchored" | "meta_too_long" | "rpc" | null;
};

export type AnchorClient = {
  verify(hashHex: string): Promise<AnchorRecord | null>;
  submitAnchor(input: {
    hashHex: string;
    metaCid: string;
    owner: string;
    onSubmitted?: (txHash: string) => Promise<void>;
  }): Promise<AnchorSubmitResult>;
  poll(txHash: string): Promise<AnchorSubmitResult>;
};
