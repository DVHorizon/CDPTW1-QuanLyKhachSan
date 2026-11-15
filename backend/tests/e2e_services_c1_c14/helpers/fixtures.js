'use strict';

/**
 * fixtures.js - Test Data Fixtures for Grand Horizon E2E Testing Track
 */

const { request } = require('./apiClient');
const { getAuthContext } = require('./authHelper');

async function getActiveStayFixture() {
  const staysRes = await request('/service-orders/active-stays');
  if (staysRes.status === 200 && Array.isArray(staysRes.data?.data) && staysRes.data.data.length > 0) {
    const stay = staysRes.data.data[0];
    return {
      stayId: stay.StayId || stay.stayId,
      bookingId: stay.BookingId || stay.bookingId,
      roomNumber: stay.Room?.RoomNumber || '101',
      status: stay.Status || 'CheckedIn',
    };
  }
  return { stayId: 1, bookingId: 1, roomNumber: '101', status: 'CheckedIn' };
}

async function getActiveServiceFixture() {
  const sRes = await request('/services?status=Active');
  if (sRes.status === 200 && Array.isArray(sRes.data?.data) && sRes.data.data.length > 0) {
    const svc = sRes.data.data[0];
    return {
      serviceId: svc.ServiceId || svc.serviceId || svc.id,
      serviceName: svc.ServiceName || svc.serviceName || svc.name,
      price: Number(svc.Price || svc.price || 100000),
    };
  }
  return { serviceId: 1, serviceName: 'Dịch vụ Mẫu', price: 100000 };
}

async function getActiveCategoryFixture() {
  const catRes = await request('/services/categories');
  if (catRes.status === 200 && Array.isArray(catRes.data?.data) && catRes.data.data.length > 0) {
    const cat = catRes.data.data[0];
    return {
      categoryId: cat.CategoryId || cat.categoryId || cat.id,
      categoryName: cat.CategoryName || cat.categoryName || cat.name,
    };
  }
  return { categoryId: 1, categoryName: 'Spa & Chăm Sóc Sức Khỏe' };
}

async function getPayableBookingFixture() {
  try {
    const { Booking, Payment } = require('../../../src/models');
    const { Op } = require('sequelize');
    const bookings = await Booking.findAll({
      where: { Status: { [Op.in]: ['Pending', 'Confirmed'] } },
      limit: 10,
    });
    for (const b of bookings) {
      const payments = await Payment.findAll({
        where: { BookingId: b.BookingId, Status: { [Op.in]: ['Paid', 'Success', 'Completed'] } },
      });
      const totalPaid = payments.reduce((sum, p) => sum + Number(p.Amount || 0), 0);
      const remaining = Number(b.TotalAmount || 0) - totalPaid;
      if (remaining > 500000) {
        return { bookingId: b.BookingId, remainingBalance: remaining };
      }
    }
  } catch (err) {
    // fallback
  }
  return { bookingId: 2, remainingBalance: 5000000 };
}

module.exports = {
  getActiveStayFixture,
  getActiveServiceFixture,
  getActiveCategoryFixture,
  getPayableBookingFixture,
};
