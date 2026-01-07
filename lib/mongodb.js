const { MongoClient } = require('mongodb');

let client;
let clientPromise;

if (!process.env.MONGODB_URI) {
    throw new Error('Please add your MONGODB_URI to .env');
}

const uri = process.env.MONGODB_URI;
const options = {
    maxPoolSize: 10,
    minPoolSize: 5,
};

if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable to preserve the connection
    if (!global._mongoClientPromise) {
        client = new MongoClient(uri, options);
        global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
} else {
    // In production mode, it's best to not use a global variable
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
}

// Helper function to get database
async function getDb() {
    const client = await clientPromise;
    return client.db('absensi_db'); // nama database
}

// Helper function to get collection
async function getCollection(collectionName) {
    const db = await getDb();
    return db.collection(collectionName);
}

module.exports = { clientPromise, getDb, getCollection };
