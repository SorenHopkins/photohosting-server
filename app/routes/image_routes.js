// Express docs: http://expressjs.com/en/api.html
const express = require('express')
// Passport docs: http://www.passportjs.org/docs/
const passport = require('passport')

const multer = require('multer')
const upload = multer({ storage: multer.memoryStorage() })

const fileUploadApi = require('../../lib/fileUploadAPI')

const fileDeleteApi = require('../../lib/fileDeleteAPI')

// pull in Mongoose model for images
const Image = require('../models/image')

// this is a collection of methods that help us detect situations when we need
// to throw a custom error
const customErrors = require('../../lib/custom_errors')

// we'll use this function to send 404 when non-existant document is requested
const handle404 = customErrors.handle404
// we'll use this function to send 401 when a user tries to modify a resource
// that's owned by someone else
const requireOwnership = customErrors.requireOwnership

// this is middleware that will remove blank fields from `req.body`, e.g.
// { image: { title: '', text: 'foo' } } -> { image: { text: 'foo' } }
const removeBlanks = require('../../lib/remove_blank_fields')
// passing this as a second argument to `router.<verb>` will make it
// so that a token MUST be passed for that route to be available
// it will also set `req.user`
const requireToken = passport.authenticate('bearer', { session: false })

// instantiate a router (mini app that only handles routes)
const router = express.Router()

// INDEX
// GET /images
router.get('/images', requireToken, (req, res, next) => {
  Image.find({owner: req.user._id})
    .then(images => {
      // `images` will be an array of Mongoose documents
      // we want to convert each one to a POJO, so we use `.map` to
      // apply `.toObject` to each one
      return images.map(image => image.toObject())
    })
    // respond with status 200 and JSON of the images
    .then(images => res.status(200).json({ images: images }))
    // if an error occurs, pass it to the handler
    .catch(next)
})

// SHOW
// GET /images/5a7db6c74d55bc51bdf39793
router.get('/images/:id', requireToken, (req, res, next) => {
  // req.params.id will be set based on the `:id` in the route
  Image.findById(req.params.id)
    .then(handle404)
    // if `findById` is succesful, respond with 200 and "image" JSON
    .then(image => res.status(200).json({ image: image.toObject() }))
    // if an error occurs, pass it to the handler
    .catch(next)
})

// CREATE
// POST /images
router.post('/images', requireToken, upload.single('upload'), (req, res, next) => {
  // // set owner of new image to be current user
  // req.body.image.owner = req.user.id
  //
  // Image.create(req.body.image)
  //   // respond to succesful `create` with status 201 and JSON of new "image"
  //   .then(image => {
  //     res.status(201).json({ image: image.toObject() })
  //   })
  //   // if an error occurs, pass it off to our error handler
  //   // the error handler needs the error message and the `res` object so that it
  //   // can send an error message back to the client
  //   .catch(next)
  console.log(req.file)
  console.log(req.body)
  req.file.owner = req.user.id
  req.file.s3name = Date.now() + req.file.originalname

  if (req.body.bookmark === 'true') {
    req.file.storageClass = 'STANDARD'
  } else {
    req.file.storageClass = 'INTELLIGENT_TIERING'
  }

  fileUploadApi(req.file)
    .then(s3Response => {
      console.log(s3Response)
      const imageParams = {
        name: req.body.name,
        fileType: req.file.mimetype,
        url: s3Response.Location,
        owner: req.user,
        favorite: req.body.bookmark,
        s3Key: s3Response.key
      }
      console.log(imageParams)
      return Image.create(imageParams)
    })
    .then(mongooseResponse =>
      res.status(201).json({ image: mongooseResponse.toObject() }))
    .catch(next)
})

// UPDATE
// PATCH /images/5a7db6c74d55bc51bdf39793
router.patch('/images/:id', requireToken, upload.single('upload'), removeBlanks, (req, res, next) => {
  // if the client attempts to change the `owner` property by including a new
  // owner, prevent that by deleting that key/value pair
  console.log(req.file)
  console.log(req.body.image)

  delete req.body.image.owner

  let imageParameters

  if (req.file) {
    if (req.body.bookmark === 'true') {
      req.file.storageClass = 'STANDARD'
    } else {
      req.file.storageClass = 'INTELLIGENT_TIERING'
    }
    req.file.s3name = Date.now() + req.file.originalname
    fileUploadApi(req.file)
      .then(s3Response => {
        console.log(s3Response)
        const imageParams = {
          name: req.body.name,
          fileType: req.file.mimetype,
          url: s3Response.Location,
          owner: req.user,
          favorite: req.body.image.bookmark,
          s3Key: s3Response.key
        }
        imageParameters = imageParams
        return imageParams
      })
      .then(imageParams => {
        return Image.findById(req.params.id)
      })
      .then(image => {
        requireOwnership(req, image)

        return image.updateOne(imageParameters)
      })
      .then(() => res.sendStatus(204))
      .catch(next)
  } else {
    Image.findById(req.params.id)
      .then(handle404)
      .then(image => {
        // pass the `req` object and the Mongoose record to `requireOwnership`
        // it will throw an error if the current user isn't the owner
        requireOwnership(req, image)

        // pass the result of Mongoose's `.update` to the next `.then`
        return image.updateOne(req.body)
      })
      // if that succeeded, return 204 and no JSON
      .then(() => res.sendStatus(204))
      // if an error occurs, pass it to the handler
      .catch(next)
  }
})

// DESTROY
// DELETE /images/5a7db6c74d55bc51bdf39793
router.delete('/images/:id', requireToken, (req, res, next) => {
  Image.findById(req.params.id)
    .then(handle404)
    .then(image => {
      // throw an error if current user doesn't own `image`
      fileDeleteApi(image.s3Key)
      requireOwnership(req, image)
      // delete the image ONLY IF the above didn't throw
      image.deleteOne()
    })
    // send back 204 and no content if the deletion succeeded
    .then(() => res.sendStatus(204))
    // if an error occurs, pass it to the handler
    .catch(next)
})

module.exports = router
