const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars from .env file in root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('Checking "session_albums" schema by inserting a dummy row (and failing deliberately)...');

    // Try to select with a limit 0 just to see if we can access it
    const { error: selectError } = await supabase
        .from('session_albums')
        .select('*')
        .limit(0);

    if (selectError) {
        console.error('Select Error:', selectError);
    } else {
        console.log('Select successful (table exists and is accessible).');
    }

    // To check columns, we can try to insert a row with invalid data to trigger a column error, 
    // or (better) just insert something that might work if we guess right

    // But wait, if we can't see the columns, we can infer them from a successful select if there's data. 
    // If there's no data, we are flying blind without information_schema access.
    // Let's try to fetch one row if it exists.
    const { data } = await supabase
        .from('session_albums')
        .select('*')
        .limit(1);

    if (data && data.length > 0) {
        console.log('Existing row keys:', Object.keys(data[0]));
    } else {
        console.log('No rows found. Cannot infer columns from data.');
        console.log('Trying to inspect via error properties on bad insert...');

        const { error } = await supabase
            .from('session_albums')
            .insert({ 'non_existent_column': 'test' });

        console.log('Insert error (should complain about column):', error);
    }
}

checkSchema();
