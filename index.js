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

  // Filter color tokens
  const colorTokens = tokens
    .filter(token => token.tokenType === 'color')
    .map(token => {
      return {
        name: token.name.replace(/\s+/g, ""),
        value: token.toHex6 ? token.toHex6() : '#000000'
      };
    });

  // Generate XAML directly without Handlebars
  const generateXamlContent = (tokens) => {
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
  const xamlOutput = generateXamlContent(colorTokens);

  // Return result using Supernova's output format
  return [{
    path: "/",
    name: "DesignTokens.xaml", 
    content: xamlOutput,
    type: "text"
  }];
});