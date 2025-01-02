const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');

// Body-parser setup (you can use Express's built-in method or body-parser)
app.use(express.urlencoded({ extended: true })); // Express built-in for parsing form data
app.use(express.json()); // To parse JSON data if you plan to handle JSON requests

// Enable CORS for all origins (you can restrict this if needed)
app.use(cors());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.log('MongoDB connection error:', err));

// Define User Schema
const { Schema } = mongoose;
const userSchema = new Schema({
  username: {
    type: String,
    required: true, // Fixed 'require' to 'required'
  },
});

// Create User Model
const myUser = mongoose.model('User', userSchema);

// Define Exercise Schema
const exerciseSchema = new Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now },
});

// Create Exercise Model
const Exercise = mongoose.model('Exercise', exerciseSchema);

// POST route to create a new user
app.post('/api/users', (req, res) => {
  const username = req.body.username; // Getting 'username' from form data

  // Create a new user
  const newUser = new myUser({ username });

  // Save the user to the database
  newUser.save()
    .then((savedUser) => {
      // Return the saved user object
      res.json(savedUser);
    })
    .catch((error) => {
      // Handle any errors during the save process
      res.status(500).json({ error: 'Failed to create user' });
    });
});

// GET route to fetch all users
app.get('/api/users', (req, res) => {
  myUser.find().then(users => {
    res.json(users);
  });
});

// POST route to add an exercise to a user
app.post('/api/users/:_id/exercises', (req, res) => {
  const { description, duration, date } = req.body;

  // Validate required fields
  if (!description || !duration) {
    return res.status(400).json({ error: 'Description and duration are required.' });
  }

  myUser.findById(req.params._id)
    .then(user => {
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }

      // Use provided date or default to the current date
      const exerciseDate = date ? new Date(date) : new Date();

      // Create the exercise
      const newExercise = new Exercise({
        userId: user._id,
        description,
        duration: parseInt(duration, 10), // Ensure duration is a number
        date: exerciseDate,
      });

      // Save the exercise to the database
      newExercise.save()
        .then(savedExercise => {
          // Return the user and exercise details
          res.json({
            _id: user._id,
            username: user.username,
            description: savedExercise.description,
            duration: savedExercise.duration,
            date: savedExercise.date.toISOString().split('T')[0], // Format as 'YYYY-MM-DD'
          });
        })
        .catch(err => {
          res.status(500).json({ error: 'Failed to save exercise' });
        });
    })
    .catch(err => {
      res.status(500).json({ error: 'An error occurred while adding the exercise.' });
    });
});

// GET route to fetch exercises for a user with optional from, to, and limit parameters
app.get('/api/users/:_id/logs', (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query; // Extract query params: from, to, and limit

  // Initialize the query object for exercises
  let query = { userId: _id };

  // Validate and apply the 'from' date filter (yyyy-mm-dd format)
  if (from) {
    const fromDate = new Date(from); // Convert 'from' query to a Date object
    if (isNaN(fromDate.getTime())) { // Check if it's a valid date
      return res.status(400).json({ error: 'Invalid "from" date format. Please use yyyy-mm-dd.' });
    }
    query.date = { $gte: fromDate }; // Filter exercises that are on or after 'from' date
  }

  // Validate and apply the 'to' date filter (yyyy-mm-dd format)
  if (to) {
    const toDate = new Date(to); // Convert 'to' query to a Date object
    if (isNaN(toDate.getTime())) { // Check if it's a valid date
      return res.status(400).json({ error: 'Invalid "to" date format. Please use yyyy-mm-dd.' });
    }
    query.date = { ...query.date, $lte: toDate }; // Filter exercises that are on or before 'to' date
  }

  // Handle 'limit' query parameter to restrict the number of exercises returned
  const limitValue = limit ? parseInt(limit, 10) : 0; // Default to 0 (no limit) if not provided

  // Fetch the exercises with the applied query filters and limit
  Exercise.find(query)
    .limit(limitValue)
    .then(exercises => {
      // Format the date of each exercise in 'YYYY-MM-DD' format
      const formattedExercises = exercises.map(ex => ({
        description: ex.description,
        duration: ex.duration,
        date: ex.date.toDateString() // Format as 'YYYY-MM-DD'
      }));

      res.json({
        _id: _id,
        log: formattedExercises,
        count: formattedExercises.length, // Number of exercises returned
      });
    })
    .catch(err => {
      console.error('Error fetching exercises:', err);
      res.status(500).json({ error: 'Failed to fetch exercises.' });
    });
});

// Serve static files (e.g., for the HTML form)
app.use(express.static('public'));

// Serve the index.html file
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// Start the server
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
