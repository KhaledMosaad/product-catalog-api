const ProductService = require("../service");

const ProductController = {
  async Search(req, res, next) {
    try {
      const { query, filter, skip, limit } = req.query;

      const products = await ProductService.Search({ query, filter, skip, limit });

      res.status(200).json(products);
    } catch (err) {
      console.log(err);
      next(err);
    }
  }
};

module.exports = ProductController;