const {
    createMultiSigAccount,
    createMultiSigTxWithMsAccount,
    generatePrivateKeys,
    signMultiSigTx,
    checkTxStatus
} = require("./utils");
const {Client, PrivateKey, TransactionId, AccountId, Timestamp}
    = require("@hashgraph/sdk");
require('dotenv').config()
const operatorAccount = process.env.ACCOUNT_ID;
const operatorKey = PrivateKey.fromStringECDSA(process.env.PRIVATE_KEY);

const client = Client.forTestnet();
client.setOperator(operatorAccount, operatorKey);

async function main() {
    // generate private keys
    const privateKeys = await generatePrivateKeys({count: 3});
    privateKeys.push(operatorKey);

    // create multi sig account
    const msAccountId = await createMultiSigAccount({privateKeys, initialKey: operatorKey.publicKey, client});

    // create multisig transaction
    const msTx = await createMultiSigTxWithMsAccount({msAccountId});


    await msTx.freezeWith(client);

    //wait 2min30
    console.log("Waiting 2min30...");
    await new Promise(resolve => setTimeout(resolve, 2.5 * 60 * 1000));
    // sign multisig transaction
    const signedTx = await signMultiSigTx({transaction: msTx, privateKeys});

    // execute multisig transaction
    const txResponse = await signedTx.execute(client);

    console.log(`TxResponse: ${JSON.stringify(txResponse, null, 2)}`);

    await checkTxStatus({txId: txResponse.transactionId});
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    })