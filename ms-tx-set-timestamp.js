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


    const timestampDate = new Date();
    //timestampDate.setHours(timestampDate.getHours() + 1);
    //timestampDate.setMinutes(timestampDate.getMinutes() + 1);
    //timestampDate.setSeconds(timestampDate.getSeconds() + 1);
    timestampDate.setMilliseconds(timestampDate.getMilliseconds() + 10);

    msTx.setTransactionId(
        //TransactionId.generate(msAccountId)
        //new TransactionId(msAccountId, Timestamp.fromDate(timestampDate))
        TransactionId.withValidStart(msAccountId, Timestamp.fromDate(timestampDate))
    );

    await msTx.freezeWith(client);

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