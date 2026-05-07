# RentChain — Rental Houses on Blockchain

**VTU 6th sem CSE Mini Project (Blockchain Technology)**

A decentralized rental marketplace where house owners list their properties on
the Ethereum blockchain and tenants pay monthly rent in ETH directly to a smart
contract — no broker, no middleman, no central database.

---

## 1. Abstract

Traditional rental platforms (99acres, NoBroker, MagicBricks) rely on a
centralized server. The platform owns the data, can take the listings down,
and brokers introduce trust issues and extra cost. **RentChain** replaces that
central server with an Ethereum smart contract:

- Listings live on-chain — anyone can see them, no one can secretly change them.
- Rent is transferred peer-to-peer through the contract.
- The contract automatically credits the owner and lets them withdraw their
  earnings using the **pull-payment pattern**.
- Identity is the user's wallet address (MetaMask).

The result is a small, easy-to-explain DApp that demonstrates the three core
ideas of a Blockchain course: **immutable storage, smart-contract logic, and
trust-less value transfer**.

---

## 2. Modules

| Module | Tech | Purpose |
| ------ | ---- | ------- |
| Smart Contract | Solidity 0.8.24 | `RentalMarket.sol` — owns the listings, accepts rent, credits owners, allows withdrawal. |
| Local Blockchain | Hardhat 2 | Spins up a local Ethereum node on `127.0.0.1:8545` with 20 funded test accounts. |
| Tests | Mocha + Chai (via `hardhat-toolbox`) | 8 unit tests covering happy path + access control + invalid input. |
| Deploy script | Hardhat + Node.js | `scripts/deploy.js` — deploys the contract and writes its address + ABI to `frontend/contract-info.js`. |
| Frontend | HTML + CSS + plain JS + `ethers.js` (CDN) | Browser DApp that connects via MetaMask and calls the contract. |

---

## 3. Architecture

```
+--------------------+         +-------------------------+
|   Browser (DApp)   |         |   MetaMask Extension    |
|   index.html       | <-----> |  (wallet + signer)      |
|   app.js (ethers)  |         +-----------+-------------+
+---------+----------+                     |
          |                                | signs tx
          | JSON-RPC (http://127.0.0.1:8545)
          v                                v
+-------------------------------------------------------+
|             Hardhat local Ethereum network            |
|   Block 0 ... Block N    (state shared across users)  |
|                                                       |
|        +-----------------------------------+          |
|        |   RentalMarket.sol  (deployed)    |          |
|        |   - properties[id]                |          |
|        |   - balances[owner]               |          |
|        |   - listProperty / rentProperty   |          |
|        |   - withdraw / endLease           |          |
|        +-----------------------------------+          |
+-------------------------------------------------------+
```

---

## 4. Smart-contract API

| Function | Visibility | Purpose |
| -------- | ---------- | ------- |
| `listProperty(location, description, rentPerMonthWei)` | external | Owner adds a property. Stored in `properties[id]`. |
| `rentProperty(id, months) payable` | external | Tenant pays exact `rent × months`. Lease end recorded. |
| `endLease(id)` | external | Owner ends an expired lease. Property becomes vacant. |
| `unlist(id)` | external | Owner removes a vacant property from the listing. |
| `withdraw()` | external | Owner withdraws collected rent (pull-payment pattern). |
| `getAllProperties()` | view | Returns the full array — used by the frontend. |

**Events** — `PropertyListed`, `PropertyRented`, `LeaseEnded`,
`PropertyUnlisted`, `Withdrawn`. Useful when explaining "how a UI knows
something happened on-chain" in viva.

