//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol";

contract DKeeperSigner is EIP712Upgradeable {
    string private constant SIGNING_DOMAIN = "DKeeper";

    string private constant SIGNATURE_VERSION = "1";

    struct WhiteList {
        address userAddress;
        bytes signature;
    }

    function __DKeeperSigner_init() internal onlyInitializing {
        __EIP712_init(SIGNING_DOMAIN, SIGNATURE_VERSION);
    }

    function getSigner(WhiteList memory dkeeper) public view returns (address) {
        return _verify(dkeeper);
    }

    /// @notice Returns a hash of the given rarity, prepared using EIP712 typed data hashing rules.

    function _hash(WhiteList memory dkeeper) internal view returns (bytes32) {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(keccak256("WhiteList(address userAddress)"), dkeeper.userAddress)
                )
            );
    }

    function _verify(WhiteList memory dkeeper) internal view returns (address) {
        bytes32 digest = _hash(dkeeper);
        return ECDSAUpgradeable.recover(digest, dkeeper.signature);
    }

    function getChainID() external view returns (uint256) {
        uint256 id;

        assembly {
            id := chainid()
        }

        return id;
    }
}
