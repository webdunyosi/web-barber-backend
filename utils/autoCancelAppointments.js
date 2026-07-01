const cron = require('node-cron');
const Appointment = require('../models/Appointment');

/**
 * O'tib ketgan buyurtmalarni avtomatik bekor qilish.
 * Har 5 daqiqada ishlaydi.
 * "pending" yoki "confirmed" holatidagi, vaqti o'tib ketgan buyurtmalar
 * "rejected" holatiga o'tkaziladi.
 */
function startAutoCancelJob() {
  // Har 5 daqiqada ishga tushadi
  cron.schedule('*/5 * * * *', async () => {
    try {
      const now = new Date();

      // Barcha pending / confirmed buyurtmalarni olish
      const appointments = await Appointment.find({
        status: { $in: ['pending', 'confirmed'] }
      });

      const expiredIds = [];

      for (const appt of appointments) {
        // date: "DD.MM.YYYY", time: "HH:MM"
        const [day, month, year] = appt.date.split('.');
        const [hours, minutes] = appt.time.split(':');

        // Buyurtma vaqtini Date obyektiga aylantirish
        const apptDate = new Date(
          Number(year),
          Number(month) - 1,
          Number(day),
          Number(hours),
          Number(minutes)
        );

        if (apptDate < now) {
          expiredIds.push(appt._id);
        }
      }

      if (expiredIds.length > 0) {
        await Appointment.updateMany(
          { _id: { $in: expiredIds } },
          { $set: { status: 'rejected' } }
        );
        console.log(`🔴 Auto-cancel: ${expiredIds.length} ta o'tib ketgan buyurtma bekor qilindi.`);
      }
    } catch (err) {
      console.error('❌ Auto-cancel cron xatosi:', err.message);
    }
  });

  console.log('⏰ Auto-cancel cron job ishga tushdi (har 5 daqiqada tekshiriladi).');
}

module.exports = { startAutoCancelJob };
