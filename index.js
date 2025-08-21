// Use the global Pulsar object provided by Supernova
Pulsar.export(async (sdk, context) => {
  const fs = require('fs');
  const path = require('path');
  const handlebars = require('handlebars');

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

  // Load and compile Handlebars template
  const templatePath = path.join(__dirname, "templates", "xaml-template.handlebars");
  const templateContent = fs.readFileSync(templatePath, "utf-8");
  const compiledTemplate = handlebars.compile(templateContent);

  // Generate final XAML
  const xamlOutput = compiledTemplate({ tokens: colorTokens });

  // Return result using Supernova's output format
  return [{
    path: "/",
    name: "DesignTokens.xaml", 
    content: xamlOutput,
    type: "text"
  }];
});