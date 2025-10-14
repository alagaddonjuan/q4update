// ussd-menus.js

function modernLotteryMenu(text, phoneNumber, client) {
    let response = '';

    if (text === '') {
        // Main Menu (Level 1)
        response = `CON Welcome to Modern Lottery
1. Play Games
2. Check results
3. Wallets
4. Recharge
5. Withdrawal
6. Contact Us`;
    } else if (text === '1') {
        // Play Games Menu (Level 2)
        response = `CON Choose the game you want to play:
1. Keno 20/80 (AWOOF)
2. Modern New 5/90(BILLIONAIRE)
3. Modern JAPORT
4. Ghana 5/90(NLA)
5. VAG LOTTO
6. NOON RUSH`;
    } else if (text === '2') {
        // Check Results Menu (Level 2)
        response = `CON Choose the game you want to check:
1. Powerball
2. Awoof
3. Biggest Bet
4. Gold Rush
5. Lucky Dollar
6. Modern Bingo
7. Bonus cash
8. Hero`;
    } else if (text === '1*1') {
        // Keno Game selected (Level 3)
        response = `CON Choose the Pool you want to play:
1. 1ST_DRAWN
2. PERM1
3. PERM2
4. 1BANKER
5. AGAINST
6. PERM3
7. PERM4
8. PERM5
9. COLOR_NUM_COUNT4+
10. # Next`;
    } else {
        // Default response for invalid input
        response = `END Invalid selection. Please try again.`;
    }
    
    return response;
}

// --- Menu for your first client (e.g., AOCOSA) ---
function aocosaMenu(text, phoneNumber, client) {
    let response = '';
    if (text === '') {
        response = `CON Welcome to ${client.name}.\n1. My Account\n2. My Phone Number`;
    } else if (text === '1') {
        response = `CON Choose account information\n1. Account Number\n2. Account Balance`;
    } else if (text === '2') {
        response = `END Your phone number is ${phoneNumber}`;
    } else if (text === '1*1') {
        response = `END Your account number is ACC${client.id}`;
    } else if (text === '1*2') {
        response = `END Your account balance is ₦10,000`;
    } else {
        response = 'END Invalid choice';
    }
    return response;
}

// --- Menu for a future client (e.g., Q4I) ---
function q4iMenu(text, phoneNumber, client) {
    let response = '';
    if (text === '') {
        response = `CON Welcome to Q4I Communications.\n1. Check Airtime Balance\n2. Buy Data`;
    } else if (text === '1') {
        response = `END Your Airtime balance is NGN 500.`;
    } else if (text === '2') {
        response = `END Data services are coming soon.`;
    } else {
        response = 'END Invalid selection.';
    }
    return response;
}

// --- A Map to link USSD codes to their menu functions ---
const menuHandlers = {
    '*347*102#': modernLotteryMenu, 
    '*384*19379#': aocosaMenu,
    '*384*55555#': q4iMenu, // Example for a new client
    // Add more clients here as you get them
};

module.exports = menuHandlers;