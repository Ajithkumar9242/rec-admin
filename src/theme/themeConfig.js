import { theme } from 'antd';
import { brandTokens, lightSemanticTokens, darkSemanticTokens } from './tokens.js';

export function getAntdTheme(isDarkMode = false) {
  const semantic = isDarkMode ? darkSemanticTokens : lightSemanticTokens;

  return {
    algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: isDarkMode ? brandTokens.teal : brandTokens.navy,
      colorInfo: brandTokens.teal,
      colorSuccess: brandTokens.success,
      colorWarning: brandTokens.amber,
      colorError: brandTokens.error,
      colorTextBase: semantic.textPrimary,
      colorBgBase: semantic.bgSurface,
      borderRadius: 8,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      controlHeight: 40,
      fontSize: 14,
    },
    components: {
      Button: {
        controlHeight: 42,
        colorPrimary: isDarkMode ? brandTokens.teal : brandTokens.navy,
        colorPrimaryHover: isDarkMode ? brandTokens.tealLight : brandTokens.navySoft,
        borderRadius: 8,
        fontWeight: 600,
      },
      Input: {
        controlHeight: 42,
        colorBorder: semantic.borderDefault,
        borderRadius: 8,
      },
      Card: {
        colorBgContainer: semantic.bgCard,
        colorBorderSecondary: semantic.borderDefault,
        borderRadiusLG: 12,
        boxShadowCard: semantic.boxShadow,
      },
      Layout: {
        colorBgBody: semantic.bgApp,
        colorBgHeader: isDarkMode ? '#12242f' : '#16313f',
        colorBgSider: isDarkMode ? '#0d1a22' : '#16313f',
      },
      Menu: {
        colorItemBg: 'transparent',
        colorItemText: isDarkMode ? '#8fa9b5' : '#b8ced6',
        colorItemTextSelected: '#ffffff',
        colorItemBgSelected: brandTokens.teal,
        borderRadius: 6,
      },
      Typography: {
        colorTextHeading: semantic.textPrimary,
      },
    },
  };
}
