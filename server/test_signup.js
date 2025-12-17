
const axios = require('axios');

async function testSignup() {
    try {
        console.log('Attempting signup...');
        const response = await axios.post('http://localhost:4000/auth/signup', {
            email: `test_${Date.now()}@example.com`,
            password: 'password123'
        });
        console.log('Signup successful:', response.data);
    } catch (error) {
        if (error.response) {
            console.error('Signup failed with status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Signup failed:', error.message);
        }
    }
}

testSignup();
