import { Connection, PublicKey } from "@solana/web3.js";
import { parseTransaction, type ParsedTransaction } from "../parser";

interface TimeRange {
  from?: number;
  to?: number;
}

export async function getHistoricalTransactions(
  connection: Connection,
  address: string | PublicKey,
  timeRange: TimeRange,
  batchSize: number = 1000,
  count: number = 100
): Promise<ParsedTransaction[]> {
  try {
    const pubKey =
      typeof address === "string" ? new PublicKey(address) : address;
    console.log("Fetching transactions for ", pubKey.toString());
    const transactions: ParsedTransaction[] = [];
    let before: string | undefined = undefined;
    let oldestTxTimestamp: number = Date.now() / 1000;

    const toTimestamp = timeRange?.to || Date.now() / 1000;
    const fromTimestamp = timeRange?.from || Date.now() / 1000 - 24 * 3600;

    while (oldestTxTimestamp >= fromTimestamp) {
      const signatureBatch = await connection.getSignaturesForAddress(
        pubKey,
        {
          before,
          limit: batchSize,
        }
        // "finalized"
      );

      if (signatureBatch.length === 0) break;
      const signatures: string[] = [];
      for (const sig of signatureBatch) {
        if (!sig.blockTime) continue;

        if (sig.blockTime > toTimestamp) continue;

        if (sig.blockTime < fromTimestamp) {
          oldestTxTimestamp = fromTimestamp - 1;
          break;
        }
        if (signatures.length + transactions.length >= count) break;
        signatures.push(sig.signature);
        oldestTxTimestamp = sig.blockTime;
      }

      if (signatures.length > 0) {
        const transactionsBatch = await connection.getParsedTransactions(
          signatures,
          { maxSupportedTransactionVersion: 0 }
        );

        for (const txn of transactionsBatch) {
          if (!txn) continue;

          transactions.push(
            parseTransaction(txn, txn.transaction.signatures[0])
          );
        }
      }
      before = signatures[signatures.length - 1];

      console.log(
        "Fetched ",
        signatureBatch.length,
        " transactions from ",
        new Date((signatureBatch[0].blockTime || 0) * 1000).toUTCString(),
        " to ",
        new Date(
          (signatureBatch.slice(-1)[0].blockTime || 0) * 1000
        ).toUTCString()
      );
      if (signatureBatch.length < batchSize || transactions.length >= count)
        break;
    }
    return transactions.sort((a, b) => b.timestamp! - a.timestamp!);
  } catch (error) {
    console.error("Error fetching historical transactions:", error);
    throw error;
  }
}
