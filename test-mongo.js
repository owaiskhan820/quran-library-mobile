const { MongoClient } = require('mongodb');

async function testMongo() {
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error('MONGODB_URI is not defined in environment properties');
    return;
  }

  console.log('Testing connection to cluster...');
  
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Successfully connected to MongoDB!');
    
    const db = client.db(); // Uses the DB from the URI or default
    console.log('Connected to DB:', db.databaseName);
    
    const collections = await db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));
    
  } catch (err) {
    console.error('Connection failed:');
    console.error(err.message);
  } finally {
    await client.close();
  }
}

testMongo();
