const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Listing = require('../models/Listing');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Max 10 files
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// @route   GET api/listings
// @desc    Get all listings
router.get('/', async (req, res) => {
  try {
    let query = {};
    
    // If host parameter is provided, filter by host
    if (req.query.host) {
      query.host = req.query.host;
    }
    
    const listings = await Listing.find(query).populate('host', 'name');
    res.json(listings);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/listings/:id
// @desc    Get listing by ID
router.get('/:id', async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).populate('host', 'name email');
    
    if (!listing) {
      return res.status(404).json({ msg: 'Listing not found' });
    }
    
    res.json(listing);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Listing not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   POST api/listings
// @desc    Create a listing
router.post('/', [auth, upload.fields([{ name: 'images', maxCount: 10 }])], async (req, res) => {
  try {
    console.log('=== CREATE LISTING DEBUG ===');
    console.log('User ID:', req.user.id);
    console.log('Request body:', req.body);
    console.log('Request body keys:', Object.keys(req.body));
    console.log('Files uploaded:', req.files ? req.files.length : 0);
    
    const { 
      hotelName, 
      description, 
      address, 
      city, 
      country, 
      starRating, 
      amenities 
    } = req.body;
    
    // Validate required fields with extra logging
    if (!hotelName) { console.log('Missing hotelName'); return res.status(400).json({ msg: 'Hotel name is required' }); }
    if (!description) { console.log('Missing description'); return res.status(400).json({ msg: 'Description is required' }); }
    if (!address) { console.log('Missing address'); return res.status(400).json({ msg: 'Address is required' }); }
    if (!city) { console.log('Missing city'); return res.status(400).json({ msg: 'City is required' }); }
    if (!country) { console.log('Missing country'); return res.status(400).json({ msg: 'Country is required' }); }
    
    let images = [];
    if (req.files && req.files['images']) {
      images = req.files['images'].map(file => file.path);
    }
    console.log('Images paths:', images);
    
    // --- Robustly parse roomTypes ---
    let roomTypes = [];
    if (req.body.roomTypes) {
      // If sent as JSON string
      try {
        const parsed = typeof req.body.roomTypes === 'string' ? JSON.parse(req.body.roomTypes) : req.body.roomTypes;
        if (Array.isArray(parsed)) {
          roomTypes = parsed.map(rt => ({
            type: rt.type,
            price: parseFloat(rt.price) || 0,
            currency: rt.currency || 'USD',
            capacity: parseInt(rt.capacity) || 1,
            available: parseInt(rt.available) || 0,
            description: rt.description || ''
          }));
        }
      } catch (e) { /* ignore */ }
    }
    // Fallback: bracket notation (FormData fields)
    if (roomTypes.length === 0) {
      let index = 0;
      while (req.body[`roomTypes[${index}][type]`]) {
        const roomType = {
          type: req.body[`roomTypes[${index}][type]`],
          price: parseFloat(req.body[`roomTypes[${index}][price]`]) || 0,
          currency: req.body[`roomTypes[${index}][currency]`] || 'USD',
          capacity: parseInt(req.body[`roomTypes[${index}][capacity]`]) || 1,
          available: parseInt(req.body[`roomTypes[${index}][available]`]) || 0,
          description: req.body[`roomTypes[${index}][description]`] || ''
        };
        roomTypes.push(roomType);
        index++;
      }
    }
    console.log('Parsed room types:', roomTypes);
    
    // Validate images
    if (!images || !images.length) {
      console.log('No images uploaded');
      return res.status(400).json({ msg: 'At least one image is required.' });
    }
    // Validate room types
    if (!roomTypes || !roomTypes.length) {
      console.log('No room types provided');
      return res.status(400).json({ msg: 'At least one room type is required.' });
    }
    
    // --- Robustly parse contactInfo ---
    let contactInfo = {};
    if (req.body.contactInfo) {
      try {
        contactInfo = typeof req.body.contactInfo === 'string' ? JSON.parse(req.body.contactInfo) : req.body.contactInfo;
      } catch (e) { /* ignore */ }
    }
    // Fallback: bracket notation
    if (!contactInfo.phone || !contactInfo.email) {
      Object.keys(req.body).forEach(key => {
        let match = key.match(/^contactInfo\[(.*)\]$/);
        if (match && match[1]) {
          contactInfo[match[1]] = req.body[key];
        } else if (key.startsWith('contactInfo.')) {
          contactInfo[key.split('.')[1]] = req.body[key];
        }
      });
    }
    // Fallback: direct fields
    if (!contactInfo.phone && req.body.phone) contactInfo.phone = req.body.phone;
    if (!contactInfo.email && req.body.email) contactInfo.email = req.body.email;
    if (!contactInfo.website && req.body.website) contactInfo.website = req.body.website;
    console.log('Contact info parsed:', contactInfo);
    console.log('Raw req.body:', req.body);
    // Trim whitespace from contactInfo fields before validation
    if (contactInfo.phone) contactInfo.phone = contactInfo.phone.trim();
    if (contactInfo.email) contactInfo.email = contactInfo.email.trim();
    // Validate contact info fields
    if (!contactInfo.phone) { console.log('Missing contactInfo.phone'); return res.status(400).json({ msg: 'Phone is required in contact information.' }); }
    if (!contactInfo.email) { console.log('Missing contactInfo.email'); return res.status(400).json({ msg: 'Email is required in contact information.' }); }
    
    console.log('Contact info:', contactInfo);
    
    // --- Robustly parse policies ---
    let policies = {};
    if (req.body.policies) {
      try {
        policies = typeof req.body.policies === 'string' ? JSON.parse(req.body.policies) : req.body.policies;
      } catch (e) { /* ignore */ }
    }
    // Fallback: bracket notation
    if (!policies.checkIn || !policies.checkOut) {
      policies = {
        checkIn: req.body['policies[checkIn]'] || '15:00',
        checkOut: req.body['policies[checkOut]'] || '11:00',
        cancellation: req.body['policies[cancellation]'] || 'Standard cancellation policy',
        petPolicy: req.body['policies[petPolicy]'] || 'No pets allowed',
        smokingPolicy: req.body['policies[smokingPolicy]'] || 'No smoking'
      };
    }
    console.log('Policies:', policies);
    
    const newListing = new Listing({
      hotelName,
      description,
      address,
      city,
      country,
      starRating: parseInt(starRating) || 3,
      roomTypes,
      amenities: amenities ? amenities.split(',').map(item => item.trim()) : [],
      images,
      contactInfo,
      policies,
      host: req.user.id
    });

    console.log('New listing object:', newListing);
    
    const listing = await newListing.save();
    console.log('Listing saved successfully:', listing._id);
    
    res.json(listing);
  } catch (err) {
    console.error('=== CREATE LISTING ERROR ===');
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    
    if (err.name === 'ValidationError') {
      console.error('Full validation error:', err);
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ msg: `Validation error: ${errors.join(', ')}` });
    }
    
    res.status(500).json({ msg: 'Server error while creating hotel' });
  }
});

// @route   PUT api/listings/:id
// @desc    Update a listing
router.put('/:id', [auth, upload.array('images', 10)], async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ msg: 'Listing not found' });
    }

    // Check user
    if (listing.host.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // Prepare update data
    const updateData = { ...req.body };
    
    // Handle amenities array
    if (req.body.amenities) {
      updateData.amenities = req.body.amenities.split(',').map(item => item.trim());
    }
    
    // Parse room types from form data
    if (req.body['roomTypes[0][type]']) {
      const roomTypes = [];
      let index = 0;
      while (req.body[`roomTypes[${index}][type]`]) {
        roomTypes.push({
          type: req.body[`roomTypes[${index}][type]`],
          price: parseFloat(req.body[`roomTypes[${index}][price]`]),
          currency: req.body[`roomTypes[${index}][currency]`] || 'USD',
          capacity: parseInt(req.body[`roomTypes[${index}][capacity]`]),
          available: parseInt(req.body[`roomTypes[${index}][available]`]),
          description: req.body[`roomTypes[${index}][description]`] || ''
        });
        index++;
      }
      updateData.roomTypes = roomTypes;
    }
    
    // Parse contact info
    if (req.body['contactInfo[phone]']) {
      updateData.contactInfo = {
        phone: req.body['contactInfo[phone]'] || '',
        email: req.body['contactInfo[email]'] || '',
        website: req.body['contactInfo[website]'] || ''
      };
    }
    
    // Parse policies
    if (req.body['policies[checkIn]']) {
      updateData.policies = {
        checkIn: req.body['policies[checkIn]'] || '15:00',
        checkOut: req.body['policies[checkOut]'] || '11:00',
        cancellation: req.body['policies[cancellation]'] || 'Standard cancellation policy',
        petPolicy: req.body['policies[petPolicy]'] || 'No pets allowed',
        smokingPolicy: req.body['policies[smokingPolicy]'] || 'No smoking'
      };
    }
    
    // Handle new images if uploaded
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => file.path);
      updateData.images = newImages;
    }

    const updatedListing = await Listing.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );

    res.json(updatedListing);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/listings/:id
