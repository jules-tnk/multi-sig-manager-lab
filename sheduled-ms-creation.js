const {
    AccountCreateTransaction,
    AccountUpdateTransaction,
    Hbar,
    PrivateKey,
    ScheduleCreateTransaction,
    ScheduleSignTransaction,
    TransactionId,
    TransferTransaction,
    Client, KeyList
} = require("@hashgraph/sdk");
require('dotenv').config()


const operatorAccount = process.env.ACCOUNT_ID;
const operatorKey = PrivateKey.fromStringECDSA(process.env.PRIVATE_KEY);

const client = Client.forTestnet();
client.setOperator(operatorAccount, operatorKey);

async function generatePrivateKeys({count}) {
    const privateKeys = [];
    for (let i = 0; i < count; i++) {
        privateKeys.push(PrivateKey.generate());
    }
    return privateKeys;
}

async function createSingleKeyAccount({privateKeys}) {
    const initialKey = operatorKey.publicKey;
    console.log("Initial Key: " + initialKey);

    const transaction = new AccountCreateTransaction()
        .setKey(initialKey)
        .setInitialBalance(new Hbar(1));

    const txResponse = await transaction.execute(client);

    // Get the new account ID
    const getReceipt = await txResponse.getReceipt(client);
    return getReceipt.accountId;
}


async function createScheduledAccountUpdateTransaction({msAccountId, privateKeys}) {
    const multisigPubKeyList = [];

    for (const key of privateKeys) {
        multisigPubKeyList.push(key.publicKey);
    }

    const keyList = new KeyList(multisigPubKeyList);

    const makeMultisigTx = new AccountUpdateTransaction()
        .setAccountId(msAccountId)
        .setKey(keyList);
    //.freezeWith(client);

    const scheduleTransaction = await new ScheduleCreateTransaction()
        .setScheduledTransaction(makeMultisigTx)
        .execute(client);

    const receipt = await scheduleTransaction.getReceipt(client);

    const scheduleId = receipt.scheduleId;
    console.log("The schedule ID is " + scheduleId);

    const scheduledTxId = receipt.scheduledTransactionId;
    console.log("The scheduled transaction ID is " + scheduledTxId);

    return {scheduleId, scheduledTxId};
}

async function signScheduledTransaction({scheduleId, privateKeys}) {
    for (const key of privateKeys) {
        const tx = await new ScheduleSignTransaction()
            .setScheduleId(scheduleId)
            .freezeWith(client)
            .sign(key)
        await tx.execute(client);
        console.log("Signed transaction with " + key.publicKey);
    }
}

async function checkStatus({scheduledTxId}) {
    const scheduledTxRecord = await TransactionId.fromString(scheduledTxId.toString()).getRecord(client);
    console.log("The scheduled transaction record is: " + scheduledTxRecord);
}

async function main() {
    // generate private keys
    const privateKeys = await generatePrivateKeys({count: 3});
    privateKeys.push(operatorKey);
    console.log(`Private keys generated: ${JSON.stringify(privateKeys.map(
        key => key.publicKey.toString()
    ), null, 2)}`);

    // create multi sig account
    const msAccountId = await createSingleKeyAccount({privateKeys});

    console.log("The new single key account ID is " + msAccountId.toString());

    // create multisig scheduled transactions
    const {scheduleId, scheduledTxId} = await createScheduledAccountUpdateTransaction({msAccountId, privateKeys});

    // sign the scheduled transaction
    await signScheduledTransaction({scheduleId, privateKeys});

    // check the status
    //await checkStatus({scheduledTxId});
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    })