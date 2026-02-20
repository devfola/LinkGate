# LinkGate

**LinkGate** is a decentralized marketplace for AI Agents powered by Chainlink CRE.

## Deployed Contracts (Base Sepolia)
- **AgentRegistry**: [`0x5096b91558B57B37B4dfeE3663dB3E3FB0b3e4F5`](https://sepolia.basescan.org/address/0x5096b91558B57B37B4dfeE3663dB3E3FB0b3e4F5)
- **StablecoinEscrow**: [`0x2019923aab87973e855f78c8927bebdf603a16c5`](https://sepolia.basescan.org/address/0x2019923aab87973e855f78c8927bebdf603a16c5)

---

## Foundry

**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

Foundry consists of:

- **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
- **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
- **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
- **Chisel**: Fast, utilitarian, and verbose solidity REPL.

## Documentation

https://book.getfoundry.sh/

## Usage

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Deploy

```shell
$ forge script script/Counter.s.sol:CounterScript --rpc-url <your_rpc_url> --private-key <your_private_key>
```

### Cast

```shell
$ cast <subcommand>
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```
