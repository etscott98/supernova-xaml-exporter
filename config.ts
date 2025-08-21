export type ExporterConfiguration = {
  /** When enabled, exports all token types (not just colors) as XAML resources with appropriate type conversion */
  includeAllTokenTypes: boolean;
  /** Maximum number of tokens to include in a single XAML file. Larger token sets will be split into multiple files */
  maxTokensPerFile: number;
  /** When enabled, creates separate XAML files for each token type (Colors.xaml, Typography.xaml, etc.) */
  groupByTokenType: boolean;
  /** When enabled, organizes tokens into ResourceDictionary sections based on their groups */
  includeTokenGroups: boolean;
  /** Prefix to add to all token names (e.g., 'DS_' for DesignSystem prefix) */
  tokenNamePrefix: string;
  /** Base name for generated XAML files. Will be suffixed with token type when grouping is enabled */
  fileNameTemplate: string;
};
