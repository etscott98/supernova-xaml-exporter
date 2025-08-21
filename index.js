// Use the global Pulsar object provided by Supernova
Pulsar.export(async (sdk, context) => {
  // Check if FileHelper is available in the sandbox
  const hasFileHelper = typeof FileHelper !== 'undefined';
  console.log('FileHelper available:', hasFileHelper);
  // Get design system and tokens
  const designSystem = await sdk.designSystems.designSystem(context.dsId);
  if (!designSystem) {
    throw new Error(`Design system with ID ${context.dsId} not found`);
  }
  
  // Fetch data from design system that is currently being exported (context)
  const remoteVersionIdentifier = {
    designSystemId: context.dsId,
    versionId: context.versionId,
  };

  // Fetch the necessary data
  let tokens = await sdk.tokens.getTokens(remoteVersionIdentifier);

  // Apply theme, if specified by the pipeline configuration (as per documentation)
  if (context.themeId) {
    console.log('Theme ID specified:', context.themeId);
    try {
      const themes = await sdk.tokens.getTokenThemes(remoteVersionIdentifier);
      const theme = themes.find((theme) => theme.id === context.themeId);
      if (theme) {
        console.log('Applying theme:', theme.name);
        tokens = await sdk.tokens.computeTokensByApplyingThemes(tokens, [theme]);
      } else {
        console.warn('Theme not found, using default tokens');
      }
    } catch (error) {
      console.warn('Error applying theme, using default tokens:', error.message);
    }
  }

  // Debug: Log all tokens to understand the structure
  console.log('Total tokens found:', tokens.length);
  console.log('First token sample:', tokens[0]);
  
  // Helper function to extract color value from token
  const extractColorValue = (token) => {
    console.log('Extracting value from token:', token.name, 'Token object:', token);
    
    // Try different ways to get the color value
    if (token.toHex6) {
      return token.toHex6();
    }
    if (token.toHex8) {
      return token.toHex8();
    }
    if (token.value) {
      // If value is an object, try to extract color information
      if (typeof token.value === 'object') {
        if (token.value.color) {
          // Handle nested color object
          const color = token.value.color;
          if (typeof color === 'string') {
            return color;
          }
          if (color.r !== undefined && color.g !== undefined && color.b !== undefined) {
            // Convert RGB to hex
            const r = Math.round(color.r * 255);
            const g = Math.round(color.g * 255);
            const b = Math.round(color.b * 255);
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
          }
        }
        if (token.value.hex) {
          return token.value.hex;
        }
        // Return the stringified object for debugging
        return JSON.stringify(token.value);
      }
      return token.value;
    }
    return '#000000'; // Fallback
  };

  // Helper function to sanitize token names for XAML keys
  const sanitizeTokenName = (name) => {
    if (!name) return 'UnknownToken';
    
    // Replace invalid characters and ensure it starts with a letter
    let sanitized = name
      .replace(/[^a-zA-Z0-9_]/g, '_') // Replace invalid chars with underscore
      .replace(/^[0-9]/, 'Token_$&'); // Prefix numbers with "Token_"
    
    // Ensure it's not empty and starts with a letter
    if (!sanitized || /^[0-9]/.test(sanitized)) {
      sanitized = 'Token_' + sanitized;
    }
    
    return sanitized || 'UnknownToken';
  };

  // Filter color tokens
  const colorTokens = tokens
    .filter(token => {
      console.log('Token:', token.name, 'Type:', token.tokenType);
      return token.tokenType === 'color';
    })
    .map(token => {
      console.log('Processing color token:', token.name);
      const value = extractColorValue(token);
      return {
        name: sanitizeTokenName(token.name),
        value: value
      };
    });
  
  console.log('Color tokens found:', colorTokens.length);
  console.log('Color tokens:', colorTokens);

  // If no color tokens found, let's try all tokens as a fallback for debugging
  let finalTokens = colorTokens;
  if (colorTokens.length === 0) {
    console.log('No color tokens found, using all tokens for debugging');
    finalTokens = tokens.slice(0, 5).map(token => ({
      name: sanitizeTokenName(token.name),
      value: extractColorValue(token)
    }));
  }

  // Generate XAML directly without Handlebars
  const generateXamlContent = (tokens) => {
    if (tokens.length === 0) {
      return `<ResourceDictionary xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
                    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">
    
    <!-- No tokens found -->
    <SolidColorBrush x:Key="Debug">No tokens were found in the design system</SolidColorBrush>

</ResourceDictionary>`;
    }

    const tokenElements = tokens.map(token => 
      `    <Color x:Key="${token.name}">${token.value}</Color>`
    ).join('\n');

    return `<ResourceDictionary xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
                    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">
    
    <!-- Design System Color Tokens -->
${tokenElements}

</ResourceDictionary>`;
  };

  // Generate final XAML
  const xamlOutput = generateXamlContent(finalTokens);

  // Return result using Supernova's FileHelper (as per documentation)
  if (typeof FileHelper !== 'undefined') {
    return [
      FileHelper.createTextFile({
        relativePath: "./",
        fileName: "DesignTokens.xaml",
        content: xamlOutput,
      })
    ];
  } else {
    // Fallback to plain object if FileHelper not available in sandbox
    console.log('Using fallback output format');
    return [
      {
        relativePath: "./",
        fileName: "DesignTokens.xaml",
        content: xamlOutput,
        type: "text"
      }
    ];
  }
});