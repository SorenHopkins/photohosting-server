const mongoose = require('mongoose')

const imageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
  s3Key: {
    type: String,
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  favorite: Boolean,
  tag: String
}, {
  timestamps: true
})

module.exports = mongoose.model('Image', imageSchema)
