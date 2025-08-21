// Use the global Pulsar object provided by Supernova
Pulsar.export(async (sdk, context) => {
  // Get configuration (as per documentation)
  const exportConfiguration = Pulsar.exportConfig();
  console.log('Export configuration:', exportConfiguration);
  
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
  
  // Helper function to extract value from any token type
  const extractTokenValue = (token) => {
    console.log('Extracting value from token:', token.name, 'Type:', token.tokenType);
    
    // Handle different token types
    switch (token.tokenType) {
      case 'color':
        return extractColorValue(token);
      case 'dimension':
      case 'spacing':
      case 'sizing':
        return extractDimensionValue(token);
      case 'typography':
        return extractTypographyValue(token);
      default:
        // Fallback for unknown types
        return extractColorValue(token);
    }
  };

  // Helper function to extract dimension values
  const extractDimensionValue = (token) => {
    console.log('Extracting dimension value from:', token.name, token.value);
    
    if (token.value && typeof token.value === 'object') {
      if (token.value.measure !== undefined) {
        // Handle unit mapping
        let unit = token.value.unit || 'px';
        if (unit === 'Pixels') unit = 'px';
        if (unit === 'Raw') unit = ''; // Raw values have no unit
        
        const measure = token.value.measure;
        
        // For Raw units (like opacity), return just the number
        if (token.value.unit === 'Raw') {
          return measure.toString();
        }
        
        return `${measure}${unit}`;
      }
    }
    
    // Fallback to string representation
    if (typeof token.value === 'string') {
      return token.value;
    }
    
    return token.value || '0px';
  };

  // Helper function to extract typography values
  const extractTypographyValue = (token) => {
    if (token.value && typeof token.value === 'object') {
      // Return a font family or size string
      if (token.value.fontFamily) {
        return token.value.fontFamily;
      }
      if (token.value.fontSize) {
        return `${token.value.fontSize.measure || token.value.fontSize}${token.value.fontSize.unit || 'px'}`;
      }
    }
    return token.value || 'Arial';
  };

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

  // Filter tokens based on configuration
  let filteredTokens;
  if (exportConfiguration.includeAllTokenTypes) {
    // Include all token types
    console.log('Including all token types');
    filteredTokens = tokens.map(token => ({
      name: sanitizeTokenName(token.name),
      value: extractTokenValue(token),
      type: token.tokenType,
      groupId: token.parentGroupId || 'ungrouped'
    }));
  } else {
    // Check what token types we actually have
    const tokenTypes = [...new Set(tokens.map(t => t.tokenType))];
    console.log('Available token types:', tokenTypes);
    
    // Default: only color tokens, but let's be more flexible with the filtering
    filteredTokens = tokens
      .filter(token => {
        console.log('Token:', token.name, 'Type:', token.tokenType);
        // Try different variations of color type
        const isColor = token.tokenType === 'color' || 
                       token.tokenType === 'Color' || 
                       token.tokenType === 'COLOR';
        
        // If no colors found but we have other tokens, include all for now
        if (!isColor && tokenTypes.length > 0 && !tokenTypes.includes('color') && !tokenTypes.includes('Color')) {
          console.log('No color tokens found, including all token types automatically');
          return true; // Include all tokens if no colors exist
        }
        
        return isColor;
      })
      .map(token => {
        console.log('Processing token:', token.name, 'Type:', token.tokenType);
        const value = extractTokenValue(token);
        return {
          name: sanitizeTokenName(token.name),
          value: value,
          type: token.tokenType,
          groupId: token.parentGroupId || 'ungrouped'
        };
      });
  }

  // Apply name prefix if configured
  if (exportConfiguration.tokenNamePrefix) {
    filteredTokens = filteredTokens.map(token => ({
      ...token,
      name: exportConfiguration.tokenNamePrefix + token.name
    }));
  }

  console.log('Filtered tokens found:', filteredTokens.length);
  console.log('Filtered tokens:', filteredTokens);

  // If no tokens found, use fallback for debugging
  let finalTokens = filteredTokens;
  if (filteredTokens.length === 0) {
    console.log('No tokens found, using fallback for debugging');
    finalTokens = tokens.slice(0, 5).map(token => ({
      name: sanitizeTokenName(token.name),
      value: extractColorValue(token),
      type: token.tokenType || 'unknown',
      groupId: 'debug'
    }));
  }

  // Helper function to create output file with proper format
  const createOutputFile = ({ fileName, content, hasFileHelper }) => {
    if (hasFileHelper) {
      return FileHelper.createTextFile({
        relativePath: "./",
        fileName: fileName,
        content: content,
      });
    } else {
      // Fallback format that matches Supernova's requirements
      return {
        path: "./",
        name: fileName,
        content: content,
        type: "text"
      };
    }
  };

  // Generate XAML directly without Handlebars
  const generateXamlContent = (tokens, tokenType = null) => {
    if (tokens.length === 0) {
      return `<ResourceDictionary xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
                    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">
    
    <!-- No tokens found -->
    <SolidColorBrush x:Key="Debug">No tokens were found in the design system</SolidColorBrush>

</ResourceDictionary>`;
    }

    // Group tokens by group if enabled
    let groupedTokens = { 'default': tokens };
    if (exportConfiguration.includeTokenGroups) {
      groupedTokens = {};
      tokens.forEach(token => {
        const groupKey = token.groupId || 'ungrouped';
        if (!groupedTokens[groupKey]) {
          groupedTokens[groupKey] = [];
        }
        groupedTokens[groupKey].push(token);
      });
    }

    // Generate token elements with grouping
    const generateTokenElement = (token) => {
      const xamlType = getXamlType(token.type);
      return `    <${xamlType} x:Key="${token.name}">${token.value}</${xamlType}>`;
    };

    const getXamlType = (tokenType) => {
      switch (tokenType) {
        case 'color': 
        case 'Color': return 'Color';
        case 'dimension':
        case 'spacing':
        case 'sizing':
        case 'space':
        case 'size': return 'sys:Double';
        case 'typography': return 'sys:String';
        case 'opacity': return 'sys:Double';
        default: 
          console.log('Unknown token type:', tokenType, '- defaulting to sys:String');
          return 'sys:String';
      }
    };

    let xamlContent = '';
    if (exportConfiguration.includeTokenGroups && Object.keys(groupedTokens).length > 1) {
      // Generate with group sections
      for (const [groupKey, groupTokens] of Object.entries(groupedTokens)) {
        xamlContent += `    <!-- ${groupKey.charAt(0).toUpperCase() + groupKey.slice(1)} Tokens -->\n`;
        xamlContent += groupTokens.map(generateTokenElement).join('\n') + '\n\n';
      }
    } else {
      // Generate flat structure
      xamlContent = tokens.map(generateTokenElement).join('\n');
    }

    const typeComment = tokenType ? `${tokenType.charAt(0).toUpperCase() + tokenType.slice(1)} ` : '';
    const namespaces = tokens.some(t => t.type !== 'color') 
      ? `xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
                    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
                    xmlns:sys="clr-namespace:System;assembly=mscorlib"`
      : `xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
                    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"`;

    return `<ResourceDictionary ${namespaces}>
    
    <!-- Design System ${typeComment}Tokens -->
${xamlContent}
</ResourceDictionary>`;
  };

  // Handle multiple files based on configuration
  const outputFiles = [];
  
  if (exportConfiguration.groupByTokenType) {
    // Group tokens by type and create separate files
    const tokensByType = {};
    finalTokens.forEach(token => {
      if (!tokensByType[token.type]) {
        tokensByType[token.type] = [];
      }
      tokensByType[token.type].push(token);
    });
    
    for (const [tokenType, typeTokens] of Object.entries(tokensByType)) {
      const fileName = `${exportConfiguration.fileNameTemplate}_${tokenType}.xaml`;
      const xamlContent = generateXamlContent(typeTokens, tokenType);
      
      outputFiles.push(createOutputFile({
        fileName: fileName,
        content: xamlContent,
        hasFileHelper: hasFileHelper
      }));
    }
  } else if (finalTokens.length > exportConfiguration.maxTokensPerFile) {
    // Split into multiple files based on token count
    const chunks = [];
    for (let i = 0; i < finalTokens.length; i += exportConfiguration.maxTokensPerFile) {
      chunks.push(finalTokens.slice(i, i + exportConfiguration.maxTokensPerFile));
    }
    
    chunks.forEach((chunk, index) => {
      const fileName = `${exportConfiguration.fileNameTemplate}_${index + 1}.xaml`;
      const xamlContent = generateXamlContent(chunk);
      
      outputFiles.push(createOutputFile({
        fileName: fileName,
        content: xamlContent,
        hasFileHelper: hasFileHelper
      }));
    });
  } else {
    // Single file output
    const fileName = `${exportConfiguration.fileNameTemplate}.xaml`;
    const xamlContent = generateXamlContent(finalTokens);
    
    outputFiles.push(createOutputFile({
      fileName: fileName,
      content: xamlContent,
      hasFileHelper: hasFileHelper
    }));
  }

  return outputFiles;
});