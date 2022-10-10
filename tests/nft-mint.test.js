const {expect} = require("chai");
const {ethers} = require("hardhat");
const {advanceTime, currentTimestamp} = require("./utils/utils");
const {WhiteList} = require("./utils/sinature");
const {BigNumber} = require("ethers");

describe("Starting the minting test", () => {
  let alice, bob, nft;

  before(async () => {
    [alice, bob] = await ethers.getSigners();
    const MagicNFT = await ethers.getContractFactory("DKeeperNFT");
    nft = await MagicNFT.deploy();

    await nft.initialize("DKeeper NFT", "DKeeper", 200, alice.address);
  });

  it("Test: Public Mint Success", async function () {
    await nft.connect(bob).publicMint(1, {value: ethers.utils.parseEther("0.5")});

    const owner = await nft.ownerOf(1);
    expect(owner).to.equal(bob.address);
  });

  it("Test: Owner Mint Success", async function () {
    await nft.connect(alice).ownerMint(1);

    const owner = await nft.ownerOf(2);
    const ownerMinted = await nft.ownerMinted();
    expect(owner).to.equal(alice.address) && expect(BigNumber.from(ownerMinted)).to.eq(1);
  });
});
