import { BigNumber, Contract, ContractFactory } from "ethers";
// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import hre, { ethers, upgrades } from "hardhat";

async function deploy() {
  // Deploy Point
  const DeepToken: ContractFactory = await ethers.getContractFactory(
    "DeepToken"
  );
  const deepToken: Contract = await DeepToken.deploy();
  console.log("DeepToken was deployed to: ", deepToken.address);

  // Deploy DKeeperNFT
  const DKeeperNFT: ContractFactory = await ethers.getContractFactory(
    "DKeeperNFT"
  );
  const dKeeperNFT: Contract = await upgrades.deployProxy(DKeeperNFT, [
    "DKeeperNFT",
    "DKeeper",
    200,
    "0xE818f5E319e92e346D4A164BB50b0573e45974FF",
  ]);
  console.log("DKeeperNFT was deployed to: ", dKeeperNFT.address);

  // Deploy DKeeperStake
  const today = new Date();
  let startTime = new Date(today.getTime());
  startTime.setDate(today.getDate() + 1);

  let endTime = new Date(today.getTime());
  endTime.setDate(today.getDate() + 366);
  let endTime1 = new Date(today.getTime());
  endTime1.setDate(today.getDate() + 57);

  const DKeeperStake: ContractFactory = await ethers.getContractFactory(
    "DKeeperStake"
  );
  const dKeeperStake: Contract = await DKeeperStake.deploy(
    deepToken.address,
    dKeeperNFT.address,
    Math.floor(startTime.getTime() / 1000),
    Math.floor(endTime.getTime() / 1000)
  );
  console.log(
    "DKeeperStake was deployed to: ",
    dKeeperStake.address,
    Math.floor(startTime.getTime() / 1000),
    Math.floor(endTime.getTime() / 1000)
  );

  // Deploy Airdrop
  const AirDrop: ContractFactory = await ethers.getContractFactory("AirDrop");
  const airdrop: Contract = await AirDrop.deploy(
    deepToken.address,
    Math.floor(startTime.getTime() / 1000),
    Math.floor(endTime1.getTime() / 1000)
  );
  console.log(
    "AirDrop was deployed to: ",
    airdrop.address,
    Math.floor(startTime.getTime() / 1000),
    Math.floor(endTime1.getTime() / 1000)
  );

  // Deploy Escrows
  const DKeeperEscrow: ContractFactory = await ethers.getContractFactory(
    "DKeeperEscrow"
  );
  const escrowStake: Contract = await DKeeperEscrow.deploy(
    deepToken.address,
    dKeeperStake.address
  );
  const escrowAirdrop: Contract = await DKeeperEscrow.deploy(
    deepToken.address,
    airdrop.address
  );
  console.log("EscrowStake was deployed to: ", escrowStake.address);
  console.log("EscrowAirdrop was deployed to: ", escrowAirdrop.address);
}

async function main(): Promise<void> {
  await deploy();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
