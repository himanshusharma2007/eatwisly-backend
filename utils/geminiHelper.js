const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

exports.getGeminiInsight = async (text, userProfile = null) => {
  try {
    // Construct user-specific context
    let userContext = '';
    if (userProfile) {
      const { age, weight, diseases = [], allergies = [], gender, name } = userProfile;
      userContext = `
        User Profile:
        - Name: ${name || 'Not provided'}
        - Gender: ${gender || 'Not specified'}
        - Age: ${age || 'Not specified'} years
        - Weight: ${weight ? `${weight} kg` : 'Not specified'}
        - Health Conditions: ${diseases.length > 0 ? diseases.join(', ') : 'None reported'}
        - Known Allergies: ${allergies.length > 0 ? allergies.join(', ') : 'None reported'}
      `;
    }

    const prompt = `
You are a nutrition expert analyzing a food label. Your goal is to provide clear, accurate health insights in simple, friendly language that anyone can understand.

FOOD LABEL TEXT: "${text}"
Note: the food lable data is extracted from uploaded image their can be some mistakes in it so if you see any unexpected or unrelavent info  in it please ignore  it and generate response only based on reliable info.
${userContext ? `PERSONALIZATION CONTEXT: ${userContext}

Please consider this user's age, weight, health conditions, and allergies when providing recommendations. Tailor your advice to their specific needs. ensure to generate response in a way like you are taking to them directly.` : 'No user profile available. Provide general health guidance.'}

INSTRUCTIONS:
- Use simple, conversational language without being overly casual or sarcastic
- Focus on accuracy and helpfulness
- Explain complex ingredients in easy-to-understand terms
- Be encouraging but honest about health implications
- Provide practical, actionable advice

Please analyze this food and respond in EXACTLY this format (include the separators):

=== HEALTH IMPACT ===
[Provide a 1-2 sentence summary of the overall health impact of this food]

=== HARMFUL INGREDIENTS ===
[For each concerning ingredient, use this exact format:]
INGREDIENT: [ingredient name]
SEVERITY: [High/Medium/Low]
WARNING: [Simple explanation of why it's concerning]
ALTERNATIVE: [Better ingredient option or "None available"]
---
[Repeat for each harmful ingredient, separated by ---]

=== NUTRITIONAL INFO ===
TOTAL_SUGAR: [number only, in grams]
TOTAL_SODIUM: [number only, in milligrams]
CALORIES_PER_SERVING: [number only, if available]
SERVING_SIZE: [text description if available]

=== HEALTH SCORE ===
[Number between 0-100, where 100 is excellent and 0 is very poor]

=== SUITABILITY ===
KIDS: [Yes/No]
DIABETICS: [Yes/No]
HEART_PATIENTS: [Yes/No]
${userContext ? 'USER_SPECIFIC: [Yes/No]' : ''}

=== SHOULD EAT ===
RECOMMENDATION: [Yes/No/Occasionally]
REASON: [Brief, clear explanation]

=== HEALTHY ALTERNATIVES ===
[Comma-separated list of 3-5 healthier alternatives]

=== ADDITIONAL NOTES ===
[Any other important information, tips, or warnings specific to this food based on the user profile or general health guidelines]

EXAMPLE FORMAT:
=== HEALTH IMPACT ===
This snack contains high amounts of added sugars and artificial preservatives that may contribute to energy crashes and digestive issues.

=== HARMFUL INGREDIENTS ===
INGREDIENT: High Fructose Corn Syrup
SEVERITY: High
WARNING: This sweetener can cause rapid blood sugar spikes and may contribute to weight gain
ALTERNATIVE: Natural fruit juice or honey
---
INGREDIENT: Sodium Benzoate
SEVERITY: Medium
WARNING: This preservative may cause allergic reactions in sensitive individuals
ALTERNATIVE: Natural preservation methods like vitamin E
---

=== NUTRITIONAL INFO ===
TOTAL_SUGAR: 24
TOTAL_SODIUM: 320
CALORIES_PER_SERVING: 150
SERVING_SIZE: 1 packet (28g)

=== HEALTH SCORE ===
35

=== SUITABILITY ===
KIDS: No
DIABETICS: No
HEART_PATIENTS: No
USER_SPECIFIC: No

=== SHOULD EAT ===
RECOMMENDATION: No
REASON: High sugar and sodium content make this unsuitable for regular consumption

=== HEALTHY ALTERNATIVES ===
Fresh fruit slices, unsalted nuts, homemade granola bars, plain yogurt with berries, whole grain crackers

=== ADDITIONAL NOTES ===
If you choose to eat this occasionally, pair it with protein or fiber to slow sugar absorption.

Remember: Use this EXACT format with the === separators. Be accurate with numbers and consistent with Yes/No answers.
    `;

    console.log('Sending prompt to Gemini...'); // Debug log
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const insightText = response.text().trim();
    console.log('Raw Gemini Response:', insightText); // Debug log

    // Enhanced parsing with better error handling
    const analysis = parseGeminiResponse(insightText, userProfile);
    console.log('Parsed Analysis:', JSON.stringify(analysis, null, 2)); // Debug log

    return analysis;
  } catch (error) {
    console.error("Gemini AI error:", error.message);
    return getFailsafeAnalysis(error.message);
  }
};

// Enhanced parsing function with robust error handling
function parseGeminiResponse(responseText, userProfile = null) {
  try {
    const sections = {};
    
    // Split response into sections using the === markers
    const sectionRegex = /=== ([^=]+) ===([\s\S]*?)(?==== |$)/g;
    let match;
    
    while ((match = sectionRegex.exec(responseText)) !== null) {
      const sectionName = match[1].trim();
      const sectionContent = match[2].trim();
      sections[sectionName] = sectionContent;
    }

    console.log('Parsed sections:', Object.keys(sections)); // Debug log

    // Parse Health Impact
    const healthImpact = sections['HEALTH IMPACT'] || 'Unable to determine health impact from the label.';

    // Parse Harmful Ingredients
    const harmfulIngredients = parseHarmfulIngredients(sections['HARMFUL INGREDIENTS'] || '');

    // Parse Nutritional Info
    const nutritionalInfo = parseNutritionalInfo(sections['NUTRITIONAL INFO'] || '');

    // Parse Health Score
    const healthScore = parseHealthScore(sections['HEALTH SCORE'] || '50');

    // Parse Suitability
    const suitability = parseSuitability(sections['SUITABILITY'] || '');

    // Parse Should Eat
    const shouldEat = parseShouldEat(sections['SHOULD EAT'] || '');

    // Parse Healthy Alternatives
    const healthyAlternatives = parseHealthyAlternatives(sections['HEALTHY ALTERNATIVES'] || '');

    // Parse Additional Notes
    const additionalNotes = sections['ADDITIONAL NOTES'] || '';

    // Generate recommendations based on parsed data
    const recommendations = generateRecommendations({
      suitability,
      harmfulIngredients,
      shouldEat,
      healthScore,
      healthyAlternatives,
      userProfile
    });

    return {
      healthImpact,
      harmfulIngredients,
      nutritionalInfo,
      healthScore,
      shouldEat: shouldEat.recommendation,
      shouldEatReason: shouldEat.reason,
      recommendations,
      healthyAlternatives,
      additionalNotes: additionalNotes || undefined
    };

  } catch (error) {
    console.error('Parsing error:', error.message);
    return getFailsafeAnalysis(`Parsing failed: ${error.message}`);
  }
}

// Helper function to parse harmful ingredients
function parseHarmfulIngredients(text) {
  if (!text || text.toLowerCase().includes('none') || text.toLowerCase().includes('no harmful')) {
    return [];
  }

  const ingredients = [];
  const ingredientBlocks = text.split('---').filter(block => block.trim());

  ingredientBlocks.forEach(block => {
    const lines = block.trim().split('\n').filter(line => line.trim());
    const ingredient = {};

    lines.forEach(line => {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();

      switch (key.trim().toUpperCase()) {
        case 'INGREDIENT':
          ingredient.name = value;
          break;
        case 'SEVERITY':
          ingredient.severity = ['High', 'Medium', 'Low'].includes(value) ? value : 'Medium';
          break;
        case 'WARNING':
          ingredient.warning = value;
          break;
        case 'ALTERNATIVE':
          ingredient.alternative = value !== 'None available' ? value : null;
          break;
      }
    });

    if (ingredient.name && ingredient.warning) {
      ingredients.push(ingredient);
    }
  });

  return ingredients;
}

// Helper function to parse nutritional info
function parseNutritionalInfo(text) {
  const nutritionalInfo = {
    totalSugar: 0,
    totalSodium: 0,
    caloriesPerServing: null,
    servingSize: null
  };

  if (!text) return nutritionalInfo;

  const lines = text.split('\n').filter(line => line.trim());
  
  lines.forEach(line => {
    const [key, value] = line.split(':').map(item => item.trim());
    
    switch (key.toUpperCase()) {
      case 'TOTAL_SUGAR':
        nutritionalInfo.totalSugar = parseFloat(value) || 0;
        break;
      case 'TOTAL_SODIUM':
        nutritionalInfo.totalSodium = parseFloat(value) || 0;
        break;
      case 'CALORIES_PER_SERVING':
        nutritionalInfo.caloriesPerServing = parseFloat(value) || null;
        break;
      case 'SERVING_SIZE':
        nutritionalInfo.servingSize = value || null;
        break;
    }
  });

  return nutritionalInfo;
}

// Helper function to parse health score
function parseHealthScore(text) {
  const score = parseInt(text.replace(/[^\d]/g, ''), 10);
  return (score >= 0 && score <= 100) ? score : 50;
}

// Helper function to parse suitability
function parseSuitability(text) {
  const suitability = {
    kids: 'Unknown',
    diabetics: 'Unknown',
    heartPatients: 'Unknown',
    userSpecific: 'Unknown'
  };

  if (!text) return suitability;

  const lines = text.split('\n').filter(line => line.trim());
  
  lines.forEach(line => {
    const [key, value] = line.split(':').map(item => item.trim());
    const normalizedValue = ['Yes', 'No'].includes(value) ? value : 'Unknown';
    
    switch (key.toUpperCase()) {
      case 'KIDS':
        suitability.kids = normalizedValue;
        break;
      case 'DIABETICS':
        suitability.diabetics = normalizedValue;
        break;
      case 'HEART_PATIENTS':
        suitability.heartPatients = normalizedValue;
        break;
      case 'USER_SPECIFIC':
        suitability.userSpecific = normalizedValue;
        break;
    }
  });

  return suitability;
}

// Helper function to parse should eat recommendation
function parseShouldEat(text) {
  const defaultResponse = {
    recommendation: 'Unknown',
    reason: 'Unable to determine recommendation from analysis.'
  };

  if (!text) return defaultResponse;

  const lines = text.split('\n').filter(line => line.trim());
  const shouldEat = { ...defaultResponse };

  lines.forEach(line => {
    const [key, ...valueParts] = line.split(':');
    const value = valueParts.join(':').trim();
    
    switch (key.trim().toUpperCase()) {
      case 'RECOMMENDATION':
        if (['Yes', 'No', 'Occasionally'].includes(value)) {
          shouldEat.recommendation = value;
        }
        break;
      case 'REASON':
        shouldEat.reason = value;
        break;
    }
  });

  return shouldEat;
}

// Helper function to parse healthy alternatives
function parseHealthyAlternatives(text) {
  if (!text || text.toLowerCase().includes('none')) {
    return [];
  }

  return text.split(',')
    .map(item => item.trim())
    .filter(item => item.length > 0)
    .slice(0, 8); // Limit to 8 alternatives
}

// Helper function to generate recommendations
function generateRecommendations(data) {
  const { suitability, harmfulIngredients, shouldEat, healthScore, additionalNotes, healthyAlternatives, userProfile } = data;
  
  // Check if user has specific health conditions
  const hasSpecificConditions = userProfile && (
    (userProfile.diseases && userProfile.diseases.length > 0) ||
    (userProfile.allergies && userProfile.allergies.length > 0)
  );
  
  const targetRecommendations = hasSpecificConditions ? 4 : 3;
  const recommendations = [];
  const usedTypes = new Set(); // Track recommendation types to avoid duplicates
  
  // Priority scoring system for recommendations
  const potentialRecommendations = [];
  
  // 1. Critical health warnings (highest priority)
  if (healthScore < 30) {
    potentialRecommendations.push({
      priority: 10,
      type: 'warning',
      title: 'Critical Health Concern',
      message: `This food has a very low health score (${healthScore}/100). Regular consumption could negatively impact your health. Consider avoiding this product.`,
      category: 'health_score'
    });
  } else if (healthScore < 50) {
    potentialRecommendations.push({
      priority: 8,
      type: 'warning',
      title: 'Below Average Health Rating',
      message: `With a health score of ${healthScore}/100, this food should be consumed sparingly as part of a balanced diet.`,
      category: 'health_score'
    });
  } else if (healthScore >= 75) {
    potentialRecommendations.push({
      priority: 6,
      type: 'positive',
      title: 'Excellent Health Choice',
      message: `Great choice! This food scores ${healthScore}/100 and can be a regular part of your healthy diet.`,
      category: 'health_score'
    });
  }
  
  // 2. User-specific health conditions (high priority)
  if (hasSpecificConditions) {
    if (userProfile.diseases && userProfile.diseases.length > 0) {
      const diseaseList = userProfile.diseases.join(', ');
      if (suitability.userSpecific === 'No') {
        potentialRecommendations.push({
          priority: 9,
          type: 'warning',
          title: 'Conflicts with Your Health Conditions',
          message: `This food is not recommended for individuals with ${diseaseList}. Please consult your healthcare provider before consumption.`,
          category: 'user_diseases'
        });
      } else {
        potentialRecommendations.push({
          priority: 7,
          type: 'info',
          title: 'Safe with Your Conditions',
          message: `This food appears safe for your health conditions (${diseaseList}), but moderation is always key.`,
          category: 'user_diseases'
        });
      }
    }
    
    if (userProfile.allergies && userProfile.allergies.length > 0) {
      const allergyList = userProfile.allergies.join(', ');
      potentialRecommendations.push({
        priority: 9,
        type: 'caution',
        title: 'Allergy Alert',
        message: `Please check ingredients carefully as you have allergies to: ${allergyList}. Always read labels thoroughly.`,
        category: 'user_allergies'
      });
    }
  }
  
  // 3. Harmful ingredients (high priority)
  if (harmfulIngredients.length > 0) {
    const highSeverity = harmfulIngredients.filter(ing => ing.severity === 'High');
    const mediumSeverity = harmfulIngredients.filter(ing => ing.severity === 'Medium');
    
    if (highSeverity.length > 0) {
      potentialRecommendations.push({
        priority: 8,
        type: 'warning',
        title: 'Contains High-Risk Ingredients',
        message: `Warning: Contains ${highSeverity.map(ing => ing.name).join(', ')}. These ingredients may pose significant health risks.`,
        category: 'harmful_ingredients'
      });
    } else if (mediumSeverity.length > 0) {
      potentialRecommendations.push({
        priority: 6,
        type: 'caution',
        title: 'Contains Ingredients of Concern',
        message: `Contains ${mediumSeverity.map(ing => ing.name).join(', ')}. Consider limiting consumption of this product.`,
        category: 'harmful_ingredients'
      });
    }
  }
  
  // 4. Age-specific recommendations
  if (userProfile && userProfile.age) {
    const age = userProfile.age;
    if (age < 18 && suitability.kids === 'No') {
      potentialRecommendations.push({
        priority: 7,
        type: 'caution',
        title: 'Not Suitable for Your Age',
        message: `At ${age} years old, this product may not provide the optimal nutrition needed for growth and development.`,
        category: 'age_specific'
      });
    } else if (age >= 60 && (suitability.heartPatients === 'No' || healthScore < 60)) {
      potentialRecommendations.push({
        priority: 7,
        type: 'info',
        title: 'Senior Health Consideration',
        message: 'As a senior, prioritizing nutrient-dense, heart-healthy foods is especially important for maintaining health.',
        category: 'age_specific'
      });
    } else if (age >= 18 && age <= 25 && healthScore < 50) {
      potentialRecommendations.push({
        priority: 5,
        type: 'info',
        title: 'Young Adult Nutrition',
        message: 'Building healthy eating habits now will benefit your long-term health. Consider choosing more nutritious options.',
        category: 'age_specific'
      });
    }
  }
  
  // 5. Specific health conditions suitability
  if (suitability.diabetics === 'No' && !usedTypes.has('diabetic')) {
    potentialRecommendations.push({
      priority: 6,
      type: 'caution',
      title: 'High Sugar Content',
      message: 'This food is high in sugar and may cause blood sugar spikes. Not recommended for diabetics or those monitoring sugar intake.',
      category: 'diabetic_unsuitable'
    });
  }
  
  if (suitability.heartPatients === 'No' && !usedTypes.has('heart')) {
    potentialRecommendations.push({
      priority: 6,
      type: 'caution',
      title: 'Heart Health Concern',
      message: 'High sodium or unhealthy fat content makes this unsuitable for heart health. Choose heart-friendly alternatives.',
      category: 'heart_unsuitable'
    });
  }
  
  // 6. Consumption recommendations
  if (shouldEat.recommendation === 'No') {
    potentialRecommendations.push({
      priority: 7,
      type: 'warning',
      title: 'Not Recommended for Consumption',
      message: shouldEat.reason,
      category: 'consumption_advice'
    });
  } else if (shouldEat.recommendation === 'Occasionally') {
    potentialRecommendations.push({
      priority: 5,
      type: 'info',
      title: 'Occasional Consumption Only',
      message: shouldEat.reason,
      category: 'consumption_advice'
    });
  }
  
  // 7. Healthy alternatives (lower priority)
  if (healthyAlternatives.length > 0 && healthScore < 60) {
    const alternatives = healthyAlternatives.slice(0, 3).join(', ');
    potentialRecommendations.push({
      priority: 4,
      type: 'positive',
      title: 'Better Alternatives Available',
      message: `Consider these healthier options instead: ${alternatives}.`,
      category: 'alternatives'
    });
  }
  
  // 8. Positive reinforcement for good choices
  if (healthScore >= 70 && shouldEat.recommendation === 'Yes') {
    potentialRecommendations.push({
      priority: 3,
      type: 'positive',
      title: 'Smart Nutritional Choice',
      message: 'This food aligns well with healthy eating guidelines. Great job making a nutritious choice!',
      category: 'positive_reinforcement'
    });
  }
  
  // 9. Additional notes (lowest priority)
  if (additionalNotes && additionalNotes.length > 20) {
    potentialRecommendations.push({
      priority: 2,
      type: 'info',
      title: 'Additional Nutrition Insights',
      message: additionalNotes,
      category: 'additional_notes'
    });
  }
  
  // Sort by priority (highest first) and select top recommendations
  potentialRecommendations.sort((a, b) => b.priority - a.priority);
  
  // Select recommendations ensuring diversity and no redundancy
  const selectedCategories = new Set();
  for (const rec of potentialRecommendations) {
    if (recommendations.length >= targetRecommendations) break;
    
    if (!selectedCategories.has(rec.category)) {
      selectedCategories.add(rec.category);
      recommendations.push({
        type: rec.type,
        title: rec.title,
        message: rec.message
      });
    }
  }
  
  // Fallback: ensure minimum recommendations
  if (recommendations.length === 0) {
    recommendations.push({
      type: 'info',
      title: 'Nutritional Analysis Complete',
      message: 'Based on the analysis, make informed choices that align with your health goals and dietary needs.'
    });
  }
  
  // If we still don't have enough recommendations, add generic helpful advice
  while (recommendations.length < targetRecommendations) {
    const fallbackRecommendations = [
      {
        type: 'info',
        title: 'Balanced Diet Reminder',
        message: 'Remember to maintain a balanced diet with variety from all food groups for optimal health.'
      },
      {
        type: 'positive',
        title: 'Hydration Tip',
        message: 'Stay hydrated by drinking plenty of water throughout the day, especially when consuming processed foods.'
      },
      {
        type: 'info',
        title: 'Portion Control',
        message: 'Pay attention to portion sizes to maintain a healthy relationship with food and prevent overconsumption.'
      }
    ];
    
    const unusedFallback = fallbackRecommendations.find(fb => 
      !recommendations.some(rec => rec.title === fb.title)
    );
    
    if (unusedFallback) {
      recommendations.push(unusedFallback);
    } else {
      break;
    }
  }
  
  return recommendations.slice(0, targetRecommendations);
}

// Failsafe analysis for error cases
function getFailsafeAnalysis(errorMessage) {
  return {
    healthImpact: 'Unable to analyze this food label. The text may be unclear or incomplete.',
    harmfulIngredients: [],
    nutritionalInfo: { 
      totalSugar: 0, 
      totalSodium: 0,
      caloriesPerServing: null,
      servingSize: null
    },
    healthScore: 50,
    shouldEat: 'Unknown',
    shouldEatReason: 'Analysis could not be completed. Please try again with a clearer image.',
    recommendations: [
      {
        type: 'error',
        title: 'Analysis Failed',
        message: `We couldn't analyze this food label properly. ${errorMessage}. Please try taking a clearer photo of the nutrition label.`
      }
    ],
    healthyAlternatives: [],
    additionalNotes: 'For best results, ensure the nutrition label is clearly visible and well-lit in your photo.'
  };
}