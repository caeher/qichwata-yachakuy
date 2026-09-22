import { Api } from "@stellar/stellar-sdk/rpc";

import type { AnchorSubmitResult } from "@/lib/stellar/anchor-types";
import { decodeAnchorRecord } from "@/lib/stellar/scval";

export function mapPollStatus(
  txHash: string,
  response: Api.GetTransactionResponse,
): AnchorSubmitResult {
  if (response.status === Api.GetTransactionStatus.NOT_FOUND) {
    return {
      txHash,
      status: "PENDING",
      ledger: null,
      feeStroops: null,
      record: null,
      error: null,
    };
  }
  if (response.status === Api.GetTransactionStatus.FAILED) {
    return {
      txHash,
      status: "FAILED",
      ledger: response.ledger ?? null,
      feeStroops: null,
      record: null,
      error: "rpc",
    };
  }
  const feeStroops =
    response.status === Api.GetTransactionStatus.SUCCESS
      ? response.resultXdr.feeCharged.toString()
      : null;
  const returnVal = response.returnValue;
  const record =
    returnVal !== undefined ? decodeAnchorRecord(returnVal) : null;
  return {
    txHash,
    status: "SUCCESS",
    ledger: response.ledger ?? null,
    feeStroops,
    record,
    error: null,
  };
}
