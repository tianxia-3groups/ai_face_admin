// 参数验证中间件
const { body, param, query, validationResult } = require('express-validator');

// 验证结果处理中间件
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: '参数验证错误',
      details: errors.array()
    });
  }
  next();
};

// 工作流验证规则
const validateWorkflow = [
  body('name')
    .notEmpty()
    .withMessage('工作流名称不能为空')
    .isLength({ min: 1, max: 100 })
    .withMessage('工作流名称长度应在1-100字符之间'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('描述长度不能超过500字符'),
  handleValidationErrors
];

// 工作流ID验证
const validateWorkflowId = [
  param('workflowId')
    .isUUID()
    .withMessage('工作流ID格式无效'),
  handleValidationErrors
];

// 登录验证规则
const validateLogin = [
  body('username')
    .notEmpty()
    .withMessage('用户名不能为空')
    .isLength({ min: 3, max: 50 })
    .withMessage('用户名长度应在3-50字符之间'),
  body('password')
    .notEmpty()
    .withMessage('密码不能为空')
    .isLength({ min: 6 })
    .withMessage('密码长度至少6个字符'),
  handleValidationErrors
];

// 训练参数验证
const validateTrainingConfig = [
  body('learningRate')
    .optional()
    .isFloat({ min: 0.0001, max: 1 })
    .withMessage('学习率应在0.0001-1之间'),
  body('epochs')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('训练轮数应在1-1000之间'),
  body('batchSize')
    .optional()
    .isInt({ min: 1, max: 128 })
    .withMessage('批次大小应在1-128之间'),
  handleValidationErrors
];

// 分页参数验证
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('页码必须是大于0的整数'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('每页数量应在1-100之间'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateWorkflow,
  validateWorkflowId,
  validateLogin,
  validateTrainingConfig,
  validatePagination
}; 