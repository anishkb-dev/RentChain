# RentChain — Viva / Study Notes

Exam-prep material for the Blockchain Technology mini-project. For the project overview, architecture, and setup, see [`README.md`](./README.md).

---

## Run order (memorize this)

Open **three terminals** in the project folder.

**Terminal 1 — start the local blockchain**
```bash
npx hardhat node
```
Prints 20 test accounts and their private keys. Keep it running.

**Terminal 2 — deploy the contract**
```bash
npx hardhat run scripts/deploy.js --network localhost
```
The deploy script automatically dumps the address + ABI into `frontend/contract-info.js` — no manual copying.

**Terminal 3 — serve the frontend**
```bash
npx http-server frontend -p 5500 -c-1 -o
```

**Configure MetaMask (one-time)**
1. Add network manually: Name `Hardhat Local`, RPC `http://127.0.0.1:8545`, Chain ID `31337`, Currency `ETH`.
2. Import a test account using any private key printed by `hardhat node` (10,000 fake ETH).
3. Switch MetaMask to the `Hardhat Local` network.

---

## 2-minute demo walkthrough

1. Open the DApp — click **Connect MetaMask**. Wallet address shows up.
2. **List** a property: e.g. `BTM Layout, 2BHK`, `Sunny corner flat`, `0.01` ETH/month. Confirm in MetaMask. Property appears in ~1 second.
3. Switch MetaMask to a **different test account** (Account 2). Refresh.
4. Click **Rent** → choose 2 months. MetaMask shows `value: 0.02 ETH`. Confirm.
5. Card now says "Rented until …".
6. Switch back to the **owner account**. "Withdrawable balance" shows `0.02 ETH`. Click **Withdraw**. ETH lands in the owner's wallet.

That's the entire decentralized rental flow — no server in the middle.

---

## Likely viva questions & one-line answers

| Question | Answer |
| -------- | ------ |
| Why blockchain for rentals? | No central server, no broker, listings can't be silently deleted, payments are direct and verifiable. |
| Where is the data stored? | In the contract's storage on the Ethereum network — `properties` mapping + `balances` mapping. |
| What is `msg.sender`? | The address that called the function — Solidity's way of identifying the caller. |
| What is `payable`? | A function modifier that lets the function accept ETH along with the call. |
| Why `pull-payment` instead of forwarding rent directly? | Prevents re-entrancy and stuck-funds DoS — owner withdraws on their own. |
| What is `30 days` in Solidity? | A built-in time unit equal to `30 * 24 * 60 * 60` seconds. |
| What is gas? | The fee paid to validators for executing a transaction. The user pays it in ETH. |
| What network are we on? | A local Hardhat node (chain id 31337). The same code works on mainnet/testnet unchanged. |
| Why ethers.js? | A lightweight JS library that wraps the Ethereum JSON-RPC and signs transactions through MetaMask. |
| How do you deploy to a real testnet? | Add a `sepolia` network in `hardhat.config.js` with an Infura/Alchemy RPC URL and a private key, then `npx hardhat run scripts/deploy.js --network sepolia`. |

---

## Test coverage rationale

Each of the 8 tests covers one `require(...)` branch in the contract — useful when the examiner asks "how did you test access control?". Run with `npx hardhat test`.
