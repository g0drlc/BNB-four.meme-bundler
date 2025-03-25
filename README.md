# Four.meme Token Bundler

A TypeScript-based bundler for creating and trading tokens on the Four.meme platform on BSC (Binance Smart Chain).

## Features

- Create multiple sub-wallets automatically
- Distribute BNB to sub-wallets
- Create new tokens using TokenManager2
- Execute simultaneous token purchases from all sub-wallets
- Track balances and transaction details

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- BNB in your master wallet for distribution and token creation
- MetaMask or similar wallet for private key management

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd four-meme-bundler
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following content:
```env
# Your wallet private key (without 0x prefix)
MASTER_PRIVATE_KEY=your_private_key_here

# BSC RPC URL
BSC_RPC_URL=https://bsc-dataseed.binance.org/

# Number of sub-wallets to create
NUMBER_OF_WALLETS=5

# Amount of BNB to send to each wallet
BNB_PER_WALLET=0.1

# Amount of BNB to use for buying tokens per wallet
BUY_AMOUNT=0.05

# Contract addresses
TOKEN_MANAGER_2=0x5c952063c7fc8610FFDB798152D69F0B9550762b
TOKEN_MANAGER_HELPER_3=0xF251F83e40a78868FcfA3FA4599Dad6494E46034

# Token parameters
TOKEN_NAME=MyToken
TOKEN_SYMBOL=MTK
TOKEN_SUPPLY=1000000
MAX_RAISING=100
OFFERS=800000
RESERVES=200000
```

## Usage

1. Configure your `.env` file with your settings:
   - Add your master wallet's private key
   - Adjust the number of sub-wallets
   - Set BNB amounts for distribution and buying
   - Configure token parameters

2. Run the bundler:
```bash
npx ts-node src/bundler.ts
```

The bundler will:
1. Generate the specified number of sub-wallets
2. Distribute BNB from your master wallet to each sub-wallet
3. Create a new token using TokenManager2
4. Execute simultaneous token purchases from all sub-wallets
5. Save wallet and transaction details to JSON files

## Output Files

- `wallet_details.json`: Contains addresses and private keys of generated sub-wallets
- `token_details.json`: Contains token information and transaction details

## Important Notes

1. **Security**:
   - Never share your private keys
   - Keep your `.env` file secure
   - Don't commit sensitive files to version control

2. **Gas Fees**:
   - Ensure your master wallet has enough BNB for:
     - Distribution to sub-wallets
     - Token creation
     - Gas fees for all transactions

3. **Transaction Timing**:
   - Token creation and buying happen in sequence
   - Buy transactions are executed simultaneously after token creation

4. **Error Handling**:
   - The script includes basic error handling
   - Failed transactions are logged but won't stop the script
   - Check the console output for any errors

## Contract Addresses

- TokenManager2 (V2): `0x5c952063c7fc8610FFDB798152D69F0B9550762b`
- TokenManagerHelper3 (V3): `0xF251F83e40a78868FcfA3FA4599Dad6494E46034`

## Support

For issues or questions, please create an issue in the repository.

## License

MIT License 