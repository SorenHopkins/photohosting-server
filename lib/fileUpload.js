
require('dotenv').config()
console.log(process.env)

const AWS = require('aws-sdk')
AWS.config.update({region: 'us-east-1'})
console.log(AWS)
// s3 = new AWS.s3()
const s3 = new AWS.S3({apiVersion: '2006-03-01'})

// call S3 to retrieve upload file to specified bucket
const uploadParams = {Bucket: process.env.BUCKET_NAME, Key: '', Body: '', ACL: 'public-read'}
const file = process.argv[2]

// Configure the file stream and obtain the upload parameters
const fs = require('fs')
const fileStream = fs.createReadStream(file)
fileStream.on('error', function (err) {
  console.log('File Error', err)
})

uploadParams.Body = fileStream
const path = require('path')
uploadParams.Key = path.basename(file)

// call S3 to retrieve upload file to specified bucket
s3.upload(uploadParams, function (err, data) {
  if (err) {
    console.log('Error', err)
  } if (data) {
    console.log('Upload Success', data.Location)
  }
})
