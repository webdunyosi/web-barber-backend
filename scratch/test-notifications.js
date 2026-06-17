const run = async () => {
  try {
    // 1. Fetch public notifications list
    const getRes = await fetch('http://localhost:5000/api/notifications');
    const data = await getRes.json();
    console.log('GET /api/notifications response length:', data.length);
    console.log('Sample data:', data.slice(0, 2));
  } catch (err) {
    console.error('Error in testing notification endpoint:', err.message);
  }
};

run();
