import {
  PublicKey,
  type ParsedTransactionWithMeta,
  type TransactionResponse,
} from "@solana/web3.js";
import WebSocket from "ws";
import { parseTransaction } from "../parser";

const apiKey = process.env.HELIUS_API_KEY;

// Initialize WebSocket connection to Helius
export function initializeWebSocket(address: string) {
  let ws: WebSocket;
  let statusCheckInterval: any;
  let pingInterval: any;
  let pongTimeout: any;

  console.log("Initializing WebSocket...");
  ws = new WebSocket(`wss://atlas-mainnet.helius-rpc.com/?api-key=${apiKey}`);

  async function sendRequest(address: string) {
    const pubKey = new PublicKey(address).toBase58();
    const request = {
      jsonrpc: "2.0",
      id: 420,
      method: "transactionSubscribe",
      params: [
        {
          accountInclude: [address],
        },
        {
          vote: false,
          failed: false,
          commitment: "finalized",
          encoding: "jsonParsed",
          transactionDetails: "full",
          maxSupportedTransactionVersion: 0,
        },
      ],
    };
    ws.send(JSON.stringify(request));
  }

  // Send a ping every 30 seconds to keep the connection alive
  function startPing() {
    pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();

        pongTimeout = setTimeout(() => {
          console.log("Pong not received in time, closing connection");
          ws.terminate();
        }, 5000);
      }
    }, 30000);
  }

  ws.on("open", function open() {
    console.log("WebSocket is open");
    sendRequest(address);
    startPing();
  });

  ws.on("message", async function incoming(data) {
    const messageStr = data.toString("utf8");
    try {
      const messageObj = JSON.parse(messageStr);

      if (messageObj?.params?.result?.transaction) {
        if (messageObj?.params?.result?.transaction?.meta?.err) return;
        const transaction = messageObj?.params?.result?.transaction;
        const parsedTransaction = parseTransaction(
          {
            meta: transaction.meta,
            slot: messageObj?.params?.result?.slot,
            transaction: transaction.transaction,
          } as ParsedTransactionWithMeta,
          messageObj?.params?.result?.signature
        );
        console.log(
          parsedTransaction.signature,
          " Token changes:\n",
          parsedTransaction.tokenTransfers
            .map(
              (txn) =>
                `\t${obfuscatePubKey(txn.toUserAccount)}: ${
                  txn.tokenAmount
                } ${obfuscatePubKey(txn.mint)}`
            )
            .join("\n")
        );
      } else {
        console.log("Received message:", messageObj);
        if (messageObj?.params?.error) {
          ws.terminate();
        }
      }
    } catch (e) {
      console.log("Failed to parse JSON:", e);
    }
  });

  ws.on("pong", function pong() {
    clearTimeout(pongTimeout);
  });

  ws.on("error", function error(err) {
    console.log("WebSocket error:", err);
  });

  // Cleanup and restart the WebSocket connection if it's closed
  ws.on("close", function close() {
    console.log("WebSocket is closed, attempting to restart...");
    clearInterval(statusCheckInterval);
    clearInterval(pingInterval);
    clearTimeout(pongTimeout);
    setTimeout(initializeWebSocket, 5000);
  });
}

export const obfuscatePubKey = (address: string) => {
  const map = {
    EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: "USDC",
    So11111111111111111111111111111111111111112: "SOL",
    Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: "USDT",
  };
  return (
    //@ts-ignore
    map[address] ??
    address?.substring(0, 4) + "..." + address?.substring(address.length - 4)
  );
};
