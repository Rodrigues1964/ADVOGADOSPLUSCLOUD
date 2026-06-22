const axios = require('axios');
async function test() {
  try {
    const res = await axios.post('http://localhost:5000/api/auth/login', { email: 'master@advogadosplus.com', password: 'password123' });
    console.log("SUCCESS:", JSON.stringify(res.data, null, 2));
  } catch(e) {
    console.log("STATUS:", e.response?.status);
    console.log("DATA:", JSON.stringify(e.response?.data, null, 2));
    console.log("MESSAGE:", e.message);
  }
}
test();
