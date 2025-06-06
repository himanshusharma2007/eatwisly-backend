const express = require("express");
const { createIngredient, getIngredients, updateIngredient, deleteIngredient, getAllScans } = require("../controllers/ingredientController");
const { adminProtect } = require("../middlewares/auth");
const router = express.Router();


// Admin routes
router.post('/ingredients', adminProtect, createIngredient);
router.get('/ingredients', adminProtect, getIngredients);
router.put('/ingredients/:id', adminProtect, updateIngredient);
router.delete('/ingredients/:id', adminProtect, deleteIngredient);
router.get('/scans/all', adminProtect, getAllScans);

module.exports= router;