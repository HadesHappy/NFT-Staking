Web3 = require("web3");
const fs = require("fs");

const ethers = require("ethers");
const axios = require("axios");
const {Interface} = require("@ethersproject/abi");
const BigNumber = ethers.BigNumber;
const jsonFile = "./artifacts/contracts/Staking.sol/MCRTStaking.json";
const parsed = JSON.parse(fs.readFileSync(jsonFile));
const abi = parsed.abi;

const MultiCallAbi = require("./MultiCall.json");

const provider = ethers.getDefaultProvider("https://bsc-dataseed4.binance.org/");
const testWeb3 = new Web3("https://bsc-dataseed4.binance.org/");
const blockPerApiRequest = 1000000;

const stakingInst = new testWeb3.eth.Contract(abi, "0x50c50569c9706A9a3034AFefa954CECa78859853");

const getCovalentApiUrl = (startBlock, endBlock, type) => {
  const covalentApiRootUrl = "https://api.covalenthq.com/v1";
  const networkId = "56";
  const topics =
    type === "stake" ? ethers.utils.id("Stake(uint256,address)") : ethers.utils.id("Unstake(uint256,address)");
  const apiKey = "ckey_1126a2694d9f44618db5620be76";
  const pageSize = 100000;
  return `${covalentApiRootUrl}/${networkId}/events/topics/${topics}/?starting-block=${startBlock}&ending-block=${endBlock}&page-size=${pageSize}&key=${apiKey}&sender-address=${"0x50c50569c9706A9a3034AFefa954CECa78859853"}`;
};

const multicall = async (abi, calls) => {
  const web3 = testWeb3;
  const multi = new web3.eth.Contract(MultiCallAbi.abi, MultiCallAbi.contract["56"]);
  const itf = new Interface(abi);

  const calldata = calls.map((call) => {
    return [call.address.toLowerCase(), itf.encodeFunctionData(call.name, call.params)];
  });
  // const calldata = calls.map((call) => [call.address.toLowerCase(), itf.encodeFunctionData(call.name, call.params)])
  const {returnData} = await multi.methods.aggregate(calldata).call();
  const res = returnData.map((call, i) => itf.decodeFunctionResult(calls[i].name, call));

  return res;
};

const getSingleV1StakeEvents = async () => {
  const startBlock = 16969877; // mainnet
  const endBlock = await provider.getBlockNumber();

  // track "Staked" events logs
  let block = startBlock;
  let logs = [];

  try {
    while (block < endBlock) {
      try {
        const covalanetApiUrl = getCovalentApiUrl(block, block + blockPerApiRequest, "stake");
        const res = await axios.get(covalanetApiUrl);
        logs = [...logs, ...res.data.data.items];
      } catch (err) {
        console.log("Error: ", err);
      }
      block += blockPerApiRequest;
    }
  } catch (err) {
    console.log("covanlent API fetch error: --->", err);
  }

  // get "Staked" Events
  let stakedUsers = {};

  logs.map((log) => {
    const staker = ethers.utils.getAddress("0x" + log.raw_log_data.substring(90));
    const stakeId = BigNumber.from(log.raw_log_data.substring(0, 66)).toNumber();
    stakedUsers[staker] = stakeId;
  });

  let calls = [];

  for (let i = 0; i < Object.keys(stakedUsers).length; i++) {
    let userAccount = Object.keys(stakedUsers)[i];

    for (let j = 0; j < stakedUsers[userAccount]; j++) {
      calls.push({
        address: "0x50c50569c9706A9a3034AFefa954CECa78859853",
        name: "stakingInfoForAddress",
        params: [userAccount, j],
      });
    }
  }

  console.log(calls.length);

  const stepCallCount = 100;

  let arr = [];

  for (let i = 0; i < calls.length; i += stepCallCount) {
    arr = [...arr, ...(await multicall(abi, calls.slice(i, i + stepCallCount)))];
  }

  let results = {};

  console.log(arr[0]);

  for (let i = 0; i < arr.length; i++) {
    const duration = BigNumber.from(arr[i].timeToUnlock).sub(BigNumber.from(arr[i].stakingTime)).toNumber();
    if (!results[duration]) results[duration] = 0;
    if (!arr[i].option)
      results[duration] += Number(
        ethers.utils.formatEther(BigNumber.from(arr[i].tokensStaked).mul(BigNumber.from(10).pow(9)))
      );
  }

  console.log(results);

  console.log("Total Stakers:", Object.keys(stakedUsers).length);

  return stakedUsers;
};

getSingleV1StakeEvents();
