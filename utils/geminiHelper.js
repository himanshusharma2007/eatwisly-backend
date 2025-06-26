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
[Any other important information, tips, or warnings specific to this food]

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
  const recommendations = [];
  const { suitability, harmfulIngredients, shouldEat, healthScore, additionalNotes, healthyAlternatives, userProfile } = data;

  // Health score based recommendations
  if (healthScore < 40) {
    recommendations.push({
      type: 'warning',
      title: 'Poor Health Rating',
      message: 'This food has a low health score. Consider choosing healthier alternatives for regular consumption.'
    });
  } else if (healthScore >= 70) {
    recommendations.push({
      type: 'positive',
      title: 'Good Health Choice',
      message: 'This food has a good health rating and can be part of a balanced diet.'
    });
  }

  // Suitability recommendations
  if (suitability.kids === 'No') {
    recommendations.push({
      type: 'caution',
      title: 'Not Suitable for Children',
      message: 'This product contains ingredients that may not be appropriate for children.'
    });
  }

  if (suitability.diabetics === 'No') {
    recommendations.push({
      type: 'caution',
      title: 'Not Suitable for Diabetics',
      message: 'High sugar content makes this unsuitable for people managing diabetes.'
    });
  }

  if (suitability.heartPatients === 'No') {
    recommendations.push({
      type: 'caution',
      title: 'Not Suitable for Heart Patients',
      message: 'High sodium or unhealthy fat content may not be suitable for heart health.'
    });
  }

  // User-specific recommendations
  if (userProfile && suitability.userSpecific === 'No') {
    recommendations.push({
      type: 'warning',
      title: 'Not Recommended for You',
      message: 'Based on your health profile, this food may not be the best choice for your specific needs.'
    });
  }

  // Harmful ingredients recommendations
  if (harmfulIngredients.length > 0) {
    const highSeverityIngredients = harmfulIngredients.filter(ing => ing.severity === 'High');
    if (highSeverityIngredients.length > 0) {
      recommendations.push({
        type: 'warning',
        title: 'Contains Harmful Ingredients',
        message: `This product contains ingredients of concern: ${highSeverityIngredients.map(ing => ing.name).join(', ')}. Consider alternatives when possible.`
      });
    }
  }

  // Should eat recommendations
  if (shouldEat.recommendation === 'No') {
    recommendations.push({
      type: 'warning',
      title: 'Not Recommended',
      message: shouldEat.reason
    });
  } else if (shouldEat.recommendation === 'Occasionally') {
    recommendations.push({
      type: 'info',
      title: 'Consume in Moderation',
      message: shouldEat.reason
    });
  }

  // Healthy alternatives recommendation
  if (healthyAlternatives.length > 0 && (healthScore < 60 || shouldEat.recommendation !== 'Yes')) {
    recommendations.push({
      type: 'positive',
      title: 'Healthier Alternatives Available',
      message: `Try these healthier options: ${healthyAlternatives.slice(0, 3).join(', ')}.`
    });
  }

  // Additional notes as recommendation
  if (additionalNotes) {
    recommendations.push({
      type: 'info',
      title: 'Additional Information',
      message: additionalNotes
    });
  }

  // Ensure we always have at least one recommendation
  if (recommendations.length === 0) {
    recommendations.push({
      type: 'info',
      title: 'Analysis Complete',
      message: 'Food analysis completed. Review the nutritional information and make informed choices.'
    });
  }

  return recommendations;
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