**Why pull-payment?** Forwarding ETH automatically inside `rentProperty()`
exposes the contract to re-entrancy attacks and stuck-funds DoS. Crediting
`balances[owner]` and making the owner call `withdraw()` later is the textbook
secure pattern (OpenZeppelin's `PullPayment`, Solidity docs §"Withdrawal from
Contracts").

---

## 5. Setup

### Prerequisites
- Node.js ≥ 18
- Google Chrome with the [MetaMask](https://metamask.io) extension

### Install
```bash
cd "mp blockchain"
npm install
```

---

## 6. Run order (memorize this for viva)

Open **three terminals** in the project folder.

### Terminal 1 — start the local blockchain
```bash
npx hardhat node
```
This prints 20 test accounts and their private keys. Keep this running.

### Terminal 2 — deploy the contract
```bash
npx hardhat run scripts/deploy.js --network localhost
```
Output:
```
RentalMarket deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
Wrote .../frontend/contract-info.js
```
The deploy script automatically dumps the address + ABI into the frontend
folder, so no manual copying.

### Terminal 3 — serve the frontend
Any static server works. Easiest:
```bash
npx http-server frontend -p 5500 -c-1 -o
```
or just open `frontend/index.html` in Chrome.

### Configure MetaMask (one-time)
1. **Add the local network:** MetaMask → Networks → Add network manually
   - Network Name: `Hardhat Local`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency: `ETH`
2. **Import a test account:** Copy any private key printed by `hardhat node`
   and paste it into MetaMask → Account → Import account. You now have 10000
   ETH (fake) to play with.
3. Switch MetaMask to the `Hardhat Local` network.

---

## 7. Demo flow (2-minute viva walkthrough)

1. Open the DApp — click **Connect MetaMask**. Wallet address shows up.
2. **List** a property: e.g. `BTM Layout, 2BHK`, `Sunny corner flat`, `0.01`
   ETH/month. MetaMask pops up — confirm the transaction. After ~1 second the
   property appears in the grid.
3. Switch MetaMask to a **different test account** (Account 2). Refresh.
4. Click **Rent** on the listing — choose 2 months. MetaMask shows the
   transaction with `value: 0.02 ETH`. Confirm.
5. Card now says "Rented until …".
6. Switch back to the **owner account**. The "Withdrawable balance" shows
   `0.02 ETH`. Click **Withdraw**. ETH lands in the owner's wallet.

That's the entire decentralized rental flow — no server in the middle.

---

## 8. Tests

```bash
npx hardhat test
```

Output:
```
RentalMarket
  ✔ lists a property
  ✔ rejects listing with zero rent
  ✔ lets a tenant rent and credits the owner balance
  ✔ rejects renting your own property
  ✔ rejects wrong rent amount
  ✔ rejects renting an already-rented property
  ✔ lets owner withdraw earnings via pull-payment
  ✔ rejects withdraw when there is nothing to withdraw

  8 passing
```

Each test covers one `require(...)` branch in the contract — useful when the
examiner asks "how did you test access control?".

---

## 9. Folder structure

```
mp blockchain/
├── contracts/
│   └── RentalMarket.sol        # the smart contract
├── scripts/
│   └── deploy.js               # deploys + writes ABI to frontend
├── test/
│   └── RentalMarket.test.js    # 8 unit tests
├── frontend/
│   ├── index.html              # UI
│   ├── style.css
│   ├── app.js                  # talks to the contract via ethers.js
│   └── contract-info.js        # auto-generated after deploy (gitignored)
├── hardhat.config.js
├── package.json
└── README.md
```

---

## 10. Possible viva questions & one-line answers

| Question | Answer |
| -------- | ------ |
| Why blockchain for rentals? | No central server, no broker, listings can't be silently deleted, payments are direct and verifiable. |
| Where is the data stored? | In the contract's storage on the Ethereum network. `properties` mapping + `balances` mapping. |
| What is `msg.sender`? | The address that called the function — Solidity's way of identifying the caller. |
| What is `payable`? | A function modifier that lets the function accept ETH along with the call. |
| Why `pull-payment` instead of forwarding rent directly? | Prevents re-entrancy and stuck-funds DoS — owner withdraws on their own. |
| What is `30 days` in Solidity? | A built-in time unit equal to `30 * 24 * 60 * 60` seconds. |
| What is gas? | The fee paid to miners/validators for executing a transaction. The user pays it in ETH. |
| What network are we on? | A local Hardhat node (chain id 31337). On mainnet/testnet, the same code works without changes. |
| Why ethers.js? | A lightweight JS library that wraps the Ethereum JSON-RPC and signs transactions through MetaMask. |
| How do you deploy to a real testnet? | Add a `sepolia` network in `hardhat.config.js` with an Infura/Alchemy RPC URL and a private key, then `npx hardhat run scripts/deploy.js --network sepolia`. |

---

## 11. Future scope (mention in the report's last section)

- Security deposit held in escrow.
- IPFS-stored images for each property.
- Off-chain identity/KYC linked to wallet.
- Rating system for tenants and owners.
- Mainnet/Sepolia deployment.
