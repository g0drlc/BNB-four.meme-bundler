import { ethers } from 'ethers';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

// Token Factory ABI for creating new tokens
const FACTORY_ABI = [
    "function createToken(string memory name, string memory symbol, uint256 totalSupply) external returns (address)",
    "function buy() external payable",
    "function balanceOf(address) external view returns (uint256)"
];

class BundlerConfig {
    masterPrivateKey: string;
    numberOfWallets: number;
    bnbPerWallet: string;
    buyAmount: string;
    rpcUrl: string;
    factoryAddress: string;
    tokenName: string;
    tokenSymbol: string;
    tokenSupply: string;

    constructor() {
        if (!process.env.MASTER_PRIVATE_KEY) {
            throw new Error('MASTER_PRIVATE_KEY not found in environment variables');
        }

        this.masterPrivateKey = process.env.MASTER_PRIVATE_KEY;
        this.numberOfWallets = parseInt(process.env.NUMBER_OF_WALLETS || '5');
        this.bnbPerWallet = process.env.BNB_PER_WALLET || '0.1';
        this.buyAmount = process.env.BUY_AMOUNT || '0.05';
        this.rpcUrl = process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/';
        this.factoryAddress = process.env.FACTORY_ADDRESS || '';
        this.tokenName = process.env.TOKEN_NAME || 'MyToken';
        this.tokenSymbol = process.env.TOKEN_SYMBOL || 'MTK';
        this.tokenSupply = process.env.TOKEN_SUPPLY || '1000000';
    }
}

class Bundler {
    private provider: ethers.providers.JsonRpcProvider;
    private config: BundlerConfig;
    private wallets: Array<{ wallet: ethers.Wallet, privateKey: string }> = [];
    private factoryContract: ethers.Contract;
    private newTokenAddress: string = '';

    constructor(config: BundlerConfig) {
        this.config = config;
        this.provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
        this.factoryContract = new ethers.Contract(
            config.factoryAddress,
            FACTORY_ABI,
            this.provider
        );
    }

    async initialize() {
        console.log('Initializing bundler...');
        await this.generateWallets();
        await this.distributeInitialBNB();
        await this.createTokenAndBuy();
        console.log('Bundler initialized successfully!');
    }

    private async generateWallets() {
        console.log(`Generating ${this.config.numberOfWallets} wallets...`);
        
        for (let i = 0; i < this.config.numberOfWallets; i++) {
            const wallet = ethers.Wallet.createRandom().connect(this.provider);
            this.wallets.push({
                wallet,
                privateKey: wallet.privateKey
            });
        }

        const walletDetails = this.wallets.map((w, index) => ({
            index,
            address: w.wallet.address,
            privateKey: w.privateKey
        }));

        fs.writeFileSync(
            'wallet_details.json',
            JSON.stringify(walletDetails, null, 2)
        );

        console.log('Wallets generated and saved to wallet_details.json');
    }

    private async distributeInitialBNB() {
        const masterWallet = new ethers.Wallet(
            this.config.masterPrivateKey,
            this.provider
        );

        console.log('Distributing initial BNB to sub-wallets...');

        for (const { wallet } of this.wallets) {
            try {
                const tx = await masterWallet.sendTransaction({
                    to: wallet.address,
                    value: ethers.utils.parseEther(this.config.bnbPerWallet),
                    gasLimit: 21000
                });
                await tx.wait();
                console.log(`Sent ${this.config.bnbPerWallet} BNB to ${wallet.address}`);
            } catch (error) {
                console.error(`Failed to send BNB to ${wallet.address}:`, error);
            }
        }
    }

    private async createTokenAndBuy() {
        const masterWallet = new ethers.Wallet(
            this.config.masterPrivateKey,
            this.provider
        );
        
        console.log('Creating token and preparing buy transactions...');
        
        try {
            // Create token first
            const factoryWithSigner = this.factoryContract.connect(masterWallet);
            const createTx = await factoryWithSigner.createToken(
                this.config.tokenName,
                this.config.tokenSymbol,
                ethers.utils.parseEther(this.config.tokenSupply),
                {
                    gasLimit: 3000000
                }
            );
            
            // Wait for token creation and get the address
            const receipt = await createTx.wait();
            const event = receipt.events?.find(e => e.event === 'TokenCreated');
            this.newTokenAddress = event?.args?.tokenAddress;
            
            console.log(`New token created at address: ${this.newTokenAddress}`);

            // Prepare buy transactions for all wallets
            const tokenContract = new ethers.Contract(
                this.newTokenAddress,
                ["function buy() external payable"],
                this.provider
            );

            // Create array of buy transactions
            const buyTxPromises = this.wallets.map(async ({ wallet }) => {
                const contractWithSigner = tokenContract.connect(wallet);
                return contractWithSigner.buy({
                    value: ethers.utils.parseEther(this.config.buyAmount),
                    gasLimit: 500000
                });
            });

            // Execute all buy transactions simultaneously
            console.log('Executing buy transactions...');
            const buyTxs = await Promise.all(buyTxPromises);
            
            // Wait for all transactions to be mined
            const buyReceipts = await Promise.all(
                buyTxs.map(tx => tx.wait())
            );

            console.log('All transactions completed!');

            // Save token and transaction details
            const tokenDetails = {
                address: this.newTokenAddress,
                name: this.config.tokenName,
                symbol: this.config.tokenSymbol,
                supply: this.config.tokenSupply,
                transactions: buyReceipts.map(receipt => ({
                    hash: receipt.transactionHash,
                    blockNumber: receipt.blockNumber
                }))
            };
            
            fs.writeFileSync(
                'token_details.json',
                JSON.stringify(tokenDetails, null, 2)
            );
            
            return buyReceipts;
        } catch (error) {
            console.error('Failed to create token or buy:', error);
            throw error;
        }
    }

    async checkBalances() {
        if (!this.newTokenAddress) {
            throw new Error('No token address available');
        }

        console.log('Checking balances...');

        const tokenContract = new ethers.Contract(
            this.newTokenAddress,
            ["function balanceOf(address) external view returns (uint256)"],
            this.provider
        );

        for (const { wallet } of this.wallets) {
            try {
                const bnbBalance = await this.provider.getBalance(wallet.address);
                const tokenBalance = await tokenContract.balanceOf(wallet.address);

                console.log(`Wallet ${wallet.address}:`);
                console.log(`  BNB: ${ethers.utils.formatEther(bnbBalance)}`);
                console.log(`  Token: ${ethers.utils.formatEther(tokenBalance)}`);
            } catch (error) {
                console.error(`Failed to check balance for ${wallet.address}:`, error);
            }
        }
    }
}

async function main() {
    try {
        const config = new BundlerConfig();
        const bundler = new Bundler(config);

        // Initialize bundler (generate wallets, distribute BNB, create and buy tokens)
        await bundler.initialize();

        // Check final balances
        await bundler.checkBalances();

    } catch (error) {
        console.error('Error in main execution:', error);
    }
}

if (require.main === module) {
    main().catch(console.error);
}