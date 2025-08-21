import { Supernova, TokenType, OutputTextFile, OutputFileType, PulsarContext, AnyOutputFile, ColorToken } from "@supernovaio/sdk-exporters"
import fs from "fs"
import path from "path"
import handlebars from "handlebars"

export default async function(sdk: Supernova, context: PulsarContext): Promise<AnyOutputFile[]> {
  const designSystem = await sdk.designSystems.designSystem(context.dsId)
  if (!designSystem) {
    throw new Error(`Design system with ID ${context.dsId} not found`)
  }
  
  const tokens = await sdk.tokens.getTokens({
    designSystemId: context.dsId,
    versionId: context.versionId
  })

  // Filter color tokens
  const colorTokens = tokens
    .filter(token => token.tokenType === TokenType.color)
    .map(token => {
      const colorToken = token as ColorToken
      return {
        name: token.name.replace(/\s+/g, ""),
        value: colorToken.toHex6()
      }
    })

  // Load and compile Handlebars template
  const templatePath = path.join(__dirname, "templates", "xaml-template.handlebars")
  const templateContent = fs.readFileSync(templatePath, "utf-8")
  const compiledTemplate = handlebars.compile(templateContent)

  // Generate final XAML
  const xamlOutput = compiledTemplate({ tokens: colorTokens })

  // Return result as a file
  const result: OutputTextFile = {
    path: "/",
    name: "DesignTokens.xaml",
    content: xamlOutput,
    type: OutputFileType.text
  }

  return [result]
}
