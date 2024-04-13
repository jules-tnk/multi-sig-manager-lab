const {
    PrivateKey,
    AccountCreateTransaction,
    Hbar,
    KeyList,
    AccountUpdateTransaction,
    TransferTransaction
} = require("@hashgraph/sdk");


async function generatePrivateKeys({count}) {
    const privateKeys = [];
    for (let i = 0; i < count; i++) {
        privateKeys.push(PrivateKey.generate());
    }
    console.log(`Private keys generated: ${JSON.stringify(privateKeys.map(
        key => key.publicKey.toString()
    ), null, 2)}`);
    return privateKeys;
}

async function createMultiSigAccount({privateKeys, initialKey, client}) {
    console.log("Initial Key: " + initialKey);

    const transaction = new AccountCreateTransaction()
        .setKey(initialKey)
        .setInitialBalance(new Hbar(10));

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

    console.log("Created multisig account " + newMsAccountId.toString());
    return newMsAccountId;
}

async function createMultiSigTxWithMsAccount({msAccountId}) {
    const transaction = new TransferTransaction()
        .addHbarTransfer(msAccountId, new Hbar(-1))
        .addHbarTransfer("0.0.3671484", new Hbar(1));

    console.log("Created multisig transaction");
    return transaction;
}

async function signMultiSigTx({transaction, privateKeys}) {
    for (const key of privateKeys) {
        await transaction.sign(key);
    }
    return transaction;
}

async function checkTxStatus({txId}) {
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

function getHashScanAccountUrl({id}) {
    return `https://hashscan.io/testnet/account/${id}`;
}

function getHashScanTransactionUrl({id}) {
    return `https://hashscan.io/testnet/transaction/${id}`;
}

module.exports = {
    generatePrivateKeys,
    createMultiSigAccount,
    createMultiSigTxWithMsAccount,
    signMultiSigTx,
    checkTxStatus
}