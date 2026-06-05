const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('🚀 Starting Barber Shop Backend API Integration Tests...');

  let adminToken = '';
  let userToken = '';
  let userId = '';
  let bookingId = '';

  // 0. Create a dummy receipt image file for uploads
  const dummyFilePath = path.join(__dirname, 'dummy_receipt.png');
  fs.writeFileSync(dummyFilePath, 'dummy-png-image-binary-data');

  try {
    // 1. ADMIN LOGIN TEST
    console.log('\n--- 1. Admin Login ---');
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: '+998 99 999 99 99',
        password: 'admin'
      })
    });
    const adminLoginData = await adminLoginRes.json();
    if (adminLoginRes.status === 200) {
      console.log('✅ Admin Login Successful!');
      adminToken = adminLoginData.token;
    } else {
      console.error('❌ Admin Login Failed:', adminLoginData);
      throw new Error('Admin login failed');
    }

    // 2. USER REGISTRATION TEST (with phone formatting verification)
    console.log('\n--- 2. User Registration ---');
    const userRegRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Mijoz Sodiq',
        phone: '+998 (90) 876-54-32', // non-normalized format test
        telegram: '@sodiq_uz',
        password: 'user123'
      })
    });
    const userRegData = await userRegRes.json();
    if (userRegRes.status === 201) {
      console.log('✅ User Registration Successful!');
      console.log('   Normalized Saved Phone:', userRegData.user.phone);
      console.log('   Cleaned Telegram Handle:', userRegData.user.telegram);
      userToken = userRegData.token;
      userId = userRegData.user.id;
    } else {
      console.error('❌ User Registration Failed:', userRegData);
      throw new Error('User registration failed');
    }

    // 3. GET PROFILE TEST (requireAuth check)
    console.log('\n--- 3. Fetch User Profile ---');
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    const meData = await meRes.json();
    if (meRes.status === 200) {
      console.log('✅ Profile Retrieval Successful! User:', meData.name);
    } else {
      console.error('❌ Profile Retrieval Failed:', meData);
      throw new Error('Profile retrieval failed');
    }

    // 4. CREATE APPOINTMENT / BOOKING TEST (multipart file upload)
    console.log('\n--- 4. Create Booking (Multipart) ---');
    const formData = new FormData();
    formData.append('name', 'Mijoz Sodiq');
    formData.append('phone', '+998 90 876 54 32');
    formData.append('telegram_user', 'sodiq_uz');
    formData.append('serviceName', 'Soch kesish (Fade)');
    formData.append('servicePrice', '80000');
    formData.append('date', '06.06.2026');
    formData.append('time', '14:30');
    
    // Attach dummy receipt
    const fileBuffer = fs.readFileSync(dummyFilePath);
    const fileBlob = new Blob([fileBuffer], { type: 'image/png' });
    formData.append('receipt', fileBlob, 'dummy_receipt.png');

    const bookingRes = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${userToken}` },
      body: formData
    });
    const bookingData = await bookingRes.json();
    if (bookingRes.status === 201) {
      console.log('✅ Booking Created Successfully!');
      console.log('   Receipt URL:', bookingData.appointment.receipt);
      bookingId = bookingData.appointment._id;
    } else {
      console.error('❌ Booking Creation Failed:', bookingData);
      throw new Error('Booking creation failed');
    }

    // 5. GET BOOKED TIMES TEST
    console.log('\n--- 5. Get Booked Slots ---');
    const bookedSlotsRes = await fetch(`${BASE_URL}/appointments/booked?date=06.06.2026`);
    const bookedSlotsData = await bookedSlotsRes.json();
    if (bookedSlotsRes.status === 200) {
      console.log('✅ Booked Slots Retrieved:', bookedSlotsData);
    } else {
      console.error('❌ Booked Slots Retrieval Failed:', bookedSlotsData);
      throw new Error('Booked slots failed');
    }

    // 6. ADMIN USER LIST TEST
    console.log('\n--- 6. Admin User List ---');
    const adminUsersRes = await fetch(`${BASE_URL}/admin/users`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const adminUsersData = await adminUsersRes.json();
    if (adminUsersRes.status === 200) {
      console.log('✅ Admin Users List Retrieved. Total normal users:', adminUsersData.length);
    } else {
      console.error('❌ Admin Users List Failed:', adminUsersData);
      throw new Error('Admin users list failed');
    }

    // 7. ADMIN BOOKING LIST TEST
    console.log('\n--- 7. Admin Bookings List ---');
    const adminBookingsRes = await fetch(`${BASE_URL}/admin/bookings`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const adminBookingsData = await adminBookingsRes.json();
    if (adminBookingsRes.status === 200) {
      console.log('✅ Admin Bookings List Retrieved. Total bookings:', adminBookingsData.length);
    } else {
      console.error('❌ Admin Bookings List Failed:', adminBookingsData);
      throw new Error('Admin bookings list failed');
    }

    // 8. ADMIN BOOKING CONFIRM TEST
    console.log('\n--- 8. Admin Confirm Booking ---');
    const confirmRes = await fetch(`${BASE_URL}/admin/bookings/${bookingId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'confirmed' })
    });
    const confirmData = await confirmRes.json();
    if (confirmRes.status === 200) {
      console.log('✅ Booking Confirmed Successfully! New Status:', confirmData.booking.status);
    } else {
      console.error('❌ Booking Confirmation Failed:', confirmData);
      throw new Error('Booking confirmation failed');
    }

    // 9. ADMIN STATISTICS TEST
    console.log('\n--- 9. Fetch Financial Statistics ---');
    const statsRes = await fetch(`${BASE_URL}/admin/statistics`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const statsData = await statsRes.json();
    if (statsRes.status === 200) {
      console.log('✅ Statistics Retrieved Successfully!');
      console.log('   Revenues:', statsData.revenues);
      console.log('   Counters:', statsData.counts);
      console.log('   Popular Services:', statsData.popularServices);
      console.log('   Chart Data (Last 7 Days):', statsData.chartData);
    } else {
      console.error('❌ Statistics Fetch Failed:', statsData);
      throw new Error('Statistics fetch failed');
    }

    // 10. USER BLOCK TEST
    console.log('\n--- 10. Admin Block User ---');
    const blockRes = await fetch(`${BASE_URL}/admin/users/${userId}/block`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ isBlocked: true })
    });
    const blockData = await blockRes.json();
    if (blockRes.status === 200) {
      console.log('✅ User Blocked Successfully! Status:', blockData.user.status);
    } else {
      console.error('❌ User Block failed:', blockData);
      throw new Error('User block failed');
    }

    // 11. VERIFY BLOCK STATUS FORBIDDEN ACCESS TEST
    console.log('\n--- 11. Verify Blocked User Access Forbidden ---');
    const blockedProfileRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    const blockedProfileData = await blockedProfileRes.json();
    if (blockedProfileRes.status === 403) {
      console.log('✅ Blocked user successfully denied access with 403! Message:', blockedProfileData.error);
    } else {
      console.error('❌ Blocked user was NOT blocked (Status code is not 403):', blockedProfileRes.status, blockedProfileData);
      throw new Error('Blocked user bypass check failed');
    }

    // 12. CLEAN UP - DELETE USER
    console.log('\n--- 12. Admin Clean Up (Delete Test User) ---');
    const deleteRes = await fetch(`${BASE_URL}/admin/users/${userId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const deleteData = await deleteRes.json();
    if (deleteRes.status === 200) {
      console.log('✅ Test User Deleted Successfully!');
    } else {
      console.error('❌ Test User Deletion Failed:', deleteData);
      throw new Error('User deletion failed');
    }

    console.log('\n⭐ ALL API TESTS PASSED SUCCESSFULLY! ⭐');

  } catch (err) {
    console.error('\n❌ TEST SUITE RUN ENCOUNTERED AN ERROR:', err.message);
  } finally {
    // clean up local files
    if (fs.existsSync(dummyFilePath)) {
      fs.unlinkSync(dummyFilePath);
    }
  }
}

// Introduce delay to wait for server to start up
setTimeout(() => {
  runTests();
}, 2000);
