const router = require("express").Router();
const trainingController = require("../controllers/training.controller");
const { auth } = require("../middleware/auth.middleware");

// All training routes require authentication
router.use(auth);

router.post("/upload-file", trainingController.uploadFile);
router.post("/upload-url", trainingController.uploadURL);
router.post("/add-qna", trainingController.addQnA);
router.get("/sources", trainingController.getSources);
router.get("/stats", trainingController.getStats);
router.delete("/sources/:id", trainingController.deleteSource);
router.post("/reset", trainingController.resetTraining); 

module.exports = router;
