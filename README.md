# Sol-Indexer

## Project Description
Sol-Indexer is a lightweight project for fetching and parsing Solana blockchain transactions. It supports two modes of operation:

1. **Historical Data Fetching:**
   - Fetches historical transaction data based on specified parameters such as timestamps, time ranges, or a particular count.
   - Default behavior fetches up to 2 hours or 100 transactions, whichever condition is met first.

2. **Real-Time Data Fetching:**
   - Uses the Helius WebSockets with `transactionSubscribe` rpc method to fetch transactions in real time.
   - Real-time events return full transaction details, eliminating the need for separate data fetching.

Both methods parse the fetched transactions..

---

## Project Setup Instructions

### Prerequisites

- Install [Bun](https://bun.sh/) to manage dependencies and run the project.

### Dependencies

The main dependencies for the project are:

- `@solana/web3.js` (v^1.98.0): Solana JavaScript API for interacting with the blockchain.
- `ws` (v^8.18.0): WebSocket library for real-time transaction subscriptions.

### Environment Variables

You need to set two environment variables before running the project:

1. **BACKEND_RPC:** The Solana RPC URL for blockchain interaction.
2. **HELIUS_API_KEY:** The API key for accessing Helius WebSocket services. Ensure that this key belongs to a business or professional plan since `transactionSubscribe` is available exclusively for these plans.

Create an `.env` file in the project root and include the following:

```env
BACKEND_RPC=<your_backend_rpc_url>
HELIUS_API_KEY=<your_helius_api_key>
```

### Additional Configuration

- Set the **address** and **live/historical boolean** in the `index.ts` file to determine the behavior of the script.

---

## How to Run the Project

1. Clone the repository and navigate to the project directory.

   ```bash
   git clone <repository-url>
   cd sol-indexer
   ```

2. Install dependencies using Bun:

   ```bash
   bun install
   ```

3. Configure environment variables as described above.

4. Run the project:

   ```bash
   bun run index.ts
   ```

### One-Command Start Script

To simplify starting the project, you can use a single command after setting up:

```bash
BACKEND_RPC=<your_backend_rpc_url> HELIUS_API_KEY=<your_helius_api_key> bun run index.ts
```

---

## Additional Notes

- **WebSocket Beta Limitations:** The Helius WebSocket `transactionSubscribe` method is currently in beta, so delays or disruptions might occur. Could switch to Laserstream (currently under development) once its released.

---

## Additional Design Questions

### 1. Issues with Watching Transactions in Real-Time

Real-time transaction monitoring can face the following challenges:

- **Network Delays:** Latency in WebSocket connections could lead to delayed transaction updates.
- **Data Overload:** High transaction volume could overwhelm downstream systems if not processed efficiently.
- **Error Handling:** Unexpected WebSocket disconnects or failures may result in data loss or the need for re-subscription.

**Strategies to Address These Issues:**

- Implement retry mechanisms and exponential backoff for WebSocket reconnects.
- Use a queue-based system to buffer incoming transactions and control the downstream processing rate.
- Monitor WebSocket health and set up alerts for disconnects or unusual delays.

### 2. Suggested Tech Stack / Architecture for This Service

**Tech Stack:**

- **TypeScript:** Chosen for its robust type support and compatibility with Solana libraries.
- **Bun/Node.js:** Used for server-side scripting and dependency management.
- **Helius API:** Provides reliable WebSocket and historical transaction fetching capabilities.
- **web3.js package:** Provides a ts sdk with rpc methods to interact with the chain.

**Architecture:**

- **WebSocket Module:** For real-time transaction streaming.
- **API Integration Layer:** Interfaces with web3.js rpc methods for historical data and helius websockets for real-time data.
- **Parser Module:** For parsing the transaction data.

### 3. Comparison of Real-Time and Historical Fetching

- **Real-Time:** Suitable for live transaction updates and immediate processing. Events include full transaction details, simplifying downstream processing.
- **Historical:** Useful for data analysis, debugging, or retrieving past transaction data. Requires more granular filtering and may necessitate additional API calls for full details.

---

