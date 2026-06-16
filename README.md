# RentChain 🏠⛓️

> A decentralized rental marketplace on Ethereum — owners list properties, tenants pay rent in ETH directly to a smart contract. No broker, no middleman, no central database.

**Tech:** Solidity 0.8.24 · Hardhat · ethers.js · MetaMask · Mocha/Chai

---

## What it does

Traditional rental platforms (NoBroker, 99acres, MagicBricks) run on a central server that owns the data, can take listings down, and inserts brokers between you and the owner. RentChain replaces that server with an **Ethereum smart contract**:

- 🔓 **Listings live on-chain** — public and tamper-proof; no one can secretly alter or delete them.
- 💸 **Rent flows peer-to-peer** — tenants pay the contract, which credits the owner directly.
- 🔐 **Wallet = identity** — users authenticate with MetaMask; no accounts, no passwords.
- 🛡️ **Secure withdrawals** — owners pull their earnings via the **pull-payment pattern**, avoiding re-entrancy and stuck-funds bugs.

It's a compact, end-to-end DApp demonstrating the three pillars of blockchain development: **immutable storage, smart-contract logic, and trust-less value transfer.**

---

## Architecture

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

## Smart-contract API (`RentalMarket.sol`)

| Function | Purpose |
| -------- | ------- |
| `listProperty(location, description, rentPerMonthWei)` | Owner adds a property to the marketplace. |
| `rentProperty(id, months) payable` | Tenant pays exact `rent × months`; lease end is recorded on-chain. |
| `endLease(id)` | Owner ends an expired lease — the property becomes vacant. |
| `unlist(id)` | Owner removes a vacant property. |
| `withdraw()` | Owner withdraws collected rent (pull-payment). |
| `getAllProperties()` | Returns all listings — read by the frontend. |

**Events:** `PropertyListed`, `PropertyRented`, `LeaseEnded`, `PropertyUnlisted`, `Withdrawn` — the frontend listens to these to react to on-chain state changes.

**Why pull-payment?** Forwarding ETH inside `rentProperty()` would expose the contract to re-entrancy attacks and stuck-funds DoS. Instead, rent is credited to `balances[owner]` and the owner calls `withdraw()` themselves — the textbook secure pattern (OpenZeppelin `PullPayment`).

---

## Tests

8 unit tests (Mocha + Chai) covering the happy path, access control, and every input-validation branch:

```bash
npx hardhat test
```

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

---

## Run it locally

**Prerequisites:** Node.js ≥ 18 · Chrome + [MetaMask](https://metamask.io)

```bash
npm install
```

Open **three terminals**:

```bash
# 1. Start a local Ethereum node (prints 20 funded test accounts)
npx hardhat node

# 2. Deploy the contract (auto-writes address + ABI to the frontend)
npx hardhat run scripts/deploy.js --network localhost

# 3. Serve the frontend
npx http-server frontend -p 5500 -c-1 -o
```

**One-time MetaMask setup:** add a network — RPC `http://127.0.0.1:8545`, Chain ID `31337`, currency `ETH` — then import any private key printed by `hardhat node` (each comes with 10,000 test ETH).

---

## Demo flow

1. **Connect MetaMask** — your wallet address appears.
2. **List** a property (e.g. `BTM Layout, 2BHK`, `0.01 ETH/month`) → confirm the tx → it appears in the grid.
3. Switch to a **different account** → **Rent** it for 2 months (`value: 0.02 ETH`) → confirm.
4. Card updates to "Rented until …".
5. Switch back to the **owner** → withdrawable balance shows `0.02 ETH` → **Withdraw** → ETH lands in the wallet.

The entire rental cycle — list, rent, pay, withdraw — with no server in the middle.

---

## Project structure

```
├── contracts/RentalMarket.sol    # the smart contract
├── scripts/deploy.js             # deploys + writes ABI to frontend
├── test/RentalMarket.test.js     # 8 unit tests
├── frontend/                     # index.html + app.js (ethers.js) + style.css
├── hardhat.config.js
└── package.json
```

---

## Roadmap

- Security deposit held in escrow
- IPFS-stored property images
- On-chain reputation/rating for tenants & owners
- Sepolia testnet deployment (the same contract runs unchanged on any EVM network)

---

> Built as a Blockchain Technology mini-project (VTU CSE). Viva/study notes are in [`VIVA.md`](./VIVA.md).
