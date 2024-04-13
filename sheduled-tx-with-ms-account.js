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

async function createMultiSigAccount({privateKeys}) {
    const initialKey = operatorKey.publicKey;
    console.log("Initial Key: " + initialKey);

    const transaction = new AccountCreateTransaction()
        .setKey(initialKey)
        .setInitialBalance(new Hbar(1));

    const txResponse = await transaction.execute(client);

    // Get the new account ID
    const getReceipt = await txResponse.getReceipt(client);
    const newMsAccountId = getReceipt.accountId;

    console.log("The new multisig account ID is " + newMsAccountId.toString());

    const multisigPubKeyList = [];

    for (const key of privateKeys) {
        multisigPubKeyList.push(key.publicKey);
    }

    const keyList = new KeyList(multisigPubKeyList);

    const makeMultisigTx = new AccountUpdateTransaction()
        .setAccountId(newMsAccountId)
        .setKey(keyList)
        .freezeWith(client);

    for (const key of privateKeys) {
        await makeMultisigTx.sign(key);
    }

    await makeMultisigTx.execute(client);

    return newMsAccountId;
}


async function createScheduledTransaction({msAccountId}) {
    const transaction = new TransferTransaction()
        .addHbarTransfer(msAccountId, new Hbar(-1))
        .addHbarTransfer("0.0.3671484", new Hbar(1));

    const scheduleTransaction = await new ScheduleCreateTransaction()
        .setScheduledTransaction(transaction)
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
            .sign(key);
        await tx.execute(client);
        console.log("Signed transaction with " + key.publicKey);
    }
}

/*async function checkStatus({scheduledTxId}) {
    const scheduledTxIdStr = scheduledTxId.toString().split("?")[0];
    console.log("The scheduled transaction ID is " + scheduledTxIdStr);

    let cleanedScheduledTxId = scheduledTxIdStr.replace("@", "-");
    cleanedScheduledTxId = cleanedScheduledTxId.split("").reverse().join("");
    cleanedScheduledTxId = cleanedScheduledTxId.replace(".", "-");
    cleanedScheduledTxId = cleanedScheduledTxId.split("").reverse().join("");
    console.log("The cleaned scheduled transaction ID is " + cleanedScheduledTxId);


    // wait 5 seconds (Apparently not needed on-chain changes need time to be available from mirror node)
    console.log("Waiting 5 seconds...");
    await new Promise(resolve => setTimeout(resolve, 5000));
    let response = await fetch(`https://testnet.mirrornode.hedera.com/api/v1/transactions/${cleanedScheduledTxId}`);
    response = await response.json();

    console.log(JSON.stringify(response, null, 2));
}*/

async function checkStatus({txId}) {
    const scheduledTxIdStr = txId.toString().split("?")[0];
    console.log("The scheduled transaction ID is " + scheduledTxIdStr);

    let cleanedScheduledTxId = scheduledTxIdStr.replace("@", "-").split("").reverse().join("").replace(".", "-").split("").reverse().join("");
    console.log("The cleaned scheduled transaction ID is " + cleanedScheduledTxId);


    // wait 5 seconds (Apparently not needed on-chain changes need time to be available from mirror node)
    console.log("Waiting 5 seconds...");
    await new Promise(resolve => setTimeout(resolve, 5000));
    let response = await fetch(`https://testnet.mirrornode.hedera.com/api/v1/transactions/${cleanedScheduledTxId}`);
    response = await response.json();

    console.log(JSON.stringify(response, null, 2));
}

async function main() {
    // generate private keys
    const privateKeys = await generatePrivateKeys({count: 3});
    privateKeys.push(operatorKey);
    console.log(`Private keys generated: ${JSON.stringify(privateKeys.map(
        key => key.publicKey.toString()
    ), null, 2)}`);

    // create multi sig account
    const msAccountId = await createMultiSigAccount({privateKeys});

    // create multisig scheduled transactions
    const {scheduleId, scheduledTxId} = await createScheduledTransaction({msAccountId});

    // sign the scheduled transaction
    await signScheduledTransaction({scheduleId, privateKeys});

    // check the status
    await checkStatus({txId: scheduledTxId});
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    })

