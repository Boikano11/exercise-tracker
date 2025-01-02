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

app.get('/api/users', (req, res)=>{
  myUser.find().then(users=>{
    res.json(users)
  })
})
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
