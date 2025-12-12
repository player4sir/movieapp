import crypto from 'crypto';

function generateSecret(length = 32): string {
    return crypto.randomBytes(length).toString('hex');
}

console.log('Generating secure production secrets...\n');

console.log('JWT_SECRET=' + generateSecret());
console.log('JWT_REFRESH_SECRET=' + generateSecret());
console.log('NEXTAUTH_SECRET=' + generateSecret());

console.log('\nCopy the above values to your .env file in production.');
