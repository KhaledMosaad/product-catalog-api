const { validate } = require('../../../common/middlewares/validation');
const { searchValidation } = require('../validation')
const ProductController = require('../controller/index')

const Router = require('express')

const router = Router()

// router for the search endpoint
// It's a public endpoint don't have authorization/authentication
router.get(
  '/products/search',
  validate(searchValidation),
  ProductController.Search
)


module.exports = router;