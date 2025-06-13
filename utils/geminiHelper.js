const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

exports.getGeminiInsight = async (text, userProfile = null) => {
  try {
    let userInfo = '';
    if (userProfile) {
      const { age, weight, diseases = [], allergies = [] , gender, name } = userProfile;
      userInfo = `
        Oh, and here's the tea on the user: 
        - name : ${name || 'unknown'},
        - gender: ${gender || 'unknown'},
        - Age: ${age || 'unknown, probably ancient'},
        - Weight: ${weight ? `${weight} kg` : 'who knows, maybe they float?'},
        - Diseases: ${diseases.length > 0 ? diseases.join(', ') : 'none, lucky duck'},
        - Allergies: ${allergies.length > 0 ? allergies.join(', ') : 'none, they eat everything'}
      `;
    }

    const prompt = `
      Yo, check this food label: "${text}". Spill the beans on its health vibes in a sarcastic, casual, and kinda funny way. Keep it simple, like you're chatting with a friend who doesn't know big science words. 
      ${userInfo ? `And heads up, we’ve got some personal deets to make this extra spicy: ${userInfo}. Tailor the advice to this person’s age, weight, diseases, and allergies (like, don’t recommend peanut butter if they’re allergic to peanuts, duh).` : 'No personal info here, so just give the general lowdown.'}
      
      Give me the scoop in this format:
      - **Health Impact**: <a quick, snarky summary of how good or bad this food is>
      - **Harmful Ingredients**: For each shady ingredient, hit me with: name, severity (Low, Medium, High), warning (why it’s a problem), and alternative (something less sketchy). Format as: name: <name>, severity: <severity>, warning: <warning>, alternative: <alternative> | (use | to separate multiple ingredients)
      - **Healthy Alternatives**: <comma-separated list of better options, keep it real>
      - **Suitability**: Kids: <yes/no>, Diabetics: <yes/no>, Heart Patients: <yes/no> ${userInfo ? ', User-Specific: <yes/no with a sassy reason>' : ''}
      - **Health Score**: <score out of 100, be honest but throw in some shade>
      - **Nutritional Info**: Total Sugar: <number in grams>, Total Sodium: <number in milligrams>
      - **Should Eat**: <yes/no>, <short, sarcastic reason why or why not>
      
      Example format:
      - **Health Impact**: This junk’s basically a sugar bomb with a side of regret.
      - **Harmful Ingredients**: name: High fructose corn syrup, severity: High, warning: Makes you gain weight faster than binge-watching, alternative: Honey | name: Sodium benzoate, severity: Medium, warning: Might make you sneeze or worse, alternative: None
      - **Healthy Alternatives**: Fresh fruit, that low-sodium soup your grandma loves
      - **Suitability**: Kids: No, Diabetics: No, Heart Patients: No, User-Specific: No, your peanut allergy says hard pass
      - **Health Score**: 40, because it’s trying to ruin your vibe
      - **Nutritional Info**: Total Sugar: 15, Total Sodium: 800
      - **Should Eat**: No, unless you want your insides to throw a tantrum
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
    let suitability = { kids: 'No', diabetics: 'No', heartPatients: 'No', userSpecific: '' };
    let healthScore = 50; // Default score
    let nutritionalInfo = { totalSugar: 0, totalSodium: 0 }; // Default values
    let shouldEat = { value: 'No', reason: 'Analysis failed, so better not risk it' }; // Default

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
          if (key === 'User-Specific') suitability.userSpecific = value;
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
      } else if (section.startsWith('- **Should Eat**:')) {
        const [value, ...reasonParts] = section.replace('- **Should Eat**:', '').trim().split(',');
        shouldEat = {
          value: value.trim(),
          reason: reasonParts.join(',').trim()
        };
      }
    });

    // Log parsed values for debugging
    console.log('Parsed Values:', {
      healthImpact,
      harmfulIngredients,
      healthyAlternatives,
      suitability,
      healthScore,
      nutritionalInfo,
      shouldEat
    });

    // Construct the recommendations array based on suitability and health impact
    const recommendations = [];
    if (suitability.kids === 'No') {
      recommendations.push({
        type: 'caution',
        title: 'Not Suitable for Kids',
        message: 'This snack’s not kid-friendly—too much junk for those little gremlins.'
      });
    }
    if (suitability.diabetics === 'No') {
      recommendations.push({
        type: 'caution',
        title: 'Not Suitable for Diabetics',
        message: 'Sugar overload alert! Diabetics, steer clear of this sweet disaster.'
      });
    }
    if (suitability.heartPatients === 'No') {
      recommendations.push({
        type: 'caution',
        title: 'Not Suitable for Heart Patients',
        message: 'Heart patients, this salty mess might send your ticker into a tantrum.'
      });
    }
    if (suitability.userSpecific && suitability.userSpecific.startsWith('No')) {
      recommendations.push({
        type: 'warning',
        title: 'Not Your Vibe',
        message: suitability.userSpecific
      });
    }
    if (harmfulIngredients.length > 0) {
      recommendations.push({
        type: 'warning',
        title: 'Harmful Ingredients Detected',
        message: `Yikes, this has some sketchy stuff: ${harmfulIngredients.map(i => i.name).join(', ')}. Swap it for ${healthyAlternatives.join(', ')} instead.`
      });
    }
    if (shouldEat.value === 'No') {
      recommendations.push({
        type: 'warning',
        title: 'Don’t Eat This',
        message: shouldEat.reason
      });
    } else {
      recommendations.push({
        type: 'info',
        title: 'Go Ahead and Munch',
        message: shouldEat.reason
      });
    }

    const analysis = {
      healthImpact,
      harmfulIngredients,
      nutritionalInfo,
      healthScore,
      shouldEat: shouldEat.value,
      shouldEatReason: shouldEat.reason,
      recommendations
    };

    // Log the final analysis object before returning
    console.log('Final Analysis Object:', JSON.stringify(analysis, null, 2));

    return analysis;
  } catch (error) {
    console.error("Gemini AI error:", error.message); // Debug log
    return {
      healthImpact: 'Well, that was a flop. Analysis failed, sorry!',
      harmfulIngredients: [],
      nutritionalInfo: { totalSugar: 0, totalSodium: 0 },
      healthScore: 50,
      shouldEat: 'No',
      shouldEatReason: 'We couldn’t analyze this, so maybe don’t risk it?',
      recommendations: [
        {
          type: 'error',
          title: 'Analysis Crashed',
          message: 'Something broke, and we couldn’t get the food scoop. Try again?'
        }
      ]
    };
  }
};