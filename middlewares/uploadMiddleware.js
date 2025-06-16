const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let folder = '';
    if (file.fieldname === 'license') folder = 'license';
    if (file.fieldname === 'aadhar') folder = 'aadhar';
    if (file.fieldname === 'insurance') folder = 'insurance';

    cb(null, path.join(__dirname, `../uploads/${folder}`));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    const allowed = ['.jpg', '.jpeg', '.png', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  }
});

module.exports = upload;
