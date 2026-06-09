async function run() {
  try {
    const res = await fetch('http://localhost:5000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: 'Salom' })
    });
    const data = await res.json();
    console.log('API Response:', data);
  } catch (err) {
    console.error('API Error:', err.message);
  }
}

run();
