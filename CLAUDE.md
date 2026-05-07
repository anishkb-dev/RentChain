# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

RentChain — a small Hardhat + plain-JS DApp built as a VTU 6th-sem mini project. A single Solidity contract (`RentalMarket.sol`) backs a static-HTML frontend that talks to it through MetaMask + ethers.js (loaded from CDN, no bundler).

## Common commands

```bash
npm install                                            # one-time
npm run compile                                        # hardhat compile
npm test                                               # run all 8 mocha/chai tests
npx hardhat test --grep "lets a tenant rent"           # run a single test by name

npm run node                                           # terminal 1 — local chain on 127.0.0.1:8545 (chainId 31337)
npm run deploy                                         # terminal 2 — deploys + writes frontend/contract-info.js
npm run frontend                                       # terminal 3 — serves frontend/ on :5500 via http-server
```

The three commands above must be run in that order in **separate terminals**. Re-run `npm run deploy` every time `hardhat node` restarts — the saved address in `frontend/contract-info.js` becomes stale and the frontend will report "Contract not found at … on this chain."

## Architecture notes

- **Single source of truth is `contracts/RentalMarket.sol`.** It is deliberately small: `properties` mapping + `balances` mapping + 6 external functions. Every test and every UI action maps 1:1 to one of those functions.
- **Pull-payment is intentional.** Rent is credited to `balances[owner]` on `rentProperty`; the owner calls `withdraw()` separately. Do not "simplify" this into forwarding ETH inside `rentProperty` — it reintroduces re-entrancy risk and is called out in the README's viva Q&A.
- **Deploy script is the bridge between contract and frontend.** `scripts/deploy.js` writes `{ address, abi }` to `frontend/contract-info.js` as `window.CONTRACT_INFO`. That file is gitignored and must be regenerated after any contract change. `frontend/app.js` will not function without it.
- **No build step on the frontend.** `frontend/index.html` loads `ethers` from a CDN and `app.js`/`contract-info.js` as plain `<script>` tags. There is no bundler, no TypeScript, no framework — keep changes in this style.
- **Network is hardcoded to Hardhat localhost.** `app.js` forces MetaMask onto chainId `0x7a69` (31337) via `wallet_switchEthereumChain` / `wallet_addEthereumChain`. Adding a real testnet means extending both `hardhat.config.js` (currently only `hardhat` + `localhost`) and the chain-switching logic in `app.js`.
- **Lease time uses `30 days` Solidity units**, not calendar months. Tests rely on `block.timestamp` semantics; if you alter the lease math, update `endLease`'s `block.timestamp >= p.leaseEnd` guard too.

## Test layout

`test/RentalMarket.test.js` — each `it(...)` covers one `require(...)` branch in the contract (zero rent, owner-rents-own, wrong amount, double-rent, withdraw guard, etc.). When adding a new `require` to the contract, add the matching negative-path test in the same file.
