const hre = require('hardhat')
module.exports.advanceTime = async (seconds) => {
    await hre.network.provider.request({
        method: "evm_increaseTime",
        params: [seconds]
    })
    await hre.network.provider.request({
        method: "evm_mine",
        params: []
    })
}

module.exports.currentTimestamp = async () => {
    const block = await (ethers.getDefaultProvider()).getBlock('latest')
    return block.timestamp - 1000
}
