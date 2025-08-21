// Use the global Pulsar object provided by Supernova
Pulsar.export(async (sdk, context) => {
  // Get design system and tokens
  const designSystem = await sdk.designSystems.designSystem(context.dsId);
  if (!designSystem) {
    throw new Error(`Design system with ID ${context.dsId} not found`);
  }
  
  const tokens = await sdk.tokens.getTokens({
    designSystemId: context.dsId,
    versionId: context.versionId
  });

  // Debug: Log all tokens to understand the structure
  console.log('Total tokens found:', tokens.length);
  console.log('First token sample:', tokens[0]);
  
  // Filter color tokens
  const colorTokens = tokens
    .filter(token => {
      console.log('Token:', token.name, 'Type:', token.tokenType);
      return token.tokenType === 'color';
    })
    .map(token => {
      console.log('Processing color token:', token.name);
      return {
        name: token.name.replace(/\s+/g, ""),
        value: token.toHex6 ? token.toHex6() : (token.value ? token.value : '#000000')
      };
    });
  
  console.log('Color tokens found:', colorTokens.length);
  console.log('Color tokens:', colorTokens);

  // If no color tokens found, let's try all tokens as a fallback for debugging
  let finalTokens = colorTokens;
  if (colorTokens.length === 0) {
    console.log('No color tokens found, using all tokens for debugging');
    finalTokens = tokens.slice(0, 5).map(token => ({
      name: token.name ? token.name.replace(/\s+/g, "") : 'UnknownToken',
      value: token.value || token.tokenType || 'unknown'
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

  // Return result using Supernova's output format
  return [{
    path: "/",
    name: "DesignTokens.xaml", 
    content: xamlOutput,
    type: "text"
  }];
});