// @desc    Delete a listing
router.delete('/:id', auth, async (req, res) => {
  try {
    console.log('Delete request for listing:', req.params.id, 'by user:', req.user.id);
    
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      console.log('Listing not found:', req.params.id);
      return res.status(404).json({ msg: 'Hotel not found' });
    }

    // Check user authorization
    if (listing.host.toString() !== req.user.id) {
      console.log('Authorization failed. Listing host:', listing.host.toString(), 'User:', req.user.id);
      return res.status(401).json({ msg: 'Not authorized to delete this hotel' });
    }

    // Find all bookings for this hotel
    const Booking = require('../models/Booking');
    const existingBookings = await Booking.find({ listing: req.params.id });
    
    console.log(`Found ${existingBookings.length} bookings for hotel ${listing.hotelName}`);

    // Update all bookings to cancelled status with reason
    if (existingBookings.length > 0) {
      const updatePromises = existingBookings.map(booking => 
        Booking.findByIdAndUpdate(booking._id, {
          status: 'cancelled',
          specialRequests: booking.specialRequests + '\n\n[SYSTEM MESSAGE] This booking was automatically cancelled because the hotel has been removed by the host.',
          updatedAt: new Date()
        })
      );
      
      await Promise.all(updatePromises);
      console.log(`Cancelled ${existingBookings.length} bookings for hotel ${listing.hotelName}`);
    }

    // Delete the hotel
    const result = await Listing.deleteOne({ _id: req.params.id });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ msg: 'Hotel not found' });
    }

    console.log('Hotel deleted successfully:', req.params.id);
    res.json({ 
      msg: 'Hotel deleted successfully',
      cancelledBookings: existingBookings.length,
      hotelName: listing.hotelName
    });
  } catch (err) {
    console.error('Error deleting hotel:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Hotel not found' });
    }
    res.status(500).json({ msg: 'Server error while deleting hotel' });
  }
});

module.exports = router;