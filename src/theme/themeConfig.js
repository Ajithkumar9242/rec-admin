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
        controlHeight: 40,
        colorPrimary: isDarkMode ? brandTokens.teal : brandTokens.navy,
        colorPrimaryHover: isDarkMode ? brandTokens.tealLight : brandTokens.navySoft,
        borderRadius: 8,
        fontWeight: 600,
      },
      Input: {
        controlHeight: 40,
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
        bodyBg: semantic.bgApp,
        headerBg: semantic.bgSurface,
        siderBg: isDarkMode ? '#0d1820' : '#ffffff',
      },
      Menu: {
        itemBg: 'transparent',
        itemColor: isDarkMode ? '#94a3b8' : '#475569',
        itemSelectedColor: isDarkMode ? '#ffffff' : brandTokens.navy,
        itemSelectedBg: isDarkMode ? 'rgba(79, 168, 192, 0.2)' : 'rgba(79, 168, 192, 0.12)',
        itemHoverColor: isDarkMode ? '#ffffff' : brandTokens.navy,
        itemHoverBg: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(79, 168, 192, 0.06)',
        subMenuItemBg: 'transparent',
        borderRadius: 8,
        fontSize: 13,
      },
      Typography: {
        colorTextHeading: semantic.textPrimary,
      },
    },
  };
}
