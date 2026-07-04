const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function testConnection() {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
        console.error("❌ Error: MONGODB_URI not found in .env.local");
        return;
    }

    console.log("⏳ Attempting to connect to MongoDB...");
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log("✅ SUCCESS: Handshake complete!");

        const db = client.db();
        const admin = db.admin();
        const info = await admin.serverStatus();

        console.log(`📡 Connected to: ${info.host}`);
        console.log("🔓 Auth Status: Authenticated successfully.");

    } catch (err) {
        console.error("❌ DATABASE CONNECTION FAILED!");
        console.error("---------------------------------");
        console.error(err.message);
        console.error("---------------------------------");
    } finally {
        await client.close();
    }
}

testConnection();