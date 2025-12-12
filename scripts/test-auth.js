
async function testAuth() {
    const endpoints = [
        'http://localhost:3000/api/auth/login',
        'http://localhost:3000/api/auth/register'
    ];

    for (const url of endpoints) {
        console.log(`Testing POST ${url}...`);
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: 'testuser', password: 'password123' })
            });
            console.log(`Status: ${res.status} ${res.statusText}`);
            console.log('Allow Header:', res.headers.get('allow'));
            const text = await res.text();
            console.log('Body:', text.substring(0, 200));
        } catch (e) {
            console.error('Error:', e.message);
        }
        console.log('---');
    }
}

testAuth();
