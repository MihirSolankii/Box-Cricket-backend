import multer from "multer";


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'D:/majorproject/backend/public/temp')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    console.log("files are ::::",file);
    cb(null, file.fieldname + '-' + uniqueSuffix)
  }
})

 export const upload = multer({ storage })