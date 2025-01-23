import {
  Connection,
  PublicKey,
  type ConfirmedSignatureInfo,
  type ParsedTransactionWithMeta,
} from "@solana/web3.js";
import { getHistoricalTransactions } from "./utils/historical";
import { initializeWebSocket, obfuscatePubKey } from "./utils/live";

const address = "7rtiKSUDLBm59b1SBmD9oajcP8xE64vAGSMbAN5CXy1q";
// "7rtiKSUDLBm59b1SBmD9oajcP8xE64vAGSMbAN5CXy1q",
// "DxEBUuzDXnQjKmvXHMgox8gr9qL7duEDtRyeq38kd4Gv",
const live = true;

const main = async () => {
  if (live) {
    initializeWebSocket("7rtiKSUDLBm59b1SBmD9oajcP8xE64vAGSMbAN5CXy1q");
  } else {
    const connection = new Connection(process.env.BACKEND_RPC!, "confirmed");
    const transactions = await getHistoricalTransactions(
      connection,
      address,
      {}
    );
    transactions.forEach((txn) => {
      console.log(
        txn.signature,
        " Token changes:\n",
        txn.tokenTransfers
          .map(
            (transfer) =>
              `\t${obfuscatePubKey(transfer.toUserAccount)}: ${
                transfer.tokenAmount
              } ${obfuscatePubKey(transfer.mint)}`
          )
          .join("\n")
      );
    });
  }
  return;
};

main();
