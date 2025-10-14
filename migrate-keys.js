// migrate-keys.js
require('dotenv').config();
const { knex } = require('./database');

async function migrateApiKeys() {
    console.log('Starting API key migration...');
    try {
        const clients = await knex('clients').select('id', 'api_key');
        
        if (clients.length === 0) {
            console.log('No clients found to migrate.');
            return;
        }

        const newKeys = clients.map(client => ({
            client_id: client.id,
            api_key: client.api_key,
            key_name: 'Default Key' // Give a default name to the old keys
        }));

        await knex('api_keys').insert(newKeys);
        
        console.log(`Successfully migrated ${clients.length} API keys.`);

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await knex.destroy(); // Close the database connection
    }
}

migrateApiKeys();