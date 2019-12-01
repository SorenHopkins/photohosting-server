require('dotenv').config()

const AWS = require('aws-sdk')
AWS.config.update({region: 'us-east-1'})

const s3 = new AWS.S3({apiVersion: '2006-03-01'})

module.exports = (file) => {
  // Creating a promise to be run
  return new Promise((resolve, reject) => {
    // Building an object with parameters for S3 upload
    // Included: Bucket name, Key (file name), Body (file data)
    // and "ACL" (access control list) -> tell what rights the user has
    // if ACL is not public read -> the access will be denied unless we set it
    // make it public in bucket every single time
    const uploadParams = {
      Bucket: process.env.BUCKET_NAME,
      Key: Date.now() + file.originalname,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read'
    }
    // Used the 'upload' method to upload to S3 using params
    s3.upload(uploadParams, function (err, data) {
      if (err) {
        reject(err) // reject error
      } else {
        resolve(data) // resolve with data
      }
    })
  })
}
