const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Booking = require('../models/Booking');
const Listing = require('../models/Listing');

// @route   PUT api/bookings/:id/status
// @desc    Update booking status (for hosts)
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    console.log('=== STATUS UPDATE DEBUG ===');
    console.log('Status update request:', { bookingId: req.params.id, status, userId: req.user.id });
    
    console.log('Finding booking...');
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      console.log('Booking not found:', req.params.id);
      return res.status(404).json({ msg: 'Booking not found' });
    }
    
    console.log('Booking found:', {
      id: booking._id,
      listing: booking.listing,
      user: booking.user,
      status: booking.status
    });
    
    console.log('Finding listing...');
    // Get the listing to check if the user is the host
    const listing = await Listing.findById(booking.listing);
    if (!listing) {
      console.log('Listing not found:', booking.listing);
      return res.status(404).json({ msg: 'Listing not found' });
    }
    
    console.log('Listing found:', {
      id: listing._id,
      title: listing.title,
      host: listing.host,
      hostType: typeof listing.host
    });
    
    // Check if the user is the host of this listing
    const listingHostId = listing.host.toString();
    const userId = req.user.id;
    const isAuthorized = listingHostId === userId;
    
    console.log('Authorization check:', { 
      listingHostId, 
      userId, 
      isAuthorized,
      listingHost: listing.host
    });
    
    if (!isAuthorized) {
      console.log('Authorization failed');
      return res.status(401).json({ msg: 'Not authorized to update this booking' });
    }
    
    console.log('Authorization successful, updating booking status...');
    // Update the booking status
    booking.status = status;
    await booking.save();
    
    console.log('Booking status updated successfully:', booking.status);
    res.json(booking);
  } catch (err) {
    console.error('=== STATUS UPDATE ERROR ===');
    console.error('Error updating booking status:', err.message);
    console.error('Error stack:', err.stack);
    res.status(500).send('Server error');
  }
});

// @route   POST api/bookings
// @desc    Create a booking
router.post('/', auth, async (req, res) => {
  try {
    const { listingId, roomType, checkIn, checkOut, guests, specialRequests } = req.body;
    
    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ msg: 'Hotel not found' });
    }
    
    // Find the selected room type
    const selectedRoomType = listing.roomTypes.find(room => room.type === roomType);
    if (!selectedRoomType) {
      return res.status(400).json({ msg: 'Room type not found' });
    }
    
    // Check availability
    if (selectedRoomType.available <= 0) {
      return res.status(400).json({ msg: 'No rooms available for this type' });
    }
    
    // Calculate total price
    const nights = Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
    const totalPrice = nights * selectedRoomType.price;
    
    const newBooking = new Booking({
      listing: listingId,
      user: req.user.id,
      roomType,
      checkIn,
      checkOut,
      guests,
      totalPrice,
      specialRequests: specialRequests || ''
    });

    const booking = await newBooking.save();
    
    // Update room availability
    selectedRoomType.available -= 1;
    await listing.save();
    
    res.json(booking);
  } catch (err) {
    console.error('Error creating booking:', err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/bookings
// @desc    Get user's bookings
router.get('/', auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id })
      .populate('listing', 'title images price')
      .populate('user', 'name email');
      
    res.json(bookings);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/bookings/listing/:id
// @desc    Get bookings for a specific listing (for hosts)
router.get('/listing/:id', auth, async (req, res) => {
  try {
    console.log('=== GET BOOKINGS BY LISTING DEBUG ===');
    console.log('Listing ID:', req.params.id);
    console.log('User ID:', req.user.id);
    
    // First, check if the user is the host of this listing
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      console.log('Listing not found:', req.params.id);
      return res.status(404).json({ msg: 'Listing not found' });
    }
    
    console.log('Listing found:', {
      id: listing._id,
      title: listing.title,
      host: listing.host,
      hostType: typeof listing.host
    });
    
    // Check if the user is the host of this listing
    const listingHostId = listing.host.toString();
    const userId = req.user.id;
    const isAuthorized = listingHostId === userId;
    
    console.log('Authorization check:', {
      listingHostId,
      userId,
      isAuthorized
    });
    
    if (!isAuthorized) {
      console.log('Authorization failed');
      return res.status(401).json({ msg: 'Not authorized to view bookings for this listing' });
    }
    
    const bookings = await Booking.find({ listing: req.params.id })
      .populate('user', 'name email');
    
    console.log('Bookings found:', bookings.length);
    console.log('Bookings data:', bookings);
    
    res.json(bookings);
  } catch (err) {
    console.error('Error fetching bookings for listing:', err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;