import {
  type ParsedTransactionWithMeta,
  type ParsedInstruction,
  type PartiallyDecodedInstruction,
} from "@solana/web3.js";

interface TokenBalanceChange {
  userAccount: string;
  tokenAccount: string;
  mint: string;
  rawTokenAmount: {
    tokenAmount: string;
    decimals: number;
  };
}

interface AccountData {
  account: string;
  nativeBalanceChange: number;
  tokenBalanceChanges: TokenBalanceChange[];
}

interface NativeTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  amount: number;
}

interface TokenTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  fromTokenAccount: string;
  toTokenAccount: string;
  tokenAmount: number;
  mint: string;
}

interface InnerInstruction {
  accounts: string[];
  data: string;
  programId: string;
}

interface Instruction {
  accounts: string[];
  data: string;
  programId: string;
  innerInstructions?: InnerInstruction[];
}

interface ParsedTransaction {
  fee: number;
  feePayer: string;
  signature: string;
  slot: number;
  timestamp: number;
  nativeTransfers: NativeTransfer[];
  tokenTransfers: TokenTransfer[];
  accountData: AccountData[];
  transactionError: { error: string } | null;
  instructions: Instruction[];
}

function parseTransaction(
  tx: ParsedTransactionWithMeta,
  signature: string
): ParsedTransaction {
  if (!tx || !tx.meta) {
    throw new Error("Invalid transaction data");
  }

  const nativeTransfers: NativeTransfer[] = [];
  if (
    tx.meta.preBalances &&
    tx.meta.postBalances &&
    tx.transaction.message.accountKeys
  ) {
    for (let i = 0; i < tx.meta.preBalances.length; i++) {
      const preBalance = tx.meta.preBalances[i];
      const postBalance = tx.meta.postBalances[i];
      const difference = postBalance - preBalance;

      if (difference !== 0) {
        // Find transfers (negative balance change indicates sender)
        if (difference < 0) {
          const receiverIdx = tx.meta.postBalances.findIndex(
            (bal, idx) => tx.meta!.preBalances[idx] - bal === difference
          );

          if (receiverIdx !== -1) {
            nativeTransfers.push({
              fromUserAccount:
                tx.transaction.message.accountKeys[i].pubkey.toString(),
              toUserAccount:
                tx.transaction.message.accountKeys[
                  receiverIdx
                ].pubkey.toString(),
              amount: difference,
            });
          }
        }
      }
    }
  }

  const tokenTransfers: TokenTransfer[] = [];
  if (tx.meta.preTokenBalances && tx.meta.postTokenBalances) {
    tx.meta.postTokenBalances.forEach((postBal, index) => {
      const preBal = tx?.meta?.preTokenBalances
        ? tx?.meta?.preTokenBalances[index]
        : null;
      if (
        preBal &&
        postBal.uiTokenAmount.uiAmount !== preBal.uiTokenAmount.uiAmount
      ) {
        tokenTransfers.push({
          fromTokenAccount:
            tx.transaction.message.accountKeys[
              preBal.accountIndex
            ].pubkey.toString(),
          toTokenAccount:
            tx.transaction.message.accountKeys[postBal.accountIndex].pubkey.toString(),
          fromUserAccount: preBal.owner || "",
          toUserAccount: postBal.owner || "",
          tokenAmount:
            (postBal.uiTokenAmount.uiAmount || 0) -
            (preBal.uiTokenAmount.uiAmount || 0),
          mint: postBal.mint,
        });
      }
    });
  }

  const accountData: AccountData[] = [];
  if (tx.meta.postBalances && tx.transaction.message.accountKeys) {
    tx.transaction.message.accountKeys.forEach((account, index) => {
      const preBalance = tx.meta!.preBalances[index] || 0;
      const postBalance = tx.meta!.postBalances[index] || 0;
      const balanceChange = postBalance - preBalance;
      const tokenBalanceChanges: TokenBalanceChange[] = [];

      if (
        // balanceChange !== 0 ||
        tx.meta!.postTokenBalances?.some((tb) => tb.accountIndex === index)
      ) {
        tx.meta!.postTokenBalances?.forEach((postTB) => {
          if (postTB.accountIndex === index) {
            const preTB = tx.meta!.preTokenBalances?.find(
              (tb) => tb.accountIndex === index && tb.mint === postTB.mint
            );

            tokenBalanceChanges.push({
              userAccount: postTB.owner || "",
              tokenAccount:
                tx.transaction.message.accountKeys[
                  postTB.accountIndex
                ].pubkey.toString(),
              mint: postTB.mint,
              rawTokenAmount: {
                tokenAmount: postTB.uiTokenAmount.amount,
                decimals: postTB.uiTokenAmount.decimals,
              },
            });
          }
        });
      }
      accountData.push({
        account: account.pubkey.toString(),
        nativeBalanceChange: balanceChange,
        tokenBalanceChanges,
      });
    });
  }

  const instructions: Instruction[] = tx.transaction.message.instructions.map(
    (instruction: ParsedInstruction | PartiallyDecodedInstruction) => {
      const parsedInstruction: Instruction = {
        accounts: [],
        data: "",
        programId: "",
        innerInstructions: [],
      };

      if ("programId" in instruction && !("program" in instruction)) {
        parsedInstruction.programId = instruction.programId.toString();
        parsedInstruction.accounts = (instruction?.accounts ?? []).map((acc) =>
          acc.toString()
        );
        parsedInstruction.data = instruction?.data || "";
      }

      const innerInstructions = tx?.meta?.innerInstructions?.find(
        (inner) =>
          inner.index ===
          tx.transaction.message.instructions.indexOf(instruction)
      );

      if (innerInstructions) {
        parsedInstruction.innerInstructions =
          innerInstructions.instructions.map((inner) => ({
            accounts:
              "accounts" in inner
                ? inner.accounts.map((acc) => acc.toString())
                : [],
            data: "data" in inner ? inner.data : "",
            programId: "programId" in inner ? inner.programId.toString() : "",
          }));
      }

      return parsedInstruction;
    }
  );

  return {
    fee: tx.meta.fee,
    feePayer: tx.transaction.message.accountKeys[0].pubkey.toString(),
    signature,
    slot: tx.slot,
    timestamp: tx.blockTime || 0,
    nativeTransfers,
    tokenTransfers,
    accountData,
    transactionError: tx.meta.err
      ? { error: JSON.stringify(tx.meta.err) }
      : null,
    instructions,
  };
}

export { parseTransaction, type ParsedTransaction };
