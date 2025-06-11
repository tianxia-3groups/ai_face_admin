// 上传中间件
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const uploadConfig = require('../config/upload');

// 存储配置
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(process.cwd(), uploadConfig.paths.temp);
    fs.ensureDirSync(uploadPath);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    const basename = path.basename(file.originalname, extension);
    cb(null, `${basename}_${timestamp}${extension}`);
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    ...uploadConfig.allowedTypes.images,
    ...uploadConfig.allowedTypes.videos
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`不支持的文件类型: ${file.mimetype}`), false);
  }
};

// 创建multer实例
const upload = multer({
  storage: storage,
  limits: uploadConfig.limits,
  fileFilter: fileFilter
});

module.exports = {
  upload,
  single: upload.single.bind(upload),
  array: upload.array.bind(upload),
  fields: upload.fields.bind(upload)
}; 