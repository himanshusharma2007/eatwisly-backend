const Ingredient = require('../models/ingredientModel');

const analyzeIngredients = async (text) => {
  const harmfulIngredients = await Ingredient.find({}); // Fetch from DB
  const textLower = text.toLowerCase();
  const foundIngredients = [];
  let totalSugar = 0;
  let totalSodium = 0;

  // Find harmful ingredients
  harmfulIngredients.forEach((ingredient) => {
    if (textLower.includes(ingredient.name.toLowerCase()) ||
        (ingredient.name === 'artificial colors' && /red \d+|yellow \d+|blue \d+/.test(textLower))) {
      foundIngredients.push({
        name: ingredient.name,
        severity: ingredient.severity,
        warning: ingredient.warning,
        alternative: ingredient.alternative
      });
    }
  });

  // Extract nutritional values
  const sugarMatch = text.match(/total sugars?\s*:?\s*(\d+)g?/i);
  if (sugarMatch) totalSugar = parseInt(sugarMatch[1]);

  const sodiumMatch = text.match(/sodium\s*:?\s*(\d+)mg?/i);
  if (sodiumMatch) totalSodium = parseInt(sodiumMatch[1]);

  // Calculate health score
  let healthScore = 100;
  foundIngredients.forEach(ing => {
    healthScore -= ing.severity === 'high' ? 25 : 15;
  });
  if (totalSugar > 15) healthScore -= 20;
  if (totalSodium > 400) healthScore -= 15;
  healthScore = Math.max(0, healthScore);

  return {
    harmfulIngredients: foundIngredients,
    nutritionalInfo: { totalSugar, totalSodium },
    healthScore,
    recommendations: generateRecommendations(foundIngredients, totalSugar, totalSodium)
  };
};

const generateRecommendations = (harmful, sugar, sodium) => {
  const recommendations = [];

  if (harmful.length > 0) {
    recommendations.push({
      type: 'warning',
      title: 'Harmful Ingredients Detected',
      message: `Found ${harmful.length} concerning ingredient(s). Consider alternatives.`
    });
  }

  if (sugar > 15) {
    recommendations.push({
      type: 'caution',
      title: 'High Sugar Content',
      message: `${sugar}g sugar per serving is high. Look for options with <10g sugar.`
    });
  }

  if (sodium > 400) {
    recommendations.push({
      type: 'caution',
      title: 'High Sodium Content',
      message: `${sodium}mg sodium is high. Aim for products with <300mg per serving.`
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      type: 'good',
      title: 'Looks Good!',
      message: 'No major red flags detected in this product.'
    });
  }

  return recommendations;
};

module.exports = { analyzeIngredients };