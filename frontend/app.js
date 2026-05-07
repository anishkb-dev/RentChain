// RentChain frontend — talks to the RentalMarket contract via MetaMask.
// CONTRACT_INFO is injected by scripts/deploy.js (frontend/contract-info.js).

const HARDHAT_CHAIN_ID_HEX = "0x7a69"; // 31337
const HARDHAT_NETWORK = {
  chainId: HARDHAT_CHAIN_ID_HEX,
  chainName: "Hardhat Local",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: ["http://127.0.0.1:8545"],
};

let provider, signer, contract, account;

const $ = (id) => document.getElementById(id);

function setStatus(msg, kind = "") {
  const el = $("status");
  el.textContent = msg;
  el.className = "status show " + kind;
  if (kind === "ok") setTimeout(() => el.classList.remove("show"), 3000);
}

function shortAddr(a) {
  return a.slice(0, 6) + "..." + a.slice(-4);
}

// Force MetaMask onto the local Hardhat network. If it isn't added yet, add it.
async function ensureHardhatNetwork() {
  const current = await window.ethereum.request({ method: "eth_chainId" });
  if (current === HARDHAT_CHAIN_ID_HEX) return;
  setStatus("Switching MetaMask to Hardhat Local...");
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: HARDHAT_CHAIN_ID_HEX }],
    });
  } catch (err) {
    if (err.code === 4902) {
      // Network not added in MetaMask yet — add it.
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [HARDHAT_NETWORK],
      });
    } else {
      throw err;
    }
  }
}

async function connect() {
  if (!window.ethereum) {
    setStatus("Install the MetaMask extension first.", "error");
    return;
  }
  if (!window.CONTRACT_INFO) {
    setStatus("contract-info.js missing — run `npx hardhat run scripts/deploy.js --network localhost`.", "error");
    return;
  }
  try {
    await ensureHardhatNetwork();
    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = await provider.getSigner();
    account = await signer.getAddress();
    contract = new ethers.Contract(window.CONTRACT_INFO.address, window.CONTRACT_INFO.abi, signer);

    // Verify the contract is actually deployed on this chain. If the Hardhat
    // node was restarted without re-running the deploy script, the saved
    // address points at an empty account and every read will fail cryptically.
    const code = await provider.getCode(window.CONTRACT_INFO.address);
    if (code === "0x") {
      setStatus(
        "Contract not found at " + shortAddr(window.CONTRACT_INFO.address) +
          " on this chain. Run: npx hardhat run scripts/deploy.js --network localhost",
        "error"
      );
      return;
    }

    $("account").textContent = shortAddr(account);
    $("connectBtn").textContent = "Connected";
    $("connectBtn").disabled = true;

    window.ethereum.on("accountsChanged", () => location.reload());
    window.ethereum.on("chainChanged", () => location.reload());

    await refresh();
  } catch (err) {
    console.error(err);
    setStatus("Wallet connection failed: " + (err.message || err), "error");
  }
}

async function listProperty(e) {
  e.preventDefault();
  if (!contract) return setStatus("Connect MetaMask first.", "error");

  const location = $("location").value.trim();
  const description = $("description").value.trim();
  const rent = $("rent").value;

  try {
    const rentWei = ethers.parseEther(rent);
    setStatus("Submitting transaction...");
    const tx = await contract.listProperty(location, description, rentWei);
    setStatus("Waiting for block confirmation...");
    await tx.wait();
    setStatus("Property listed on-chain.", "ok");
    e.target.reset();
    await refresh();
  } catch (err) {
    console.error(err);
    setStatus(parseError(err), "error");
  }
}

async function refresh() {
  if (!contract) return;
  try {
    const props = await contract.getAllProperties();
    const container = $("properties");
    container.innerHTML = "";

    const visible = props.filter((p) => p.isListed);
    $("emptyState").style.display = visible.length === 0 ? "block" : "none";
    $("emptyState").textContent = visible.length === 0
      ? "No listings yet. Use the form above to add one."
      : "";

    for (const p of visible) {
      container.appendChild(renderCard(p));
    }

    const bal = await contract.balances(account);
    $("balance").textContent = ethers.formatEther(bal);
  } catch (err) {
    console.error(err);
    setStatus("Failed to load properties: " + err.message, "error");
  }
}

function renderCard(p) {
  const rentEth = ethers.formatEther(p.rentPerMonthWei);
  const isOwner = p.owner.toLowerCase() === account.toLowerCase();
  const now = Math.floor(Date.now() / 1000);
  const isRented =
    p.currentTenant !== ethers.ZeroAddress && Number(p.leaseEnd) > now;

  const card = document.createElement("div");
  card.className = "card";

  const status = isRented
    ? `<p class="rented">Rented until ${new Date(Number(p.leaseEnd) * 1000).toLocaleDateString()}</p>`
    : `<p class="vacant">Vacant</p>`;

  const action =
    !isOwner && !isRented
      ? `
        <div class="rent-row">
          <input type="number" min="1" max="12" value="1" id="months-${p.id}" />
          <button data-id="${p.id}" data-rent="${p.rentPerMonthWei}" class="primary rentBtn">Rent</button>
        </div>`
      : isOwner
      ? `<p class="muted">You own this listing.</p>`
      : "";

  card.innerHTML = `
    <h3>${escapeHtml(p.location)}</h3>
    <p>${escapeHtml(p.description)}</p>
    <p class="price">${rentEth} ETH <span class="muted">/ month</span></p>
    <p class="meta">Owner ${shortAddr(p.owner)}</p>
    ${status}
    ${action}
  `;

  card.querySelectorAll(".rentBtn").forEach((b) =>
    b.addEventListener("click", rentProperty)
  );
  return card;
}

async function rentProperty(e) {
  const id = e.target.dataset.id;
  const rentPerMonth = BigInt(e.target.dataset.rent);
  const monthsInput = $("months-" + id);
  const months = BigInt(monthsInput.value);
  const value = rentPerMonth * months;

  try {
    setStatus(`Sending ${ethers.formatEther(value)} ETH for ${months} month(s)...`);
    const tx = await contract.rentProperty(id, months, { value });
    setStatus("Waiting for block confirmation...");
    await tx.wait();
    setStatus("Property rented.", "ok");
    await refresh();
  } catch (err) {
    console.error(err);
    setStatus(parseError(err), "error");
  }
}

async function withdraw() {
  if (!contract) return;
  try {
    setStatus("Withdrawing earnings...");
    const tx = await contract.withdraw();
    await tx.wait();
    setStatus("Withdrawn to your wallet.", "ok");
    await refresh();
  } catch (err) {
    console.error(err);
    setStatus(parseError(err), "error");
  }
}

function parseError(err) {
  return err?.shortMessage || err?.reason || err?.message || "Transaction failed";
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

$("connectBtn").addEventListener("click", connect);
$("listForm").addEventListener("submit", listProperty);
$("refreshBtn").addEventListener("click", refresh);
$("withdrawBtn").addEventListener("click", withdraw);
