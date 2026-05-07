const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RentalMarket", function () {
  let market, owner, tenant, other;

  beforeEach(async () => {
    [owner, tenant, other] = await ethers.getSigners();
    const Market = await ethers.getContractFactory("RentalMarket");
    market = await Market.deploy();
  });

  it("lists a property", async () => {
    await market.listProperty("BTM Layout, 2BHK", "Sunny flat", ethers.parseEther("0.01"));
    const props = await market.getAllProperties();
    expect(props.length).to.equal(1);
    expect(props[0].owner).to.equal(owner.address);
    expect(props[0].location).to.equal("BTM Layout, 2BHK");
  });

  it("rejects listing with zero rent", async () => {
    await expect(
      market.listProperty("X", "Y", 0)
    ).to.be.revertedWith("Rent must be > 0");
  });

  it("lets a tenant rent and credits the owner balance", async () => {
    await market.listProperty("BTM, 2BHK", "Nice flat", ethers.parseEther("0.01"));
    const value = ethers.parseEther("0.02"); // 2 months
    await market.connect(tenant).rentProperty(1, 2, { value });
    expect(await market.balances(owner.address)).to.equal(value);

    const props = await market.getAllProperties();
    expect(props[0].currentTenant).to.equal(tenant.address);
  });

  it("rejects renting your own property", async () => {
    await market.listProperty("X", "Y", ethers.parseEther("0.01"));
    await expect(
      market.rentProperty(1, 1, { value: ethers.parseEther("0.01") })
    ).to.be.revertedWith("Owner cannot rent own property");
  });

  it("rejects wrong rent amount", async () => {
    await market.listProperty("X", "Y", ethers.parseEther("0.01"));
    await expect(
      market.connect(tenant).rentProperty(1, 2, { value: ethers.parseEther("0.01") })
    ).to.be.revertedWith("Send exact rent amount");
  });

  it("rejects renting an already-rented property", async () => {
    await market.listProperty("X", "Y", ethers.parseEther("0.01"));
    await market.connect(tenant).rentProperty(1, 1, { value: ethers.parseEther("0.01") });
    await expect(
      market.connect(other).rentProperty(1, 1, { value: ethers.parseEther("0.01") })
    ).to.be.revertedWith("Already rented");
  });

  it("lets owner withdraw earnings via pull-payment", async () => {
    await market.listProperty("X", "Y", ethers.parseEther("0.01"));
    await market.connect(tenant).rentProperty(1, 1, { value: ethers.parseEther("0.01") });

    const before = await ethers.provider.getBalance(owner.address);
    const tx = await market.withdraw();
    const r = await tx.wait();
    const gas = r.gasUsed * r.gasPrice;
    const after = await ethers.provider.getBalance(owner.address);

    expect(after).to.equal(before + ethers.parseEther("0.01") - gas);
    expect(await market.balances(owner.address)).to.equal(0n);
  });

  it("rejects withdraw when there is nothing to withdraw", async () => {
    await expect(market.withdraw()).to.be.revertedWith("Nothing to withdraw");
  });
});
