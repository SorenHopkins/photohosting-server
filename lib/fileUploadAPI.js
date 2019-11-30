require('dotenv').config()

const AWS = require('aws-sdk')
AWS.config.update({region: 'us-east-1'})

const s3 = new AWS.S3({apiVersion: '2006-03-01'})

const awsFileUpload = function (key, body) {
// call S3 to retrieve upload file to specified bucket

  return new Promise((resolve, reject) => {
    const uploadParams = {Bucket: process.env.BUCKET_NAME, Key: key, Body: body, ACL: 'public-read'}
    s3.upload(uploadParams, function (err, data) {
      if (err) {
        reject(err)
      } else {
        resolve(data)
      }
    })
  })
}

module.exports = awsFileUpload
