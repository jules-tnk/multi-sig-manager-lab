const {
    PrivateKey,
    AccountCreateTransaction,
    Hbar,
    Client
} = require("@hashgraph/sdk");

require("dotenv").config();


const operatorAccount = process.env.ACCOUNT_ID;
const operatorKey = PrivateKey.fromStringECDSA(process.env.PRIVATE_KEY);

const client = Client.forTestnet();
client.setOperator(operatorAccount, operatorKey);

async function main() {
    const newKey = PrivateKey.generate();

    console.log(`private key = ${newKey.toString()}`);
    console.log(`public key = ${newKey.publicKey.toString()}`);

    try {
        let response = await new AccountCreateTransaction()
            .setInitialBalance(new Hbar(10))
            .setKey(newKey.publicKey)
            .execute(client);

        const receipt = await response.getReceipt(client);

        console.log(`account id = ${receipt.accountId.toString()}`);
    } catch (error) {
        console.error(error);
    }

    process.exit(0);
}

void main();