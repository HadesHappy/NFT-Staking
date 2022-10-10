const {expectRevert, time, BN, snapshot, expectEvent} = require("@openzeppelin/test-helpers");
const {equal, expect} = require("chai");
const {BigNumber} = require("ethers");
const hre = require("hardhat");
const {web3: any, ethers} = require("hardhat");
const DeepArt = hre.artifacts.require("DeepToken");
const DKeeperStakeArt = hre.artifacts.require("DKeeperStake");
const DKeeperArt = hre.artifacts.require("DKeeperNFT");
const DKeeperEscrowArt = hre.artifacts.require("DKeeperEscrow");

const toBN = (n) => new BN(n);
const E18 = toBN(10).pow(toBN(18));
const E11 = toBN(10).pow(toBN(11));
const E9 = toBN(10).pow(toBN(9));
const today = new Date();

describe("DKeeper Staking Contract", function () {
  before("Deploy contract", async function () {
    const [owner, alice, bob, carol, rewardHolder, user1, user2, user3] = await web3.eth.getAccounts();
    this.owner = owner;
    this.alice = alice;
    this.bob = bob;
    this.carol = carol;
    this.user1 = user1;
    this.user2 = user2;
    this.user3 = user3;
    this.rewardHolder = rewardHolder;
    this.startTime = today;
    this.startTime.setDate(today.getDate() + 1);
    this.startTime = Math.floor(this.startTime.getTime() / 1000);
    this.endTime = today;
    this.endTime.setDate(today.getDate() + 366);
    this.endTime = Math.floor(this.endTime.getTime() / 1000);
    console.log(this.startTime, this.endTime);

    // Deploy the contracts
    this.DeepToken = await DeepArt.new();
    this.DKeeper = await DKeeperArt.new();
    await this.DKeeper.initialize("DKeeper NFT", "DKeeper", 200, this.rewardHolder);

    this.DKeeperStake = await DKeeperStakeArt.new(
      this.DeepToken.address,
      this.DKeeper.address,
      this.startTime,
      this.endTime
    );

    this.DKeeperEscrow = await DKeeperEscrowArt.new(this.DeepToken.address, this.DKeeperStake.address);
    await this.DKeeperStake.setEscrow(this.DKeeperEscrow.address);

    // Set DeepToken minters & allocations
    this.DeepToken.setMinter(this.DKeeperEscrow.address, true);
    this.DeepToken.setAllocation(this.DKeeperEscrow.address, toBN(10000000).mul(E18));

    console.log("DeepToken: ", this.DeepToken.address);
    console.log("DKeeperNFT: ", this.DKeeper.address);
    console.log("DKeeperStake: ", this.DKeeperStake.address);
    console.log("DKeeperEscrow: ", this.DKeeperEscrow.address);
  });

  describe("should set correct state variables", function () {
    it("(1) check DeepToken contract address", async function () {
      expect(await this.DKeeperStake.deepToken()).to.equal(this.DeepToken.address);
    });

    it("(2) check DKeeper contract address", async function () {
      expect(await this.DKeeperStake.dKeeper()).to.equal(this.DKeeper.address);
    });

    it("(3) check DKeeperEscrow contract address", async function () {
      expect(await this.DKeeperStake.dKeeperEscrow()).to.equal(this.DKeeperEscrow.address);
    });

    it("(4) check accTokenPerShare", async function () {
      expect((await this.DKeeperStake.accTokenPerShare()).toString()).to.eq("0");
    });
  });

  describe("should calculate the correct rewards", function () {
    it("test minting NFTs", async function () {
      await this.DKeeper.publicMint(1, {from: this.user1, value: ethers.utils.parseEther("0.5")});
      await this.DKeeper.publicMint(1, {from: this.user2, value: ethers.utils.parseEther("1")});
      await this.DKeeper.publicMint(1, {from: this.user3, value: ethers.utils.parseEther("2")});

      await this.DKeeper.setApprovalForAll(this.DKeeperStake.address, true, {from: this.user1});
      await this.DKeeper.setApprovalForAll(this.DKeeperStake.address, true, {from: this.user2});
      await this.DKeeper.setApprovalForAll(this.DKeeperStake.address, true, {from: this.user3});

      expect(await this.DKeeper.ownerOf(1)).to.equal(this.user1) &&
        expect(await this.DKeeper.ownerOf(2)).to.equal(this.user2) &&
        expect(await this.DKeeper.ownerOf(3)).to.equal(this.user3);
    });

    it("test claimable rewards", async function () {
      await this.DKeeperStake.deposit(1, {from: this.user1});
      await this.DKeeperStake.deposit(2, {from: this.user2});
      await this.DKeeperStake.deposit(3, {from: this.user3});

      await time.increase(3600 * 24 * 10);
      const reward1 = toBN(await this.DKeeperStake.pendingDeep(this.user1));
      const reward2 = toBN(await this.DKeeperStake.pendingDeep(this.user2));
      const reward3 = toBN(await this.DKeeperStake.pendingDeep(this.user3));

      await this.DKeeperStake.claim({from: this.user1});

      expect((await this.DeepToken.balanceOf(this.user1)).div(E18).toString()).to.eq(reward1.div(E18).toString());
    });

    it("test withdraw functionality", async function () {
      await this.DKeeperStake.withdraw(1, {from: this.user1});
      await this.DKeeperStake.withdraw(2, {from: this.user2});
      await this.DKeeperStake.withdraw(3, {from: this.user3});

      expect(await this.DKeeper.ownerOf(1)).to.equal(this.user1) &&
        expect(await this.DKeeper.ownerOf(2)).to.equal(this.user2) &&
        expect(await this.DKeeper.ownerOf(3)).to.equal(this.user3);
    });
  });
});
