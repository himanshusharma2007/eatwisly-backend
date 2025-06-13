const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
exports.getGeminiInsight = async (text) => {
    try {
      const prompt = `
        Here's a food label text:\n"${text}".\n
        Analyze the health impact of this product.
        Provide the following details in a structured format:
        - **Health Impact**: <summary of the health impact>
        - **Harmful Ingredients**: For each harmful ingredient, provide: name, severity (Low, Medium, High), warning (why it's harmful), and alternative (a healthier option). Format as: name: <name>, severity: <severity>, warning: <warning>, alternative: <alternative> | (use | to separate multiple ingredients)
        - **Healthy Alternatives**: <comma-separated list of overall alternatives>
        - **Suitability**: Kids: <yes/no>, Diabetics: <yes/no>, Heart Patients: <yes/no>
        - **Health Score**: <score out of 100>
        - **Nutritional Info**: Total Sugar: <number in grams>, Total Sodium: <number in milligrams>
        Example format:
        - **Health Impact**: This product is high in sodium and contains added sugars.
        - **Harmful Ingredients**: name: High fructose corn syrup, severity: High, warning: May cause weight gain, alternative: Honey | name: Sodium benzoate, severity: Medium, warning: May cause allergic reactions, alternative: None
        - **Healthy Alternatives**: Fresh fruit juice, low-sodium broth
        - **Suitability**: Kids: No, Diabetics: No, Heart Patients: No
        - **Health Score**: 40
        - **Nutritional Info**: Total Sugar: 15, Total Sodium: 800
      `;
  
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const insightText = response.text().trim();
      console.log('Raw Gemini Insight:', insightText); // Debug log
  
      // Parse the Gemini response into a structured format
      const sections = insightText.split(/\n(?=- \*\*)/); // Split on new lines starting with "- **"
      let healthImpact = '';
      let harmfulIngredients = [];
      let healthyAlternatives = [];
      let suitability = { kids: 'No', diabetics: 'No', heartPatients: 'No' };
      let healthScore = 50; // Default score
      let nutritionalInfo = { totalSugar: 0, totalSodium: 0 }; // Default values
  
      sections.forEach(section => {
        section = section.trim();
        if (section.startsWith('- **Health Impact**:')) {
          healthImpact = section.replace('- **Health Impact**:', '').trim();
        } else if (section.startsWith('- **Harmful Ingredients**:')) {
          const ingredients = section.replace('- **Harmful Ingredients**:', '').trim();
          if (ingredients) {
            const ingredientEntries = ingredients.split('|').map(item => item.trim()).filter(item => item);
            harmfulIngredients = ingredientEntries.map(entry => {
              const parts = entry.split(',').map(part => part.trim());
              const ingredient = {};
              parts.forEach(part => {
                const [key, value] = part.split(':').map(item => item.trim());
                if (key === 'name') ingredient.name = value;
                if (key === 'severity') ingredient.severity = value;
                if (key === 'warning') ingredient.warning = value;
                if (key === 'alternative') ingredient.alternative = value;
              });
              return ingredient;
            });
          }
        } else if (section.startsWith('- **Healthy Alternatives**:')) {
          const alternatives = section.replace('- **Healthy Alternatives**:', '').trim();
          healthyAlternatives = alternatives
            ? alternatives.split(',').map(item => item.trim()).filter(item => item)
            : [];
        } else if (section.startsWith('- **Suitability**:')) {
          const parts = section.replace('- **Suitability**:', '').trim().split(',');
          parts.forEach(part => {
            const [key, value] = part.split(':').map(item => item.trim());
            if (key === 'Kids') suitability.kids = value;
            if (key === 'Diabetics') suitability.diabetics = value;
            if (key === 'Heart Patients') suitability.heartPatients = value;
          });
        } else if (section.startsWith('- **Health Score**:')) {
          healthScore = parseInt(section.replace('- **Health Score**:', '').trim(), 10) || 50;
        } else if (section.startsWith('- **Nutritional Info**:')) {
          const parts = section.replace('- **Nutritional Info**:', '').trim().split(',');
          parts.forEach(part => {
            const [key, value] = part.split(':').map(item => item.trim());
            if (key === 'Total Sugar') nutritionalInfo.totalSugar = parseFloat(value) || 0;
            if (key === 'Total Sodium') nutritionalInfo.totalSodium = parseFloat(value) || 0;
          });
        }
      });
  
      // Log parsed values for debugging
      console.log('Parsed Values:', {
        healthImpact,
        harmfulIngredients,
        healthyAlternatives,
        suitability,
        healthScore,
        nutritionalInfo
      });
  
      // Construct the recommendations array based on suitability and health impact
      const recommendations = [];
      if (suitability.kids === 'No') {
        recommendations.push({
          type: 'caution',
          title: 'Not Suitable for Kids',
          message: 'This product may not be suitable for children due to its ingredients or nutritional profile.'
        });
      }
      if (suitability.diabetics === 'No') {
        recommendations.push({
          type: 'caution',
          title: 'Not Suitable for Diabetics',
          message: 'This product may not be suitable for diabetics due to high sugar or other concerns.'
        });
      }
      if (suitability.heartPatients === 'No') {
        recommendations.push({
          type: 'caution',
          title: 'Not Suitable for Heart Patients',
          message: 'This product may not be suitable for heart patients due to high sodium, saturated fats, or other concerns.'
        });
      }
      if (harmfulIngredients.length > 0) {
        recommendations.push({
          type: 'warning',
          title: 'Harmful Ingredients Detected',
          message: `This product contains harmful ingredients: ${harmfulIngredients.map(i => i.name).join(', ')}. Consider alternatives like ${healthyAlternatives.join(', ')}.`
        });
      }
  
      const analysis = {
        healthImpact, // Include healthImpact in the analysis object
        harmfulIngredients,
        nutritionalInfo,
        healthScore,
        recommendations
      };
  
      // Log the final analysis object before returning
      console.log('Final Analysis Object:', JSON.stringify(analysis, null, 2));
  
      return analysis;
    } catch (error) {
      console.error("Gemini AI error:", error.message); // Debug log
      return {
        healthImpact: 'Analysis failed.',
        harmfulIngredients: [],
        nutritionalInfo: { totalSugar: 0, totalSodium: 0 },
        healthScore: 50,
        recommendations: [
          {
            type: 'error',
            title: 'Analysis Failed',
            message: 'Unable to generate insights due to an error.'
          }
        ]
      };
    }
  };