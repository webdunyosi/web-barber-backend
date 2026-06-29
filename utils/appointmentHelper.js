const Appointment = require('../models/Appointment');

const parseAppointmentDateTime = (dateStr, timeStr) => {
  // dateStr: "DD.MM.YYYY"
  // timeStr: "HH:MM"
  if (!dateStr || !timeStr) return new Date(0);
  const [day, month, year] = dateStr.split('.').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute);
};

const autoRejectPastAppointments = async () => {
  try {
    const now = new Date();
    // Find all 'pending' appointments
    const pendingAppointments = await Appointment.find({ status: 'pending' });
    
    let updatedCount = 0;
    for (const app of pendingAppointments) {
      const appDateTime = parseAppointmentDateTime(app.date, app.time);
      if (appDateTime < now) {
        app.status = 'rejected';
        await app.save();
        updatedCount++;
        console.log(`[Auto-Reject] Past pending appointment rejected: ID ${app._id}, Mijoz: ${app.name} (${app.date} ${app.time})`);
      }
    }
    
    if (updatedCount > 0) {
      console.log(`[Auto-Reject] Total of ${updatedCount} past pending appointments auto-rejected.`);
    }
  } catch (error) {
    console.error('[Auto-Reject] Error updating past appointments:', error);
  }
};

module.exports = {
  autoRejectPastAppointments,
  parseAppointmentDateTime
};
