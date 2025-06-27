const mongoose = require('mongoose');

const RoomTypeSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['Standard', 'Deluxe', 'Suite', 'Executive', 'Presidential', 'Family', 'Business']
  },
  price: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true,
    enum: ['USD', 'INR'],
    default: 'USD'
  },
  capacity: {
    type: Number,
    required: true
  },
  available: {
    type: Number,
    required: true,
    default: 0
  },
  description: {
    type: String,
    default: ''
  }
});

const ContactInfoSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  website: {
    type: String,
    default: ''
  }
});

const PoliciesSchema = new mongoose.Schema({
  checkIn: {
    type: String,
    default: '15:00'
  },
  checkOut: {
    type: String,
    default: '11:00'
  },
  cancellation: {
    type: String,
    default: 'Standard cancellation policy'
  },
  petPolicy: {
    type: String,
    default: 'No pets allowed'
  },
  smokingPolicy: {
    type: String,
    default: 'No smoking'
  }
});

const ListingSchema = new mongoose.Schema({
  hotelName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  country: {
    type: String,
    required: true
  },
  starRating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  roomTypes: [RoomTypeSchema],
  amenities: [{
    type: String
  }],
  images: [{
    type: String
  }],
  contactInfo: ContactInfoSchema,
  policies: PoliciesSchema,
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Listing', ListingSchema);