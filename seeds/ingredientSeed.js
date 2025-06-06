const mongoose = require('mongoose');
const Ingredient = require('../models/Ingredient');
const { connectDB } = require('../config');

const seedData = [
  {
    name: 'high fructose corn syrup',
    severity: 'high',
    warning: 'Linked to obesity and diabetes',
    alternative: 'honey or maple syrup'
  },
  {
    name: 'trans fat',
    severity: 'high',
    warning: 'Increases heart disease risk',
    alternative: 'products with 0g trans fat'
  },
  {
    name: 'palm oil',
    severity: 'medium',
    warning: 'High in saturated fat',
    alternative: 'olive oil or avocado oil'
  },
  {
    name: 'sodium benzoate',
    severity: 'medium',
    warning: 'May cause allergic reactions',
    alternative: 'natural preservatives like vitamin E'
  },
  {
    name: 'artificial colors',
    severity: 'medium',
    warning: 'May cause hyperactivity in children',
    alternative: 'natural coloring from fruits/vegetables'
  },
  {
    name: 'monosodium glutamate',
    severity: 'medium',
    warning: 'May cause headaches in sensitive people',
    alternative: 'natural flavor enhancers'
  },
  {
    name: 'aspartame',
    severity: 'high',
    warning: 'Artificial sweetener with health concerns',
    alternative: 'stevia or monk fruit'
  }
];

const seedIngredients = async () => {
  try {
    await connectDB();
    await Ingredient.deleteMany({});
    await Ingredient.insertMany(seedData);
    console.log('Ingredients seeded successfully');
    process.exit();
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedIngredients();