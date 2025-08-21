"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
const sdk_exporters_1 = require("@supernovaio/sdk-exporters");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const handlebars_1 = __importDefault(require("handlebars"));
async function default_1(sdk, context) {
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
        .filter(token => token.tokenType === sdk_exporters_1.TokenType.color)
        .map(token => {
        const colorToken = token;
        return {
            name: token.name.replace(/\s+/g, ""),
            value: colorToken.toHex6()
        };
    });
    // Load and compile Handlebars template
    const templatePath = path_1.default.join(__dirname, "templates", "xaml-template.handlebars");
    const templateContent = fs_1.default.readFileSync(templatePath, "utf-8");
    const compiledTemplate = handlebars_1.default.compile(templateContent);
    // Generate final XAML
    const xamlOutput = compiledTemplate({ tokens: colorTokens });
    // Return result as a file
    const result = {
        path: "/",
        name: "DesignTokens.xaml",
        content: xamlOutput,
        type: sdk_exporters_1.OutputFileType.text
    };
    return [result];
}
