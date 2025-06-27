require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Listing = require('./models/Listing');

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected for seeding'))
  .catch(err => console.log(err));

const seedData = async () => {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Listing.deleteMany({});

    // Create sample users
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const user1 = new User({
      name: 'John Doe',
      email: 'john@example.com',
      password: hashedPassword,
      isHost: true
    });
    
    const user2 = new User({
      name: 'Jane Smith',
      email: 'jane@example.com',
      password: hashedPassword,
      isHost: false
    });

    await user1.save();
    await user2.save();

    // Create sample hotels
    const hotel1 = new Listing({
      hotelName: 'Grand Plaza Hotel',
      description: 'Luxury 5-star hotel in the heart of downtown with stunning city views and world-class amenities.',
      address: '123 Main Street',
      city: 'New York',
      country: 'USA',
      starRating: 5,
      roomTypes: [
        {
          type: 'Standard',
          price: 150,
          capacity: 2,
          available: 10,
          description: 'Comfortable room with city view'
        },
        {
          type: 'Deluxe',
          price: 250,
          capacity: 3,
          available: 5,
          description: 'Spacious room with premium amenities'
        },
        {
          type: 'Suite',
          price: 450,
          capacity: 4,
          available: 3,
          description: 'Luxury suite with separate living area'
        }
      ],
      amenities: ['WiFi', 'Pool', 'Gym', 'Restaurant', 'Spa', 'Room Service'],
      images: ['uploads/hotel1-1.jpg', 'uploads/hotel1-2.jpg'],
      contactInfo: {
        phone: '+1-555-0123',
        email: 'info@grandplaza.com',
        website: 'www.grandplaza.com'
      },
      policies: {
        checkIn: '15:00',
        checkOut: '11:00',
        cancellation: 'Free cancellation up to 24 hours before check-in',
        petPolicy: 'Pets allowed with additional fee',
        smokingPolicy: 'Designated smoking areas only'
      },
      host: user1._id
    });

    const hotel2 = new Listing({
      hotelName: 'Seaside Resort & Spa',
      description: 'Beautiful beachfront resort offering relaxation and adventure with direct access to pristine beaches.',
      address: '456 Ocean Drive',
      city: 'Miami',
      country: 'USA',
      starRating: 4,
      roomTypes: [
        {
          type: 'Standard',
          price: 120,
          capacity: 2,
          available: 15,
          description: 'Ocean view room with balcony'
        },
        {
          type: 'Family',
          price: 180,
          capacity: 5,
          available: 8,
          description: 'Large family room with connecting bathrooms'
        },
        {
          type: 'Presidential',
          price: 800,
          capacity: 6,
          available: 1,
          description: 'Ultimate luxury with private pool and butler service'
        }
      ],
      amenities: ['WiFi', 'Beach Access', 'Pool', 'Spa', 'Restaurant', 'Water Sports'],
      images: ['uploads/hotel2-1.jpg', 'uploads/hotel2-2.jpg'],
      contactInfo: {
        phone: '+1-555-0456',
        email: 'reservations@seaside.com',
        website: 'www.seasideresort.com'
      },
      policies: {
        checkIn: '16:00',
        checkOut: '10:00',
        cancellation: 'Free cancellation up to 48 hours before check-in',
        petPolicy: 'No pets allowed',
        smokingPolicy: 'No smoking in rooms, designated areas only'
      },
      host: user1._id
    });

    const hotel3 = new Listing({
      hotelName: 'Mountain View Lodge',
      description: 'Cozy mountain lodge perfect for nature lovers and adventure seekers with hiking trails nearby.',
      address: '789 Mountain Road',
      city: 'Denver',
      country: 'USA',
      starRating: 3,
      roomTypes: [
        {
          type: 'Standard',
          price: 80,
          capacity: 2,
          available: 12,
          description: 'Rustic room with mountain views'
        },
        {
          type: 'Business',
          price: 120,
          capacity: 2,
          available: 6,
          description: 'Business room with work desk and high-speed internet'
        }
      ],
      amenities: ['WiFi', 'Hiking Trails', 'Restaurant', 'Fireplace', 'Parking'],
      images: ['uploads/hotel3-1.jpg', 'uploads/hotel3-2.jpg'],
      contactInfo: {
        phone: '+1-555-0789',
        email: 'info@mountainview.com',
        website: 'www.mountainviewlodge.com'
      },
      policies: {
        checkIn: '14:00',
        checkOut: '12:00',
        cancellation: 'Free cancellation up to 72 hours before check-in',
        petPolicy: 'Pets welcome with no additional fee',
        smokingPolicy: 'No smoking in rooms'
      },
      host: user1._id
    });

    await hotel1.save();
    await hotel2.save();
    await hotel3.save();

    console.log('Seed data created successfully!');
    console.log('Sample users:');
    console.log('- john@example.com (password: password123) - Host');
    console.log('- jane@example.com (password: password123) - Guest');
    console.log('Sample hotels created with room types and amenities');

  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    mongoose.connection.close();
  }
};

seedData();