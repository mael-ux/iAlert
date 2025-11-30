// backend/src/routes/photos.js
// NASA Photos endpoints - random photo and gallery
const express = require('express');
const router = express.Router();
const pool = require('../dataBase/db'); // Your database connection

// GET /api/photos/random - Get random photo for homepage
router.get('/random', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM photos ORDER BY RANDOM() LIMIT 1'
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No photos available' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching random photo:', error);
    res.status(500).json({ error: 'Failed to fetch photo' });
  }
});

// GET /api/photos - Get all photos for gallery
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM photos ORDER BY date DESC'
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching photos:', error);
    res.status(500).json({ error: 'Failed to fetch photos' });
  }
});

// GET /api/photos/:id - Get specific photo by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM photos WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching photo:', error);
    res.status(500).json({ error: 'Failed to fetch photo' });
  }
});

module.exports = router;